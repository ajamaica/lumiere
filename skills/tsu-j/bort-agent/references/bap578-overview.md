# BAP-578: Non-Fungible Agent Standard

BAP-578 is an NFT standard for autonomous AI agents on BNB Smart Chain, created by @ladyxtel. Each agent is an ERC-721 token with on-chain state, configurable AI intelligence, and multi-platform connectivity.

## Contract Addresses (BSC Mainnet)

| Contract | Address |
|----------|---------|
| BAP578 (Agent NFT) | `0x15b15df2ffff6653c21c11b93fb8a7718ce854ce` |
| AgentFactory | `0x2b1a3610823bd70c13a3b27dd7b84d2a20d7eeca` |
| PlatformRegistry | `0x985eae300107a838c1aB154371188e0De5a87316` |
| KnowledgeRegistry | `0xabf88658ba140366d893a81763edb8d4a37d16ce` |
| MerkleTreeLearning | `0x69dd4d2a0970751e1825d4291425641c1c2e6c81` |
| BAP578Treasury | `0x8cc352df91dda4aa5154dc81bea1d359d00cd59f` |
| BAP578Staking | `0x0530899315dd4d1af0496fd6dd3ad4e355165f80` |

## On-Chain Identity

Each agent's identity is its ERC-721 NFT. The `getState(uint256 tokenId)` function returns:

```solidity
struct State {
    uint256 balance;          // Agent's BNB balance (wei)
    Status status;            // 0 = Paused, 1 = Active, 2 = Terminated
    address owner;            // Wallet that owns the agent NFT
    address logicAddress;     // Logic contract (determines agent type)
    uint256 lastActionTimestamp; // Last on-chain action
}
```

Ownership verification: call `ownerOf(tokenId)` on the BAP578 contract. The returned address is the verified owner of that agent.

## Agent Types (10)

Each agent type is defined by its logic contract address on BNB Chain:

| Type | Logic Contract | Description |
|------|----------------|-------------|
| Basic Agent | `0x9eb431f7df06c561af5dd02d24fa806dd7f51211` | General-purpose AI assistant |
| Trading Agent | `0x17affcd99dea21a5696a8ec07cb35c2d3d63c25e` | DeFi trading and market analysis |
| Security Agent | `0xd9a131d5ee901f019d99260d14dc2059c5bddac0` | Smart contract auditing and security |
| DAO Agent | `0x5cba71e6976440f5bab335e7199ca6f3fb0dc464` | Governance and proposal management |
| Creator Agent | `0x4dd93c9abfb577d926c0c1f76d09b122fe967b36` | Content creation and brand identity |
| Game Agent | `0xbee7ff1de98a7eb38b537c139e2af64073e1bfbf` | GameFi mechanics and economy design |
| Strategic Agent | `0x05c3eb90294d709a6fe128a9f0830cdaa1ed22a2` | Data analysis and strategic planning |
| Social Media Agent | `0x7572f5ffbe7f0da6935be42cd2573c743a8d7b5f` | Community management and engagement |
| Oracle Data Agent | `0x0c7b91ce0ee1a9504db62c7327ff8aa8f6abfd36` | Off-chain data aggregation and feeds |
| NFT Marketplace Agent | `0x02fe5764632b788380fc07bae10bb27eebbd2552` | NFT collection management and trading |

## AI Soul System

Each agent can be configured with an AI "soul" - an LLM provider + system prompt + personality.

### Supported LLM Providers

| Provider | Models |
|----------|--------|
| Anthropic Claude | claude-sonnet-4-20250514, claude-haiku-4-20250514 |
| OpenAI | gpt-4o, gpt-4o-mini |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| Kimi (Moonshot) | moonshot-v1-8k, moonshot-v1-32k |
| MiniMax | MiniMax-M2, MiniMax-M2.1 |

### Soul Configuration

- **System prompt** - Custom instructions defining the agent's behavior
- **Personality** - Name, tone, and description
- **Temperature** - LLM creativity setting (0-2)
- **Max tokens** - Response length limit (1-16384)
- **Conversation memory** - Last 20 messages per channel/chat

## Platform Connections

Agents connect to messaging platforms through the PlatformRegistry contract:

| Platform | Type ID | Connector |
|----------|---------|-----------|
| Discord | 0 | Discord.js bot |
| Telegram | 1 | Telegraf bot |
| Twitter/X | 2 | Twitter API v2 |
| Web API | 3 | REST/Webhook endpoint |

### WebAPI Connector Endpoints

The WebAPI connector runs on port 3001 (default) and exposes:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/:agentId/messages` | Send a message to the agent |
| POST | `/agents/:agentId/webhooks` | Send a webhook event (optional HMAC-SHA256 signature) |
| GET | `/agents/:agentId/status` | Check agent connection status |
| GET | `/health` | Runtime health check |

**Message endpoint request body:**
```json
{
  "content": "Your message here",
  "author": "sender-name",
  "metadata": { "source": "openclaw" }
}
```

**Message endpoint response:**
```json
{
  "received": true,
  "agentId": 1
}
```

## Message Flow

```
Inbound message (Discord/Telegram/Twitter/WebAPI)
  -> Platform Connector
  -> Message Router
  -> Record on-chain activity
  -> AI Soul (LLM generates response)
  -> Response sent back to originating platform
```

## Security Model

- **API keys** encrypted with AES-256-GCM using a master key
- **Write operations** require wallet signature (EIP-191) + on-chain ownership check
- **Rate limiting** on all API endpoints (20 req/15min for sensitive endpoints)
- **Agent identity** is the NFT itself - `ownerOf(tokenId)` is the source of truth

## Links

- BSCScan (BAP578): https://bscscan.com/address/0x15b15df2ffff6653c21c11b93fb8a7718ce854ce
- BSCScan (PlatformRegistry): https://bscscan.com/address/0x985eae300107a838c1aB154371188e0De5a87316
