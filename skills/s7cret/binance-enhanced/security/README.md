Security additions for the Binance skill.

Contents:

- limits.sh - hourly/daily operation limits
- logger.sh - structured transaction logging (NDJSON)
- keys_crypto.py - AES-GCM encryption/decryption helper for API keys
- security_checks.sh - safety checks to source from existing scripts
- checklist.md - security checklist and best practices

Instructions:
Source limits.sh and logger.sh from your executable scripts. Use keys_crypto.py to encrypt API keys at rest and decrypt when needed (prefer ephemeral environment variable KEYS_CRYPTO_PW or prompt).

Example usage (bash):
source shared/security/limits.sh
source shared/security/logger.sh

# 1) Check limits before placing order (amount in USD)

check_and_consume_limit 100 || exit 1

# 2) Log the order

log_txn --type order --symbol BTCUSDT --side BUY --qty 0.001 --price 40000 --status submitted --user alice

# 3) Place order via SKILL.md methods

Notes:

- Review limits.json to set appropriate daily/hourly limits.
- Encrypted key files created with keys_crypto.py should be stored with restrictive permissions (chmod 600).
- For production, integrate with a secure KMS (AWS KMS, GCP KMS, Hashicorp Vault) rather than password-based encryption.
