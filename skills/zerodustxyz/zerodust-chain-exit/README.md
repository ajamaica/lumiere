# ZeroDust OpenClaw Skill

OpenClaw skill for sweeping native gas tokens to exactly zero balance using EIP-7702.

## What This Skill Does

Enables OpenClaw agents to help users:
- Sweep 100% of native gas tokens from EIP-7702 compatible chains
- Leave exactly zero balance (no dust)
- Cross-chain transfers via Gas.zip bridging
- Batch sweeps from multiple chains to a single destination

**Important:** This only works on chains that support EIP-7702 (25 chains currently). Not all EVM chains are supported.

## Supported Chains

Ethereum, BSC, Base, Arbitrum, Optimism, Polygon, Gnosis, Scroll, Zora, Mode, Mantle, Celo, Fraxtal, Unichain, World Chain, Berachain, Ink, Plasma, BOB, Story, Superseed, Sei, Sonic, Soneium, X Layer

**Not supported:** Avalanche, Blast, Linea, Apechain, and other chains without EIP-7702.

## Publishing to ClawHub

### Prerequisites

1. Install the ClawHub CLI:
   ```bash
   npm install -g @openclaw/clawhub-cli
   ```

2. Login with your GitHub account:
   ```bash
   clawhub login
   ```
   Note: Your GitHub account must be at least 1 week old to publish.

### Publish Command

```bash
cd integrations/openclaw

clawhub publish . \
  --slug zerodust-chain-exit \
  --name "ZeroDust Chain Exit" \
  --version 1.0.0 \
  --changelog "Initial release - sweep native tokens to zero balance across 25 EIP-7702 chains"
```

### Updating the Skill

```bash
clawhub publish . \
  --slug zerodust-chain-exit \
  --name "ZeroDust Chain Exit" \
  --version 1.1.0 \
  --changelog "Description of changes"
```

## Local Testing

1. Copy the skill to your OpenClaw skills directory:
   ```bash
   cp -r . ~/.openclaw/skills/zerodust-chain-exit/
   ```

2. Enable in `openclaw.json`:
   ```json
   {
     "skills": {
       "zerodust-chain-exit": {
         "enabled": true
       }
     }
   }
   ```

3. Set your API key:
   ```bash
   export ZERODUST_API_KEY=zd_your_key_here
   ```

4. Test with prompts like:
   - "sweep my dust from Arbitrum to Base"
   - "exit Polygon completely"
   - "move all my ETH to Base"

## Getting an API Key

```bash
curl -X POST https://zerodust-backend-production.up.railway.app/agent/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My OpenClaw Agent", "agentId": "my-agent-001"}'
```

Save the `apiKey` from the response - it's only shown once.

## API Documentation

Full API docs: https://zerodust-backend-production.up.railway.app/docs

## Fees

- Service fee: 1% of balance (min $0.05, max $0.50)
- Gas costs reimbursed from sweep amount
- User receives ~97-99% of balance

## Support

- Issues: https://github.com/zerodustxyz/zerodust-backend/issues

## License

MIT
