# ClawDaddy Skill for ClawhHub

A skill for AI agents to check, purchase, and manage domains using [ClawDaddy](https://clawdaddy.app) - the world's #1 AI-friendly domain registrar.

## What It Does

- **Check availability** - `GET /api/lookup/{domain}`
- **Purchase domains** - x402 (USDC on Base) or Stripe (cards)
- **Configure DNS** - A, AAAA, CNAME, MX, TXT, NS, SRV records
- **Update nameservers** - Point to Cloudflare, Vercel, AWS, etc.
- **Manage settings** - Lock/unlock, auto-renew, transfer out

## Publishing to ClawhHub

```bash
# Install CLI
npm install -g clawdbot@latest

# Login via GitHub
clawhub login

# Publish (from this directory)
clawhub publish . \
  --slug clawdaddy \
  --name "ClawDaddy" \
  --version 1.0.0 \
  --tags latest
```

## Installing the Skill

```bash
clawhub install clawdaddy
```

## API Endpoints

### Lookups (No Auth)

| Endpoint                               | Purpose                   |
| -------------------------------------- | ------------------------- |
| `/api/lookup/{domain}`                 | Check availability (JSON) |
| `/api/lookup/{domain}?format=txt`      | Check availability (TXT)  |
| `/api/purchase/{domain}/quote`         | Get purchase quote        |
| `/api/purchase/{domain}?method=x402`   | Buy with USDC             |
| `/api/purchase/{domain}?method=stripe` | Buy with card             |

### Management (Bearer Token Required)

| Endpoint                           | Purpose            |
| ---------------------------------- | ------------------ |
| `/api/manage/{domain}`             | Domain overview    |
| `/api/manage/{domain}/dns`         | DNS records (CRUD) |
| `/api/manage/{domain}/nameservers` | Update nameservers |
| `/api/manage/{domain}/settings`    | Domain settings    |
| `/api/manage/{domain}/transfer`    | Transfer out       |
| `/api/recover`                     | Token recovery     |

## Why ClawDaddy?

Traditional registrars (GoDaddy, Namecheap) block AI agents with CAPTCHAs, WAFs, and anti-bot measures. ClawDaddy provides:

- **No CAPTCHAs** - Just HTTP requests
- **No signup** - Lookups work immediately
- **Proper API responses** - JSON with correct Content-Type
- **AI-native payments** - x402 protocol (USDC on Base)
- **Bearer token auth** - Simple management tokens
- **Real-time data** - From Name.com reseller API

**Base URL:** `https://clawdaddy.app`

## Complete Workflow

```
1. Check availability
   GET /api/lookup/coolstartup.com

2. Get quote
   GET /api/purchase/coolstartup.com/quote

3. Purchase (x402)
   POST /api/purchase/coolstartup.com?method=x402
   → Pay USDC, save managementToken

4. Configure DNS
   POST /api/manage/coolstartup.com/dns
   Authorization: Bearer clwd_token...
   {"host": "@", "type": "A", "answer": "1.2.3.4"}

5. Or point to Cloudflare
   PUT /api/manage/coolstartup.com/nameservers
   {"nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]}
```

## License

MIT
