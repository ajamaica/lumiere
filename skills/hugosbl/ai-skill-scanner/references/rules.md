# Security Rules Reference

## Rule Categories

### Credential Exfiltration (CRED\_\*) <!-- noscan -->

Detects patterns where credentials, API keys, or tokens are being sent to external services.

- `CRED_EXFIL_FETCH` — HTTP client sending credential-like data
- `CRED_EXFIL_CURL` — curl/wget with credential data
- `CRED_READ_ENV` — Reading non-standard environment variables

### Network Calls (NET\_\*)

Detects suspicious outbound network activity.

- `NET_HARDCODED_IP` — Hardcoded IP (not domain) in HTTP call
- `NET_EXTERNAL_URL` — HTTP to non-whitelisted domain
- `NET_WEBHOOK` — Data sent to webhook services <!-- noscan -->
- `NET_DNS_EXFIL` — DNS-based data exfiltration <!-- noscan -->

### Code Obfuscation (OBFUSC\_\*)

Detects techniques used to hide malicious code.

- `OBFUSC_BASE64_DECODE` — Base64 decoding
- `OBFUSC_EVAL` — Dynamic code execution (eval/exec/Function)
- `OBFUSC_HEX_STRING` — Long hex-encoded strings
- `OBFUSC_CHAR_CODES` — Character code string construction

### File System (FS\_\*)

Detects access to sensitive files or system locations.

- `FS_READ_SENSITIVE` — Reading SSH keys, credentials, configs
- `FS_READ_BROWSER` — Accessing browser data (cookies, passwords)
- `FS_WRITE_STARTUP` — Writing to autorun/startup locations

### Process Execution (EXEC\_\*)

Detects dangerous process/shell patterns.

- `EXEC_SHELL` — Shell command execution
- `EXEC_REVERSE_SHELL` — Reverse shell patterns <!-- noscan -->

### Data Collection (DATA\_\*)

Detects surveillance/monitoring patterns.

- `DATA_KEYLOG` — Keyboard monitoring <!-- noscan -->
- `DATA_SCREENSHOT` — Screen capture <!-- noscan -->
- `DATA_CLIPBOARD` — Clipboard access <!-- noscan -->

### Crypto (CRYPTO\_\*)

Detects cryptocurrency-related threats.

- `CRYPTO_WALLET` — Wallet key extraction <!-- noscan -->
- `CRYPTO_MINING` — Mining software <!-- noscan -->

### Prompt Injection (PROMPT\_\*)

Detects attempts to manipulate agent behavior.

- `PROMPT_INJECT` — Classic prompt injection
- `PROMPT_OVERRIDE` — Behavior override attempts

### Suspicious Patterns (SUS\_\*)

General suspicious indicators.

- `SUS_MINIFIED` — Minified/unreadable code
- `SUS_ENCODED_URL` — URL construction from parts
- `SUS_TELEMETRY` — Tracking/analytics <!-- noscan -->

## Severity Levels

| Level    | Meaning                    | Action                 |
| -------- | -------------------------- | ---------------------- |
| CRITICAL | Almost certainly malicious | Do NOT install         |
| HIGH     | Very suspicious            | Manual review required |
| MEDIUM   | Needs investigation        | Check context          |
| LOW      | Informational              | Probably fine          |
| INFO     | Note                       | No action needed       |

## Whitelisted Domains

Network calls to these domains are not flagged:

- api.github.com, api.openai.com, api.anthropic.com
- api.google.com, registry.npmjs.org, pypi.org
- clawhub.com, clawd.bot
- localhost, 127.0.0.1, 0.0.0.0
