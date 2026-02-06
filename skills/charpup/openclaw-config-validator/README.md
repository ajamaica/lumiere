# OpenClaw Config Validator

[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.1+-blue)](https://openclaw.ai)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **The authoritative configuration validation and management toolkit for OpenClaw**

## 🎯 What is this?

`openclaw-config-validator` is a comprehensive skill that provides:

- 📚 **Complete schema documentation** for OpenClaw 2026.2.1
- ✅ **Validation tools** to check your configuration
- 🛡️ **Safety guidelines** to prevent common errors
- 🔍 **Official JSON Schema** from the OpenClaw project

## 🚀 Quick Start

```bash
# Clone into your OpenClaw skills directory
cd ~/.openclaw/workspace/skills
git clone https://github.com/yourusername/openclaw-config-validator.git

# Validate your current configuration
cd openclaw-config-validator
./scripts/schema-validate.sh

# Read the complete schema reference
cat reference/SCHEMA.md
```

## 📋 Features

### Complete Schema Coverage (22 Nodes)

| Category     | Nodes                                                |
| ------------ | ---------------------------------------------------- |
| **Core**     | `agents`, `models`, `session`, `commands`            |
| **Channels** | `discord`, `telegram`, `whatsapp`, `slack`, `feishu` |
| **Tools**    | `tools`, `browser`, `hooks`                          |
| **Audio**    | `talk`, `audio` ⭐                                   |
| **System**   | `gateway`, `logging`, `diagnostics`, `cron`          |
| **Plugins**  | `skills`, `plugins`, `bindings`                      |

### Validation Tools

- **`get-schema.sh`** - Extract runtime schema from your live configuration
- **`schema-validate.sh`** - Validate configuration and detect issues

### Safety First

- ⚠️ **Risk levels** marked for each configuration node
- 🚫 **Forbidden fields** list (fields that don't exist in OpenClaw)
- ✅ **Pre-modification checklist** - 7 steps to safe config changes
- 🔄 **Rollback procedures** - Recovery when things go wrong

## 📖 Documentation

### Schema Reference

The main documentation is in `reference/SCHEMA.md`:

```bash
# Quick lookup
cat reference/SCHEMA.md | grep -A 10 "gateway"

# Full read
cat reference/SCHEMA.md
```

### Key Sections

- **[🚨 Checklist](reference/SCHEMA.md#修改前检查清单)** - Must-read before any config changes
- **[🚫 Forbidden Fields](reference/SCHEMA.md#绝对禁止)** - What NOT to add
- **[📋 Node Reference](reference/SCHEMA.md#顶级节点速查)** - Quick lookup for all 22 nodes

## 🛠️ Usage

### Validate Configuration

```bash
# Basic validation
./scripts/schema-validate.sh

# Detailed output
./scripts/schema-validate.sh --verbose

# Generate report
./scripts/schema-validate.sh --report
```

### Extract Runtime Schema

```bash
# See your current config structure
./scripts/get-schema.sh

# Save to file
./scripts/get-schema.sh > my-runtime-schema.md
```

### Using with Ajv

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate with official schema
ajv validate \
  -s reference/openclaw-official-schema.json \
  -d ~/.openclaw/openclaw.json
```

## 🆕 What's New in OpenClaw 2026.2.1

This skill documents all 22 top-level nodes, including these additions:

| Node          | Description                      |
| ------------- | -------------------------------- |
| `logging`     | Comprehensive log configuration  |
| `talk`        | Voice mode for macOS/iOS/Android |
| `audio`       | TTS and VoiceWake settings       |
| `bindings`    | Multi-agent message routing      |
| `diagnostics` | OpenTelemetry integration        |
| `update`      | Auto-update configuration        |

## ⚠️ Common Pitfalls

### Don't: Add Non-Existent Fields

```json
// ❌ WRONG - web.braveApiKey doesn't exist
{
  "web": {
    "braveApiKey": "..."
  }
}

// ✅ CORRECT - use environment variable
// export BRAVE_API_KEY=... in your shell
```

### Don't: Modify Gateway Settings

```json
// ❌ WRONG - gateway is read-only
{
  "gateway": {
    "port": 99999 // Don't change this!
  }
}
```

### Do: Follow the Checklist

```bash
# Always backup first
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)

# Use jq for modifications
jq '.agents.defaults.model.primary = "new-model"' \
  ~/.openclaw/openclaw.json > /tmp/new.json

# Validate before applying
openclaw doctor
```

## 📚 References

- [OpenClaw Official Docs](https://docs.openclaw.ai/gateway/configuration)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Discord](https://discord.gg/clawd)

## 🤝 Contributing

Contributions welcome! Please:

1. Follow the existing documentation style
2. Test changes with `schema-validate.sh`
3. Update SCHEMA.md if adding new nodes
4. Submit PR with clear description

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Schema is the boundary, not the permission.</strong><br>
  <em>Know where the boundary is.</em>
</p>

<p align="center">
  Created by <a href="https://github.com/openclaw">Galatea</a> 🜁
</p>
