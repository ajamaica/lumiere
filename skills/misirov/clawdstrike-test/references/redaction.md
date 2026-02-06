# Redaction Rules

Follow these rules exactly.

## Tokens and secrets

1. Format: `****` plus last 4 characters if available.
2. Example: `sk_test_1234567890` -> `****7890`.

## Paths and usernames

1. If sharing reports publicly, replace usernames with `<user>`.
2. Example: `/home/alice/.openclaw` -> `/home/<user>/.openclaw`.

## Do not print

1. Full file contents of config, credentials, sessions, or skill files.
2. Pairing codes, OAuth headers, cookies, session tokens.

## Helper

Use `scripts/redact_helpers.sh` for consistent masking and JSON escaping.
