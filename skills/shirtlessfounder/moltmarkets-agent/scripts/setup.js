#!/usr/bin/env node

/**
 * MoltMarkets Agent Setup Script
 *
 * Creates all required memory files and validates credentials.
 * Run: node skills/moltmarkets-agent/scripts/setup.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const MEMORY_DIR = path.join(process.cwd(), 'memory')
const CREDS_PATH = path.join(process.env.HOME, '.config/moltmarkets/credentials.json')

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
  console.log('✓ Created memory/ directory')
}

// Check credentials
if (!fs.existsSync(CREDS_PATH)) {
  console.error('✗ Missing credentials file: ~/.config/moltmarkets/credentials.json')
  console.error('  Create it with: { "api_key": "mm_xxx", "user_id": "uuid", "username": "xxx" }')
  process.exit(1)
}

const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'))
console.log(`✓ Found credentials for user: ${creds.username}`)

// Validate API key
function validateApiKey() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.zcombinator.io/molt',
      path: '/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${creds.api_key}` },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode === 200) {
          const user = JSON.parse(data)
          console.log(`✓ API key valid. Balance: ${user.balance}ŧ`)
          resolve(user)
        } else {
          reject(new Error(`API returned ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Create memory files
const files = {
  'moltmarkets-shared-state.json': {
    balance: 0, // Will be updated from API
    lastUpdated: new Date().toISOString(),
    lastAction: { agent: 'setup', action: 'Initial setup', cost: 0, marketIds: [] },
    notifications: {
      dmDylan: { onResolution: false, onTrade: false, onCreation: false, onSpawn: false },
    },
    config: {
      trader: { edgeThreshold: 0.1, kellyMultiplier: 1.0, maxPositionPct: 0.3, mode: 'aggressive' },
      creator: { maxOpenMarkets: 8, cooldownMinutes: 20, minBalance: 50, mode: 'loose-cannon' },
    },
    recentTrades: [],
    recentCreations: [],
  },

  'trader-history.json': {
    trades: [],
    categoryStats: {
      crypto_price: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
      news_events: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
      pr_merge: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
      github_activity: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
      cabal_response: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
      platform_meta: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalPnL: 0,
        recentLossStreak: 0,
        recentWinStreak: 0,
      },
    },
    lastTradeId: 0,
    netPnL: 0,
  },

  'creator-roi.json': {
    markets: [],
    totalLiquiditySeeded: 0,
    totalFeesEarned: 0,
    netROI: 0,
    avgVolumePerMarket: 0,
    zeroVolumeCount: 0,
  },
}

const mdFiles = {
  'trader-learnings.md': `# Trader Learnings — MoltMarkets

## Purpose
Track patterns from wins/losses and adjust strategy accordingly.

---

## ⚠️ Categories Needing Improvement

*None yet — collecting data*

---

## 📊 Category Performance Summary

| Category | Trades | Win Rate | Total PnL | Status |
|----------|--------|----------|-----------|--------|
| crypto_price | 0 | - | 0ŧ | ✅ OK |
| news_events | 0 | - | 0ŧ | ✅ OK |
| pr_merge | 0 | - | 0ŧ | ✅ OK |
| github_activity | 0 | - | 0ŧ | ✅ OK |
| cabal_response | 0 | - | 0ŧ | ✅ OK |
| platform_meta | 0 | - | 0ŧ | ✅ OK |

---

## 📝 Lessons Learned

*Document specific lessons after each loss*

---

*Last updated: ${new Date().toISOString()}*
`,

  'creator-learnings.md': `# Creator Learnings — MoltMarkets

## Purpose
Track what types of markets generate volume. Volume = fees = ROI.

---

## 📊 Category Performance Summary

| Category | Created | Avg Volume | Zero Vol % | Status |
|----------|---------|------------|------------|--------|
| crypto_price | 0 | - | - | 🆕 NEW |
| news_events | 0 | - | - | 🆕 NEW |
| meta_cabal | 0 | - | - | 🆕 NEW |

---

## 🎯 What Makes Markets Tradeable

- **Stakes**: Real outcome people care about
- **Edge**: Traders think they know better than market
- **Clarity**: Obviously resolvable
- **Fun**: Entertaining to participate in

---

*Last updated: ${new Date().toISOString()}*
`,

  'trader-kelly.md': `# Kelly Criterion for MoltMarkets

## Formula

kelly% = edge / odds

Where:
- edge = your_probability - market_probability
- odds = 1 / market_probability (YES) or 1 / (1 - market_probability) (NO)

## Risk Adjustments

| Condition | Kelly Multiplier |
|-----------|-----------------|
| Normal | 1.0x |
| Category loss streak 2 | 0.5x |
| Category loss streak 3+ | 0x (skip) |

## Position Limits

- Max 30% of balance per bet
- Min 10% edge to bet
- Round down bet sizes
`,
}

async function main() {
  try {
    // Validate API
    const user = await validateApiKey()

    // Update shared state with actual balance
    files['moltmarkets-shared-state.json'].balance = user.balance

    // Create JSON files
    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(MEMORY_DIR, filename)
      if (fs.existsSync(filepath)) {
        console.log(`⏭ Skipping ${filename} (already exists)`)
      } else {
        fs.writeFileSync(filepath, JSON.stringify(content, null, 2))
        console.log(`✓ Created ${filename}`)
      }
    }

    // Create MD files
    for (const [filename, content] of Object.entries(mdFiles)) {
      const filepath = path.join(MEMORY_DIR, filename)
      if (fs.existsSync(filepath)) {
        console.log(`⏭ Skipping ${filename} (already exists)`)
      } else {
        fs.writeFileSync(filepath, content)
        console.log(`✓ Created ${filename}`)
      }
    }

    console.log('\n✅ Setup complete!')
    console.log('\nNext steps:')
    console.log('1. Create cron jobs using definitions in references/cron-definitions.md')
    console.log('2. Review and customize config in memory/moltmarkets-shared-state.json')
    console.log(
      '3. Monitor performance in memory/trader-learnings.md and memory/creator-learnings.md',
    )
  } catch (err) {
    console.error('✗ Setup failed:', err.message)
    process.exit(1)
  }
}

main()
