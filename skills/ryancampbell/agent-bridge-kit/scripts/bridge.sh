#!/usr/bin/env bash
# Agent Bridge Kit — Main Router
# Routes commands to platform adapters
set -euo pipefail

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$BRIDGE_DIR/scripts"
CONFIG_FILE="${BRIDGE_CONFIG:-$BRIDGE_DIR/bridge-config.json}"
CROSSPOST_LOG="${BRIDGE_DIR}/data/crosspost-log.json"

# --- Helpers ---

die() { echo '{"error":"'"$1"'"}' >&2; exit 1; }

require_jq() { command -v jq &>/dev/null || die "jq is required but not installed"; }

load_config() {
  [[ -f "$CONFIG_FILE" ]] || die "Config not found: $CONFIG_FILE — copy templates/bridge-config.json"
  CONFIG=$(cat "$CONFIG_FILE")
}

platform_enabled() {
  echo "$CONFIG" | jq -re ".platforms.${1}.enabled // false" 2>/dev/null | grep -q true
}

get_config_val() {
  echo "$CONFIG" | jq -r "$1 // empty" 2>/dev/null
}

ensure_data_dir() {
  mkdir -p "$BRIDGE_DIR/data"
  [[ -f "$CROSSPOST_LOG" ]] || echo '[]' > "$CROSSPOST_LOG"
}

source_adapter() {
  local adapter="$SCRIPTS_DIR/adapters/${1}.sh"
  [[ -f "$adapter" ]] || die "Adapter not found: $1"
  # shellcheck source=/dev/null
  source "$adapter"
}

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# --- Commands ---

cmd_post() {
  local title="${1:?Usage: bridge post <title> <content>}"
  local content="${2:?Usage: bridge post <title> <content>}"
  if platform_enabled moltbook; then
    source_adapter moltbook
    moltbook_post "$title" "$content"
  else
    die "No write-enabled platform configured"
  fi
}

cmd_read() {
  local platform="" sort="new" submolt="" tag="" limit=25
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --moltbook)   platform="moltbook"; shift ;;
      --foragents)  platform="foragents"; shift ;;
      --colony)     platform="colony"; shift ;;
      --sort)       sort="$2"; shift 2 ;;
      --submolt)    submolt="$2"; shift 2 ;;
      --tag)        tag="$2"; shift 2 ;;
      --limit)      limit="$2"; shift 2 ;;
      *)            shift ;;
    esac
  done

  if [[ "$platform" == "moltbook" ]] || { [[ -z "$platform" ]] && platform_enabled moltbook; }; then
    source_adapter moltbook
    if [[ -n "$submolt" ]]; then
      moltbook_read_submolt "$submolt" "$sort"
    else
      moltbook_read "$sort" "$limit"
    fi
  fi

  if [[ "$platform" == "foragents" ]] || { [[ -z "$platform" ]] && platform_enabled foragents; }; then
    source_adapter foragents
    foragents_feed "$tag"
  fi

  if [[ "$platform" == "colony" ]] || { [[ -z "$platform" ]] && platform_enabled colony; }; then
    source_adapter colony
    colony_read "$limit"
  fi
}

cmd_comment() {
  local post_id="${1:?Usage: bridge comment <post_id> <content>}"
  local content="${2:?Usage: bridge comment <post_id> <content>}"
  source_adapter moltbook
  moltbook_comment "$post_id" "$content"
}

cmd_upvote() {
  local post_id="${1:?Usage: bridge upvote <post_id>}"
  source_adapter moltbook
  moltbook_upvote "$post_id"
}

cmd_search() {
  local query="${1:?Usage: bridge search <query>}"
  source_adapter moltbook
  moltbook_search "$query"
}

cmd_profile() {
  source_adapter moltbook
  if [[ $# -gt 0 ]]; then
    moltbook_profile_by_name "$1"
  else
    moltbook_profile
  fi
}

cmd_skills() {
  source_adapter foragents
  if [[ $# -gt 0 ]]; then
    foragents_skill "$1"
  else
    foragents_skills
  fi
}

cmd_register() {
  local platform=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --foragents) platform="foragents"; shift ;;
      --moltbook)  platform="moltbook"; shift ;;
      *)           shift ;;
    esac
  done
  [[ -n "$platform" ]] || die "Usage: bridge register --foragents|--moltbook"
  source_adapter "$platform"
  "${platform}_register"
}

cmd_crosspost() {
  local title="${1:?Usage: bridge crosspost <title> <content>}"
  local content="${2:?Usage: bridge crosspost <title> <content>}"
  ensure_data_dir

  local results="[]"
  local ts
  ts="$(timestamp)"

  # Idempotency check
  local recent
  recent=$(jq --arg t "$title" '[.[] | select(.title == $t)] | length' "$CROSSPOST_LOG" 2>/dev/null || echo 0)
  if [[ "$recent" -gt 0 ]]; then
    echo '{"warning":"Title already cross-posted. Check crosspost-log.json"}' >&2
  fi

  if platform_enabled moltbook; then
    source_adapter moltbook
    local mb_result
    mb_result=$(moltbook_post "$title" "$content" 2>/dev/null) || true
    if [[ -n "$mb_result" ]]; then
      results=$(echo "$results" | jq --argjson r "$mb_result" '. + [$r]')
    fi
  fi

  if platform_enabled colony; then
    source_adapter colony
    local colony_result
    colony_result=$(colony_post "$title" "$content" 2>/dev/null) || true
    if [[ -n "$colony_result" ]]; then
      results=$(echo "$results" | jq --argjson r "$colony_result" '. + [$r]')
    fi
  fi

  # forAgents is read-only — write support added when their API supports it

  # Log the crosspost
  local entry
  entry=$(jq -n --arg title "$title" --arg ts "$ts" --argjson results "$results" \
    '{title: $title, timestamp: $ts, results: $results}')
  jq --argjson e "$entry" '. + [$e]' "$CROSSPOST_LOG" > "${CROSSPOST_LOG}.tmp" \
    && mv "${CROSSPOST_LOG}.tmp" "$CROSSPOST_LOG"

  echo "$results" | jq .
}

cmd_feed() {
  local limit=20 sort="new"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --limit) limit="$2"; shift 2 ;;
      --sort)  sort="$2"; shift 2 ;;
      *)       shift ;;
    esac
  done

  local all="[]"

  if platform_enabled moltbook; then
    source_adapter moltbook
    local mb
    mb=$(moltbook_read "$sort" "$limit" 2>/dev/null) || true
    [[ -n "$mb" ]] && all=$(echo "$all" | jq --argjson items "$mb" '. + (if ($items | type) == "array" then $items else [$items] end)')
  fi

  if platform_enabled foragents; then
    source_adapter foragents
    local fa
    fa=$(foragents_feed "" 2>/dev/null) || true
    [[ -n "$fa" ]] && all=$(echo "$all" | jq --argjson items "$fa" '. + (if ($items | type) == "array" then $items else [$items] end)')
  fi

  if platform_enabled colony; then
    source_adapter colony
    local col
    col=$(colony_read "$limit" 2>/dev/null) || true
    [[ -n "$col" ]] && all=$(echo "$all" | jq --argjson items "$col" '. + (if ($items | type) == "array" then $items else [$items] end)')
  fi

  echo "$all" | jq --argjson lim "$limit" 'sort_by(.timestamp) | reverse | .[:$lim]'
}

cmd_help() {
  cat <<'EOF'
Agent Bridge Kit — Cross-platform presence for AI agents

Usage: bridge.sh <command> [options]

Commands:
  post <title> <content>          Post to primary platform (Moltbook)
  read [--moltbook|--foragents|--colony]
       [--sort hot|new|top]       Read feed from a platform
       [--submolt <name>]
       [--tag <tag>]
  comment <post_id> <content>     Comment on a Moltbook post
  upvote <post_id>                Upvote a Moltbook post
  search <query>                  Search Moltbook posts
  profile [name]                  Get agent profile from Moltbook
  skills [slug]                   List or view skills from forAgents.dev
  register --foragents|--moltbook Register on a platform
  crosspost <title> <content>     Post to all enabled platforms
  feed [--limit N] [--sort S]     Unified feed from all platforms
  help                            Show this help

Environment:
  BRIDGE_CONFIG       Path to config file (default: ./bridge-config.json)
  MOLTBOOK_API_KEY    Moltbook API key
  FORAGENTS_CLIENT_ID forAgents.dev client ID
  COLONY_API_KEY      The Colony API key
EOF
}

# --- Main ---

main() {
  require_jq
  load_config

  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    post)      cmd_post "$@" ;;
    read)      cmd_read "$@" ;;
    comment)   cmd_comment "$@" ;;
    upvote)    cmd_upvote "$@" ;;
    search)    cmd_search "$@" ;;
    profile)   cmd_profile "$@" ;;
    skills)    cmd_skills "$@" ;;
    register)  cmd_register "$@" ;;
    crosspost) cmd_crosspost "$@" ;;
    feed)      cmd_feed "$@" ;;
    help|--help|-h) cmd_help ;;
    *)         die "Unknown command: $cmd. Run with 'help' for usage." ;;
  esac
}

main "$@"
