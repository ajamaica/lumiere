#!/usr/bin/env bash

set_config_network() {
  local url="$1"
  python3 - <<'PY' "$CONFIG" "$url"
import sys
try:
    import yaml  # type: ignore
except Exception as e:
    raise SystemExit(f"PyYAML required to edit config: {e}")

cfg = sys.argv[1]
url = sys.argv[2]
with open(cfg, "r") as f:
    data = yaml.safe_load(f) or {}
data["network"] = url
with open(cfg, "w") as f:
    yaml.safe_dump(data, f, sort_keys=False)
PY
}

set_config_wallet_path() {
  local path="$1"
  python3 - <<'PY' "$CONFIG" "$path"
import sys
try:
    import yaml  # type: ignore
except Exception as e:
    raise SystemExit(f"PyYAML required to edit config: {e}")

cfg = sys.argv[1]
path = sys.argv[2]
with open(cfg, "r") as f:
    data = yaml.safe_load(f) or {}
wallet = data.get("wallet") or {}
wallet["path"] = path
data["wallet"] = wallet
with open(cfg, "w") as f:
    yaml.safe_dump(data, f, sort_keys=False)
PY
}

ensure_storage_mode() {
  python3 - <<'PY' "$CONFIG"
import sys
try:
    import yaml  # type: ignore
except Exception as e:
    raise SystemExit(f"PyYAML required to edit config: {e}")

cfg = sys.argv[1]
with open(cfg, "r") as f:
    data = yaml.safe_load(f) or {}

storage_bridge = data.get("storage_bridge") or {}
storage = storage_bridge.get("storage") or {}

mode = (storage.get("mode") or "").strip().lower()
pinata = storage.get("pinata") or {}
jwt = (pinata.get("jwt") or "").strip()

pinata_missing = (not jwt) or jwt.upper() in ("YOUR_PINATA_JWT", "CHANGEME", "REPLACE_ME")

# If pinata is selected but not configured, or mode is missing, fallback to local ipfs.
if mode in ("", "pinata") and pinata_missing:
    storage["mode"] = "local_ipfs"
    local = storage.get("local_ipfs") or {}
    local.setdefault("api_url", "http://127.0.0.1:5001")
    local.setdefault("gateway_url", "http://127.0.0.1:8080/ipfs")
    local.setdefault("save_dir", "~/.peaq_ipfs_cache")
    storage["local_ipfs"] = local
    storage_bridge["storage"] = storage
    data["storage_bridge"] = storage_bridge
    with open(cfg, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False)
PY
}

ensure_config_network() {
  if [[ "${PEAQ_ROS2_PIN_NETWORK:-1}" == "0" ]]; then
    return
  fi
  if [[ -n "$NETWORK_PRIMARY" ]]; then
    set_config_network "$NETWORK_PRIMARY"
  fi
}

network_candidates() {
  local primary="$NETWORK_PRIMARY"
  local csv="$NETWORK_FALLBACKS"
  local -a out=()
  if [[ -n "$primary" ]]; then
    out+=("$primary")
  fi
  if [[ -n "$csv" ]]; then
    local IFS=','; read -r -a arr <<<"$csv"
    local item
    for item in "${arr[@]}"; do
      item="$(echo "$item" | xargs)"
      [[ -z "$item" ]] && continue
      if [[ "$item" != "$primary" ]]; then
        out+=("$item")
      fi
    done
  fi
  printf "%s\n" "${out[@]}"
}
