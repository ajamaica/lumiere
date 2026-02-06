# AGIRAILS Payments - OpenClaw Skill

Official OpenClaw skill for AI agent payments via the ACTP (Agent Commerce Transaction Protocol).

## What is this?

This skill enables AI agents running on [OpenClaw/Clawdbot](https://openclaw.ai) to:
- **Pay for services** from other agents
- **Receive payments** for providing services
- **Track transactions** through the 8-state machine
- **Handle disputes** with blockchain-secured escrow

### Manual installation
```bash
# Clone to your skills directory
git clone https://github.com/agirails/openclaw-skill.git ~/.openclaw/skills/agirails
```

## Prerequisites

1. **AGIRAILS SDK** installed in your project:
   ```bash
   npm install @agirails/sdk   # TypeScript
   pip install agirails        # Python
   ```

2. **Environment variables**:
   ```bash
   export AGENT_PRIVATE_KEY="0x..."   # Wallet private key
   export AGENT_ADDRESS="0x..."       # Wallet address
   ```

3. **USDC on Base** - Bridge via [bridge.base.org](https://bridge.base.org)

## Usage

Once installed, just tell your AI agent:

> "Pay 10 USDC to 0xProviderAddress for translation service"

The skill provides documentation for:
- Basic API (one-liner payments)
- Standard API (full control)
- Advanced API (provider flows, proof encoding)

## Skill Contents

```
openclaw-skill/
├── SKILL.md                         # Main skill documentation
├── README.md                        # This file
├── references/
│   ├── state-machine.md             # 8-state machine reference
│   ├── requester-template.md        # Full requester agent template
│   └── provider-template.md         # Full provider agent template
├── examples/
│   ├── simple-payment.md            # All 3 API levels explained
│   └── full-lifecycle.md            # Complete transaction flow
├── openclaw/                        # OpenClaw integration
│   ├── QUICKSTART.md                # 5-minute setup guide
│   ├── agent-config.json            # Ready-to-use configs
│   ├── SOUL-treasury.md             # Buyer agent template
│   ├── SOUL-provider.md             # Seller agent template
│   ├── cron-examples.json           # Automation jobs
│   ├── validation-patterns.md       # Delivery validators
│   └── security-checklist.md        # Pre-launch audit
└── scripts/
    ├── setup.sh                     # Automated setup
    ├── test-balance.ts              # Check wallet balance
    └── test-purchase.ts             # Test on testnet
```

## State Machine

```
INITIATED → QUOTED → COMMITTED → IN_PROGRESS → DELIVERED → SETTLED
                          ↓            ↓             ↓
                     CANCELLED    DISPUTED ─────────→↑
```

**Important:** `IN_PROGRESS` is required before `DELIVERED`.

## Links

- **AGIRAILS Website**: https://agirails.io
- **SDK Documentation**: https://docs.agirails.io
- **SDK Repository**: https://github.com/agirails/sdk
- **Discord**: https://discord.gg/nuhCt75qe4

## License

MIT © AGIRAILS Inc.
