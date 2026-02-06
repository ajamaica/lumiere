#!/usr/bin/env bash
set -euo pipefail

API_KEY="${OKX_API_KEY}"
PASSPHRASE="${OKX_PASSPHRASE}"

ts() {
  python3 - <<'PY'
from datetime import datetime, timezone
print(datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'))
PY
}

sign() {
  local TIMESTAMP="$1"
  local METHOD="$2"
  local PATH_WITH_QUERY="$3"
  python3 - <<PY
import hmac, hashlib, base64, os
msg = f"${TIMESTAMP}${METHOD}${PATH_WITH_QUERY}"
secret = os.environ["OKX_SECRET_KEY"].encode()
print(base64.b64encode(hmac.new(secret, msg.encode(), hashlib.sha256).digest()).decode())
PY
}

call() {
  local METHOD="$1"
  local PATH_WITH_QUERY="$2"
  local TIMESTAMP
  TIMESTAMP="$(ts)"
  SIGN="$(sign "$TIMESTAMP" "$METHOD" "$PATH_WITH_QUERY")"
  curl -s "https://web3.okx.com${PATH_WITH_QUERY}" \
    -H "OK-ACCESS-KEY: ${API_KEY}" \
    -H "OK-ACCESS-TIMESTAMP: ${TIMESTAMP}" \
    -H "OK-ACCESS-PASSPHRASE: ${PASSPHRASE}" \
    -H "OK-ACCESS-SIGN: ${SIGN}"
}

echo "1) Supported Chains"
call "GET" "/api/v6/dex/aggregator/supported/chain?chainIndex=1" | jq '.'

echo "2) Tokens (first 5)"
call "GET" "/api/v6/dex/aggregator/all-tokens?chainIndex=1" | jq '.data[:5]'

echo "3) Swap Quote"
call "GET" "/api/v6/dex/aggregator/quote?chainIndex=1&fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=1000000000000000000&swapMode=exactIn" | jq '{
  fromTokenAmount: .data[0].fromTokenAmount,
  toTokenAmount: .data[0].toTokenAmount,
  tradeFee: .data[0].tradeFee,
  router: .data[0].router
}'

echo "4) Swap Transaction"
call "GET" "/api/v6/dex/aggregator/swap?chainIndex=1&fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&amount=500000000000000000&swapMode=exactIn&slippagePercent=0.01&userWalletAddress=0xaa4e09ab283e207bd7171d924db2dda49315637b" | jq '{
  tx: .data[0].tx,
  router: .data[0].routerResult.router,
  priceImpactPercent: .data[0].routerResult.priceImpactPercent,
  dexRouterList: (.data[0].routerResult.dexRouterList // [])
}'

echo "5) Approval Transaction (with approve target)"
APPROVE_TO="$(call "GET" "/api/v6/dex/aggregator/supported/chain?chainIndex=1" | jq -r '.data[0].dexTokenApproveAddress')"
call "GET" "/api/v6/dex/aggregator/approve-transaction?chainIndex=1&tokenContractAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&approveAmount=1000000000" | jq --arg to "${APPROVE_TO}" '{
  data: .data[0].data,
  dexContractAddress: (.data[0].dexContractAddress // $to),
  gasLimit: .data[0].gasLimit,
  gasPrice: .data[0].gasPrice
}'
