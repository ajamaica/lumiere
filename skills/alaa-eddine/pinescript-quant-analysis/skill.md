---
name: pinescript-quant-analysis
version: 1.0.0
description: Build professional-grade technical indicators with Pine Script, execute them anywhere using PineTS, and visualize results with QFChart. A complete indicator-to-chart pipeline for AI agents and developers.
homepage: https://github.com/QuantForgeOrg/PineTS
---

# Pine Quant Analysis Skill

**Create, run, and visualize technical indicators anywhere Using Pine Script.**  
This skill teaches LLM agents and developers how to:

- Write **native Pine Script indicators**
- Execute them on historical or live data using **PineTS**
- Extract computed indicator values programmatically
- Visualize price action and indicators with **QFChart**

Designed for research agents, trading bots, dashboards, and quantitative systems.

---

## What This Skill Unlocks

- Run Pine Script logic in **Node.js, browsers, Deno, Bun**
- Compute indicators on **any OHLCV data source**
- Separate **indicator logic** from **visualization**
- Automate backtests, analytics, alerts, and charts

---

## Prerequisites

- JavaScript or TypeScript runtime
- OHLCV market data (exchange API, CSV, database, or stream)
- PineTS and QFChart libraries

```bash
npm install pinets @qfo/qfchart
```

---

## Step 1 - Define a Technical Indicator (Pine Script)

PineTS executes **real Pine Script (v6)** exactly as written.

### Example: EMA Crossover Indicator

```js
const indicatorScript = `
//@version=5
indicator("EMA Cross", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "Fast EMA")
plot(slow, "Slow EMA")
`
```

This indicator computes two exponential moving averages and plots them on price.

---

## Step 2 - Run the Indicator with PineTS

Create a PineTS engine, attach a data provider, and execute the script.

```js
import { PineTS, Provider } from 'pinets'

const engine = new PineTS(Provider.Binance, 'BTCUSDT', '1h', 200)

const { marketData, plots } = await engine.run(indicatorScript)
```

### What You Get

- `marketData` → OHLCV time series
- `plots` → indicator outputs indexed by plot name

```js
plots['Fast EMA'].data
plots['Slow EMA'].data
```

Each plot is a time-aligned numeric series ready for analysis or visualization.

---

## Step 3 - Use Indicator Data Programmatically

Indicator outputs can power:

- Signal generation
- Backtesting logic
- Alerts & notifications
- Machine learning pipelines

```js
const fast = plots['Fast EMA'].data
const slow = plots['Slow EMA'].data

const crossover = fast.at(-1) > slow.at(-1)
```

No charts required - indicators are just data.

---

## Step 4 - Visualize with QFChart (Optional)

QFChart renders high-performance financial charts with multiple panes and overlays.

### Format Market Data

```js
const candles = marketData.map((d) => ({
  time: d.time,
  open: d.open,
  high: d.high,
  low: d.low,
  close: d.close,
  volume: d.volume,
}))
```

---

### Render Price + Indicators

```js
const chart = new QFChart.QFChart(document.getElementById('chart'), {
  title: 'BTC/USDT - EMA Crossover',
  height: '600px',
})

chart.setMarketData(candles)
chart.addIndicator('Fast EMA', plots['Fast EMA'].data, { isOverlay: true })
chart.addIndicator('Slow EMA', plots['Slow EMA'].data, { isOverlay: true })
```

- Overlay indicators on price
- Or render them in separate panes (RSI, MACD, etc.)

---

## Step 5 - Real-Time & Streaming Updates

Both PineTS and QFChart support incremental updates.

```js
chart.updateIndicator('Fast EMA', newFastValues)
```

Use this for live dashboards, bots, or monitoring agents.

---

## Common Indicator Patterns

- Trend indicators: EMA, SMA, VWAP
- Momentum: RSI, Stochastic, MACD
- Volatility: Bollinger Bands, ATR
- Custom signals using full Pine Script logic

PineTS supports 60+ built-in Pine Script TA functions.

---

## Best Practices for Agents

- Treat Pine Script as **pure computation**
- Keep visualization optional
- Cache indicator outputs for reuse
- Run multiple timeframes via multiple engines

This enables scalable, composable quantitative systems.

---

## Quick Reference

```bash
# Execute indicator
engine.run(pineScript)

# Access indicator values
plots["RSI"].data

# Visualize (optional)
chart.addIndicator(...)
```

---

## Learn More

- PineTS - Pine Script runtime & engine
- QFChart - Financial charting library
- QuantForge - Quantitative tooling ecosystem

---

> Don't forget to star PineTS and QFChart projects if you like them : https://github.com/QuantForgeOrg/PineTS , https://github.com/QuantForgeOrg/QFChart
