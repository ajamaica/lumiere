# Avantis Quick Start

## Essential Commands

### Check Status

```bash
# View open positions
avantis_venv/bin/python skills/avantis/scripts/positions.py
```

### Open Trade

```bash
# 5x long ETH with $10 collateral
avantis_venv/bin/python skills/avantis/scripts/trade.py long ETH 10 5

# 10x short BTC with $20 collateral, TP at $95k, SL at $102k
avantis_venv/bin/python skills/avantis/scripts/trade.py short BTC 20 10 --tp 95000 --sl 102000
```

### Close Trade

```bash
# Full close (use indices from positions.py)
avantis_venv/bin/python skills/avantis/scripts/close.py 0 0

# Partial close ($5 worth)
avantis_venv/bin/python skills/avantis/scripts/close.py 0 0 --amount 5
```

## Position Sizing Cheatsheet

| Collateral | Leverage | Position Size | Min Pair |
| ---------- | -------- | ------------- | -------- |
| $5         | 10x      | $50           | ETH, BTC |
| $10        | 5x       | $50           | ETH, BTC |
| $20        | 2.5x     | $50           | ETH, BTC |
| $10        | 10x      | $100          | Any      |

**Rule**: `collateral × leverage ≥ $30` for ETH, `≥ $50` for BTC

## Risk Management

### Conservative Setup

- Collateral: $10-20
- Leverage: 2-5x
- Always set stop loss
- Position size: <5% of account

### Moderate Setup

- Collateral: $20-50
- Leverage: 5-10x
- Tight stop loss required
- Position size: 5-10% of account

### Aggressive Setup (NOT RECOMMENDED FOR BEGINNERS)

- Collateral: $50+
- Leverage: 10-50x
- Very tight stops essential
- High liquidation risk

## Current Status

**Wallet**: `0x79622Ea91BBbDF860e9b0497E4C297fC52c8CE64`

- USDC: 49.82
- Gas: 0.004500 ETH (~89 trades)
- Approved: 100 USDC

**SDK**: Installed at `/home/ubuntu/clawd/avantis_venv/`

## Common Errors

### "BELOW_MIN_POS"

**Issue**: Position size too small
**Fix**: Increase collateral or leverage

```bash
# ❌ $5 × 5x = $25 (too small)
# ✅ $10 × 5x = $50 (works)
```

### "Price Feed Down" (503)

**Issue**: Avantis infrastructure temporarily unavailable
**Fix**: Wait 5-10 minutes and retry

### "Insufficient Balance"

**Issue**: Not enough USDC or gas
**Fix**: Add funds to wallet

## Pair Indices Reference

| Pair     | Index | Min Position |
| -------- | ----- | ------------ |
| ETH/USD  | 0     | $30          |
| BTC/USD  | 1     | $50          |
| LINK/USD | 2     | $30          |
| ...      | ...   | ...          |

**Get exact index**: The script automatically looks it up by pair name (e.g., "ETH")

## Examples

### Scenario: Bullish on ETH

```bash
# Open 5x long with $10, TP at $3500
avantis_venv/bin/python skills/avantis/scripts/trade.py long ETH 10 5 --tp 3500

# Check position
avantis_venv/bin/python skills/avantis/scripts/positions.py

# If price hits $3300, close half to lock profit
avantis_venv/bin/python skills/avantis/scripts/close.py 0 0 --amount 5
```

### Scenario: Expecting BTC Correction

```bash
# Open 3x short with $20, SL at $101k
avantis_venv/bin/python skills/avantis/scripts/trade.py short BTC 20 3 --sl 101000

# Monitor position
avantis_venv/bin/python skills/avantis/scripts/positions.py

# Close when target hit
avantis_venv/bin/python skills/avantis/scripts/close.py 1 0
```

## Next Steps

1. **Test with small amount**: Start with $10-20 collateral, 2-5x leverage
2. **Use stop losses**: ALWAYS set --sl on first trades
3. **Monitor regularly**: Check positions every few hours
4. **Learn from results**: Document what works in continuous-learning instincts
