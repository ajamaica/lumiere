Security Checklist & Best Practices for Binance Skill

1. Secrets and Key Management

- Never commit BINANCE_API_KEY or BINANCE_SECRET to git
- Store keys encrypted using keys_crypto.py or use KMS/OS key store
- Restrict file permissions: chmod 600 on secrets files
- Rotate API keys every 90 days or after suspected compromise
- Use API key IP whitelisting and minimal permissions (e.g., disable withdrawals)

2. Operational Limits & Controls

- Configure daily/hourly limits in shared/security/data/limits.json
- Use limits.sh check_and_consume_limit before any trade or conversion
- Use AUTO_CONFIRM only for fully automated tested strategies; require manual confirmation otherwise

3. Logging & Monitoring

- Enable NDJSON transaction logging with logger.sh (shared/security/logs/transactions.log)
- Ship logs to a secure external monitoring/logging service (e.g., Datadog, ELK, CloudWatch)
- Alert on suspicious patterns: many small orders, repeated failures, rate limit errors

4. Runtime Safety

- Validate environment variables at startup using security_checks.sh
- Check system clock sync before signed requests
- Enforce recvWindow and small timeouts on critical API calls

5. Development & CI

- Use TESTNET by default in CI and for development
- Run unit tests for limits and logging
- Do not enable production keys in CI

6. Incident Response

- Maintain a key rotation playbook
- Keep contact list for owners and a runbook for pausing trading
- Ensure backups of config and logs (encrypted at rest)

7. Code Hygiene

- Limit use of eval or uncontrolled shell expansion
- Escape user inputs used in API queries
- Sanitize logs to avoid leaking secrets (mask secret values)

Quick actions to secure deployment:

- Encrypt keys and set KEYS_CRYPTO_PW as environment variable at runtime
- Set restrictive file permissions for shared/security
- Configure automated log shipping and alerts

References:

- Binance API security docs
- OWASP Secure Coding Practices
