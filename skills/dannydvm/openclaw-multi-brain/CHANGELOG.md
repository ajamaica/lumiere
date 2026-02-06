# Changelog

All notable changes to openclaw-dual-brain will be documented in this file.

## [0.1.0] - 2026-02-05

### Initial Release

**Complete refactor and productization of `dual-brain-watcher.js`**

#### Added

- ✨ Provider-agnostic architecture supporting multiple LLM providers
- ✨ Ollama provider (local, zero cost)
- ✨ Moonshot/Kimi provider (Chinese LLM)
- ✨ OpenAI provider (GPT-4o, GPT-4-turbo)
- ✨ Groq provider (fast Llama inference)
- ✨ Full CLI with commands: setup, start, stop, status, logs, install-daemon
- ✨ Interactive configuration wizard
- ✨ Config management at `~/.dual-brain/config.json`
- ✨ Daemon management (PID tracking, graceful shutdown)
- ✨ macOS LaunchAgent installer
- ✨ Linux systemd service installer
- ✨ Engram semantic memory integration (optional)
- ✨ Comprehensive documentation (README, SKILL, QUICKSTART)
- ✨ Architecture diagrams and examples

#### Changed

- 🔄 Refactored from monolithic 213-line script to modular package
- 🔄 Provider abstraction (was hardcoded Kimi)
- 🔄 Config from `.kimi-api-key` file to JSON config with multiple providers
- 🔄 Perspectives directory: `~/.engram/perspectives/` → `~/.dual-brain/perspectives/`
- 🔄 State file: `~/.engram/dual-brain-state.json` → `~/.dual-brain/state.json`

#### Fixed

- 🐛 Timeout handling for slow LLM providers
- 🐛 Duplicate message detection
- 🐛 Graceful failure when provider unavailable
- 🐛 PID file cleanup on daemon exit

#### Technical

- 📦 npm package with global CLI binary
- 📦 Plain JavaScript (no TypeScript, no build step)
- 📦 Zero dependencies (uses Node.js built-ins only)
- 📦 Cross-platform (macOS, Linux)
- 📦 Works with Node.js >=16

#### Migration from dual-brain-watcher.js

- **Breaking:** Config location changed (`.kimi-api-key` → `~/.dual-brain/config.json`)
- **Breaking:** Perspectives location changed (`~/.engram/` → `~/.dual-brain/`)
- **Non-breaking:** Session file format unchanged (still reads OpenClaw JSONL)
- **Improvement:** Multi-provider support (not just Kimi)

#### Known Limitations

- API keys stored in plaintext (no encryption)
- Single provider per instance (no ensemble)
- No perspective history (only latest)
- No web dashboard (CLI only)

---

## [Unreleased]

### Planned Features

- [ ] API key encryption (OS keychain integration)
- [ ] Multi-provider ensemble perspectives
- [ ] Perspective history and archive
- [ ] Web dashboard for monitoring
- [ ] Metrics and health checks
- [ ] Claude/Anthropic API provider
- [ ] Custom perspective prompts per agent
- [ ] Unit tests and CI/CD

---

**Version Format:** [MAJOR.MINOR.PATCH] following [Semantic Versioning](https://semver.org/)
