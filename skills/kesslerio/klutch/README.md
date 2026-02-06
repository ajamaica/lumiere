# OpenClaw Klutch Skill

💳 OpenClaw skill for Klutch programmable credit card API integration.

## Features

- **Card Info**: View your Klutch card details and status
- **Transaction History**: List recent transactions with merchant details
- **Spending Categories**: View transaction categories and MCC codes
- **Spending Analysis**: Group transactions by category
- **Configuration Management**: Customize API endpoint and timeouts

## Prerequisites

1. **Klutch Account**: Active Klutch credit card account
2. **API Credentials**: Client ID and Secret Key from Klutch developer portal
3. **Python 3.10+**: Required for running the scripts

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/kesslerio/openclaw-skill-klutch.git
cd openclaw-skill-klutch

# Install dependencies
pip install -r requirements.txt
```

### Via OpenClaw

```bash
clawhub install klutch
```

## Configuration

### Environment Variables

Set your Klutch API credentials:

```bash
# Direct credentials
export KLUTCH_CLIENT_ID="your-client-id"
export KLUTCH_SECRET_KEY="your-secret-key"

# OR 1Password CLI integration (item must have "api key" and "api secret" fields)
export KLUTCH_1PASSWORD_ITEM="Klutch API Credential"
```

### Configuration File

The skill stores configuration and session tokens in `~/.config/klutch/`:

```bash
~/.config/klutch/
├── config.json      # User preferences
└── token.json       # Cached session token (auto-managed)
```

### API Endpoints

The skill connects to Klutch's GraphQL API:

- **Production:** `https://graphql.klutchcard.com/graphql`
- **Sandbox:** `https://sandbox.klutchcard.com/graphql` (for testing)

## Usage

### Check Card Info

```bash
python scripts/klutch.py balance
```

Output:

```json
{
  "cards": [
    {
      "id": "crd_xxx",
      "name": "Martin Kessler",
      "status": "ACTIVE"
    }
  ]
}
```

### List Transactions

```bash
# Default (last 30 days)
python scripts/klutch.py transactions

# Custom limit
python scripts/klutch.py transactions --limit 20
```

Output:

```json
{
  "transactions": [
    {
      "id": "txn_xxx",
      "amount": -100.0,
      "merchantName": "Checking",
      "transactionStatus": "SETTLED"
    }
  ]
}
```

### Card Management

```bash
# List all cards
python scripts/klutch.py card list

# View transaction categories
python scripts/klutch.py card categories

# View spending by category
python scripts/klutch.py card spending
```

### Configuration Management

```bash
# View all configuration
python scripts/klutch.py config get

# Get specific value
python scripts/klutch.py config get api.timeout

# Set configuration value
python scripts/klutch.py config set api.timeout 60
```

## Troubleshooting

### Authentication Issues

If you receive authentication errors:

1. Verify your credentials are set correctly
2. Delete `~/.config/klutch/token.json` to force re-authentication
3. Check that your API key hasn't expired

### Session Token Expired

The skill automatically creates session tokens. If you encounter issues:

```bash
rm ~/.config/klutch/token.json
```

## Security Notes

- Never commit credentials to version control
- The skill stores tokens in `~/.config/klutch/token.json`
- Session tokens are refreshed automatically when needed
- Consider using 1Password CLI for credential injection (see issue #10)

## Hypothetical Agent Use Cases & Prompts

The Klutch skill enables OpenClaw agents to manage their own financial resources or act as your personal financial assistant.

### 1. Autonomous Sub-Agent Budgeting

Allow a sub-agent to handle its own costs for a specific task.

- **Prompt:** "Spawn a research agent to analyze this market. Create a Klutch virtual card for it named 'Research Task' with a $20 limit for API and tool access."

### 2. Smart Subscription Monitoring

Monitor recurring charges and alert on changes.

- **Prompt:** "Check my Klutch transactions every Monday. If my Netflix or AWS subscription cost changes by more than 10%, send me an alert on Telegram."

### 3. Category Spending Analysis

Get insights into where your money is going.

- **Prompt:** "Summarize my Klutch spending for the 'FOOD' and 'FUN' categories this month. Tell me if I'm on track to stay under my $500 budget."

### 4. Merchant-Locked Security

Automatically secure your online shopping.

- **Prompt:** "I'm about to buy something from a new store. Create a Klutch virtual card named 'One-time Shop' with a $50 limit and lock it to the merchant name 'CoolGadgets.com'."

### 5. Expense Reporting

Generate automated summaries for your records.

- **Prompt:** "At the end of every month, list my top 10 Klutch transactions and categorize them into a Markdown table for my journal."

## License

MIT License - see LICENSE file for details.

## Disclaimer

This is an unofficial integration. Use at your own risk. Always verify operations in the official Klutch app.
