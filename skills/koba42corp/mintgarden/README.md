<p align="center">
  <h1 align="center">🌱 MintGarden API Client</h1>
  <p align="center">
    <strong>Browse, search, and analyze Chia NFTs via MintGarden API</strong>
  </p>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-v18+-green.svg" alt="Node.js: v18+">
  </a>
  <a href="https://api.mintgarden.io/docs">
    <img src="https://img.shields.io/badge/API-MintGarden-blue.svg" alt="MintGarden API">
  </a>
  <a href="https://clawd.bot">
    <img src="https://img.shields.io/badge/Framework-Clawdbot-orange.svg" alt="Built with Clawdbot">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg" alt="Status">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
</p>

---

## 🎯 Overview

Access the complete MintGarden API to interact with NFTs on the Chia blockchain. Search collections, view floor prices, track trading history, browse profiles, and more.

**No API key required** — MintGarden's API is free and public.

## ✨ Features

- 🔍 **Search** NFTs and collections with natural language
- 📊 **Stats** — floor prices, volumes, sales counts, trending
- 🖼️ **NFT Details** — metadata, attributes, rarity, ownership
- 📚 **Collections** — browse top collections, view activity
- 👤 **Profiles** — user portfolios, trade history, holdings
- 📈 **Events** — real-time marketplace activity
- 💰 **Offers** — active bids and listings
- 🔥 **Trending** — what's hot in the last 24h

## 🚀 Quick Start

### Installation

```bash
# Via ClawdHub (recommended)
clawdhub install mintgarden

# Or manually
cd ~/.clawd/skills
git clone https://github.com/yourusername/mintgarden-skill.git mintgarden
cd mintgarden
npm install
chmod +x cli.js
npm link
```

### Usage

#### CLI

```bash
# Search
mg search "zombie"
mg search nfts "rare pixel"
mg search collections "art"

# Collections
mg collections list
mg collection col1abc...
mg collection stats col1abc...

# NFTs
mg nft nft1abc...
mg nft history nft1abc...

# Profiles
mg profile username
mg profile did:chia:...

# Stats
mg stats
mg trending
mg top collectors
```

#### Telegram

```
/mg search zombie
/mg collection col1abc...
/mg trending
/mg events
```

#### Clawdbot Agent

```javascript
const { handleCommand } = require('./skills/mintgarden')

const output = await handleCommand('show me trending collections')
console.log(output)
```

#### API Client

```javascript
const MintGardenAPI = require('./skills/mintgarden/lib/api')
const api = new MintGardenAPI()

// Get trending collections
const trending = await api.getTrending({ period: '24h', limit: 10 })

// Search NFTs
const results = await api.searchNFTs('zombie', { limit: 20 })

// Get collection details
const collection = await api.getCollection('col1abc...')

// Get NFT details
const nft = await api.getNFT('nft1abc...')

// Get profile
const profile = await api.getProfile('username')
```

## 📖 Command Reference

### Search Commands

| Command                           | Description        | Example                       |
| --------------------------------- | ------------------ | ----------------------------- |
| `mg search <query>`               | Search everything  | `mg search zombie`            |
| `mg search nfts "<query>"`        | Search NFTs only   | `mg search nfts "rare pixel"` |
| `mg search collections "<query>"` | Search collections | `mg search collections "art"` |

### Collection Commands

| Command                       | Description               | Example                             |
| ----------------------------- | ------------------------- | ----------------------------------- |
| `mg collections list`         | Top collections by volume | `mg collections list`               |
| `mg collection <id>`          | Collection details        | `mg collection col1abc...`          |
| `mg collection nfts <id>`     | NFTs in collection        | `mg collection nfts col1abc...`     |
| `mg collection stats <id>`    | Collection statistics     | `mg collection stats col1abc...`    |
| `mg collection activity <id>` | Recent activity           | `mg collection activity col1abc...` |

### NFT Commands

| Command                        | Description   | Example                     |
| ------------------------------ | ------------- | --------------------------- |
| `mg nft <launcher_id>`         | NFT details   | `mg nft nft1abc...`         |
| `mg nft history <launcher_id>` | Trade history | `mg nft history nft1abc...` |
| `mg nft offers <launcher_id>`  | Active offers | `mg nft offers nft1abc...`  |

### Profile Commands

| Command                          | Description     | Example                     |
| -------------------------------- | --------------- | --------------------------- |
| `mg profile <username\|did>`     | Profile details | `mg profile alice`          |
| `mg profile nfts <username>`     | User's NFTs     | `mg profile nfts alice`     |
| `mg profile activity <username>` | User's activity | `mg profile activity alice` |

### Stats & Events

| Command                     | Description          | Example                |
| --------------------------- | -------------------- | ---------------------- |
| `mg events`                 | Recent global events | `mg events`            |
| `mg events <collection_id>` | Collection events    | `mg events col1abc...` |
| `mg stats`                  | Global stats         | `mg stats`             |
| `mg trending`               | Trending (24h)       | `mg trending`          |
| `mg top collectors`         | Top collectors (7d)  | `mg top collectors`    |
| `mg top traders`            | Top traders (7d)     | `mg top traders`       |

### Shortcuts

| Input             | Action                 |
| ----------------- | ---------------------- |
| `mg col1abc...`   | Get collection by ID   |
| `mg nft1abc...`   | Get NFT by launcher ID |
| `mg did:chia:...` | Get profile by DID     |

## 🛠️ API Methods

Complete method reference for the API client:

### Search

- `search(query, options)` — Search all
- `searchNFTs(query, options)` — Search NFTs
- `searchCollections(query, options)` — Search collections

### Collections

- `getCollections(options)` — List collections
- `getCollection(id)` — Get collection
- `getCollectionNFTs(id, options)` — Collection NFTs
- `getCollectionAttributes(id)` — Collection attributes
- `getCollectionStats(id)` — Collection stats
- `getCollectionActivity(id, options)` — Collection activity

### NFTs

- `getNFT(launcherId)` — Get NFT
- `getNFTHistory(launcherId, options)` — Trade history
- `getNFTOffers(launcherId, options)` — Active offers

### Profiles

- `getProfile(identifier)` — Get profile
- `getProfileNFTs(identifier, options)` — Profile's NFTs
- `getProfileCollections(identifier, options)` — Profile's collections
- `getProfileActivity(identifier, options)` — Profile activity
- `getProfileOffers(identifier, options)` — Profile offers

### Events & Stats

- `getEvents(options)` — Global/collection events
- `getGlobalActivity(options)` — Global activity
- `getGlobalStats()` — Global stats
- `getTrending(options)` — Trending collections
- `getTopCollectors(options)` — Top collectors
- `getTopTraders(options)` — Top traders

### Offers

- `getOffers(options)` — List offers
- `getOffer(id)` — Get offer

### Utilities

- `resolveAddress(address)` — Resolve address
- `getCAT(assetId)` — Get CAT info

## 📊 Output Examples

### Collection Details

```
📚 Chia Friends
✓ Verified

Floor Price: 0.450 XCH
Volume 24h: 12.300 XCH
Volume 7d: 89.500 XCH
Total Volume: 1247.800 XCH

Items: 10000
Owners: 3421
Sales: 8756

ID: col1abc...
```

### NFT Details

```
🖼  Rare Zombie #4567

Collection: Zombie NFTs
Price: 2.500 XCH
Floor: 1.200 XCH

Rarity: #127 of 10000
Owner: did:chia:...

Attributes:
  • Background: Purple
  • Eyes: Red
  • Hat: Crown

Launcher ID: nft1abc...
```

### Trending Collections

```
🔥 Trending Collections (24h):

1. Chia Friends
   Floor: 0.450 XCH | Vol: 12.300 XCH
   Sales: 27

2. Space Cats
   Floor: 0.800 XCH | Vol: 8.700 XCH
   Sales: 11
```

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Custom API base URL
export MINTGARDEN_API_URL=https://api.mintgarden.io
```

### Options

Most methods accept an `options` object:

```javascript
{
  offset: 0,        // Pagination offset
  limit: 50,        // Results per page (max 100)
  sort: 'volume_7d', // Sort field
  order: 'desc'     // Sort order
}
```

## 🧪 Examples

### Track a Collection's Activity

```javascript
const api = new MintGardenAPI()

// Get collection stats
const stats = await api.getCollectionStats('col1abc...')
console.log(`Floor: ${stats.floor_price / 1e12} XCH`)

// Get recent sales
const activity = await api.getCollectionActivity('col1abc...', { limit: 10 })
activity.events.forEach((event) => {
  console.log(`${event.type}: ${event.price / 1e12} XCH`)
})
```

### Find Underpriced NFTs

```javascript
const api = new MintGardenAPI()

const collection = await api.getCollection('col1abc...')
const floor = collection.floor_price

const nfts = await api.getCollectionNFTs('col1abc...', { limit: 100 })
const deals = nfts.nfts.filter((nft) => nft.price < floor * 0.8)

console.log(`Found ${deals.length} NFTs below 80% of floor!`)
```

### Monitor Marketplace

```javascript
const api = new MintGardenAPI()

setInterval(async () => {
  const events = await api.getEvents({ limit: 5 })
  events.events.forEach((event) => {
    console.log(`${event.type}: ${event.nft.name} - ${event.price / 1e12} XCH`)
  })
}, 60000) // Check every minute
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Links

- **MintGarden**: https://mintgarden.io
- **API Docs**: https://api.mintgarden.io/docs
- **Clawdbot**: https://clawd.bot
- **ClawdHub**: https://clawdhub.com
- **Chia Network**: https://chia.net

## 💬 Support

- Issues: [GitHub Issues](https://github.com/yourusername/mintgarden-skill/issues)
- Discord: [Clawdbot Community](https://discord.gg/clawd)
- Telegram: [@clawdbot](https://t.me/clawdbot)

---

<p align="center">Made with 🖖 by the Clawdbot community</p>
