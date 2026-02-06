# Risk Management

> Comprehensive guide to managing risk, avoiding liquidation, and protecting capital on 01.xyz.

Proper risk management is the difference between surviving long-term and being liquidated. This guide covers margin mechanics, position sizing, and circuit breakers.

## Table of Contents

1. [Margin Fraction Deep Dive](#margin-fraction-deep-dive)
2. [Liquidation Mechanics](#liquidation-mechanics)
3. [Funding Rate Impact](#funding-rate-impact)
4. [Position Sizing Guidelines](#position-sizing-guidelines)
5. [Circuit Breakers](#circuit-breakers)
6. [Risk Monitoring System](#risk-monitoring-system)

---

## Margin Fraction Deep Dive

### The Formula

```
Margin Fraction = (Total Account Value) / (Total Position Notional)

Where:
- Total Account Value = Collateral + Unrealized PnL - Unpaid Funding
- Total Position Notional = Σ |Position Size × Mark Price|
```

### Real Example

```
Scenario: You have $10,000 USDC collateral

Position 1: 5 BTC at $100,000 = $500,000 notional
Position 2: -100 SOL at $150 = -$15,000 notional (short)

Market moves:
- BTC drops 2% → Unrealized PnL: -$10,000
- SOL rises 3% → Unrealized PnL: -$450

Calculation:
Total Account Value = $10,000 - $10,000 - $450 = -$450
Total Position Notional = $500,000 + $15,000 = $515,000

Margin Fraction = -$450 / $515,000 = -0.00087 (-0.087%)

⚠️ RESULT: Account is bankrupt and will be liquidated
```

### Margin Fraction Zones

| Zone            | Margin Fraction | Status                    | Action Required             |
| --------------- | --------------- | ------------------------- | --------------------------- |
| **Safe**        | > 50%           | Conservative leverage     | Monitor as normal           |
| **Caution**     | 20% - 50%       | Moderate leverage         | Increase monitoring         |
| **Warning**     | 10% - 20%       | High leverage             | Consider reducing positions |
| **Danger**      | 5% - 10%        | Very high leverage        | Add margin or reduce NOW    |
| **Liquidation** | < 5%            | At or below maint. margin | Liquidation imminent        |

### Calculating Your Position

```javascript
function calculateRiskMetrics(account, markets) {
  const totalCollateral = account.totalCollateral
  const unrealizedPnl = account.positions.reduce((sum, pos) => {
    const market = markets.find((m) => m.id === pos.marketId)
    return sum + pos.size * (market.markPrice - pos.entryPrice)
  }, 0)

  const totalAccountValue = totalCollateral + unrealizedPnl - account.unpaidFunding

  const positionNotional = account.positions.reduce((sum, pos) => {
    const market = markets.find((m) => m.id === pos.marketId)
    return sum + Math.abs(pos.size * market.markPrice)
  }, 0)

  const marginFraction = totalAccountValue / positionNotional
  const effectiveLeverage = positionNotional / totalAccountValue

  return {
    totalCollateral,
    unrealizedPnl,
    totalAccountValue,
    positionNotional,
    marginFraction: marginFraction * 100, // as percentage
    effectiveLeverage: effectiveLeverage.toFixed(2) + 'x',
    status: getRiskStatus(marginFraction),
  }
}

function getRiskStatus(mf) {
  if (mf > 0.5) return 'SAFE'
  if (mf > 0.2) return 'CAUTION'
  if (mf > 0.1) return 'WARNING'
  if (mf > 0.05) return 'DANGER'
  return 'LIQUIDATION'
}
```

---

## Liquidation Mechanics

### What Triggers Liquidation?

Liquidation occurs when: `Margin Fraction < Maintenance Margin Requirement`

Each market has its own maintenance margin:

- BTC/ETH/SOL: 5%
- Altcoins: 10%

### The Liquidation Process

```
1. Account margin fraction drops below maintenance requirement
2. Liquidation engine identifies the account
3. Engine closes positions at market price
4. Liquidation fee charged (typically higher than normal fees)
5. Remaining margin returned to account
```

### Liquidation Price Calculation

```javascript
function calculateLiquidationPrice(position, account, market) {
  const maintenanceMargin = market.maintenanceMargin // e.g., 0.05 for 5%

  if (position.side === 'long') {
    // For longs: price drops to this level
    return position.entryPrice * (1 - (account.marginFraction - maintenanceMargin))
  } else {
    // For shorts: price rises to this level
    return position.entryPrice * (1 + (account.marginFraction - maintenanceMargin))
  }
}

// Example: Long position
const longPosition = {
  entryPrice: 150,
  size: 100,
  side: 'long',
}
const account = {
  marginFraction: 0.1, // 10%
}
const market = {
  maintenanceMargin: 0.05, // 5%
}

// Distance to liquidation: 10% - 5% = 5%
// Liquidation price: $150 * (1 - 0.05) = $142.50
```

### Liquidation Buffer

Always maintain a buffer above the minimum:

| Recommendation   | Buffer Above Maintenance | Why                                    |
| ---------------- | ------------------------ | -------------------------------------- |
| **Conservative** | 15%                      | Volatility protection                  |
| **Moderate**     | 10%                      | Normal market conditions               |
| **Aggressive**   | 5%                       | Tight risk, requires active monitoring |

**Formula:**

```
Minimum Safe Margin Fraction = Maintenance Margin + Buffer

Example (BTC):
Maintenance: 5%
Buffer: 10%
Minimum Safe: 15%
```

### Estimating Time to Liquidation

```javascript
function estimateTimeToLiquidation(position, account, market, volatilityMetrics) {
  const currentPrice = market.markPrice
  const liquidationPrice = calculateLiquidationPrice(position, account, market)
  const distanceToLiquidation = Math.abs(currentPrice - liquidationPrice) / currentPrice

  // Using average 24h volatility
  const avgMovePerHour = volatilityMetrics.hourlyVolatility || 0.02 // 2%

  const hoursToLiquidation = distanceToLiquidation / avgMovePerHour

  return {
    distance: (distanceToLiquidation * 100).toFixed(2) + '%',
    liquidationPrice: liquidationPrice.toFixed(2),
    estimatedHours: Math.floor(hoursToLiquidation),
    riskLevel:
      hoursToLiquidation < 1
        ? 'CRITICAL'
        : hoursToLiquidation < 4
          ? 'HIGH'
          : hoursToLiquidation < 24
            ? 'MODERATE'
            : 'LOW',
  }
}
```

---

## Funding Rate Impact

### Funding Rate Mechanics

Funding rates keep perpetuals aligned with spot prices:

```
Every 8 hours (00:00, 08:00, 16:00 UTC):
- Funding Payment = Position Size × Mark Price × Funding Rate

If funding rate = +0.01%:
- Longs pay shorts: 0.01% of position value
If funding rate = -0.01%:
- Shorts pay longs: 0.01% of position value
```

### Annualized Funding Cost

```javascript
function calculateAnnualizedFunding(rates) {
  // Daily rates paid 3 times per day
  const dailyRate = rates.reduce((sum, r) => sum + r, 0)
  return dailyRate * 365
}

// Example: Last 30 funding periods
const rates = [0.0001, 0.0002, 0.00015, 0.00008 /* ... */]
const annualized = calculateAnnualizedFunding(rates)

console.log(`Current funding trend: ${(annualized * 100).toFixed(2)}% APR`)

// Position impact
const positionSize = 100 // SOL
const markPrice = 150
const annualCost = positionSize * markPrice * annualized
console.log(`Annual funding cost: $${annualCost.toFixed(2)}`)
```

### Funding Rate Arbitrage

When funding rates are extreme, consider:

| Strategy            | Conditions         | Execution                         |
| ------------------- | ------------------ | --------------------------------- |
| **Receive Funding** | Very positive rate | Open small short, collect funding |
| **Pay to Hedge**    | Very negative rate | Accept funding cost to hedge spot |
| **Avoid**           | Rate > 0.1% per 8h | Too expensive to hold position    |

---

## Position Sizing Guidelines

### The 2% Rule (Conservative)

Never risk more than 2% of total capital on a single trade:

```javascript
function calculatePositionSize(account, entryPrice, stopLossPrice, riskPercent = 2) {
  const capital = account.totalCollateral
  const riskAmount = capital * (riskPercent / 100)

  const priceDistance = Math.abs(entryPrice - stopLossPrice)
  const positionSize = riskAmount / priceDistance

  return {
    maxPositionSize: positionSize,
    riskAmount: riskAmount,
    riskPercent: riskPercent + '%',
  }
}

// Example
const account = { totalCollateral: 100000 } // $100k
const entryPrice = 150
const stopLoss = 140

const sizing = calculatePositionSize(account, entryPrice, stopLoss, 2)
// Result: Can buy ~20 SOL max (risk $2000 if stopped out)
```

### Kelly Criterion (Advanced)

For positive-expectancy strategies:

```javascript
function kellyFraction(winProbability, winRate, lossRate) {
  // Kelly = (p × b - q) / b
  // Where: p = win probability, q = loss probability (1-p), b = win/loss ratio
  const q = 1 - winProbability
  const b = winRate / lossRate
  return (winProbability * b - q) / b
}

// Example: 60% win rate, 2:1 reward/risk
const kelly = kellyFraction(0.6, 2, 1) // 0.4 or 40%

// Use fractional Kelly for safety
const halfKelly = kelly / 2 // 20% of account per trade
```

### Maximum Leverage by Experience

| Experience Level | Max Leverage | Rationale                   |
| ---------------- | ------------ | --------------------------- |
| **Beginner**     | 2-3x         | Room for mistakes, learning |
| **Intermediate** | 5-10x        | Comfort with mechanics      |
| **Advanced**     | 10-20x       | Full understanding of risks |

### Position Sizing Checklist

☐ **Entry planned** — Know your entry price  
☐ **Stop-loss set** — Know your maximum loss  
☐ **Risk calculated** — Position size appropriate for account  
☐ **Leverage checked** — Within safe limits  
☐ **Funding considered** — Holding period factored  
☐ **Catalyst timing** — Avoiding high-impact events initially

---

## Circuit Breakers

### Automated Safety Limits

Circuit breakers automatically stop trading when risk thresholds are breached.

### Tier 1: Soft Limits (Warnings)

```javascript
const softLimits = {
  maxDrawdown: 0.1, // 10% daily drawdown
  maxPositionSize: 50000, // $50k per position
  maxLeverage: 10, // 10x maximum
  minMarginFraction: 0.25, // 25% margin fraction
}

function checkSoftLimits(account, positions) {
  const violations = []

  if (account.dailyDrawdown > softLimits.maxDrawdown) {
    violations.push('Daily drawdown exceeded')
  }

  const leverage = calculateLeverage(account, positions)
  if (leverage > softLimits.maxLeverage) {
    violations.push(`Leverage ${leverage.toFixed(1)}x exceeds ${softLimits.maxLeverage}x`)
  }

  if (account.marginFraction < softLimits.minMarginFraction) {
    violations.push('Margin fraction below safe threshold')
  }

  return violations
}
```

### Tier 2: Hard Limits (Trading Halt)

```javascript
const hardLimits = {
  maxDrawdown: 0.2, // 20% drawdown = stop trading
  minMarginFraction: 0.1, // 10% = liquidation danger
  maxDailyTrades: 50, // Prevent overtrading
  maxLossPerTrade: 5000, // $5k max loss per trade
}

function enforceHardLimits(account, positions, todayStats) {
  const mustStop = []

  if (todayStats.drawdown > hardLimits.maxDrawdown) {
    mustStop.push('Trading suspended: 20% drawdown reached')
    // Close all positions, require manual restart
  }

  if (account.marginFraction < hardLimits.minMarginFraction) {
    mustStop.push('Trading suspended: Critical margin level')
    // Emergency margin add or position reduction required
  }

  if (todayStats.tradeCount > hardLimits.maxDailyTrades) {
    mustStop.push('Trading suspended: Daily trade limit reached')
  }

  return mustStop
}
```

### Manual Kill Switch

Always have a way to stop everything immediately:

```javascript
class EmergencyKillSwitch {
  constructor(nordClient) {
    this.nord = nordClient
    this.armed = true
    this.lastHeartbeat = Date.now()
  }

  async trigger(reason) {
    if (!this.armed) return

    console.log(`🚨 EMERGENCY KILL SWITCH ACTIVATED: ${reason}`)

    try {
      // 1. Cancel all pending orders
      await this.nord.cancelAllOrders()
      console.log('✅ All orders cancelled')

      // 2. Close all positions
      const account = await this.nord.getAccount()
      for (const position of account.positions) {
        await this.nord.closePosition(position.marketId)
        console.log(`✅ Closed position: ${position.marketId}`)
      }

      // 3. Log and notify
      await this.logEmergency(reason)

      // 4. Disable trading
      this.armed = false
    } catch (error) {
      console.error('Kill switch failed:', error)
      // Fallback to notifications
      await this.sendEmergencyAlert(error)
    }
  }

  disarm() {
    console.log('⚠️ Kill switch disarmed — trading resumed')
    this.armed = false
  }
}

// Usage
const killSwitch = new EmergencyKillSwitch(nord)

// Bind to signals
process.on('SIGINT', () => killSwitch.trigger('Manual interrupt'))

// Bind to risk triggers
checkAccountHealth().then((health) => {
  if (health.status === 'LIQUIDATION') {
    killSwitch.trigger('Liquidation imminent')
  }
})
```

---

## Risk Monitoring System

### Complete Risk Monitor

```javascript
class RiskMonitor {
  constructor(nord, config) {
    this.nord = nord
    this.config = config
    this.alerts = []
    this.running = false
  }

  async start() {
    this.running = true
    console.log('Risk monitoring started...')

    while (this.running) {
      await this.checkAll()
      await this.sleep(this.config.checkInterval || 5000)
    }
  }

  async checkAll() {
    try {
      const account = await this.nord.getAccount()
      const markets = await this.nord.getMarkets()

      // 1. Check margin fraction
      await this.checkMarginFraction(account)

      // 2. Check position concentrations
      await this.checkConcentration(account, markets)

      // 3. Check funding exposure
      await this.checkFundingExposure(account, markets)

      // 4. Check drawdown
      await this.checkDrawdown(account)

      // 5. Report status
      this.reportStatus(account)
    } catch (error) {
      console.error('Risk check failed:', error)
    }
  }

  async checkMarginFraction(account) {
    const mf = account.marginFraction * 100

    if (mf < 10) {
      await this.alert('CRITICAL', `Margin fraction ${mf.toFixed(2)}% — Liquidation imminent!`)
    } else if (mf < 15) {
      await this.alert(
        'WARNING',
        `Margin fraction ${mf.toFixed(2)}% — Add margin or reduce positions`,
      )
    } else if (mf < 20) {
      console.log(`⚠️ Margin fraction low: ${mf.toFixed(2)}%`)
    }
  }

  async checkConcentration(account, markets) {
    const totalValue = account.positions.reduce((sum, p) => {
      const m = markets.find((x) => x.id === p.marketId)
      return sum + Math.abs(p.size * m.markPrice)
    }, 0)

    for (const position of account.positions) {
      const market = markets.find((m) => m.id === position.marketId)
      const value = Math.abs(position.size * market.markPrice)
      const concentration = value / totalValue

      if (concentration > 0.5) {
        await this.alert(
          'WARNING',
          `${market.symbol} is ${(concentration * 100).toFixed(0)}% of portfolio — over-concentrated`,
        )
      }
    }
  }

  async checkFundingExposure(account, markets) {
    let totalDailyFunding = 0

    for (const position of account.positions) {
      const market = markets.find((m) => m.id === position.marketId)
      const stats = await this.nord.getMarketStats(position.marketId)
      const fundingCost = position.size * market.markPrice * stats.fundingRate * 3
      totalDailyFunding += fundingCost
    }

    if (Math.abs(totalDailyFunding) > account.totalCollateral * 0.001) {
      await this.alert('INFO', `Daily funding impact: $${totalDailyFunding.toFixed(2)}`)
    }
  }

  async checkDrawdown(account) {
    const peakValue = this.getPeakValue() // Track highest account value
    const currentValue = account.totalAccountValue
    const drawdown = (peakValue - currentValue) / peakValue

    if (drawdown > 0.1) {
      await this.alert('WARNING', `Drawdown: ${(drawdown * 100).toFixed(2)}%`)
    }
    if (drawdown > 0.2) {
      await this.alert(
        'CRITICAL',
        `Severe drawdown: ${(drawdown * 100).toFixed(2)}% — Consider reducing exposure`,
      )
    }
  }

  async alert(level, message) {
    const alert = { level, message, time: new Date() }
    this.alerts.push(alert)

    // Log to console
    const emoji = level === 'CRITICAL' ? '🚨' : level === 'WARNING' ? '⚠️' : 'ℹ️'
    console.log(`${emoji} [${level}] ${message}`)

    // Send notification (implement your own)
    await this.sendNotification(alert)
  }

  reportStatus(account) {
    const mf = (account.marginFraction * 100).toFixed(2)
    const leverage = (account.totalPositionValue / account.totalAccountValue).toFixed(2)

    console.log(
      `[Monitor] Margin: ${mf}% | Leverage: ${leverage}x | Positions: ${account.positions.length}`,
    )
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

### Emergency Response Playbook

| Scenario                  | Immediate Action                      | Follow-up           |
| ------------------------- | ------------------------------------- | ------------------- |
| **Margin < 10%**          | Add collateral OR reduce 50% position | Review risk model   |
| **Single position > 60%** | Trim to <40%                          | Diversify strategy  |
| **Funding cost > 1%/day** | Close or hedge                        | Review hold time    |
| **Tech issues**           | Kill switch, manual check             | Debug, document     |
| **Extreme volatility**    | Reduce leverage, widen stops          | Monitor correlation |

---

## Summary

### The Risk Management Hierarchy

```
1. POSITION SIZING (what you control)
   ↓ 2% rule, Kelly sizing, max leverage limits
2. CIRCUIT BREAKERS (automated protection)
   ↓ Soft warnings, hard limits, kill switches
3. MONITORING (constant vigilance)
   ↓ Margin fraction, concentration, funding, drawdown
4. EMERGENCY PROCEDURES (last resort)
   ↓ Close all, add margin, manual intervention
```

### Key Ratios to Watch

| Metric          | Good  | Warning | Danger |
| --------------- | ----- | ------- | ------ |
| Margin Fraction | > 25% | 10-25%  | < 10%  |
| Leverage        | < 5x  | 5-10x   | > 10x  |
| Concentration   | < 40% | 40-60%  | > 60%  |
| Daily Drawdown  | < 5%  | 5-15%   | > 15%  |

---

_Next: Read [trading-basics.md](trading-basics.md) for order placement mechanics._
