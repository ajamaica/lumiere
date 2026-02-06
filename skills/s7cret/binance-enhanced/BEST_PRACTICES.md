# Best Practices — Binance Skill

This document outlines recommended practices for safely using the Binance skill.

1. Secrets and Keys

- Never commit API keys or secrets to source control.
- Use a secrets manager (HashiCorp Vault, AWS Secrets Manager, GitHub Secrets) for CI/CD.
- Limit API key permissions: enable only the scopes needed (spot/futures) and keep withdraw disabled unless necessary.
- Rotate keys periodically and after suspected compromise.

2. Start in Testnet and Paper Mode

- Always validate new workflows in TESTNET and set TRADE_MODE=paper before switching to live.
- Use the .env.example to configure separate values for testnet and production.

3. Limit Risk with Profiles

- Use conservative default profile for new users. Provide balanced/aggressive profiles for power users.
- Enforce position sizing, stop-loss, and max leverage via config profiles.

4. Confirmations and Human-in-the-Loop

- Require explicit confirmation for high-impact actions (large orders, leverage changes, withdrawals).
- Expose an audit trail of commands and confirmations.

5. Rate Limits and Efficient Polling

- Respect Binance rate limits; implement caching for non-critical endpoints (e.g., exchangeInfo) and use websockets for real-time data.
- Batch requests when possible and back off exponentially on 429 responses.

6. Time Sync and Signatures

- Ensure system clocks are synced with NTP. Use RECV_WINDOW as a safety buffer, but prefer correct time.

7. Logging and Observability

- Log API requests and responses (sanitize secrets) and capture metrics: request latency, error rates, used weights.
- Configure alerts for critical events (margin call, large PnL swings, repeated API errors).

8. Testing and CI

- Add integration tests that run against TESTNET, and unit tests that mock Binance responses.
- Use CI secrets for testnet keys; avoid exposing production secrets to CI.

9. User Education

- Warn users about leverage, liquidation risks, and slippage.
- Provide accessible documentation (SKILL.md) and quick FAQ.

10. Incident Response

- On suspected compromises, immediately rotate API keys, disable trading, and contact Binance support.
- Keep a runbook for emergency steps and ensure maintainers have necessary access.
