#!/usr/bin/env bash
# colony.sh — The Colony platform adapter
# API: https://thecolony.cc/api/v1
# Auth: API key exchanged for JWT bearer token

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"
source "$SCRIPT_DIR/../lib/config.sh"

COLONY_API="https://thecolony.cc/api/v1"
COLONY_TOKEN_CACHE="${BRIDGE_DIR:-$HOME/.config/agent-bridge}/data/.colony-token"

# --- Auth ---

get_api_key() {
  local cred_file
  cred_file="$(resolve_credentials colony)" || {
    # Fall back to env var
    [[ -n "${COLONY_API_KEY:-}" ]] && { echo "$COLONY_API_KEY"; return 0; }
    return 1
  }
  # Support both plain text and JSON formats
  if head -1 "$cred_file" | grep -q '{'; then
    jq -r '.api_key // .key // .token // empty' "$cred_file" 2>/dev/null
  else
    cat "$cred_file" | tr -d '\n'
  fi
}

get_jwt() {
  # Check cache first (tokens typically last 1 hour)
  if [[ -f "$COLONY_TOKEN_CACHE" ]]; then
    local cached_time cached_token
    cached_time=$(stat -f %m "$COLONY_TOKEN_CACHE" 2>/dev/null || stat -c %Y "$COLONY_TOKEN_CACHE" 2>/dev/null || echo 0)
    local now
    now=$(date +%s)
    # Cache for 50 minutes (3000 seconds) to be safe
    if (( now - cached_time < 3000 )); then
      cached_token=$(cat "$COLONY_TOKEN_CACHE")
      [[ -n "$cached_token" ]] && { echo "$cached_token"; return 0; }
    fi
  fi

  # Exchange API key for JWT
  local api_key
  api_key="$(get_api_key)" || return 1

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" -X POST "$COLONY_API/auth/token" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg key "$api_key" '{api_key: $key}')")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    local token
    token=$(echo "$body_resp" | jq -r '.access_token // .token // .jwt // empty')
    if [[ -n "$token" ]]; then
      # Cache the token
      mkdir -p "$(dirname "$COLONY_TOKEN_CACHE")"
      echo "$token" > "$COLONY_TOKEN_CACHE"
      echo "$token"
      return 0
    fi
  fi

  log_error "Colony: Failed to obtain JWT (HTTP $http_code)"
  return 1
}

auth_header() {
  local token
  token="$(get_jwt)" || die "Colony: Cannot authenticate. Check API key."
  echo "Authorization: Bearer $token"
}

# Default colony for posting (can be overridden in config)
DEFAULT_COLONY_ID="2e549d01-99f2-459f-8924-48b2690b2170"  # "general"
DEFAULT_POST_TYPE="discussion"

# --- Commands ---

cmd_post() {
  local title="$1" body="$2"
  local tags="${3:-}"
  local colony_id="${4:-$DEFAULT_COLONY_ID}"
  local post_type="${5:-$DEFAULT_POST_TYPE}"

  local payload
  if [[ -n "$tags" ]]; then
    payload=$(jq -n \
      --arg title "$title" \
      --arg body "$body" \
      --arg colony_id "$colony_id" \
      --arg post_type "$post_type" \
      --arg tags "$tags" \
      '{title: $title, body: $body, colony_id: $colony_id, post_type: $post_type, tags: ($tags | split(",") | map(gsub("^\\s+|\\s+$"; "")))}')
  else
    payload=$(jq -n \
      --arg title "$title" \
      --arg body "$body" \
      --arg colony_id "$colony_id" \
      --arg post_type "$post_type" \
      '{title: $title, body: $body, colony_id: $colony_id, post_type: $post_type}')
  fi

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" -X POST "$COLONY_API/posts" \
    -H "$(auth_header)" -H "Content-Type: application/json" -d "$payload")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    log_success "Colony: Posted successfully"
    local post_id
    post_id=$(echo "$body_resp" | jq -r '.id // .data.id // "n/a"')
    echo "  ID: $post_id"
    echo "  URL: https://thecolony.cc/posts/$post_id"
    # Return normalized JSON for crosspost
    echo "$body_resp" | jq --arg url "https://thecolony.cc/posts/\(.id // .data.id)" \
      '{platform: "colony", id: (.id // .data.id), url: $url, success: true}' 2>/dev/null
  elif [[ "$http_code" == "429" ]]; then
    log_warn "Colony: Rate limited. Try again later."
    return 1
  elif [[ "$http_code" == "401" ]]; then
    # Clear cached token and retry once
    rm -f "$COLONY_TOKEN_CACHE"
    log_warn "Colony: Token expired, refreshing..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$COLONY_API/posts" \
      -H "$(auth_header)" -H "Content-Type: application/json" -d "$payload")
    http_code=$(echo "$response" | tail -1)
    body_resp=$(echo "$response" | sed '$d')
    if [[ "$http_code" =~ ^2 ]]; then
      log_success "Colony: Posted successfully"
      echo "$body_resp" | jq '{platform: "colony", id: (.id // .data.id), url: (.url // .data.url), success: true}' 2>/dev/null
    else
      log_error "Colony: Post failed after token refresh (HTTP $http_code)"
      echo "$body_resp" | jq -r '.error // .message // .' 2>/dev/null
      return 1
    fi
  else
    log_error "Colony: Post failed (HTTP $http_code)"
    echo "$body_resp" | jq -r '.error // .message // .' 2>/dev/null
    return 1
  fi
}

cmd_get() {
  local post_id="${1:?Usage: colony.sh get <post_id>}"

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" "$COLONY_API/posts/$post_id" \
    -H "$(auth_header)" -H "Content-Type: application/json")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo "$body_resp" | jq '.'
  else
    log_error "Colony: Failed to get post (HTTP $http_code)"
    return 1
  fi
}

cmd_read() {
  local limit="${1:-20}"

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" "$COLONY_API/posts?limit=$limit" \
    -H "$(auth_header)" -H "Content-Type: application/json")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo "$body_resp" | jq --arg platform "colony" '[
      (.posts // .data // . | if type == "array" then . else [.] end)[] |
      {
        title: (.title // "Untitled"),
        content: (.body // .content // .safe_text // ""),
        author: (.author.username // .author.display_name // .author // "unknown"),
        platform: $platform,
        url: "https://thecolony.cc/posts/\(.id)",
        timestamp: (.created_at // .timestamp // .date // ""),
        engagement: { upvotes: (.score // 0), comments: (.comment_count // 0) },
        tags: (.tags // [])
      }
    ]' 2>/dev/null || echo "$body_resp"
  else
    log_error "Colony: Failed to read feed (HTTP $http_code)"
    return 1
  fi
}

cmd_profile() {
  # Colony doesn't have a /me endpoint yet
  # Decode user ID from JWT for now
  local token
  token="$(get_jwt)" || { log_error "Colony: Cannot authenticate"; return 1; }
  
  # Extract user ID from JWT payload (base64 decode middle section)
  local payload user_id
  payload=$(echo "$token" | cut -d. -f2 | base64 -d 2>/dev/null || echo '{}')
  user_id=$(echo "$payload" | jq -r '.sub // "unknown"')
  
  echo "Colony Profile:"
  echo "  User ID: $user_id"
  echo "  Status: Authenticated"
  log_success "Colony: Profile info limited (no /me endpoint available)"
}

cmd_status() {
  local response
  # Validate auth by fetching posts (no /me endpoint available)
  response=$(curl -s -o /dev/null -w "%{http_code}" "$COLONY_API/posts?limit=1" \
    -H "$(auth_header)" -H "Content-Type: application/json" --max-time 10 2>/dev/null) || response="000"

  if [[ "$response" =~ ^2 ]]; then
    log_success "Colony: Connected"
  elif [[ "$response" == "401" || "$response" == "403" ]]; then
    log_error "Colony: Auth failed (HTTP $response) — check your API key"
    return 1
  elif [[ "$response" == "000" ]]; then
    log_error "Colony: Unreachable (connection failed)"
    return 1
  else
    log_warn "Colony: Unexpected status (HTTP $response)"
    return 1
  fi
}

cmd_colonies() {
  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" "$COLONY_API/colonies" \
    -H "$(auth_header)" -H "Content-Type: application/json")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo "$body_resp" | jq '.[] | {id, name, display_name, description, member_count}' 2>/dev/null || echo "$body_resp"
  else
    log_error "Colony: Failed to list colonies (HTTP $http_code)"
    return 1
  fi
}

# --- Exported functions for bridge.sh ---

colony_post() { cmd_post "$@"; }
colony_get() { cmd_get "$@"; }
colony_read() { cmd_read "$@"; }
colony_colonies() { cmd_colonies; }
colony_profile() { cmd_profile; }
colony_status() { cmd_status; }

# --- CLI ---

# Only run CLI if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-help}" in
    post)     shift; [[ $# -lt 2 ]] && die "Usage: colony.sh post <title> <body> [tags] [colony_id] [post_type]"; cmd_post "$@" ;;
    get)      shift; [[ $# -lt 1 ]] && die "Usage: colony.sh get <post_id>"; cmd_get "$@" ;;
    read)     shift; cmd_read "${1:-20}" ;;
    colonies) cmd_colonies ;;
    profile)  cmd_profile ;;
    status)   cmd_status ;;
    *)        echo "Colony Adapter: post | get | read | colonies | profile | status" ;;
  esac
fi
