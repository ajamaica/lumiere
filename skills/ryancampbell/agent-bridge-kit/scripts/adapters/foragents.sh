#!/usr/bin/env bash
# Agent Bridge Kit — forAgents.dev Adapter
# API: https://www.foragents.dev
# Auth: Public APIs (optional client_id for registration)
#
# Primarily read-oriented: news feed + skills directory.
# Write endpoints will be added as the forAgents API expands.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_BASE="https://www.foragents.dev"

# --- Config ---

find_config() {
  local locations=(
    "$SKILL_DIR/bridge-config.json"
    "$HOME/.openclaw/skills/agent-bridge-kit/bridge-config.json"
  )
  for loc in "${locations[@]}"; do
    [[ -f "$loc" ]] && echo "$loc" && return 0
  done
  return 1
}

CONFIG_FILE="$(find_config 2>/dev/null || echo "")"

get_client_id() {
  if [[ -z "$CONFIG_FILE" ]]; then
    echo "${FORAGENTS_CLIENT_ID:-}" && return
  fi
  local env_var
  env_var=$(jq -r '.platforms.foragents.client_id_env // "FORAGENTS_CLIENT_ID"' "$CONFIG_FILE")
  echo "${!env_var:-}"
}

# --- Normalize ---

normalize_feed_items() {
  jq '[.[] | {
    platform: "foragents",
    type: "post",
    id: (.id // .slug // null),
    title: (.title // null),
    content: (.summary // .description // .content // null),
    author: (.author // .source // null),
    timestamp: (.published // .date // .created_at // null),
    meta: {
      url: (.url // .link // null),
      tags: (.tags // []),
      category: (.category // null)
    }
  }]'
}

normalize_skills() {
  jq '[.[] | {
    platform: "foragents",
    type: "skill",
    id: (.slug // .id // null),
    title: (.name // .title // null),
    content: (.description // .summary // null),
    author: (.author // .maintainer // null),
    timestamp: (.updated_at // .created_at // null),
    meta: {
      url: (.url // null),
      tags: (.tags // []),
      install_url: (.install_url // null)
    }
  }]'
}

# --- Commands ---

cmd_read() {
  local limit=25 tag=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --limit) limit="$2"; shift 2 ;;
      --tag)   tag="$2"; shift 2 ;;
      *)       shift ;;
    esac
  done

  local url="$API_BASE/api/feed.json"
  local params=""

  [[ -n "$tag" ]] && params="?tag=$(jq -rn --arg t "$tag" '$t | @uri')"

  local response
  response=$(curl -sS -X GET "${url}${params}" \
    -H "Accept: application/json")

  # Handle both array and wrapped responses
  echo "$response" \
    | jq 'if type == "array" then . else (.items // .feed // .data // []) end' \
    | jq '.[:'"$limit"']' \
    | normalize_feed_items
}

cmd_skills() {
  local slug="${1:-}"

  if [[ -n "$slug" ]]; then
    # Return raw markdown for a specific skill
    curl -sS "$API_BASE/api/skills/${slug}.md"
    return
  fi

  local response
  response=$(curl -sS -X GET "$API_BASE/api/skills.json" \
    -H "Accept: application/json")

  echo "$response" \
    | jq 'if type == "array" then . else (.skills // .data // []) end' \
    | normalize_skills
}

cmd_mcp() {
  curl -sS -X GET "$API_BASE/api/mcp.json" \
    -H "Accept: application/json" | jq .
}

cmd_post() {
  # forAgents.dev is currently read-only for external agents
  jq -n '{
    platform: "foragents",
    type: "error",
    error: "forAgents.dev does not currently support external posting. Use the feed for reading.",
    supported_actions: ["read", "skills", "mcp"]
  }'
}

cmd_register() {
  local agent_name="" platform="openclaw" owner_url=""

  if [[ -n "$CONFIG_FILE" ]]; then
    agent_name=$(jq -r '.agent.name // ""' "$CONFIG_FILE")
    owner_url=$(jq -r '.agent.homepage // ""' "$CONFIG_FILE")
  fi

  # Override from args
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)  agent_name="$2"; shift 2 ;;
      --url)   owner_url="$2"; shift 2 ;;
      *)       shift ;;
    esac
  done

  if [[ -z "$agent_name" ]]; then
    echo "Error: Agent name required. Set in config or use --name" >&2
    return 1
  fi

  local payload
  payload=$(jq -n \
    --arg name "$agent_name" \
    --arg platform "$platform" \
    --arg ownerUrl "$owner_url" \
    '{name: $name, platform: $platform, ownerUrl: $ownerUrl}')

  curl -sS -X POST "$API_BASE/api/register" \
    -H "Content-Type: application/json" \
    -d "$payload" | jq '{
      platform: "foragents",
      type: "registration",
      client_id: (.client_id // null),
      message: (.message // "Registration submitted")
    }'
}

cmd_status() {
  local response
  if response=$(curl -sS -f -X GET "$API_BASE/api/feed.json" \
    -H "Accept: application/json" 2>/dev/null); then
    local count
    count=$(echo "$response" | jq 'if type == "array" then length else (.items // .feed // .data // []) | length end')
    jq -n --arg count "$count" '{"platform":"foragents","connected":true,"feed_items":($count | tonumber)}'
  else
    jq -n '{"platform":"foragents","connected":false,"error":"API unreachable"}'
  fi
}

# --- Router ---

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  read)     cmd_read "$@" ;;
  post)     cmd_post ;;
  skills)   cmd_skills "$@" ;;
  mcp)      cmd_mcp ;;
  register) cmd_register "$@" ;;
  status)   cmd_status ;;
  *)
    echo "forAgents adapter: read|skills|mcp|register|status" >&2
    exit 1
    ;;
esac
