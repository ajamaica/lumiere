---
name: clawback
description: Mirror congressional stock trades with automated broker execution and risk management. Use when you want to track and automatically trade based on congressional disclosures from House Clerk and Senate eFD sources.
version: 1.1.0
author: mainfraame
homepage: https://github.com/mainfraame/clawback
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': '🦀',
        'requires': { 'bins': ['python3', 'pip'] },
        'install': { 'pip': '{baseDir}' },
        'primaryEnv': 'BROKER_API_KEY',
      },
  }
---

# ClawBack

**Mirror congressional stock trades with automated broker execution**

## Agent Instructions

When the user invokes `/clawback`, execute the appropriate command based on the argument:

### Commands

| Command            | Action                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `/clawback setup`  | Interactive setup - prompt for credentials (see below)                                    |
| `/clawback status` | Check status: `cd {baseDir} && source venv/bin/activate && python -m clawback.cli status` |
| `/clawback run`    | Start trading: `cd {baseDir} && source venv/bin/activate && python -m clawback.cli run`   |
| `/clawback`        | Default to status check                                                                   |

### `/clawback setup` - Interactive Setup Flow

When user runs `/clawback setup`, follow these steps:

**Step 1: Install dependencies (if needed)**
Check if `{baseDir}/venv` exists. If not, run:

```bash
cd {baseDir} && python3 -m venv venv && source venv/bin/activate && pip install -e .
```

**Step 2: Prompt for E\*TRADE credentials**
Ask the user for each value:

1. **Environment**: Ask "Do you want to use **sandbox** (testing) or **production** (real money)?"
   - Default: sandbox

2. **Consumer Key**: Ask "Enter your E\*TRADE Consumer Key (from developer.etrade.com):"
   - Required field

3. **Consumer Secret**: Ask "Enter your E\*TRADE Consumer Secret:"
   - Required field

4. **Account ID**: Ask "Enter your E\*TRADE Account ID (or leave blank to get it after OAuth):"
   - Optional - can be obtained later

**Step 3: Save configuration**
Create/update `~/.clawback/config.json` with the provided values:

```json
{
  "broker": {
    "adapter": "etrade",
    "environment": "<sandbox or production>",
    "credentials": {
      "apiKey": "<consumer_key>",
      "apiSecret": "<consumer_secret>"
    }
  },
  "trading": {
    "accountId": "<account_id>",
    "initialCapital": 50000,
    "tradeScalePercentage": 0.01,
    "maxPositionPercentage": 0.05,
    "dailyLossLimit": 0.02
  },
  "notifications": {
    "telegram": {
      "enabled": true,
      "useOpenClaw": true
    }
  },
  "congress": {
    "dataSource": "official",
    "pollIntervalHours": 24,
    "minimumTradeSize": 10000
  }
}
```

**Step 4: Confirm setup**
Tell the user: "Configuration saved to ~/.clawback/config.json. Run `/clawback status` to verify."

### Getting E\*TRADE API Credentials

Direct user to: https://developer.etrade.com

1. Create a developer account
2. Create a new app (sandbox first for testing)
3. Copy the Consumer Key and Consumer Secret

### Configuration Location

- Config file: `~/.clawback/config.json`
- Skill directory: `{baseDir}`

### Reading Saved Configuration

To check if the user has configured credentials, read `~/.clawback/config.json`:

- If file doesn't exist or credentials are empty → prompt for setup
- If credentials exist → can proceed with status/run commands

The CLI automatically reads from `~/.clawback/config.json` for all operations.

### Checking Setup Status

Before running `/clawback status` or `/clawback run`, verify:

1. `{baseDir}/venv` exists (dependencies installed)
2. `~/.clawback/config.json` exists with non-empty `broker.credentials.apiKey`

If either is missing, suggest running `/clawback setup` first.

---

ClawBack tracks stock trades disclosed by members of Congress (House and Senate) and executes scaled positions in your E\*TRADE brokerage account. Built on the premise that congressional leaders consistently outperform the market due to informational advantages.

## Default Target Politicians

ClawBack monitors these politicians by default (configurable):

| Politician             | Chamber | Priority    |
| ---------------------- | ------- | ----------- |
| Nancy Pelosi           | House   | 1 (highest) |
| Dan Crenshaw           | House   | 2           |
| Tommy Tuberville       | Senate  | 2           |
| Marjorie Taylor Greene | House   | 3           |

## Trading Strategy Defaults

| Parameter          | Default                | Description                          |
| ------------------ | ---------------------- | ------------------------------------ |
| Trade Delay        | 3 days                 | Wait after disclosure before trading |
| Holding Period     | 30 days                | Target hold time for positions       |
| Position Size      | 5%                     | Max allocation per trade             |
| Stop-Loss          | 8%                     | Per-position stop-loss               |
| Portfolio Drawdown | 15%                    | Max portfolio loss before halt       |
| Disclosure Checks  | 10:00, 14:00, 18:00 ET | Daily check times                    |

## Features

- **Real-time disclosure tracking** from official House Clerk and Senate eFD sources
- **Automated trade execution** via E\*TRADE API (only supported broker)
- **Smart position sizing** - scales trades to your account size
- **Trailing stop-losses** - lock in profits, limit losses
- **Risk management** - drawdown limits, consecutive loss protection
- **Telegram notifications** - get alerts for new trades and stop-losses
- **Backtesting engine** - test strategies on historical data

## Performance (Backtest Results)

| Strategy                 | Win Rate | Return | Sharpe |
| ------------------------ | -------- | ------ | ------ |
| 3-day delay, 30-day hold | 42.9%    | +6.2%  | 0.39   |
| 9-day delay, 90-day hold | 57.1%    | +4.7%  | 0.22   |

Congressional leaders have outperformed the S&P 500 by 47% annually according to NBER research.

## Installation via ClawHub

```bash
# Install from ClawHub registry
clawhub install clawback

# Or install from local directory
clawhub install ./clawback
```

### Post-Installation Setup

After installation via ClawHub, the `install.sh` script runs automatically:

1. **Python Environment Setup** - Creates virtual environment
2. **Package Installation** - Installs ClawBack via pip
3. **Directory Structure** - Creates logs/, data/, config/ directories
4. **Setup Prompt** - Asks if you want to run the setup wizard

If you skip setup during installation, run it manually:

```bash
cd ~/.openclaw/skills/clawback
./setup.sh          # Interactive setup wizard
# or
clawback setup      # CLI-based setup
```

### Improved Setup Features

- **Better input handling** - Works in both interactive and non-interactive modes
- **Input validation** - Validates E\*TRADE API key formats
- **Timeout handling** - Automatically uses defaults if no input
- **Error recovery** - Fallback to manual setup if CLI fails
- **Configuration check** - Detects existing config and offers options

## Interactive Setup Wizard

The setup wizard guides you through configuration:

### Step 1: Environment Selection

- **Sandbox** (recommended for testing): No real trades, uses E\*TRADE developer sandbox
- **Production**: Real trading with real money

### Step 2: E\*TRADE API Credentials

- **Consumer Key**: From E\*TRADE developer portal
- **Consumer Secret**: From E\*TRADE developer portal

### Step 3: Authentication

- Automatic OAuth flow with E\*TRADE
- Opens browser for authorization
- Returns verification code

### Step 4: Account Selection

- Lists all available E\*TRADE accounts
- Choose which account to trade with

### Step 5: Telegram Setup (Optional)

- Configure notifications via Telegram bot
- Uses OpenClaw's built-in Telegram channel if available

## Environment Variables

After setup, credentials are stored in `.env`:

```bash
# E*TRADE API (required)
BROKER_API_KEY=your_consumer_key_here
BROKER_API_SECRET=your_consumer_secret_here
BROKER_ACCOUNT_ID=your_account_id_here

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# FMP API (optional)
FMP_API_KEY=your_fmp_api_key_here
```

## Usage

```bash
# Use the installed CLI command
clawback run      # Start interactive trading mode
clawback daemon   # Run as background service
clawback status   # Check system status
clawback setup    # Re-run setup wizard
clawback test     # Test Telegram notifications
```

## Automated Trading

The `clawback daemon` command runs continuously with:

- **Disclosure checks** at 10:00, 14:00, 18:00 ET (when filings are typically released)
- **Trade execution** at 9:35 AM ET (5 min after market open)
- **Token refresh** every 90 minutes (keeps E\*TRADE session alive)
- **Market hours enforcement** (9:30 AM - 4:00 PM ET)

## Data Sources

- **House Clerk**: https://disclosures-clerk.house.gov (PDF parsing)
- **Senate eFD**: https://efdsearch.senate.gov (web scraping)
- **Financial Modeling Prep**: Enhanced financial data (optional)

## Supported Brokers

ClawBack currently only supports E*TRADE. The adapter pattern allows for future broker support, but only E*TRADE is implemented and tested.

| Broker   | Adapter             | Status    |
| -------- | ------------------- | --------- |
| E\*TRADE | `etrade_adapter.py` | Supported |

## Risk Management

- **Position limits**: 5% max per symbol, 20 positions max
- **Stop-losses**: 8% per position, 15% portfolio drawdown
- **Daily limits**: 3% max daily loss
- **PDT compliance**: Conservative 2 trades/day limit

## Authentication Helpers

For manual E\*TRADE authentication outside the main CLI:

```bash
# Standalone OAuth authentication script
cd {baseDir}
source venv/bin/activate
python scripts/auth_script.py
```

This generates an authorization URL, prompts for the verification code, and completes authentication.

## File Locations

| File                              | Purpose               |
| --------------------------------- | --------------------- |
| `~/.clawback/config.json`         | Main configuration    |
| `~/.clawback/.access_tokens.json` | E\*TRADE OAuth tokens |
| `~/.clawback/data/trading.db`     | SQLite database       |

## Security

- No hardcoded credentials in source code
- Environment variable based configuration
- Encrypted token storage for E\*TRADE
- Git-ignored `.env` file
- Optional production encryption

## Support

- **Documentation**: See README.md for detailed setup
- **Issues**: https://github.com/mainfraame/clawback/issues
- **Community**: https://discord.com/invite/clawd

## Disclaimer

**Trading involves substantial risk of loss.** This software is for educational purposes only. Past congressional trading performance does not guarantee future results. Always test with E\*TRADE sandbox accounts before live trading.
