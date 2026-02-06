#!/bin/bash
# github-mentions: Monitor and track GitHub mentions across your orgs
# Requires: gh cli, jq

set -e

STATE_FILE="${GITHUB_MENTIONS_STATE:-$HOME/.openclaw/workspace/memory/github-mentions-state.json}"
STATE_DIR=$(dirname "$STATE_FILE")
CONFIG_FILE="${GITHUB_MENTIONS_CONFIG:-$HOME/.openclaw/workspace/skills/github-mentions/config.json}"

# Default configuration
# - orgOnly: true = only mentions from within your orgs (default)
# - orgMembersOnly: true = only mentions from org members (default)
# - memberCacheHours: 1 = refresh org member list every hour
# - checkIntervalMinutes: 5 = intended check frequency (for reference)
DEFAULT_CONFIG='{
  "orgOnly": true,
  "orgMembersOnly": true,
  "memberCacheHours": 1,
  "checkIntervalMinutes": 5
}'

# Ensure directories exist
mkdir -p "$STATE_DIR"
mkdir -p "$(dirname "$CONFIG_FILE")"

# Initialize config file if it doesn't exist
init_config() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "$DEFAULT_CONFIG" > "$CONFIG_FILE"
    echo "Initialized config at $CONFIG_FILE"
  fi
}

# Get config value
get_config() {
  local key="$1"
  local default="$2"
  init_config
  local val=$(jq -r "if $key == null then \"\" else $key | tostring end" "$CONFIG_FILE" 2>/dev/null)
  echo "${val:-$default}"
}

# Update config
set_config() {
  init_config
  local tmp=$(mktemp)
  jq "$1" "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
}

# Initialize state file if it doesn't exist
init_state() {
  if [[ ! -f "$STATE_FILE" ]]; then
    local username=$(gh api user --jq '.login')
    local orgs=$(gh api user/orgs --jq '[.[].login]')

    cat > "$STATE_FILE" << EOF
{
  "lastChecked": null,
  "username": "$username",
  "orgs": $orgs,
  "orgMembers": {},
  "orgMembersLastRefresh": null,
  "mentions": {}
}
EOF
    echo "Initialized state file at $STATE_FILE"
  fi
}

# Get value from state
get_state() {
  local key="$1"
  jq -r "$key" "$STATE_FILE"
}

# Update state file
update_state() {
  local tmp=$(mktemp)
  jq "$1" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# Refresh org members if cache is stale
refresh_org_members() {
  local cache_hours=$(get_config '.memberCacheHours' '1')
  local last_refresh=$(get_state '.orgMembersLastRefresh')
  local now=$(date +%s)

  local should_refresh=false
  if [[ "$last_refresh" == "null" || -z "$last_refresh" ]]; then
    should_refresh=true
  else
    local last_ts=$(date -d "$last_refresh" +%s 2>/dev/null || echo "0")
    local age_hours=$(( (now - last_ts) / 3600 ))
    if [[ $age_hours -ge $cache_hours ]]; then
      should_refresh=true
    fi
  fi

  if [[ "$should_refresh" == "true" ]]; then
    echo "Refreshing org member cache (stale or missing)..."
    local members_obj="{}"

    for org in $(get_state '.orgs | .[]'); do
      echo "  Fetching members for $org..."
      local members=$(gh api "orgs/$org/members" --jq '[.[].login]' 2>/dev/null || echo "[]")
      members_obj=$(echo "$members_obj" | jq --arg org "$org" --argjson members "$members" '.[$org] = $members')
    done

    local now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    update_state ".orgMembers = $members_obj | .orgMembersLastRefresh = \"$now_iso\""
    echo "  Member cache updated."
  fi
}

# Check if a user is an org member
is_org_member() {
  local username="$1"
  local org="$2"

  jq -e ".orgMembers[\"$org\"] | index(\"$username\") != null" "$STATE_FILE" >/dev/null 2>&1
}

# Check for new mentions
cmd_check() {
  init_state
  init_config

  local username=$(get_state '.username')
  local orgs=$(get_state '.orgs | .[]' | tr '\n' ' ')
  local last_checked=$(get_state '.lastChecked')
  local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Get config
  local org_only=$(get_config '.orgOnly' 'true')
  local org_members_only=$(get_config '.orgMembersOnly' 'true')

  echo "Checking mentions for @$username"
  echo "Orgs: $orgs"
  echo "Config: orgOnly=$org_only, orgMembersOnly=$org_members_only"
  [[ "$last_checked" != "null" ]] && echo "Last checked: $last_checked"
  echo ""

  # Refresh org members if needed (for filtering)
  if [[ "$org_members_only" == "true" ]]; then
    refresh_org_members
  fi

  # Primary source: GitHub Notifications API (most reliable for mentions)
  echo "Checking notifications API..."

  local since_param=""
  if [[ "$last_checked" != "null" ]]; then
    since_param="?since=$last_checked"
  fi

  # Get notifications filtered to mentions and review requests
  local notifications=$(gh api "notifications${since_param}" --jq '.[] | select(.reason == "mention" or .reason == "review_requested" or .reason == "assign")' 2>/dev/null || echo "")

  if [[ -n "$notifications" ]]; then
    echo "$notifications" | jq -c '.' 2>/dev/null | while read -r notif; do
      local reason=$(echo "$notif" | jq -r '.reason')
      local title=$(echo "$notif" | jq -r '.subject.title')
      local url=$(echo "$notif" | jq -r '.subject.url')
      local notif_type=$(echo "$notif" | jq -r '.subject.type' | tr '[:upper:]' '[:lower:]')
      local updated=$(echo "$notif" | jq -r '.updated_at')
      local repo_full=$(echo "$notif" | jq -r '.repository.full_name')

      # Extract issue/PR number from URL
      local number=$(echo "$url" | grep -oE '[0-9]+$')
      local mention_id="$repo_full#$number"

      # Filter: org only
      local repo_org=$(echo "$repo_full" | cut -d'/' -f1)
      if [[ "$org_only" == "true" ]]; then
        if ! get_state '.orgs | .[]' | grep -q "^$repo_org$"; then
          echo "  SKIP (outside org): $mention_id"
          continue
        fi
      fi

      # Check if already tracked
      local existing=$(jq -r ".mentions[\"$mention_id\"] // empty" "$STATE_FILE")
      if [[ -z "$existing" ]]; then
        # Get more details about who mentioned
        local mentioner="unknown"
        if [[ "$notif_type" == "pullrequest" ]]; then
          mentioner=$(gh api "$url" --jq '.user.login' 2>/dev/null || echo "unknown")
        elif [[ "$notif_type" == "issue" ]]; then
          mentioner=$(gh api "$url" --jq '.user.login' 2>/dev/null || echo "unknown")
        fi

        # Filter: org members only
        if [[ "$org_members_only" == "true" && "$mentioner" != "unknown" ]]; then
          if ! is_org_member "$mentioner" "$repo_org"; then
            echo "  SKIP (non-org-member): $mention_id by @$mentioner"
            continue
          fi
        fi

        echo "  NEW [$reason]: $mention_id - $title (by @$mentioner)"

        # Construct web URL from API URL
        local web_url=$(echo "$url" | sed 's|api.github.com/repos|github.com|' | sed 's|/pulls/|/pull/|' | sed 's|/issues/|/issues/|')

        # Add to state
        update_state ".mentions[\"$mention_id\"] = {
          \"type\": \"$notif_type\",
          \"reason\": \"$reason\",
          \"status\": \"pending\",
          \"title\": $(echo "$title" | jq -R .),
          \"url\": \"$web_url\",
          \"apiUrl\": \"$url\",
          \"mentionedAt\": \"$updated\",
          \"mentionedBy\": \"$mentioner\"
        }"
      fi
    done
  else
    echo "  No new notifications."
  fi

  # Update lastChecked
  update_state ".lastChecked = \"$now\""

  echo ""
  echo "Check complete."
  cmd_summary
}

# List mentions
cmd_list() {
  init_state

  local status_filter="$1"
  local filter=".mentions | to_entries[]"

  if [[ -n "$status_filter" ]]; then
    filter="$filter | select(.value.status == \"$status_filter\")"
  fi

  echo "Tracked mentions:"
  echo ""

  jq -r "$filter | \"[\(.value.status | ascii_upcase)] \(.key) - \(.value.title) (by @\(.value.mentionedBy))\"" "$STATE_FILE" 2>/dev/null || echo "No mentions found."
}

# Show summary
cmd_summary() {
  init_state

  local pending=$(jq '[.mentions | to_entries[] | select(.value.status == "pending")] | length' "$STATE_FILE")
  local in_progress=$(jq '[.mentions | to_entries[] | select(.value.status == "in_progress")] | length' "$STATE_FILE")
  local completed=$(jq '[.mentions | to_entries[] | select(.value.status == "completed")] | length' "$STATE_FILE")

  echo "Summary:"
  echo "  Pending: $pending"
  echo "  In progress: $in_progress"
  echo "  Completed: $completed"
}

# Start working on a mention
cmd_start() {
  local mention_id="$1"

  if [[ -z "$mention_id" ]]; then
    echo "Usage: github-mentions start <owner/repo#number>"
    exit 1
  fi

  local existing=$(jq -r ".mentions[\"$mention_id\"] // empty" "$STATE_FILE")
  if [[ -z "$existing" ]]; then
    echo "Mention not found: $mention_id"
    exit 1
  fi

  update_state ".mentions[\"$mention_id\"].status = \"in_progress\" | .mentions[\"$mention_id\"].startedAt = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\""
  echo "Marked $mention_id as in_progress"
}

# Mark mention as done
cmd_done() {
  local mention_id="$1"

  if [[ -z "$mention_id" ]]; then
    echo "Usage: github-mentions done <owner/repo#number>"
    exit 1
  fi

  local existing=$(jq -r ".mentions[\"$mention_id\"] // empty" "$STATE_FILE")
  if [[ -z "$existing" ]]; then
    echo "Mention not found: $mention_id"
    exit 1
  fi

  update_state ".mentions[\"$mention_id\"].status = \"completed\" | .mentions[\"$mention_id\"].completedAt = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\""
  echo "Marked $mention_id as completed"
}

# View mention details
cmd_view() {
  local mention_id="$1"

  if [[ -z "$mention_id" ]]; then
    echo "Usage: github-mentions view <owner/repo#number>"
    exit 1
  fi

  local mention=$(jq -r ".mentions[\"$mention_id\"] // empty" "$STATE_FILE")
  if [[ -z "$mention" ]]; then
    echo "Mention not found: $mention_id"
    exit 1
  fi

  echo "=== $mention_id ==="
  jq -r ".mentions[\"$mention_id\"] | \"Type: \(.type)\nStatus: \(.status)\nTitle: \(.title)\nURL: \(.url)\nMentioned by: @\(.mentionedBy)\nMentioned at: \(.mentionedAt)\"" "$STATE_FILE"

  echo ""
  echo "=== Issue/PR Details ==="

  # Extract repo and number
  local repo=$(echo "$mention_id" | sed 's/#.*//')
  local number=$(echo "$mention_id" | sed 's/.*#//')

  # Use API to get details (avoids gh pr view issues)
  gh api "repos/$repo/issues/$number" --jq '{title, body: .body[0:1000], user: .user.login, state, html_url}' 2>/dev/null || \
  gh api "repos/$repo/pulls/$number" --jq '{title, body: .body[0:1000], user: .user.login, state, html_url}' 2>/dev/null || \
  echo "Could not fetch details"
}

# Reset state (clear all mentions)
cmd_reset() {
  local username=$(get_state '.username')
  local orgs=$(get_state '.orgs')

  cat > "$STATE_FILE" << EOF
{
  "lastChecked": null,
  "username": "$username",
  "orgs": $orgs,
  "orgMembers": {},
  "orgMembersLastRefresh": null,
  "mentions": {}
}
EOF
  echo "State reset. All mentions cleared."
}

# Show/set config
cmd_config() {
  init_config

  if [[ -z "$1" ]]; then
    echo "Current configuration:"
    jq '.' "$CONFIG_FILE"
    echo ""
    echo "Usage:"
    echo "  github-mentions config                     Show current config"
    echo "  github-mentions config orgOnly true        Only track mentions from within orgs"
    echo "  github-mentions config orgOnly false       Track all mentions"
    echo "  github-mentions config orgMembersOnly true Only track mentions from org members"
    echo "  github-mentions config orgMembersOnly false Track mentions from anyone in org repos"
    echo "  github-mentions config memberCacheHours 2  Set member cache TTL (hours)"
    return
  fi

  local key="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    get_config ".$key"
  else
    # Handle boolean vs number
    if [[ "$value" == "true" || "$value" == "false" ]]; then
      set_config ".$key = $value"
    elif [[ "$value" =~ ^[0-9]+$ ]]; then
      set_config ".$key = $value"
    else
      set_config ".$key = \"$value\""
    fi
    echo "Set $key = $value"
  fi
}

# Main command dispatcher
case "${1:-}" in
  check)
    cmd_check
    ;;
  list)
    cmd_list "$2"
    ;;
  summary)
    cmd_summary
    ;;
  start)
    cmd_start "$2"
    ;;
  done)
    cmd_done "$2"
    ;;
  view)
    cmd_view "$2"
    ;;
  reset)
    cmd_reset
    ;;
  config)
    cmd_config "$2" "$3"
    ;;
  *)
    echo "github-mentions: Monitor GitHub mentions across your orgs"
    echo ""
    echo "Commands:"
    echo "  check              Check for new mentions"
    echo "  list [status]      List mentions (optionally filter by pending|in_progress|completed)"
    echo "  summary            Show mention counts by status"
    echo "  start <id>         Mark mention as in_progress"
    echo "  done <id>          Mark mention as completed"
    echo "  view <id>          View mention details"
    echo "  reset              Clear all tracked mentions"
    echo "  config [key] [val] Show/set configuration"
    echo ""
    echo "Mention ID format: owner/repo#number"
    echo ""
    echo "Configuration options (via 'config' command):"
    echo "  orgOnly          - Only track mentions from within your orgs (default: true)"
    echo "  orgMembersOnly   - Only track mentions from org members (default: true)"
    echo "  memberCacheHours - How often to refresh org member list (default: 1 hour)"
    ;;
esac
