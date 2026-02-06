---
name: erc-800claw
description: The OpenClaw entry point for ERC-8004 agent identity and reputation. Register agents on-chain, query identities, give and receive feedback ratings.
metadata:
  { 'openclaw': { 'emoji': '🪪', 'requires': { 'anyBins': ['node', 'npx', 'python3', 'pip'] } } }
---

# ERC-800Claw

Your entry point into ERC-8004 - the on-chain identity, reputation, and validation standard for autonomous agents.

ERC-8004 is an [open protocol](https://8004.org) enabling verifiable agent identity and reputation on Ethereum. Agents can register identities (ERC-721 NFTs), receive and give reputation feedback, and optionally verify their capabilities through validators. ERC-800Claw, built by [Primer](https://primer.systems), provides simple APIs for interacting with the protocol.

## When to Use This Skill

Use ERC-800Claw when:

- You need to **register an agent identity** on-chain
- You need to **look up an agent** by ID or owner
- You want to **give feedback/ratings** to another agent
- You need to **check an agent's reputation**
- The user asks about **agent verification** or trust

## Quick Setup

### Node.js

```bash
npm install erc-800claw
```

### Python

```bash
pip install erc-800claw
```

## How to Respond

| User Says/Asks                    | What to Do                                                              |
| --------------------------------- | ----------------------------------------------------------------------- |
| "Look up agent #123"              | Run `erc-800claw agent 123` to get details                              |
| "Does agent 42 exist?"            | Run `erc-800claw exists 42`                                             |
| "How many agents does 0x... own?" | Run `erc-800claw owner 0x...`                                           |
| "Register my agent"               | Run `erc-800claw register --name "Name"` (requires PRIVATE_KEY env var) |
| "What networks are supported?"    | Run `erc-800claw networks`                                              |
| "Show contract addresses"         | Run `erc-800claw contracts`                                             |

## CLI Commands

| Command                           | Description                                 |
| --------------------------------- | ------------------------------------------- |
| `erc-800claw agent <id>`          | Get agent details by ID                     |
| `erc-800claw exists <id>`         | Check if an agent exists                    |
| `erc-800claw owner <address>`     | Get agent count for an address              |
| `erc-800claw register`            | Register a new agent (requires PRIVATE_KEY) |
| `erc-800claw networks`            | List supported networks                     |
| `erc-800claw contracts [network]` | Show contract addresses                     |

### CLI Options

- `--network, -n <name>` - Network to use (mainnet, sepolia). Default: mainnet
- `--json, -j` - Output as JSON

### Example CLI Output

```bash
$ erc-800claw agent 1
Agent #1 (mainnet)
────────────────────────────────────────
Owner:    0x1234...abcd
URI:      data:application/json;base64,...
Name:     My Agent
About:    An autonomous agent for...
Explorer: https://etherscan.io/nft/0x8004.../1

$ erc-800claw exists 100
Agent 100 exists on mainnet

$ erc-800claw owner 0x1234...
Address 0x1234... owns 3 agent(s) on mainnet

$ PRIVATE_KEY=0x... erc-800claw register --name "My Agent" --network sepolia
Agent Registered on sepolia!
────────────────────────────────────────
Agent ID: 42
Owner:    0x1234...abcd
Tx:       0xabc123...
Explorer: https://sepolia.etherscan.io/nft/0x8004.../42
```

## How ERC-8004 Works

ERC-8004 provides three on-chain registries:

1. **Identity Registry** (ERC-721) - Every agent gets a unique NFT token with metadata URI
2. **Reputation Registry** - Structured feedback scores from clients to agents
3. **Validation Registry** - Independent verification (zkML, TEE, stakers)

The flow:

1. **Register** - Mint an agent identity NFT with name/description metadata
2. **Operate** - Use your agent ID when interacting with other agents
3. **Build Reputation** - Clients give feedback, scores accumulate on-chain
4. **Verify** (optional) - Validators attest to capabilities

## Using in Code

### Node.js / TypeScript

```javascript
const { createClient } = require('erc-800claw')

const client = createClient({ network: 'mainnet' })

// Get agent by ID
const agent = await client.getAgent(1)
console.log(agent)
// {
//   agentId: 1,
//   tokenURI: 'data:application/json;base64,...',
//   owner: '0x...',
//   metadata: { name: 'My Agent', description: '...' },
//   explorerUrl: 'https://etherscan.io/...'
// }

// Check if agent exists
const exists = await client.agentExists(42)

// Get agent count for address
const count = await client.getAgentCount('0x...')

// Register a new agent (no IPFS needed - uses data URI!)
const result = await client.registerAgent(process.env.PRIVATE_KEY, {
  name: 'My Autonomous Agent',
  description: 'Handles customer support',
  services: [{ name: 'support', endpoint: 'https://myagent.com/api' }],
})
console.log(`Registered agent #${result.agentId}`)

// Give feedback to an agent
await client.giveFeedback(process.env.PRIVATE_KEY, agentId, {
  value: 4.5, // Score out of 5
  decimals: 1,
  tag1: 'support',
  tag2: 'fast',
})
```

### Python

```python
from erc800claw import create_client
import os

client = create_client(network='mainnet')

# Get agent by ID
agent = client.get_agent(1)
print(agent)
# {
#     'agent_id': 1,
#     'token_uri': 'data:application/json;base64,...',
#     'owner': '0x...',
#     'metadata': {'name': 'My Agent', 'description': '...'},
#     'explorer_url': 'https://etherscan.io/...'
# }

# Check if agent exists
exists = client.agent_exists(42)

# Get agent count for address
count = client.get_agent_count('0x...')

# Register a new agent (no IPFS needed - uses data URI!)
result = client.register_agent(
    private_key=os.environ['PRIVATE_KEY'],
    name='My Autonomous Agent',
    description='Handles customer support',
    services=[{'name': 'support', 'endpoint': 'https://myagent.com/api'}]
)
print(f"Registered agent #{result['agent_id']}")

# Give feedback to an agent
client.give_feedback(
    private_key=os.environ['PRIVATE_KEY'],
    agent_id=agent_id,
    value=4.5,        # Score out of 5
    decimals=1,
    tag1='support',
    tag2='fast'
)
```

## Metadata Format

Agent metadata follows a standard schema:

```json
{
  "name": "My Agent",
  "description": "What my agent does",
  "image": "https://example.com/avatar.png",
  "services": [
    {
      "name": "api",
      "endpoint": "https://myagent.com/api",
      "description": "Main API endpoint"
    }
  ],
  "supported_trust": ["reputation", "validation"]
}
```

The SDK automatically encodes this as a data URI - no IPFS upload required.

## Integration with xClaw02

ERC-800Claw works with **xClaw02** (x402 payments) to enable paid agent services:

1. Register your agent identity with ERC-800Claw
2. Set up payment receiving with xClaw02
3. Clients verify your identity, pay for services, then rate you

See the **xClaw02** skill for payment setup.

## Supported Networks

| Network          | Chain ID | Status |
| ---------------- | -------- | ------ |
| Ethereum Mainnet | 1        | Live   |
| Sepolia Testnet  | 11155111 | Live   |

## Contract Addresses

### Mainnet

- Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

### Sepolia

- Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Reputation Registry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

## Environment Variables

| Variable          | Format               | Description                                             |
| ----------------- | -------------------- | ------------------------------------------------------- |
| `PRIVATE_KEY`     | `0x` + 64 hex chars  | Wallet private key (required for registration/feedback) |
| `ERC8004_NETWORK` | `mainnet`, `sepolia` | Default network (default: mainnet)                      |
| `ERC8004_RPC_URL` | URL                  | Custom RPC endpoint                                     |

## Error Handling

| Error                  | Meaning                     | What to Do                               |
| ---------------------- | --------------------------- | ---------------------------------------- |
| `Agent not found`      | No agent with that ID       | Verify the agent ID is correct           |
| `Agent already exists` | Token already minted        | Each agent ID is unique                  |
| `Not the owner`        | Can't modify other's agents | Only owner can update agent metadata     |
| `Invalid address`      | Malformed Ethereum address  | Check address format (0x + 40 hex chars) |

## Security Notes

- **Never expose private keys** in logs, chat, or output
- Use environment variables for wallet credentials
- Agent registration costs gas - have ETH in your wallet
- Private key format: `0x` followed by 64 hexadecimal characters

## Links

- **ERC-8004 Protocol**: https://8004.org
- **EIP-8004**: https://eips.ethereum.org/EIPS/eip-8004
- **SDK (npm)**: https://npmjs.com/package/erc-800claw
- **SDK (PyPI)**: https://pypi.org/project/erc-800claw
- **GitHub**: https://github.com/primer-systems/ERC-8004
- **Primer Systems**: https://primer.systems
