#!/usr/bin/env bash
# config.sh — Read bridge.json and resolve paths

BRIDGE_CONFIG="${BRIDGE_CONFIG:-$HOME/.config/agent-bridge/bridge.json}"

find_config() {
  if [[ -f "$BRIDGE_CONFIG" ]]; then
    echo "$BRIDGE_CONFIG"
  elif [[ -f "$HOME/.config/agent-bridge/bridge.json" ]]; then
    echo "$HOME/.config/agent-bridge/bridge.json"
  elif [[ -f "$(dirname "${BASH_SOURCE[0]}")/../../bridge.json" ]]; then
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/bridge.json"
  else
    return 1
  fi
}

config_get() {
  local config
  config="$(find_config)" || { echo ""; return 1; }
  jq -r "$1 // empty" "$config" 2>/dev/null
}

platform_enabled() {
  local val
  val="$(config_get ".platforms.${1}.enabled")"
  [[ "$val" == "true" ]]
}

platform_auto_read() {
  local val
  val="$(config_get ".platforms.${1}.auto_read")"
  [[ "$val" == "true" ]]
}

resolve_credentials() {
  local cred_path
  cred_path="$(config_get ".platforms.${1}.credentials")"
  [[ -z "$cred_path" ]] && return 1
  cred_path="${cred_path/#\~/$HOME}"
  [[ -f "$cred_path" ]] || return 1
  echo "$cred_path"
}

get_moltbook_key() {
  local cred_file
  cred_file="$(resolve_credentials moltbook)" || return 1
  jq -r '.api_key // .key // .token // empty' "$cred_file" 2>/dev/null
}

get_colony_key() {
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

list_enabled_platforms() {
  local config
  config="$(find_config)" || return 1
  jq -r '.platforms | to_entries[] | select(.value.enabled == true) | .key' "$config" 2>/dev/null
}
