# ClawBack - Development Guide

Congressional Trade Mirror Bot - Automatically mirrors congressional stock trades.

## Quick Start

```bash
# Always use the virtual environment
source venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Run the CLI
clawback status
clawback setup
clawback run
```

## Development Commands

```bash
# Activate venv (required for all commands)
source venv/bin/activate

# Run linter
ruff check src/clawback/

# Auto-fix lint issues
ruff check src/clawback/ --fix

# Run tests
pytest tests/ -v
```

## Release Process

```bash
# Linting runs automatically before release
make ship-patch   # Bump patch, lint, commit, tag, push, publish
make ship-minor   # Bump minor version
make ship-major   # Bump major version

# Or run steps individually:
make lint         # Run linter (must pass before release)
make bump-patch   # Bump version only
make release      # Commit, tag, push
make publish      # Publish to ClawHub
```

## Project Structure

```
src/clawback/
├── cli.py              # Command-line interface
├── main.py             # TradingBot main class
├── trade_engine.py     # Trade execution with risk management
├── congress_tracker.py # Congressional disclosure scraping
├── etrade_adapter.py   # E*TRADE broker integration
├── broker_adapter.py   # Abstract broker interface
├── database.py         # SQLite persistence
├── notifications.py    # Alert system
└── congress_data/      # Data collection modules
```

## Configuration

Config file: `~/.clawback/config.json`

Required for trading:

- E\*TRADE API credentials (apiKey, apiSecret)
- Account ID

## Linting

Uses **ruff** for linting. Configuration in `pyproject.toml`.

Key rules enforced:

- F401: Unused imports
- F841: Unused variables
- E/W: PEP8 style
- B: Common bugs (flake8-bugbear)
- I: Import sorting

Ignored (for Python 3.9 compatibility):

- UP006/UP035: Modern type hint syntax (3.10+)
- RUF012/013: Verbose annotations
