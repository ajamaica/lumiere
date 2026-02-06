# Changelog

## [1.5.1] - 2026-02-06

### Security

- **Fixed shell injection vulnerability** in hooks/clawvault/handler.js
  - Changed from `execSync` (with shell) to `execFileSync` (no shell)
  - All arguments passed as array, never interpolated into shell string
  - Vault path validation: must be absolute, exist, and contain .clawvault.json

- **Fixed prompt injection vulnerability**
  - Checkpoint recovery data now sanitized before injection
  - Control characters stripped, markdown escaped, length limited
  - Session keys and command sources sanitized with strict allowlist

- **Removed direct GitHub dependency** for qmd
  - qmd moved to optional peer dependency
  - Users install separately: `npm install -g github:tobi/qmd`
  - ClawVault gracefully handles missing qmd

### Changed

- Hook now validates vault paths before use
- Error messages in hooks are now generic (no sensitive data leaked)

---

## [1.5.0] - 2026-02-06

### Added

- **`clawvault repair-session`** - Repair corrupted OpenClaw session transcripts
  - Detects orphaned `tool_result` blocks that reference non-existent `tool_use` IDs
  - Identifies aborted tool calls with partial JSON
  - Automatically relinks parent chain after removals
  - Creates backup before repair (configurable with `--no-backup`)
  - Dry-run mode with `--dry-run` to preview repairs
  - List sessions with `--list` flag
  - JSON output with `--json` for scripting

  **Problem solved:** When the Anthropic API rejects with "unexpected tool_use_id found in tool_result blocks", this command fixes the transcript so the session can continue without losing context.

  ```bash
  # Analyze without changing
  clawvault repair-session --dry-run

  # Repair current main session
  clawvault repair-session

  # Repair specific session
  clawvault repair-session --session <id> --agent <agent-id>
  ```

- **Session utilities** (`src/lib/session-utils.ts`)
  - `listAgents()` - Find all agents in ~/.openclaw/agents/
  - `findMainSession()` - Get current session for an agent
  - `findSessionById()` - Look up specific session
  - `getSessionFilePath()`, `backupSession()` - File helpers

### Tests

- Added 13 tests for session repair functionality
  - Transcript parsing
  - Tool use extraction from assistant messages
  - Corruption detection (aborted + orphaned)
  - Parent chain relinking
  - Dry-run mode
  - Backup creation

---

## [1.4.2] - 2026-02-06

### Added

- **OpenClaw Hook Integration** - Automatic context death resilience
  - `gateway:startup` event: Detects if previous session died, injects alert into first agent turn
  - `command:new` event: Auto-checkpoints before session reset
  - Install: `openclaw hooks install clawvault && openclaw hooks enable clawvault`
  - Hook ships with npm package via `openclaw.hooks` field in package.json

- **`clawvault wake`** - All-in-one session start command
  - Combines: `recover --clear` + `recap` + summary
  - Shows context death status, recent handoffs, what you were working on
  - Perfect for session startup ritual

- **`clawvault sleep <summary>`** - All-in-one session end command
  - Creates handoff with: --next, --blocked, --decisions, --questions, --feeling
  - Clears death flag
  - Optional git commit prompt (--no-git to skip)
  - Captures rich context before ending session

### Fixed

- Fixed readline import in sleep command (was using `readline/promises` which bundlers couldn't resolve)

### Changed

- Documentation updated for hook-first approach
- AGENTS.md simplified - hook handles basics, manual commands for rich context
- SKILL.md updated with OpenClaw Integration section

---

## [1.4.1] - 2026-02-05

### Added

- `clawvault doctor` - Vault health diagnostics
- `clawvault shell-init` - Shell integration setup

---

## [1.4.0] - 2026-02-04

### Added

- **qmd integration** - Semantic search via local embeddings
- `clawvault setup` - Auto-discovers OpenClaw memory folder
- `clawvault status` - Vault health, checkpoint age, qmd index
- `clawvault template` - List/create/add with 7 built-in templates
- `clawvault link --backlinks` - See what links to a file
- `clawvault link --orphans` - Find broken wiki-links

### Changed

- qmd is now required for semantic search functionality

---

## [1.3.x] - Earlier

- Initial release with core functionality
- Checkpoint/recover for context death resilience
- Handoff/recap for session continuity
- Wiki-linking and entity management
- Structured memory categories
