---
name: flaw0
description: Security and vulnerability scanner for OpenClaw code, plugins, skills, and Node.js dependencies. Powered by OpenClaw AI models.
version: 1.0.0
author: Tom
homepage: https://github.com/yourusername/flaw0
license: MIT
metadata:
  openclaw:
    emoji: "🔍"
    category: "security"
tags:
  - security
  - vulnerability-scanner
  - code-analysis
  - dependency-checker
  - openclaw
---

# flaw0 - Zero Flaws Security Scanner

Security and vulnerability scanner for OpenClaw ecosystems. Analyzes source code, plugins, skills, and Node.js dependencies to detect potential security flaws.

**Goal: Achieve flaw 0** (zero flaws detected) 🎯

## Installation

Install this skill via [ClawHub](https://www.clawhub.ai):

```bash
npx clawhub@latest install flaw0
```

Or install globally via npm:

```bash
npm install -g flaw0
```

## When to Use This Skill

Use **flaw0** to ensure your OpenClaw code and dependencies are secure:

### Before Installing Skills

```bash
# Check a skill before installing
flaw0 scan ~/.openclaw/skills/new-skill
```

### During Development

```bash
# Scan your code as you develop
flaw0 scan src/

# Check dependencies
flaw0 deps
```

### Before Committing

```bash
# Full security audit
flaw0 audit
```

### Auditing OpenClaw Installation

```bash
# Scan all OpenClaw components
flaw0 scan --target all

# Check specific components
flaw0 scan --target skills
flaw0 scan --target plugins
flaw0 scan --target core
```

## Usage

### Basic Commands

#### Scan Code

```bash
# Scan current directory
flaw0 scan

# Scan specific directory
flaw0 scan /path/to/code

# Use specific AI model
flaw0 scan --model claude-opus-4-6
```

#### Check Dependencies

```bash
# Quick dependency scan
flaw0 deps

# Deep scan (entire dependency tree)
flaw0 deps --deep
```

#### Full Security Audit

```bash
# Comprehensive scan (code + dependencies)
flaw0 audit

# Save report to file
flaw0 audit --output report.json

# JSON output for CI/CD
flaw0 audit --json
```

#### Scan OpenClaw Components

```bash
# Scan OpenClaw core
flaw0 scan --target core

# Scan all plugins
flaw0 scan --target plugins

# Scan all skills
flaw0 scan --target skills

# Scan everything
flaw0 scan --target all
```

## What flaw0 Detects

### Code Vulnerabilities (12+ Types)

1. **Command Injection**
   - `exec()` with unsanitized input
   - Shell command construction with user input

2. **Code Injection**
   - `eval()` usage
   - `Function()` constructor with strings

3. **SQL Injection**
   - String concatenation in SQL queries
   - Unparameterized queries

4. **Cross-Site Scripting (XSS)**
   - `innerHTML` assignments
   - `dangerouslySetInnerHTML` usage

5. **Path Traversal**
   - Unvalidated file path operations
   - `readFile()` with user input

6. **Hardcoded Secrets**
   - API keys in source code
   - Passwords and tokens
   - AWS credentials

7. **Weak Cryptography**
   - MD5 and SHA1 usage
   - Weak hashing algorithms

8. **Insecure Randomness**
   - `Math.random()` for security operations
   - Predictable token generation

9. **Unsafe Deserialization**
   - `JSON.parse()` without validation
   - Unvalidated input parsing

10. **Missing Authentication**
    - API endpoints without auth middleware
    - Unprotected routes

### Dependency Issues

1. **Known CVEs** - Vulnerabilities from CVE database
2. **Outdated Packages** - Packages with security updates available
3. **Malicious Packages** - Known malware or suspicious packages
4. **Duplicate Dependencies** - Bloated dependency trees

## Understanding Results

### Flaw Score

Results are reported with a **flaw score** - lower is better:

- **flaw 0** 🎯 - Perfect! No issues detected
- **flaw 1-3** 🟡 - Minor issues
- **flaw 4-10** 🟠 - Needs attention
- **flaw 10+** 🔴 - Critical issues

### Score Calculation

Each issue is weighted by severity:
- **Critical**: 3 points
- **High**: 2 points
- **Medium**: 1 point
- **Low**: 0.5 points

**Total flaw score** = sum of all weighted issues (rounded)

### Example Output

#### Clean Code (flaw 0)

```
🔍 flaw0 Security Scan Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Result: flaw 0
✅ Status: SECURE

✓ No security issues detected!
✓ All checks passed

Great job! 🎉
```

#### Issues Found (flaw 12)

```
🔍 flaw0 Security Scan Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Result: flaw 12
⚠️  Status: ISSUES FOUND

Code Flaws: 5
├─ 🔴 Critical: 2
├─ 🟠 High: 1
├─ 🟡 Medium: 2
└─ ⚪ Low: 0

Dependency Flaws: 7
├─ 🔴 Critical CVEs: 3
├─ 🟠 High CVEs: 2
├─ 🟡 Medium: 2
└─ ⚪ Low: 0

Detailed Report:
─────────────────────────────────

1. [CRITICAL] Command Injection
   Location: src/executor.js:78
   Code: `exec(\`ls ${userInput}\`)`
   Description: Unsanitized exec() call
   → Fix: Use execFile() or validate input
   🤖 AI Confidence: high
   💡 AI Suggestion: Replace exec() with execFile()
      and validate input against whitelist

2. [HIGH] Hardcoded API Key
   Location: config/api.js:5
   Code: `const API_KEY = "sk-1234..."`
   Description: API key exposed in source code
   → Fix: Use process.env.API_KEY

3. [CRITICAL] CVE-2024-12345 in lodash@4.17.19
   Package: lodash@4.17.19
   Description: Prototype pollution vulnerability
   → Fix: npm install lodash@4.17.21

...
```

## AI-Powered Analysis

flaw0 uses OpenClaw's AI models for intelligent code review:

### Available Models

#### claude-sonnet-4-5 (default)
- Balanced speed and accuracy
- Best for most use cases
- Good false positive reduction

```bash
flaw0 scan --model claude-sonnet-4-5
```

#### claude-opus-4-6
- Most thorough analysis
- Deepest context understanding
- Slower but most accurate

```bash
flaw0 scan --model claude-opus-4-6
```

#### claude-haiku-4-5
- Fastest scanning
- Good for quick checks
- Use in CI/CD for speed

```bash
flaw0 scan --model claude-haiku-4-5
```

### AI Features

- **Context-aware analysis** - Understands code flow and context
- **False positive reduction** - Filters out non-issues
- **Confidence scoring** - Rates detection confidence
- **Fix suggestions** - Provides specific remediation steps

## Configuration

### Create Config File

```bash
flaw0 init
```

This creates `.flaw0rc.json`:

```json
{
  "severity": {
    "failOn": "high",
    "ignore": ["low"]
  },
  "targets": {
    "code": true,
    "dependencies": true,
    "devDependencies": false
  },
  "exclude": [
    "node_modules/**",
    "test/**",
    "*.test.js"
  ],
  "model": "claude-sonnet-4-5",
  "maxFlawScore": 0
}
```

### Configuration Options

- **severity.failOn** - Exit with error on this severity level or higher
- **severity.ignore** - Skip these severity levels
- **targets** - What to scan (code, dependencies)
- **exclude** - File patterns to ignore
- **model** - AI model to use
- **maxFlawScore** - Maximum acceptable flaw score

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  flaw0:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install flaw0
        run: npm install -g flaw0

      - name: Run security scan
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: flaw0 audit

      - name: Check flaw score
        run: |
          SCORE=$(flaw0 audit --json | jq '.flawScore')
          if [ "$SCORE" -gt 0 ]; then
            echo "❌ Flaws detected: flaw $SCORE"
            exit 1
          fi
          echo "✅ No flaws: flaw 0"
```

### Pre-commit Hook

```bash
#!/bin/bash
echo "🔍 Running flaw0 scan..."
flaw0 scan

if [ $? -ne 0 ]; then
  echo "❌ Flaws detected! Commit blocked."
  exit 1
fi
```

## Examples

### Scan Before Installing a Skill

```bash
# Download a skill to review
git clone https://github.com/user/some-skill.git /tmp/some-skill

# Scan it
flaw0 scan /tmp/some-skill

# If flaw 0, safe to install
# If flaw > 0, review issues first
```

### Audit Your OpenClaw Skills

```bash
# Scan all installed skills
flaw0 scan --target skills

# Example output:
# ✓ clawdex - flaw 0
# ✓ database-helper - flaw 0
# ⚠ crypto-bot - flaw 3
# ✓ git-assistant - flaw 0
# Overall: flaw 3
```

### Check Dependencies After Install

```bash
# After installing new packages
npm install some-package

# Check for vulnerabilities
flaw0 deps
```

### Full Project Audit

```bash
# Comprehensive security check
flaw0 audit --output security-report.json

# Review the report
cat security-report.json | jq '.flawScore'
```

## API Usage

Use flaw0 programmatically in your own tools:

```javascript
const Flaw0 = require('flaw0');

const scanner = new Flaw0({
  target: './src',
  model: 'claude-sonnet-4-5'
});

// Run full scan
const results = await scanner.scan();

console.log(`Flaw Score: ${results.flawScore}`);

if (results.flawScore === 0) {
  console.log('✅ No flaws detected!');
} else {
  results.codeFlaws.forEach(flaw => {
    console.log(`[${flaw.severity}] ${flaw.name}`);
    console.log(`  Location: ${flaw.file}:${flaw.line}`);
    console.log(`  Fix: ${flaw.fix}`);
  });
}
```

## How It Works

1. **Pattern Matching** - Fast regex-based detection of common vulnerabilities
2. **AI Analysis** - Claude AI reviews each issue in context
3. **False Positive Filtering** - AI identifies and removes non-issues
4. **Dependency Checking** - Integrates with npm audit and CVE databases
5. **Scoring** - Calculates weighted flaw score
6. **Reporting** - Generates detailed, actionable reports

## Tips for Achieving flaw 0

1. **Fix Critical issues first** - Biggest security impact
2. **Update dependencies** - Resolve known CVEs quickly
3. **Use parameterized queries** - Prevent SQL injection
4. **Validate all inputs** - Stop injection attacks
5. **Use environment variables** - No hardcoded secrets
6. **Apply security headers** - Use helmet.js
7. **Implement authentication** - Protect all endpoints
8. **Use strong crypto** - SHA-256 or better
9. **Sanitize output** - Prevent XSS
10. **Review AI suggestions** - Learn from recommendations

## Comparison with Other Tools

| Feature | flaw0 | npm audit | Snyk | ESLint Security |
|---------|-------|-----------|------|-----------------|
| Dependency CVEs | ✅ | ✅ | ✅ | ❌ |
| AI Code Analysis | ✅ | ❌ | ❌ | ❌ |
| OpenClaw-specific | ✅ | ❌ | ❌ | ❌ |
| Context-aware | ✅ | ❌ | ⚠️ | ⚠️ |
| False positive reduction | ✅ | ❌ | ⚠️ | ❌ |
| Fix suggestions | ✅ | ⚠️ | ✅ | ⚠️ |

## Requirements

- **Node.js**: 14+
- **API Key**: Anthropic API key for AI analysis
- **npm**: For dependency checking

### Setup API Key

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

Get your API key from: https://console.anthropic.com/

## Troubleshooting

### "No API key found"

```bash
export ANTHROPIC_API_KEY='sk-...'
# Or add to ~/.bashrc or ~/.zshrc
```

### "npm audit failed"

Ensure you have a valid package.json:

```bash
npm init -y
npm install
```

### Rate Limit Exceeded

If you hit API rate limits:
1. Use haiku model: `--model haiku`
2. Scan smaller portions
3. Wait and retry

## Support

- **Documentation**: See USAGE.md for detailed guide
- **Examples**: Check examples/ directory
- **Issues**: Report at GitHub repository
- **Demo**: Run `./demo.sh` for interactive demo

## About

**flaw0** helps the OpenClaw community achieve secure, vulnerability-free code.

- Built with OpenClaw/Claude AI
- Uses industry-standard security patterns
- Continuously updated with new vulnerabilities
- Open source under MIT license

## Contributing

Contributions welcome! Areas for contribution:
- New vulnerability patterns
- Additional AI models
- Python/Go support
- Web dashboard
- Custom rule engine

## License

MIT License - see LICENSE file

---

**Goal: flaw 0 for everyone! 🎯**

**Remember**: Security is not a one-time check. Run flaw0 regularly to maintain **flaw 0** status!
