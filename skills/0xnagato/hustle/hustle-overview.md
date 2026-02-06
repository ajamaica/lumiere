# Hustle - Arbitrage Intelligence & Operations Engine

**Last Updated:** 2026-02-01
**Location:** ~/Desktop/game-compare/hustle/
**Purpose:** Multi-game arbitrage automation for loot-to-cash operations

## System Overview

The Hustle Engine is an arbitrage intelligence system that extracts value from virtual game economies through automated market monitoring, price analysis, and trade execution. It focuses on "Loot-to-Cash" opportunities across multiple games with real-money economies.

```
┌─────────────────────────────────────────────────────────────┐
│                    External Game Economies                   │
│  ARC Raiders │ Off The Grid │ Albion Online │ Once Human    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Layer (Python)                  │
│                                                               │
│  Solvers:                                                    │
│  • arc-raiders/solver.py (Active)                            │
│  • albion/solver.py (Active)                                 │
│  • otg/scraped_prices.json (Manual)                          │
│                                                               │
│  Components:                                                 │
│  • monitor.py - Price data collection                        │
│  • decider.py - Trade decision logic                         │
│  • solver.py - Profit optimization                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Decision Layer (AI)                         │
│                                                               │
│  • AGENTS.md - Agent identity & behavior                     │
│  • SOUL.md - Core principles & boundaries                    │
│  • HEARTBEAT.md - Periodic checks & automation               │
│                                                               │
│  Knowledge:                                                  │
│  • leads.md - Market opportunities                           │
│  • training_manual.md - Operational procedures               │
│  • daily_leads.md - Daily activity log                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution Layer                             │
│                                                               │
│  Vault: .vault/secrets.json                                  │
│  • Game account credentials                                  │
│  • API keys & authentication                                 │
│  • Wallet addresses                                          │
│                                                               │
│  Web Dashboard: arc-raiders/web/                             │
│  • Profit tracking                                           │
│  • Market analysis                                           │
│  • Trade history                                             │
└─────────────────────────────────────────────────────────────┘
```

## Active Hustles

| Game              | Status      | ROI      | Type               | Documentation                          |
| ----------------- | ----------- | -------- | ------------------ | -------------------------------------- |
| **ARC Raiders**   | ✅ Active   | 100-300% | Loot Extraction    | [arc-raiders.md](./arc-raiders.md)     |
| **Albion Online** | ✅ Active   | 20-50%   | Black Market       | [albion-online.md](./albion-online.md) |
| **Off The Grid**  | ⚠️ Manual   | 200-500% | Blockchain Parts   | [off-the-grid.md](./off-the-grid.md)   |
| **Once Human**    | 📋 Research | 150-300% | Blueprint Flipping | TBD                                    |

## Directory Structure

```
hustle/
├── AGENTS.md              # Agent persona & operational guidelines
├── SOUL.md                # Core principles & boundaries
├── HEARTBEAT.md           # Periodic automation tasks
├── BOOTSTRAP.md           # First-run setup
├── IDENTITY.md            # Agent identity configuration
├── USER.md                # User profile & preferences
├── TOOLS.md               # Tool configurations
├── SCALABILITY_REPORT.md  # Expansion opportunities
│
├── arc-raiders/           # ARC Raiders solver (Active)
│   ├── HUSTLE_PROTOCOL.md # ARC-specific operations manual
│   ├── monitor.py         # Price monitoring
│   ├── decider.py         # Trade decision logic
│   ├── solver.py          # Profit optimization
│   └── web/               # Dashboard application
│
├── albion/                # Albion Online solver (Active)
│   ├── solver.py          # Black market arbitrage
│   └── items.json         # Item database
│
├── otg/                   # Off The Grid (Manual)
│   ├── scraped_prices.json
│   └── assets.json
│
├── engine/                # Core automation engine
│   ├── vault.py           # Credential management
│   └── [other utilities]
│
├── knowledge/             # Market intelligence
│   ├── leads.md           # Opportunity tracking
│   ├── training_manual.md # Operational procedures
│   └── daily_leads.md     # Daily activity log
│
├── solvers/               # Generic solver utilities
├── logic/                 # Decision logic modules
├── logs/                  # Operation logs
└── skills/                # Solver-specific skills
```

## Core Concepts

### 1. Loot-to-Cash Flow

```
Extract In-Game → Optimize → List → Sell → Cash Out
      ↓              ↓         ↓      ↓        ↓
   Bot Farm    Solver.py  Odealo   Buyer   PayPal/Crypto
```

### 2. Arbitrage Strategies

#### Craft Arbitrage (Albion)

- Buy raw materials at low prices
- Craft in cities with resource return bonuses
- Sell to Black Market at premium

#### Floor Sweeping (OTG)

- Monitor OpenSea for underpriced cyber parts
- Auto-buy when price drops below threshold
- Resell when market normalizes

#### Seasonal Flipping (Once Human)

- Accumulate scarce materials early season
- Craft rare blueprints
- Sell to late-season players at premium

### 3. Automation Patterns

#### Monitor Pattern

```python
# Continuous price monitoring
while True:
    prices = fetch_market_data()
    opportunities = identify_arbitrage(prices)
    if opportunities:
        alert_user(opportunities)
    sleep(interval)
```

#### Solver Pattern

```python
# Profit optimization
def optimize_trades(prices, inventory, constraints):
    # Linear programming or heuristic optimization
    best_trades = calculate_max_profit(prices, inventory)
    return sorted(best_trades, key=lambda x: x.roi, reverse=True)
```

#### Decider Pattern

```python
# Risk-adjusted decision making
def should_execute_trade(trade, risk_tolerance, market_volatility):
    expected_profit = trade.profit
    risk_score = calculate_risk(market_volatility)
    if expected_profit / risk_score > risk_tolerance:
        return True
    return False
```

## Agent Persona

### Core Principles (from SOUL.md)

1. **Be genuinely helpful, not performatively helpful**
   - Skip filler, take action
   - Actions speak louder than words

2. **Have opinions**
   - Allowed to disagree, prefer, find things interesting
   - Not a search engine with extra steps

3. **Be resourceful before asking**
   - Read files, check context, search
   - Come back with answers, not questions

4. **Earn trust through competence**
   - Be careful with external actions (emails, posts)
   - Be bold with internal actions (reading, organizing)

### Operational Guidelines (from AGENTS.md)

#### Session Startup Routine

1. Read `SOUL.md` - Who you are
2. Read `USER.md` - Who you're helping
3. Read recent `memory/*.md` - Recent context
4. Read `MEMORY.md` (main session only) - Long-term memory

#### Memory Management

- **Daily notes:** `memory/YYYY-MM-DD.md` - Raw activity logs
- **Long-term:** `MEMORY.md` - Curated memories & insights
- **State:** `memory/heartbeat-state.json` - Check timestamps

#### Safety Rules

- Don't exfiltrate private data (ever)
- Don't run destructive commands without asking
- Use `trash` > `rm` (recoverable beats gone)
- When in doubt, ask

### Heartbeat Operations

**Purpose:** Proactive background work without constant interruption

**When to Check:**

- Rotate through checks 2-4 times per day
- Track last check time in `heartbeat-state.json`
- Batch similar checks together

**What to Check:**

- **Market Opportunities** - New arbitrage spreads
- **Running Solvers** - Bot health & profit tracking
- **Memory Maintenance** - Update MEMORY.md from daily logs
- **Project Status** - Git status, pending work

**When to Reach Out:**

- Important profit opportunity (>50% ROI)
- Bot error or stuck process
- Interesting market trend discovered
- It's been >8h since last check-in

**When to Stay Quiet (HEARTBEAT_OK):**

- Late night (23:00-08:00) unless urgent
- User is clearly busy
- Nothing new since last check
- Just checked <30 minutes ago

## Vault Management

### Structure

```json
{
  "arc_raiders": {
    "username": "...",
    "password": "...",
    "session_token": "..."
  },
  "gunz_wallet": {
    "address": "0x...",
    "private_key": "..."
  },
  "odealo": {
    "api_key": "...",
    "seller_id": "..."
  }
}
```

### Usage

```bash
# Retrieve credential
python3 hustle/engine/vault.py --action retrieve --key arc_raiders

# Store credential
python3 hustle/engine/vault.py --action store --key new_game --value '{"user":"..."}'
```

## Web Dashboard

### ARC Raiders Dashboard

- **Location:** `arc-raiders/web/`
- **Purpose:** Real-time profit tracking
- **Features:**
  - Live price charts
  - Trade history
  - ROI calculations
  - Inventory management

### Tech Stack

- React + TypeScript
- Vite dev server
- Tailwind CSS
- Real-time WebSocket updates

## Automation Setup

### Cron Jobs (Recommended)

```bash
# Check market prices every 30 minutes
*/30 * * * * cd ~/Desktop/game-compare/hustle && python3 arc-raiders/monitor.py >> logs/monitor.log 2>&1

# Run Albion solver every hour
0 * * * * cd ~/Desktop/game-compare/hustle && python3 albion/solver.py >> logs/albion.log 2>&1

# Daily profit report at 8 PM
0 20 * * * cd ~/Desktop/game-compare/hustle && python3 engine/daily_report.py
```

### Heartbeat Integration

In `HEARTBEAT.md`:

```markdown
## Hustle Operations

Check these periodically (2-4x daily):

- [ ] ARC Raiders bot health: `ps aux | grep monitor.py`
- [ ] Recent profit opportunities: Read `logs/opportunities.log`
- [ ] Update daily_leads.md with new findings
```

## Performance Metrics

### Target ROI by Game

- **Albion Online:** 20-50% (high volume, low risk)
- **ARC Raiders:** 100-300% (medium volume, medium risk)
- **Off The Grid:** 200-500% (low volume, high risk, blockchain volatility)
- **Once Human:** 150-300% (seasonal, timing-dependent)

### Success Metrics

- **Profit Per Hour:** $10-50 automated
- **Win Rate:** >70% profitable trades
- **False Positives:** <10% failed opportunities
- **Uptime:** >95% bot availability

## Common Workflows

### 1. Starting a New Hustle

```bash
# 1. Research opportunity (manually)
# 2. Create solver in solvers/[game_name].py
# 3. Test solver with sample data
python3 solvers/new_game.py --test

# 4. Add to cron for automation
crontab -e

# 5. Monitor for 24h before scaling
tail -f logs/new_game.log
```

### 2. Investigating an Opportunity

```bash
# 1. Check recent leads
cat knowledge/daily_leads.md

# 2. Run solver manually
python3 [game]/solver.py --analyze

# 3. If profitable, execute trade
python3 [game]/solver.py --execute --amount [X]
```

### 3. Daily Profit Check

```bash
# 1. Check all solver logs
tail -n 50 logs/*.log | grep "PROFIT"

# 2. Review dashboard
cd arc-raiders/web && npm run dev

# 3. Update knowledge base
echo "$(date): [Finding]" >> knowledge/daily_leads.md
```

## Security Considerations

### Never Commit to Git

- `.vault/secrets.json` (credentials)
- `logs/*.log` (may contain sensitive data)
- `memory/MEMORY.md` (personal context)
- Screenshots with wallet addresses

### Safe Practices

- Use `.gitignore` for sensitive directories
- Encrypt vault at rest
- Use environment variables for API keys
- Never log credentials in plaintext

## Troubleshooting

### Bot Stopped Running

```bash
# Check process
ps aux | grep python | grep hustle

# Check logs
tail -f logs/monitor.log

# Restart if needed
python3 arc-raiders/monitor.py &
```

### API Rate Limited

```python
# Add exponential backoff
import time
def fetch_with_retry(url, max_retries=3):
    for i in range(max_retries):
        try:
            return requests.get(url)
        except RateLimitError:
            time.sleep(2 ** i)
```

### False Opportunities

```python
# Add minimum profit threshold
MIN_PROFIT_USD = 5
if trade.profit_usd < MIN_PROFIT_USD:
    continue  # Skip low-value opportunities
```

## Future Expansion

### Planned Features

1. **Multi-Solver Dashboard** - Unified view across all games
2. **AI-Powered Predictions** - ML models for price forecasting
3. **Automated Trade Execution** - Reduce manual intervention
4. **Risk Management** - Position sizing & stop losses

### Potential New Hustles

- **Tarkov:** Flea market arbitrage
- **Path of Exile:** Currency flipping
- **Eve Online:** Inter-station trade routes
- **CSGO:** Skin arbitrage

## Resources

### Internal Documentation

- [arc-raiders.md](./arc-raiders.md) - ARC Raiders solver
- [albion-online.md](./albion-online.md) - Albion solver
- [off-the-grid.md](./off-the-grid.md) - OTG manual operations

### External Resources

- [Albion Online Data Project](https://www.albion-online-data.com/) - Price API
- [GUNZ Marketplace](https://opensea.io/collection/gunz) - OTG cyber parts
- [Odealo](https://www.odealo.com/) - RMT marketplace

## Learnings Log

### 2026-02-01

- Created comprehensive hustle overview documentation
- Documented automation patterns and agent persona
- Added security guidelines and troubleshooting
- Prepared for cron/heartbeat integration

---

_This is the master hustle overview. See game-specific documentation for solver details._
