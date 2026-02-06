#!/usr/bin/env bash
set -euo pipefail
: "${SWITCHBOT_TOKEN:?Need SWITCHBOT_TOKEN}"
: "${SWITCHBOT_SECRET:?Need SWITCHBOT_SECRET}"
DEVICE_ID=${1:?Usage: send_command.sh <deviceId> <command> [parameter]}
COMMAND=${2:?Usage: send_command.sh <deviceId> <command> [parameter]}
PARAMETER=${3:-default}
BASE="https://api.switch-bot.com"
T=$(date +%s%3N)
NONCE=$(uuidgen)
SIGN=$(printf "%s%s%s" "$SWITCHBOT_TOKEN" "$T" "$NONCE" | openssl dgst -sha256 -hmac "$SWITCHBOT_SECRET" -binary | openssl base64)
curl -sS -X POST -H "Authorization: $SWITCHBOT_TOKEN" -H "sign: $SIGN" -H "t: $T" -H "nonce: $NONCE" -H "Content-Type: application/json" -d "{\"command\":\"$COMMAND\",\"parameter\":\"$PARAMETER\",\"commandType\":\"command\"}" "$BASE/v1.1/devices/$DEVICE_ID/commands" | jq .