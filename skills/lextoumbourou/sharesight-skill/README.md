# Sharesight Skill for OpenClaw

> Manage Sharesight portfolios, holdings, trades, and custom investments via the API.

## Features

- **Portfolios** - List, view, and analyze portfolio performance
- **Holdings** - View, update DRP settings, delete holdings
- **Trades** - Create, view, update, and delete trades
- **Custom Investments** - Full CRUD for custom investments, prices, and coupon rates
- **Write Protection** - Safe by default, write operations require explicit opt-in

## Installation

### Manual Installation

```bash
# Clone into your skills directory
cd ~/.claude/skills  # or your preferred skills location
git clone https://github.com/your-username/sharesight-skill.git sharesight

# Install dependencies
cd sharesight
uv sync
```

### Verify Installation

```bash
cd ~/.claude/skills/sharesight
uv run sharesight --help
```

## Setup

### 1. Get Sharesight API Credentials

1. Email Sharesight to request API access (see [Getting Started](https://portfolio.sharesight.com/api/))
2. Once enabled, find your credentials under **Account** > **Sharesight API**
3. Copy your **Client ID** and **Client Secret**

### 2. Set Environment Variables

For OpenClaw, add to `~/.openclaw/.env`:

```bash
SHARESIGHT_CLIENT_ID=your_client_id
SHARESIGHT_CLIENT_SECRET=your_client_secret
```

Or add to `~/.openclaw/openclaw.json`:

```json
{
  "env": {
    "SHARESIGHT_CLIENT_ID": "your_client_id",
    "SHARESIGHT_CLIENT_SECRET": "your_client_secret"
  }
}
```

See [OpenClaw Environment Configuration](https://docs.openclaw.ai/environment) for more options.

For shell usage, add to `~/.bashrc` or `~/.zshrc`:

```bash
export SHARESIGHT_CLIENT_ID="your_client_id"
export SHARESIGHT_CLIENT_SECRET="your_client_secret"
```

### 3. Enable Write Operations (Optional)

Write operations (create, update, delete) are disabled by default for safety. To enable, add to your environment:

For OpenClaw (`~/.openclaw/.env`):

```bash
SHARESIGHT_ALLOW_WRITES=true
```

For shell:

```bash
export SHARESIGHT_ALLOW_WRITES=true
```

### 4. Authenticate

```bash
uv run sharesight auth login
```

## Usage

### CLI Commands

```bash
# List portfolios
uv run sharesight portfolios list

# Get portfolio performance
uv run sharesight portfolios performance 12345 --start-date 2024-01-01

# List holdings
uv run sharesight holdings list

# Create a trade (requires SHARESIGHT_ALLOW_WRITES=true)
uv run sharesight trades create 12345 --symbol AAPL --market NASDAQ --date 2024-01-15 --quantity 10 --price 185.50

# Create a custom investment
uv run sharesight investments create --code XTM --name "MinoTari" --country US --type ORDINARY --portfolio-id 12345

# Get help
uv run sharesight --help
```

### In OpenClaw/Claude

Just ask naturally:

- "Show me my Sharesight portfolios"
- "What's the performance of my crypto portfolio this year?"
- "Add a buy trade for 100 shares of AAPL at $150"
- "Create a custom investment for XTM Tari"

## API Reference

See [SKILL.md](./SKILL.md) for complete API documentation.

## Output

All commands output JSON to stdout. Errors are written to stderr.

## Token Storage

Access tokens are cached in `~/.config/sharesight-cli/config.json` and automatically refreshed when expired (tokens are valid for 30 minutes).

## Development

```bash
# Install dev dependencies
uv sync --extra dev

# Run tests
uv run pytest tests/ -v

# Run directly
uv run sharesight portfolios list
```

## Troubleshooting

| Error                       | Solution                                                  |
| --------------------------- | --------------------------------------------------------- |
| `Missing credentials`       | Set `SHARESIGHT_CLIENT_ID` and `SHARESIGHT_CLIENT_SECRET` |
| `Write operations disabled` | Set `SHARESIGHT_ALLOW_WRITES=true`                        |
| `401 Unauthorized`          | Run `sharesight auth login` to refresh token              |
| `404 Not Found`             | Check the resource ID exists                              |

## License

MIT
