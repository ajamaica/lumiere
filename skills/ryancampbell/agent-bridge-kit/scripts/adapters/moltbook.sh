#!/usr/bin/env bash
# moltbook.sh — Moltbook platform adapter
# API: https://www.moltbook.com/api/v1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"
source "$SCRIPT_DIR/../lib/config.sh"

MOLTBOOK_API="https://www.moltbook.com/api/v1"

auth_header() {
  local key
  key="$(get_moltbook_key)" || die "Moltbook: Cannot read API key. Check credentials path in bridge.json"
  echo "Authorization: Bearer $key"
}

cmd_post() {
  local title="$1" body="$2"
  local submolt="${3:-$(config_get '.platforms.moltbook.default_submolt')}"
  submolt="${submolt:-general}"

  local payload
  payload=$(jq -n --arg title "$title" --arg body "$body" --arg submolt "$submolt" \
    '{title: $title, body: $body, submolt: $submolt}')

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" -X POST "$MOLTBOOK_API/posts" \
    -H "$(auth_header)" -H "Content-Type: application/json" -d "$payload")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    log_success "Moltbook: Posted to s/$submolt"
    echo "$body_resp" | jq -r '"  URL: \(.url // .data.url // "n/a")\n  ID: \(.id // .data.id // "n/a")"' 2>/dev/null || true
  elif [[ "$http_code" == "429" ]]; then
    log_warn "Moltbook: Rate limited (1 post per 30 min). Try again later."
    return 1
  else
    log_error "Moltbook: Post failed (HTTP $http_code)"
    echo "$body_resp" | jq -r '.error // .message // .' 2>/dev/null
    return 1
  fi
}

cmd_read() {
  local limit="${1:-20}" sort="${2:-new}"

  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" "$MOLTBOOK_API/feed?sort=$sort&limit=$limit" \
    -H "$(auth_header)" -H "Content-Type: application/json")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo "$body_resp" | jq --arg platform "moltbook" '[
      (.data // . | if type == "array" then . else [.] end)[] |
      {
        title: (.title // "Untitled"),
        content: (.body // .content // .text // ""),
        author: (.author // .user // .agent_name // "unknown"),
        platform: $platform,
        url: (.url // ""),
        timestamp: (.created_at // .timestamp // .date // ""),
        engagement: { upvotes: (.upvotes // .score // 0), comments: (.comment_count // .comments // 0) }
      }
    ]' 2>/dev/null || echo "$body_resp"
  else
    log_error "Moltbook: Failed to read feed (HTTP $http_code)"
    return 1
  fi
}

cmd_profile() {
  local response http_code body_resp
  response=$(curl -s -w "\n%{http_code}" "$MOLTBOOK_API/agents/me" \
    -H "$(auth_header)" -H "Content-Type: application/json")
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')

  if [[ "$http_code" =~ ^2 ]]; then
    echo "Moltbook Profile:"
    echo "$body_resp" | jq '.' 2>/dev/null || echo "$body_resp"
  else
    log_error "Moltbook: Failed to get profile (HTTP $http_code)"
    return 1
  fi
}

cmd_status() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" "$MOLTBOOK_API/agents/me" \
    -H "$(auth_header)" -H "Content-Type: application/json" --max-time 10)

  if [[ "$response" =~ ^2 ]]; then
    log_success "Moltbook: Connected"
  elif [[ "$response" == "401" || "$response" == "403" ]]; then
    log_error "Moltbook: Auth failed (HTTP $response) — check your API key"
    return 1
  elif [[ "$response" == "000" ]]; then
    log_error "Moltbook: Unreachable (connection failed)"
    return 1
  else
    log_warn "Moltbook: Unexpected status (HTTP $response)"
    return 1
  fi
}

case "${1:-help}" in
  post)    shift; [[ $# -lt 2 ]] && die "Usage: moltbook.sh post <title> <body> [submolt]"; cmd_post "$@" ;;
  read)    shift; cmd_read "${1:-20}" "${2:-new}" ;;
  profile) cmd_profile ;;
  status)  cmd_status ;;
  *)       echo "Moltbook Adapter: post | read | profile | status" ;;
esac
