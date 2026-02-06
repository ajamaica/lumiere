# Troubleshooting Guide — Binance Skill

This guide helps diagnose and resolve common issues when using the Binance skill.

1. Authentication / API Key Errors

- Symptoms: 401 Unauthorized, permission denied, order rejections.
- Checks:
  - Ensure BINANCE_API_KEY and BINANCE_SECRET are set in the environment or .env and loaded by the runtime.
  - Verify key permissions (Spot/Futures/Withdraw disabled for safety unless needed).
  - Check IP whitelist on Binance dashboard. If enabled, add your client IP or disable for testing.
- Fixes:
  - Recreate API keys and update environment variables.
  - Restart processes after changing environment variables.

2. Time Sync Errors (recvWindow / -1021)

- Symptoms: timestamp outside recvWindow, signature errors.
- Checks:
  - Run `date` and compare to an NTP source.
  - Ensure container/VM time sync is enabled.
- Fixes:
  - Enable NTP (systemd-timesyncd/ntpd) or run `ntpdate -u pool.ntp.org`.
  - Increase RECV_WINDOW in .env/config as a temporary workaround.

3. Invalid Quantity / Lot Size Errors (-1013)

- Symptoms: order rejected with invalid quantity/price step errors.
- Checks:
  - Call Exchange Info endpoint to view symbol filters (stepSize, minQty, tickSize).
  - Validate rounding logic in client code.
- Fixes:
  - Round quantities/prices to valid steps before submitting.
  - Implement a helper that adjusts values to the nearest valid increment.

4. Insufficient Balance (-2010)

- Symptoms: Orders fail due to insufficient balance.
- Checks:
  - Fetch account balances and compare free vs total amounts.
  - For margin/futures ensure collateral/margin is allocated.
- Fixes:
  - Reduce order size or deposit funds.
  - Transfer assets between spot and margin/futures accounts if required.

5. Network / Connectivity Problems

- Symptoms: timeouts, websocket disconnects, intermittent failures.
- Checks:
  - Verify outbound connectivity to api.binance.com and stream endpoints.
  - Check proxy settings and firewall rules.
- Fixes:
  - Add retries with exponential backoff.
  - Use longer timeouts and robust reconnect logic for websockets.

6. Unexpected Orders / Safety Violations

- Symptoms: orders executed without confirmation or violating risk limits.
- Checks:
  - Confirm require_confirmation and execution_checks are enabled in config.
  - Audit logs for command history and triggers.
- Fixes:
  - Enable paper mode, increase logging, and require manual confirmations.
  - Disable potentially dangerous commands until root cause is found.

7. Rate Limits / 429 Responses

- Symptoms: 429 Too Many Requests, IP banned warnings.
- Checks:
  - Examine headers for X-MBX-USED-WEIGHT and limits.
  - Ensure you are using API keys responsibly; avoid polling too frequently.
- Fixes:
  - Implement rate limit handling: respect the Retry-After header, back off and queue calls.
  - Use the Binance weight system to prioritize critical endpoints.

8. Webhook / Alert Failures

- Symptoms: failed notifications to monitoring webhook.
- Checks:
  - Verify webhook URL, network access, and HTTP status codes.
- Fixes:
  - Use a reliable webhook provider, add retries, and fall back to email/slack.

9. Debugging Tips

- Enable DEBUG logging temporarily to capture request/response payloads (sanitize secrets before sharing).
- Reproduce issues in TESTNET to avoid real funds.
- Capture curl requests provided in SKILL.md and run them locally to reproduce API behaviour.

10. When to contact maintainers

- If you hit an unrecoverable API bug, unexplained asset changes, or suspect account compromise, stop trading and contact the maintainer with logs, timestamps, and non-secret config (never send your API secret).

Useful commands

- Check current time: date
- Test connectivity: curl -v https://api.binance.com
- Exchange info: curl "https://api.binance.com/api/v3/exchangeInfo" | jq '.symbols[] | select(.symbol=="BTCUSDT")'
