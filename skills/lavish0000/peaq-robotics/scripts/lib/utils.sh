#!/usr/bin/env bash

fatal() {
  echo "${SCRIPT_NAME}: $*" >&2
  exit 2
}

resolve_openclaw_workspace() {
  local dir="${PWD:-$(pwd)}"
  while [[ -n "$dir" && "$dir" != "/" ]]; do
    if [[ -f "$dir/AGENTS.md" && -f "$dir/TOOLS.md" ]]; then
      echo "$dir"
      return
    fi
    dir="$(dirname "$dir")"
  done
  echo ""
}

get_openclaw_agent_id() {
  if [[ -n "${OPENCLAW_AGENT_ID:-}" ]]; then
    echo "$OPENCLAW_AGENT_ID"
    return
  fi
  if [[ -n "${OPENCLAW_AGENT_DIR:-}" ]]; then
    basename "$(dirname "$OPENCLAW_AGENT_DIR")"
    return
  fi
  echo ""
}

get_hostname() {
  hostname 2>/dev/null || uname -n 2>/dev/null || echo ""
}

yaml_escape() {
  # Escape single quotes for YAML single-quoted scalars.
  printf "%s" "$1" | sed "s/'/''/g"
}

json_compact_or_raw() {
  python3 - <<'PY' "$1"
import json
import sys

raw = sys.argv[1]
try:
    obj = json.loads(raw)
except Exception:
    print(raw)
else:
    print(json.dumps(obj, separators=(',', ':')))
PY
}

read_json_arg() {
  local arg="${1:-}"
  if [[ -z "$arg" ]]; then
    echo "{}"
    return
  fi
  if [[ "$arg" == @* ]]; then
    local path="${arg#@}"
    [[ -f "$path" ]] || fatal "JSON file not found: $path"
    python3 - <<'PY' "$path"
import json
import sys

with open(sys.argv[1], "r") as f:
    obj = json.load(f)
print(json.dumps(obj, separators=(',', ':')))
PY
    return
  fi
  json_compact_or_raw "$arg"
}
