---
name: security-scanner
description: Comprehensive vulnerability and malware scanner for skills and code. Detects code execution vulnerabilities (eval, exec, dynamic require), credential theft patterns, network calls to suspicious domains, obfuscation, and more. Provides risk assessment (SAFE/CAUTION/DANGEROUS) with detailed findings and actionable recommendations. Use before installing untrusted skills or when reviewing code for security issues.
---

# Security Scanner Skill

Comprehensive static analysis tool for detecting vulnerabilities, malware patterns, and security issues in code and skills.

## Overview

Security Scanner performs deep static analysis on:

- **Code files** (.js, .ts, .jsx, .tsx, .py, .go, .java, .rb, .php, .sh)
- **Skill directories** (recursively scans all code)
- **Inline code snippets**

It flags dangerous patterns, suspicious behaviors, and obfuscation, then provides actionable recommendations.

## Quick Start

```bash
# Scan a skill directory
security-scanner ./my-skill/

# Scan a single file
security-scanner ./package.js

# Scan code snippet
security-scanner --code "eval(userInput)"

# Get JSON output
security-scanner ./skill --output json

# See suggested fixes
security-scanner ./skill --fix
```

## Risk Levels & Recommendations

### 🔴 DANGEROUS → REJECT

**Verdict:** Do not install this code.

Detected patterns:

- `eval()` - Arbitrary code execution
- `exec()` - Command execution
- Dynamic `require()` with variable paths
- Evidence of code injection vulnerabilities

**Action:** Request source code review from maintainer or reject entirely.

### 🟡 CAUTION → QUARANTINE

**Verdict:** Review before installation.

Detected patterns:

- `child_process` calls (spawning external commands)
- Environment variable access (potential secret theft)
- Network calls to unknown domains
- Obfuscated/minified code
- Low-level socket access (net, dgram)
- Encoded strings (hex/Unicode escapes)

**Action:** Examine findings, ask maintainer about suspicious patterns, install with caution.

### 🟢 SAFE → INSTALL

**Verdict:** No obvious malicious patterns detected.

**Action:** Safe to install. Standard security practices still recommended (keep updated, monitor permissions).

## What It Detects

### Code Execution (Highest Risk)

- ✗ `eval()`
- ✗ `exec()`
- ✗ Dynamic `require()` with variable paths
- ⚠ `child_process` module imports

### Credential Theft

- ✗ `process.env.SECRET`, `process.env.API_KEY`, etc.
- ⚠ Dynamic environment variable access `process.env[varName]`
- ⚠ `fs.readFileSync()` on sensitive system files (`/etc/`, `~/`)

### Network/Data Exfiltration

- ⚠ Network calls to unknown external domains (via `fetch`, `http.get`, etc.)
- ⚠ HTTP/HTTPS module imports (potential network calls)
- ⚠ Low-level socket access (`net`, `dgram`)

### Obfuscation (Red Flag)

- ⚠ Minified code (unusually high symbol density, very short lines)
- ⚠ Hex-encoded strings (`\x41\x42\x43`)
- ⚠ Unicode-encoded strings (`\u0041\u0042`)

**Why it matters:** Obfuscated code hides malicious logic. Legitimate libraries don't need to be obfuscated.

## Output Formats

### Text (Human-Readable, Default)

```
=== Security Scanner Report ===

Target: ./my-skill
Files Scanned: 5
Findings: 2

Risk Level: CAUTION

Detailed Findings:

  scripts/handler.js
    Line 42: [CAUTION] child_process allows spawning external commands
      Code: require('child_process')
      Context: const spawn = require('child_process').spawn;

  src/api.js
    Line 18: [CAUTION] Network call to external domain
      Code: fetch('https://api.example.com/verify')
      Context: return fetch('https://api.example.com/verify', {...})

Recommendation:
  Action: QUARANTINE
  Reason: Code contains potentially suspicious patterns requiring review
  Details: Review findings before installation. Consider asking maintainer about specific suspicious patterns.

Suggested Fixes:
  • Replace dynamic require with static import
    File: scripts/handler.js:42
    Suggestion: Use static imports or a whitelist of allowed modules
    Difficulty: MEDIUM
```

### JSON (Programmatic)

```bash
scanner --output json
```

Returns structured JSON with:

- `target`: Path/name scanned
- `timestamp`: ISO timestamp
- `riskLevel`: SAFE | CAUTION | DANGEROUS
- `findings[]`: Array of detected issues with line numbers
- `scannedFiles[]`: List of files analyzed
- `recommendation`: Action and reasoning
- `fixes[]`: (if `--fix` used) Suggested code changes

## Using It in Your Workflow

### Pre-Installation Check

```bash
# Before installing a new skill
security-scanner ~/downloads/mystery-skill/

# If DANGEROUS → Don't install
# If CAUTION → Review output, ask author
# If SAFE → Good to go
```

### Code Review

```bash
# Check your own skill for issues
security-scanner ./my-skill/ --output json > security-report.json

# Fix issues
security-scanner ./my-skill/ --fix
```

### Automated CI/CD

```bash
# In your build pipeline - fail if DANGEROUS detected
security-scanner ./src/ --output json
if [ $? -eq 2 ]; then
  echo "Security violations found"
  exit 1
fi
```

### Sub-Agent Invocation

```bash
# From a sub-agent or CLI
/Users/ericwoodard/clawd/security-scanner-skill/scripts/scanner.js ~/clawd/some-skill/
```

## Common Findings & How to Interpret

### eval() / exec()

**Finding:** "eval() allows arbitrary code execution"

**Interpretation:** Code can run any arbitrary JavaScript at runtime. Extremely dangerous.

**Response:**

- ❌ If malicious: REJECT
- ⚠️ If legitimate: Ask author why eval is needed (usually there's a safer way)

### child_process Import

**Finding:** "child_process allows spawning external commands"

**Interpretation:** Code can run system commands. Used legitimately by build tools, but also by malware.

**Response:**

- Check where it's used
- Does it run user input? → DANGEROUS
- Does it run hardcoded commands? → Probably safe, but review

### process.env.API_KEY

**Finding:** "Accessing sensitive environment variables"

**Interpretation:** Code reads secret keys from environment. This is standard, but verify:

- Is it documented?
- Is the key actually used for intended purpose?
- Could it be exfiltrated?

**Response:**

- Normal for legitimate skills that need API keys
- Check if the API call goes to the expected domain

### Minified Code

**Finding:** "Code appears to be minified or obfuscated"

**Interpretation:** Source code is intentionally hidden. Why?

**Response:**

- ❌ Single-file skill that's minified → Suspicious, ask for source
- ✅ Node module with both `.js` and `.min.js` → Standard practice
- ⚠️ Hex-encoded strings → Request deobfuscation

### Fetch to Unknown Domain

**Finding:** "Network call to external domain"

**Interpretation:** Code calls some external API. Is it expected?

**Response:**

- ✅ `fetch('https://api.github.com/...')` → Normal
- ❌ `fetch('https://malware-collection.ru/...')` → Dangerous
- ⚠️ `fetch(userProvidedUrl)` → Dangerous (open redirect)

## How to Use with Sub-Agents

From a sub-agent, invoke the scanner:

```bash
# Run scan
/Users/ericwoodard/clawd/security-scanner-skill/scripts/scanner.js <skill-path>

# Check exit code
if [ $? -eq 2 ]; then
  # DANGEROUS - handle rejection
elif [ $? -eq 1 ]; then
  # CAUTION - handle quarantine
else
  # SAFE
fi

# Or parse JSON output
result=$(/Users/ericwoodard/clawd/security-scanner-skill/scripts/scanner.js <path> --output json)
riskLevel=$(echo "$result" | jq -r '.riskLevel')
```

## Limitations

⚠️ **Static analysis only** - Does not execute code, so:

- Runtime tricks might not be detected
- Obfuscated strings that are decoded at runtime won't be flagged
- Complex control flow analysis not performed

**Still safe:** Unless the scanner says DANGEROUS, you should be fine. CAUTION requires manual review but many are false positives.

## Commands

### `security-scanner <path>`

Scan a file or directory.

```bash
security-scanner ./my-skill/
security-scanner ./code.js
```

### `security-scanner --code "<snippet>"`

Scan inline code without creating a file.

```bash
security-scanner --code "eval(userInput)"
```

### `security-scanner <path> --output json`

Output results as JSON for programmatic parsing.

```bash
security-scanner ./skill --output json > report.json
```

### `security-scanner <path> --output text`

Output as human-readable text (default).

### `security-scanner <path> --fix`

Show suggested code fixes and mitigation strategies.

```bash
security-scanner ./skill --fix
```

### `security-scanner --help`

Show usage information.

## Exit Codes

- `0` - SAFE (no dangerous patterns)
- `1` - CAUTION (suspicious patterns found, manual review needed)
- `2` - DANGEROUS (malicious patterns detected, do not install)

## Implementation Notes

- Pattern matching via regular expressions
- Obfuscation detection via heuristics (symbol density, encoding)
- Line-accurate reporting (can pinpoint exact locations)
- Multi-language support (.js, .ts, .py, .go, .java, .rb, .php, .sh)
- Automatic filtering of non-code directories (node_modules, .git, dist, etc.)

## Future Enhancements

Potential additions:

- Semantic analysis (understand variable data flow)
- Signature-based detection (known malware patterns)
- Configuration audit (unusual permissions, suspicious settings)
- Quarantine mode (automatically remove/comment suspicious code)
- Integration with malware databases
- Supply chain attack detection (pinning specific versions, checksum verification)

---

**Last Updated:** 2025-01-29
**Status:** Production Ready
