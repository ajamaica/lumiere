#!/usr/bin/env bash
# Simple connectivity check to Binance Testnet API
# Usage: ./testnet.sh [BASE_URL]
# Defaults to https://testnet.binance.vision

set -euo pipefail

BASE_URL="${1:-https://testnet.binance.vision}"
CURL_BIN="$(command -v curl || true)"
JQ_BIN="$(command -v jq || true)"

if [[ -z "$CURL_BIN" ]]; then
  echo "curl is required but not found in PATH" >&2
  exit 2
fi

echo "Checking Binance Testnet connectivity at $BASE_URL"

# Ping endpoint should return an empty JSON object: {}
PING_RESP="$(${CURL_BIN} -sSf "${BASE_URL}/api/v3/ping" || true)"
if [[ -z "$PING_RESP" ]]; then
  echo "ERROR: /api/v3/ping returned empty response" >&2
  exit 3
fi

# A valid ping response is usually an empty JSON object ({}), but accept any JSON
if [[ "$PING_RESP" != "{}" && "$PING_RESP" != "[]" ]]; then
  # try parsing as JSON if jq exists
  if [[ -n "$JQ_BIN" ]]; then
    echo "$PING_RESP" | ${JQ_BIN} . >/dev/null 2>&1 || { echo "ERROR: /api/v3/ping returned invalid JSON" >&2; exit 4; }
  fi
fi

echo "/api/v3/ping OK"

# Check server time endpoint for serverTime field
TIME_RESP="$(${CURL_BIN} -sSf "${BASE_URL}/api/v3/time" || true)"
if [[ -z "$TIME_RESP" ]]; then
  echo "ERROR: /api/v3/time returned empty response" >&2
  exit 5
fi

if [[ -n "$JQ_BIN" ]]; then
  if ! echo "$TIME_RESP" | ${JQ_BIN} -e '.serverTime' >/dev/null; then
    echo "ERROR: /api/v3/time missing serverTime field or invalid JSON" >&2
    echo "Response: $TIME_RESP" >&2
    exit 6
  fi
fi

echo "/api/v3/time OK -> $TIME_RESP"

echo "Binance Testnet connectivity checks passed"
exit 0
