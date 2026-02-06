#!/usr/bin/env bash

core_info_json() {
  ensure_env
  python3 - <<'PY' "$CORE_NODE_NAME"
import subprocess
import sys
import re

node = sys.argv[1]
out = subprocess.check_output(
    ["ros2", "service", "call", f"/{node}/info", "peaq_ros2_interfaces/srv/GetNodeInfo"],
    text=True,
)

raw = None

# Pattern 1: result='...'
m = re.search(r"result='(.*)'", out, re.S)
if m:
    raw = m.group(1)
else:
    # Pattern 2: result: "..."
    for line in out.splitlines():
        if line.lstrip().startswith("result:"):
            raw = line.split("result:", 1)[1].strip()
            if raw.startswith('\"') and raw.endswith('\"'):
                raw = raw[1:-1]
            break

if raw is None:
    raise SystemExit("Could not parse result from ros2 output")

decoded = bytes(raw, "utf-8").decode("unicode_escape")
print(decoded)
PY
}

did_read_json() {
  ensure_env
  python3 - <<'PY' "$CORE_NODE_NAME"
import subprocess
import sys
import re

node = sys.argv[1]
out = subprocess.check_output(
    ["ros2", "service", "call", f"/{node}/identity/read", "peaq_ros2_interfaces/srv/IdentityRead", "{}"],
    text=True,
)

raw = None

# Pattern 1: doc_json='...'
m = re.search(r"doc_json='(.*)'", out, re.S)
if m:
    raw = m.group(1)
else:
    # Pattern 2: doc_json: "..."
    for line in out.splitlines():
        if "doc_json:" in line:
            raw = line.split("doc_json:", 1)[1].strip()
            if raw.startswith('\"') and raw.endswith('\"'):
                raw = raw[1:-1]
            break

if raw is None:
    raise SystemExit("Could not parse doc_json from ros2 output")

decoded = bytes(raw, "utf-8").decode("unicode_escape")
print(decoded)
PY
}

safe_core_info_json() {
  if ! out="$(core_info_json 2>/dev/null)"; then
    echo "{}"
    return
  fi
  if [[ -z "$out" ]]; then
    echo "{}"
    return
  fi
  echo "$out"
}

identity_card_json() {
  local name="${1:-}"
  local roles_csv="${2:-}"
  local endpoints_json="${3:-}"
  local meta_json="${4:-}"

  agent_id="$(get_openclaw_agent_id)"
  fallback_name="$agent_id"
  if [[ -z "$fallback_name" ]]; then
    fallback_name="$(get_hostname)"
  fi
  python3 - <<'PY' "$name" "$roles_csv" "$endpoints_json" "$meta_json" "$fallback_name"
import json, sys

name, roles_csv, endpoints_raw, meta_raw, fallback_name = sys.argv[1:6]

def parse_json(raw):
    raw = (raw or "").strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": raw}

roles = [r.strip() for r in (roles_csv or "").split(",") if r.strip()]
endpoints = parse_json(endpoints_raw)
meta = None
if (meta_raw or "").strip():
    meta = parse_json(meta_raw)

card = {
    "schema": "peaq.identityCard.v1",
    "name": name or fallback_name or "",
    "roles": roles,
    "endpoints": endpoints,
}
if meta is not None:
    card["metadata"] = meta

print(json.dumps(card, separators=(",", ":")))
PY
}

core_state() {
  local out
  out="$(ros2 lifecycle get "/$CORE_NODE_NAME" 2>/dev/null || true)"
  if echo "$out" | grep -q "current state"; then
    echo "$out" | awk -F':' '/current state/ {print $2}' | awk '{print $1}'
  else
    echo "$out" | awk '{print $1}'
  fi
}
