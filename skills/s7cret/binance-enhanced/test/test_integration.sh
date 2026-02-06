#!/usr/bin/env bash
# Basic integration tests using local mock files and optional testnet endpoint
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOCK_DIR="$ROOT_DIR/shared/test/mocks"
TESTNET_URL="${BINANCE_TESTNET_URL:-https://testnet.binance.vision}"

CURL_BIN="$(command -v curl || true)"
JQ_BIN="$(command -v jq || true)"

if [[ -z "$CURL_BIN" ]]; then
  echo "curl is required but missing" >&2
  exit 2
fi

echo "Running integration tests"

# 1) Validate mock files exist
for f in ping.json time.json ticker_price_BTCUSDT.json account.json; do
  if [[ ! -f "$MOCK_DIR/$f" ]]; then
    echo "MISSING MOCK: $MOCK_DIR/$f" >&2
    exit 3
  fi
done

echo "Mocks present: OK"

# 2) Test local mock parsing
echo "Testing mock parsing..."
if [[ -n "$JQ_BIN" ]]; then
  cat "$MOCK_DIR/ping.json" | ${JQ_BIN} . >/dev/null
  cat "$MOCK_DIR/time.json" | ${JQ_BIN} '.serverTime' >/dev/null
  cat "$MOCK_DIR/ticker_price_BTCUSDT.json" | ${JQ_BIN} '.price' >/dev/null
  cat "$MOCK_DIR/account.json" | ${JQ_BIN} '.balances[] | {asset: .asset, free: .free}' >/dev/null
  echo "Mock parsing: OK"
else
  echo "jq not found: skipping JSON parsing assertions"
fi

# 3) Optional: check real testnet endpoints if reachable
if curl -sSf --max-time 5 "$TESTNET_URL" >/dev/null 2>&1; then
  echo "Testnet reachable: performing ping and time checks against $TESTNET_URL"
  PING="${CURL_BIN} -sSf $TESTNET_URL/api/v3/ping"
  TIME="${CURL_BIN} -sSf $TESTNET_URL/api/v3/time"
  echo "Ping: $($PING)"
  echo "Time: $($TIME)"
else
  echo "Testnet not reachable (network blocked or offline): skipped real API checks"
fi

echo "All integration checks passed"
