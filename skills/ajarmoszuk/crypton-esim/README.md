# Crypton eSIM Skill for OpenClaw

Purchase anonymous eSIMs directly from chat. Pay with Bitcoin, Monero, or card.

## Features

- Browse eSIM plans for 170+ countries
- Purchase without creating an account
- Pay with BTC, XMR, or credit card
- Check order status and get activation codes
- No API key required

## Installation

1. Copy this folder to your OpenClaw skills directory
2. The skill will be automatically loaded

## Usage

### Commands

| Command                                | Description              |
| -------------------------------------- | ------------------------ |
| `esim`                                 | List available countries |
| `esim [country]`                       | Show plans for a country |
| `buy [package_id] with [btc/xmr/card]` | Purchase an eSIM         |
| `status [order_uuid]`                  | Check order status       |

### Examples

```
> esim
Available eSIM Destinations:
• Germany (DE) - from €1.40 (15 plans)
• France (FR) - from €1.75 (13 plans)
...

> esim germany
eSIM Plans for Germany:
• 500 MB / 1 days - €1.40
  DE_0.5_Daily
• 1.0 GB / 7 days - €2.45
  DE_1_7
...

> buy DE_1_7 with btc
Order Created

Plan: Germany 1GB 7Days
Data: 1.0 GB
Validity: 7 days
Price: €2.45

Payment Method: Bitcoin
Amount: 0.00004521 BTC
Address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

Order ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

> status a1b2c3d4-e5f6-7890-abcd-ef1234567890
Order Status: ✅ Complete

Plan: Germany 1GB 7Days
Data: 1024 MB remaining
ICCID: 8901234567890123456

Activation Code:
LPA:1$smdp.example.com$ACTIVATION-CODE

Scan the QR code or enter the activation code in your phone's eSIM settings.
```

## API Reference

The skill uses the Crypton Guest eSIM API:

- **Base URL:** `https://crypton.sh/api/v1/guest/esim`
- **Authentication:** None required
- **Rate Limits:** 30 req/min (plans), 10 req/min (checkout)

### Endpoints

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| GET    | `/plans`        | List available plans |
| GET    | `/countries`    | List countries       |
| POST   | `/checkout`     | Create purchase      |
| GET    | `/order/{uuid}` | Check status         |

## Configuration

Configure the skill in `SKILL.md` or directly in `crypton_esim.py`:

| Variable                 | Default                                | Description                        |
| ------------------------ | -------------------------------------- | ---------------------------------- |
| `api_base_url`           | `https://crypton.sh/api/v1/guest/esim` | API endpoint                       |
| `default_payment_method` | `btc`                                  | Default payment (btc, xmr, stripe) |

## Testing

Run the skill directly for interactive testing:

```bash
python crypton_esim.py
```

Or with a single command:

```bash
python crypton_esim.py "esim germany"
```

## Support

- Website: https://crypton.sh
- API Docs: https://crypton.sh/esim/guest

## License

MIT
