# Changelog

## [1.1.0] - 2026-02-01

### Changed

- Version bump

## [1.0.16] - 2026-02-01

### Added

- `scripts/auth_script.py` - Standalone E\*TRADE OAuth authentication helper

## [1.0.15] - 2026-02-01

### Fixed

- **CLI import fix**: Changed `from main import TradingBot` to `from clawback.main import TradingBot`
- **CLI method call fix**: Use correct `interactive_mode()` method instead of `run()`
- **Python 3.9 compatibility**: Fixed `tuple[bool, str]` type hint to use `Tuple[bool, str]`
- **Config safety**: Added `.get()` with defaults for congress_tracker, trade_engine config access
- **OAuth parsing**: Safer parsing of OAuth response in etrade_adapter
- **Account validation**: Check account_id exists before placing orders
- **Quote access**: Safe access to quote dict with `.get()` fallback
- **Date parsing logic**: Fixed backtester date format loop to only set fallback after all formats fail
- **Bare except cleanup**: Replaced all bare `except:` with specific exception types

## [1.0.14] - 2026-02-01

### Changed

- Version bump

## [1.0.13] - 2026-02-01

### Changed

- Version bump

## [1.0.12] - 2026-02-01

### Changed

- Version bump

## [1.0.11] - 2026-02-01

### Changed

- Version bump

## [1.0.10] - 2026-02-01

### Changed

- Version bump

## [1.0.9] - 2026-02-01

### Changed

- Version bump

## [1.0.8] - 2026-02-01

### Changed

- Version bump

## [1.0.7] - 2026-02-01

### Changed

- Version bump

## [1.0.6] - 2026-02-01

### Changed

- Version bump

## [1.0.5] - 2026-02-01

### Changed

- Version bump

## [1.0.4] - 2026-02-01

### Changed

- Version bump

## [1.0.3] - 2026-02-01

### Changed

- Version bump

## [1.0.2] - February 2026

### Added

- **OpenClaw Skill Support**: Properly packaged for ClawHub distribution
- **OpenClaw Telegram Integration**: Option to use OpenClaw's built-in Telegram channel for notifications
- **Simplified CLI**: Single config path (`~/.clawback/config.json`) eliminates confusion

### Changed

- **Consolidated CLI**: Merged all CLI improvements into single `cli.py`
- **Updated metadata**: SKILL.md uses single-line frontmatter format per OpenClaw requirements
- **Cleaned repository**: Removed development artifacts, test files, and duplicate scripts

### Fixed

- **Config path handling**: Always uses `~/.clawback/config.json`
- **Setup wizard**: More robust and user-friendly
- **OpenClaw integration**: Proper skill metadata and installation

### Installation

```bash
# Via ClawHub
clawhub install clawback

# Or from local directory
clawhub install ./clawback

# Or manual pip install
pip install -e .
clawback setup
```

## [1.0.1] - January 2026

### Added

- Generic broker naming for multi-broker support
- Sandbox environment support
- Telegram markdown escaping fix
- OpenClaw skill integration
- Token persistence in SQLite with auto-refresh

### Changed

- Removed hardcoded credentials from config and docs
- Restructured for OpenClaw agent automation
- Improved setup process

## [1.0.0] - Initial Release

### Features

- Congressional trade tracking from Senate eFD and House Clerk
- E\*TRADE broker integration
- Automated trade execution based on congressional disclosures
- Risk management and safety controls
- Telegram notifications
- SQLite database for trade tracking
