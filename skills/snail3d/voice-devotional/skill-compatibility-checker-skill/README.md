# Skill Compatibility Checker

> **vet skills before you install them**

A Clawdbot skill that checks whether a new skill is compatible with your system before installation. Analyzes conflicts, system requirements, dependencies, and security issues—then gives you a clear GO/CAUTION/BLOCKED verdict with actionable fix steps.

## Features

- ✅ **Conflict Detection** — Name, CLI command, and port conflicts with existing skills
- ✅ **System Checks** — OS, architecture, and Node.js version compatibility
- ✅ **Dependency Audit** — Missing CLI tools, API keys, Clawdbot versions
- ✅ **Security Scan** — Automated vulnerability scan via security-scanner-skill
- ✅ **Clear Readiness** — GO / CAUTION / BLOCKED with detailed next steps
- ✅ **Multiple Outputs** — Human-readable text and JSON for CI/CD

## Installation

```bash
cd ~/clawd/skill-compatibility-checker-skill
npm install
chmod +x scripts/checker.js
```

Make it globally available:

```bash
npm link
# or manually: alias skill-compatibility-checker="~/clawd/skill-compatibility-checker-skill/scripts/checker.js"
```

## Quick Start

```bash
# Check a skill before installing
skill-compatibility-checker ~/clawd/some-skill

# Get detailed JSON output
skill-compatibility-checker ~/clawd/some-skill --output json

# See help
skill-compatibility-checker --help
```

## Understanding the Verdict

### 🟢 GO

**Safe to install.** No blocking issues.

```bash
$ skill-compatibility-checker ~/clawd/my-skill
✅ GO - Safe to install
```

Next step: `npm install && clawdbot skill install`

### 🟡 CAUTION

**Installable with caveats.** Review and fix issues first.

```
⚠️  CAUTION - Review issues before installation

Missing CLI Tools:
❌ ffmpeg
   Install: brew install ffmpeg

Missing API Keys:
⚠️  groq - configure in TOOLS.md
```

Fix the issues (install tools, configure keys), then install.

### 🔴 BLOCKED

**Cannot install on this system.**

```
❌ BLOCKED - Do not install

Issues preventing installation:
• System requirements not met (OS/arch/Node version)
• Skill name conflict with existing installation
• Security risk detected (dangerous patterns found)
```

Either:

- Use a compatible system
- Contact skill author about Windows/Linux/x86_64 support
- Uninstall the conflicting skill

## What It Checks

### Conflicts

- Skill name already installed
- CLI command collisions (e.g., both try to add `foobar` command)
- Port usage conflicts
- Config section overlaps

### System Requirements

- **OS:** macOS, Linux, Windows
- **Architecture:** arm64, x86_64
- **Node.js:** Minimum version requirement

### Dependencies

- **CLI tools:** ffmpeg, python, java, docker, etc.
- **API keys:** Groq, ElevenLabs, OpenAI, Stripe, Twilio, etc.
- **Clawdbot version:** X.Y.Z minimum
- **npm packages:** Listed but auto-installed

### Security

- Code execution vulnerabilities (eval, exec)
- Credential theft patterns
- Suspicious network calls
- Obfuscation/minification

## Use Cases

### Manual Installation

Before installing a new skill from ClawdHub or GitHub:

```bash
git clone https://github.com/user/my-cool-skill ~/clawd/my-cool-skill
skill-compatibility-checker ~/clawd/my-cool-skill

# Review the report, fix any issues, then install
npm install && clawdbot skill install
```

### CI/CD Pipelines

Validate skills before merging:

```bash
#!/bin/bash
skill-compatibility-checker ./skill --output json > report.json
if [ $? -eq 2 ]; then
  echo "Skill blocked on reference system (arm64/macOS/Node 25)"
  exit 1
fi
# ... continue with tests, build, deploy
```

### Skill Repositories

Add to your skill's CI/CD to catch compatibility issues:

```yaml
# GitHub Actions example
- name: Check compatibility
  run: |
    npm install -g clawdbot-skill-compatibility-checker
    skill-compatibility-checker .
```

### Maintenance

Periodically check existing skills for issues:

```bash
for skill in ~/clawd/*-skill; do
  echo "Checking $(basename $skill)..."
  skill-compatibility-checker "$skill" || true
done
```

## Output Formats

### Text (Human-Readable)

Default output, designed for manual review:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    SKILL COMPATIBILITY CHECKER REPORT                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Skill: my-skill
Path:  /Users/ericwoodard/clawd/my-skill

┌─ INSTALLATION READINESS ─────────────────────────────────────────────────┐
│ ✅ GO - Safe to install
└────────────────────────────────────────────────────────────────────────────┘

┌─ SYSTEM REQUIREMENTS ────────────────────────────────────────────────────┐
│ Your System: darwin / arm64 / Node 25.4.0
│ ✅ System requirements met
└────────────────────────────────────────────────────────────────────────────┘

┌─ RECOMMENDATION ─────────────────────────────────────────────────────────┐
│ ✅ Ready to install. No blocking issues detected.
└────────────────────────────────────────────────────────────────────────────┘
```

### JSON

Machine-readable, for programmatic use:

```bash
skill-compatibility-checker ~/clawd/my-skill --output json
```

```json
{
  "skill": {
    "name": "my-skill",
    "path": "/Users/ericwoodard/clawd/my-skill"
  },
  "readiness": "GO",
  "timestamp": "2026-01-29T15:30:00.000Z",
  "system": {
    "platform": "darwin",
    "arch": "arm64",
    "nodeVersion": "25.4.0"
  },
  "conflicts": { "conflicts": [], "warnings": [] },
  "systemRequirements": { "issues": [], "warnings": [] },
  "dependencies": {
    "missingCLITools": [],
    "missingApiKeys": [],
    "clawdbotVersionRequired": null
  },
  "security": {
    "riskLevel": "SAFE",
    "findings": []
  },
  "recommendation": "Ready to install. No blocking issues detected."
}
```

## Exit Codes

- **0** — GO: Ready to install
- **1** — CAUTION: Fix issues before installing
- **2** — BLOCKED: Cannot install on this system

Use in shell scripts:

```bash
skill-compatibility-checker ~/clawd/my-skill
case $? in
  0) echo "Installing..."; npm install && clawdbot skill install ;;
  1) echo "Fix issues first"; exit 1 ;;
  2) echo "Incompatible system"; exit 2 ;;
esac
```

## Configuration

### API Keys

The checker looks in two places for API keys:

1. **TOOLS.md** (`~/clawd/TOOLS.md`):

   ```markdown
   ## API Keys & Services

   - **Groq API:** `gsk_...`
   - **ElevenLabs API:** Configured
   ```

2. **Environment Variables**:
   ```bash
   export GROQ_API_KEY="gsk_..."
   export ELEVENLABS_API_KEY="sk_..."
   ```

If a skill needs `groq` and you have `GROQ_API_KEY` or mention it in TOOLS.md, it passes. Otherwise, it's flagged as missing.

## Programmatic Usage

Use the checker in your own Node.js code:

```javascript
const {
  checkConflicts,
  checkSystemRequirements,
  checkDependencies,
  runSecurityScan,
  determineReadiness,
  formatJsonReport,
} = require('./scripts/checker.js')

// Check system requirements
const sysReqs = checkSystemRequirements('./my-skill')
if (sysReqs.issues.length > 0) {
  console.error('Incompatible:', sysReqs.issues)
  process.exit(2)
}

// Check all aspects
const results = {
  conflicts: checkConflicts('./my-skill', []),
  sysReqs,
  deps: checkDependencies('./my-skill'),
  security: runSecurityScan('./my-skill'),
}

const readiness = determineReadiness(results)
console.log(readiness) // 'GO' | 'CAUTION' | 'BLOCKED'
```

## Limitations & Future Work

### Current Limitations

- ClawdHub lookups not implemented yet (use local paths)
- Port conflict detection is informational (doesn't actually test ports)
- CLI tool detection based on common names (ffmpeg, python, java, etc.)
- API key detection is pattern-based

### Planned Features

- ClawdHub integration (`skill-compatibility-checker clawdhub:skill-name`)
- Actual port binding tests
- Custom required tool detection
- Caching of scan results
- Skill update notifications

## Troubleshooting

### "skill path not found"

```bash
skill-compatibility-checker ~/clawd/my-skill
# Error: Skill path not found: ~/clawd/my-skill
```

Fix: Use absolute paths or ensure directory exists:

```bash
skill-compatibility-checker /Users/ericwoodard/clawd/my-skill
```

### "security-scanner-skill not installed"

```
UNKNOWN - security-scanner-skill not installed. Cannot perform security scan.
```

The checker continues without security scanning. Install optional dependency:

```bash
cd ~/clawd/security-scanner-skill && npm install
```

### "BLOCKED: Requires Node.js 18.0.0, but you have 16.0.0"

You need to upgrade Node.js:

```bash
brew upgrade node
# or use nvm
nvm install 18 && nvm use 18
```

### "Missing API Keys: groq"

Configure the API key in TOOLS.md:

```markdown
## API Keys & Services

- **Groq API:** `gsk_...`
```

Or set environment variable:

```bash
export GROQ_API_KEY="gsk_..."
```

## Related Skills

- **security-scanner-skill** — Deep vulnerability scanning (eval, exec, etc.)
- **skill-creator-skill** — Generate new skills from scratch
- **trending-skills-monitor-skill** — Track new skills on ClawdHub

## Contributing

Found a bug or want to add a feature?

1. Fork the skill
2. Create a branch: `git checkout -b feature/your-idea`
3. Make changes and test: `./test.sh`
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature/your-idea`
6. Open a pull request

## License

MIT — Use freely, modify, share.

---

**Happy skill hunting!** 🚀

Got a cool skill you want to install? Run it through the compatibility checker first!
