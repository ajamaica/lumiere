---
name: skill-compatibility-checker
description: Pre-installation skill vetter that checks for conflicts, system requirement mismatches, missing dependencies, and security issues before you install a skill. Analyzes skill manifests, scans for name/CLI/port conflicts with existing skills, verifies OS/architecture/Node version compatibility, checks for missing CLI tools and API keys, and runs automated security scanning. Returns GO/CAUTION/BLOCKED with detailed remediation steps.
---

# Skill Compatibility Checker

Vet skills before installation. Analyzes compatibility, conflicts, dependencies, and security risks.

## Quick Start

```bash
# Check a local skill directory
skill-compatibility-checker ~/clawd/some-skill

# Get JSON output for programmatic use
skill-compatibility-checker ~/clawd/some-skill --output json
```

## What It Checks

### 1. Conflict Detection

- **Name conflicts** - Is a skill with this name already installed?
- **CLI command conflicts** - Does it try to install a command that already exists?
- **Port conflicts** - Does it use ports that are already in use?
- **Config conflicts** - Does it modify the same config sections as existing skills?

### 2. System Requirements

Verifies your system meets the skill's requirements:

- **OS compatibility** - macOS, Linux, or Windows?
- **Architecture** - arm64 or x86_64?
- **Node.js version** - Does your Node meet the minimum requirement?

Parsed from:

- SKILL.md frontmatter and content
- package.json `engines.node` field

### 3. Dependencies

Checks for missing requirements:

- **CLI tools** - ffmpeg, python, java, docker, etc.
  - Lists which are missing
  - Provides install commands (brew install X)
- **API keys** - Groq, ElevenLabs, OpenAI, Stripe, Twilio, etc.
  - Checks TOOLS.md and environment variables
  - Lists which are not configured
- **Clawdbot version** - Does the skill need Clawdbot X.Y.Z or higher?
- **npm packages** - Dependency summary from package.json

### 4. Security Scan

Runs the **security-scanner** skill (if installed):

- Detects code execution vulnerabilities (eval, exec, dynamic require)
- Flags credential theft patterns
- Warns about network calls to unknown domains
- Identifies obfuscated or minified code
- Returns risk level: **SAFE** / **CAUTION** / **DANGEROUS**

## Output: Installation Readiness

### 🟢 GO

**Ready to install. No blocking issues detected.**

- No system requirement mismatches
- No conflicts detected
- All dependencies available
- Security scan clear (SAFE)
- Missing optional dependencies (with install commands provided)

### 🟡 CAUTION

**Proceed with caution. Review issues before installation.**

- All system requirements met, but see warnings
- Conflicts detected but resolvable
- Some dependencies missing (CLI tools, API keys)
- Security scan shows CAUTION level
- Resolution steps provided for each issue

### 🔴 BLOCKED

**Do not install.**

- System requirements NOT met (wrong OS, architecture, or Node version)
- Skill name conflicts with existing installation
- Security scan detects DANGEROUS patterns
- Cannot be installed on this system

## Usage Examples

### Check a skill directory

```bash
$ skill-compatibility-checker ~/clawd/my-skill

╔════════════════════════════════════════════════════════════════════════════╗
║                    SKILL COMPATIBILITY CHECKER REPORT                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Skill: my-skill
Path:  /Users/ericwoodard/clawd/my-skill
Date:  2026-01-29T15:30:00.000Z

┌─ INSTALLATION READINESS ─────────────────────────────────────────────────┐
│ ✅ GO - Safe to install
│
└────────────────────────────────────────────────────────────────────────────┘

┌─ SYSTEM REQUIREMENTS ────────────────────────────────────────────────────┐
│ Your System: darwin / arm64 / Node 25.4.0
│
│ System requirements met ✅
└────────────────────────────────────────────────────────────────────────────┘

┌─ RECOMMENDATION ─────────────────────────────────────────────────────────┐
│ ✅ Ready to install. No blocking issues detected.
│
│ Next step: npm install && clawdbot skill install
└────────────────────────────────────────────────────────────────────────────┘
```

### With warnings (CAUTION)

```bash
$ skill-compatibility-checker ~/clawd/another-skill

┌─ INSTALLATION READINESS ─────────────────────────────────────────────────┐
│ ⚠️  CAUTION - Review issues before installation
│
└────────────────────────────────────────────────────────────────────────────┘

┌─ DEPENDENCIES ───────────────────────────────────────────────────────────┐
│ Missing CLI Tools:
│ ❌ ffmpeg
│    Install: brew install ffmpeg
│
│ Missing API Keys/Tokens:
│ ⚠️  groq - configure in TOOLS.md or environment
│ ⚠️  elevenlabs - configure in TOOLS.md or environment
└────────────────────────────────────────────────────────────────────────────┘

┌─ RECOMMENDATION ─────────────────────────────────────────────────────────┐
│ ⚠️  Proceed with caution. Review all issues above.
│
│ Actions before installation:
│ 1. Install missing CLI tools (see above)
│ 2. Configure missing API keys in TOOLS.md
│ 3. Review security findings and audit code if needed
└────────────────────────────────────────────────────────────────────────────┘
```

### JSON output for programmatic use

```bash
$ skill-compatibility-checker ~/clawd/my-skill --output json

{
  "skill": {
    "name": "my-skill",
    "path": "/Users/ericwoodard/clawd/my-skill",
    "description": "Does something useful"
  },
  "readiness": "GO",
  "timestamp": "2026-01-29T15:30:00.000Z",
  "system": {
    "platform": "darwin",
    "arch": "arm64",
    "nodeVersion": "25.4.0",
    "osVersion": "26.2"
  },
  "conflicts": {
    "conflicts": [],
    "warnings": []
  },
  "systemRequirements": {
    "issues": [],
    "warnings": []
  },
  "dependencies": {
    "missingCLITools": [],
    "missingApiKeys": [],
    "clawdbotVersionRequired": null,
    "warnings": []
  },
  "security": {
    "riskLevel": "SAFE",
    "findings": [],
    "message": ""
  },
  "recommendation": "Ready to install. No blocking issues detected."
}
```

## How It Works

### 1. Resolve Skill Path

- Local paths: `~/clawd/my-skill` or `/full/path/to/skill`
- ClawdHub lookups: `clawdhub:skill-name` (future)

### 2. Parse Skill Metadata

- Read SKILL.md frontmatter (name, description, requirements)
- Read SKILL.md and README.md content
- Parse package.json (bin, engines, dependencies)

### 3. Check Conflicts

- Compare skill name with all installed skills in ~/clawd/
- Check if bin commands from package.json already exist in PATH
- Scan for port usage declarations

### 4. Verify System Requirements

- Compare required OS with `process.platform` (darwin, linux, win32)
- Compare required arch with `process.arch` (arm64, x64)
- Compare required Node version with running Node version
- Parse from SKILL.md and package.json engines field

### 5. Check Dependencies

- Search content for mentions of common CLI tools (ffmpeg, python, java, etc.)
- Check if those tools exist in PATH
- Parse SKILL.md/README for API key requirements
- Check TOOLS.md and process.env for configured keys
- Note npm dependencies from package.json

### 6. Run Security Scan

- Invoke security-scanner-skill if available
- Pass skill path to scanner
- Capture risk level and findings
- Report security assessment

### 7. Generate Report

- Determine readiness (GO / CAUTION / BLOCKED)
- Format as text (human-readable) or JSON (programmatic)
- Provide actionable remediation steps

## Exit Codes

- **0** - GO: Ready to install
- **1** - CAUTION: Review and fix issues before installing
- **2** - BLOCKED: Do not install on this system

This allows scripts to programmatically handle compatibility:

```bash
skill-compatibility-checker ~/clawd/my-skill
if [ $? -eq 0 ]; then
  echo "Installing..."
  npm install && clawdbot skill install
elif [ $? -eq 1 ]; then
  echo "Review issues and try again"
  exit 1
else
  echo "Cannot install on this system"
  exit 2
fi
```

## Requirements

- **Node.js** ≥ 14.0.0
- **security-scanner-skill** (optional, for security scanning)
- **CLI tools** (optional, detected if mentioned in skill docs)

## How to Use with Other Skills/Sub-Agents

The skill-compatibility-checker is designed to be invoked by other tools:

```bash
# From command line
skill-compatibility-checker ~/clawd/some-skill --output json > report.json

# From Node.js
const checker = require('./scripts/checker.js');
const results = checker.checkSystemRequirements('./skill-path');
```

## Configuration

### Environment Variables

The checker automatically reads these to determine configured API keys:

- `GROQ_API_KEY`
- `ELEVENLABS_API_KEY`
- `OPENAI_API_KEY`
- `STRIPE_API_KEY`
- `TWILIO_AUTH_TOKEN`
- etc.

### TOOLS.md Format

The checker looks in `~/clawd/TOOLS.md` for API key sections:

```markdown
## API Keys & Services

- **Groq API:** `gsk_...` (Whisper audio transcription)
- **ElevenLabs API:** Configured (sk\_...)
```

## Limitations

- ClawdHub lookups not yet implemented (use local paths)
- Port conflict detection is informational only (doesn't test actual ports)
- API key requirement detection is pattern-based (may miss some)
- CLI tool detection based on common names (ffmpeg, python, etc.)

## Advanced: Programmatic API

Use the skill in your own code:

```javascript
const {
  checkConflicts,
  checkSystemRequirements,
  checkDependencies,
  runSecurityScan,
  determineReadiness,
} = require('./scripts/checker.js')

// Run a single check
const sysReqs = checkSystemRequirements('./my-skill')
console.log(sysReqs)
// { issues: [], warnings: [] }

// Check readiness
const readiness = determineReadiness(results)
// 'GO' | 'CAUTION' | 'BLOCKED'
```

## Tips

1. **Before installing any skill**, run the checker first:

   ```bash
   skill-compatibility-checker ~/clawd/new-skill
   ```

2. **For CI/CD pipelines**, use JSON output and exit codes:

   ```bash
   skill-compatibility-checker ~/clawd/new-skill --output json || exit $?
   ```

3. **Check regularly** - run the checker on existing skills if you update TOOLS.md:

   ```bash
   for skill in ~/clawd/*-skill; do
     skill-compatibility-checker "$skill" || true
   done
   ```

4. **Resolve CAUTION warnings** - they're fixable:
   - Install missing CLI tools: `brew install <tool>`
   - Configure API keys in TOOLS.md
   - Review security findings and ask maintainer

5. **Don't force install BLOCKED skills** - the system incompatibility is real and you'll encounter errors.

## See Also

- **security-scanner-skill** - Static code analysis for malware/vulnerabilities
- **TOOLS.md** - Your API key configuration file
- **SKILL.md** - Skill metadata format
