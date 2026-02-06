# OpenClaw Config Validator Skill

**ID**: `openclaw-config-validator`  
**Version**: 1.0.0  
**OpenClaw Version**: 2026.2.1+

A comprehensive configuration validation and management skill for OpenClaw, providing authoritative schema documentation, validation tools, and best practices.

---

## Overview

This skill helps OpenClaw agents and users:

- Understand the complete OpenClaw configuration schema
- Validate configurations against the official JSON Schema
- Follow safe configuration management practices
- Prevent common configuration errors

---

## Features

### 📚 Complete Schema Reference

- **22 top-level configuration nodes** documented
- **Official JSON Schema** from OpenClaw 2026.2.1
- **Risk levels** marked for each node (🟢 Low 🟡 Medium 🔴 High)
- **Field types, defaults, and examples**

### ✅ Validation Tools

- `get-schema.sh` - Extract runtime schema from live configuration
- `schema-validate.sh` - Validate configuration against schema
- Pre-commit checklist to prevent errors

### 🛡️ Safety Features

- **Forbidden fields list** - Know what not to add
- **Pre-modification checklist** - 7-step safety process
- **Rollback procedures** - Recovery when things go wrong
- **Error troubleshooting** - Common issues and solutions

---

## Quick Start

### 1. Validate Current Configuration

```bash
./scripts/schema-validate.sh
```

### 2. Extract Runtime Schema

```bash
./scripts/get-schema.sh
```

### 3. Read Schema Reference

```bash
cat reference/SCHEMA.md
```

---

## File Structure

```
openclaw-config-validator/
├── SKILL.md                          # This file
├── reference/
│   ├── SCHEMA.md                     # Authoritative schema reference (v2)
│   ├── openclaw-official-schema.json # Official JSON Schema from OpenClaw
│   └── AGENT_PROMPT.md              # Configuration management guide
└── scripts/
    ├── get-schema.sh                # Runtime schema extractor
    └── schema-validate.sh           # Configuration validator
```

---

## Configuration Safety Rules

### ✅ DO

- Read SCHEMA.md before making changes
- Backup config: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)`
- Use `jq` for modifications, never direct edit
- Run `openclaw doctor` before and after changes
- Test in non-production first

### ❌ DON'T

- Create new top-level nodes not in SCHEMA.md
- Add `web.braveApiKey` or similar non-existent fields
- Modify `gateway` node (read-only)
- Skip the backup step
- Guess field names or formats

---

## Schema Highlights

### New in OpenClaw 2026.2.1

| Node          | Purpose                        | Status        |
| ------------- | ------------------------------ | ------------- |
| `logging`     | Log configuration              | ✅ Documented |
| `talk`        | Voice mode (macOS/iOS/Android) | ✅ Documented |
| `audio`       | Audio/TTS/VoiceWake            | ✅ Documented |
| `bindings`    | Multi-agent routing            | ✅ Documented |
| `diagnostics` | OpenTelemetry integration      | ✅ Documented |
| `update`      | Auto-update settings           | ✅ Documented |

### Risk Levels

| Level     | Nodes      | Action Required         |
| --------- | ---------- | ----------------------- |
| 🟢 Low    | Most nodes | Normal caution          |
| 🟡 Medium | `channels` | Backup before modify    |
| 🔴 High   | `gateway`  | Read-only, don't modify |

---

## Validation

### Using schema-validate.sh

```bash
# Basic validation
./scripts/schema-validate.sh

# Detailed report
./scripts/schema-validate.sh --verbose

# Generate report file
./scripts/schema-validate.sh --report
```

### Using Ajv (optional)

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate with official schema
ajv validate -s reference/openclaw-official-schema.json \
  -d ~/.openclaw/openclaw.json
```

---

## Troubleshooting

### Configuration Validation Failed

```bash
# 1. Check specific errors
openclaw doctor

# 2. Restore from backup
cp ~/.openclaw/openclaw.json.backup.* ~/.openclaw/openclaw.json

# 3. Restart gateway (if needed)
openclaw gateway restart
```

### Gateway Won't Start

```bash
# Check config syntax
jq '.' ~/.openclaw/openclaw.json

# If invalid, restore default
mv ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.broken
# Then re-run: openclaw onboard
```

---

## References

- **Official Docs**: https://docs.openclaw.ai/gateway/configuration
- **OpenClaw Repo**: https://github.com/openclaw/openclaw
- **OpenClaw Discord**: https://discord.gg/clawd

---

## Changelog

### v1.0.0 (2026-02-04)

- Initial release
- Complete OpenClaw 2026.2.1 schema documentation
- Official JSON Schema integration
- Validation scripts
- Safety guidelines and checklists

---

## License

MIT - See OpenClaw project for details.

---

**"Schema is the boundary, not the permission. Know where the boundary is."**

_Created by Galatea 🜁_
