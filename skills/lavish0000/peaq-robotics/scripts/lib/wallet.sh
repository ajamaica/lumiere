#!/usr/bin/env bash

wallet_info_from_config() {
  python3 - <<'PY' "$CONFIG"
import json
import base64
import os
import sys
try:
    import yaml  # type: ignore
except Exception as e:
    raise SystemExit(f"PyYAML required to read config: {e}")

cfg = sys.argv[1]
with open(cfg, "r") as f:
    data = yaml.safe_load(f) or {}

network = data.get("network") or ""
wallet = data.get("wallet") or {}
path = wallet.get("path") or ""
path = os.path.expanduser(path)
if not path:
    raise SystemExit("wallet.path missing in config")
if not os.path.exists(path):
    raise SystemExit(f"wallet file not found: {path}")

with open(path, "r") as f:
    obj = json.load(f)

typ = (obj.get("type") or "").lower()
enc = (obj.get("encoding") or "base64").lower()
payload = obj.get("data") or ""

if enc == "base64":
    raw = base64.b64decode(payload).decode("utf-8") if payload else ""
else:
    raw = payload

print(json.dumps({
    "network": network,
    "wallet_path": path,
    "wallet_type": typ,
    "payload": raw,
}))
PY
}

fund_request_line() {
  local amount="${1:-}"
  local reason="${2:-}"
  local info_json addr

  if [[ -z "$amount" ]]; then
    amount="0.05"
  fi
  if [[ -z "$reason" ]]; then
    reason="DID + storage init"
  fi

  info_json="$(safe_core_info_json)"
  addr="$(python3 - <<'PY' "$info_json"
import json, sys
info = json.loads(sys.argv[1])
print(info.get("wallet_address", ""))
PY
)"
  [[ -n "$addr" ]] || fatal "fund-request requires core node running (could not read wallet address)"
  echo "peaq-robotics fund-request: address=$addr amount=$amount PEAQ reason=\"$reason\""
}
