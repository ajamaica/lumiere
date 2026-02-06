---
name: fear-greed
description: Embeddable Fear & Greed Index for crypto dashboards. Real-time sentiment gauge. Drop-in React/HTML components. Works with AI agents, Claude, Cursor.
version: 1.1.1
keywords: fear-greed, crypto-sentiment, market-indicator, trading-widget, dashboard-component, react-widget, bitcoin-sentiment, ai, ai-agent, ai-coding, trading-bot, fintech, market-data, openclaw, moltbot, vibe-coding, agentic
---

# Crypto Sentiment Widget

**Market mood at a glance.** Embeddable Fear & Greed Index for crypto dashboards and trading apps.

Drop-in React and HTML components. Real-time updates. No API key required. Powered by Strykr PRISM.

## Quick Usage

```bash
# Get current Fear & Greed value
./fear-greed.sh

# Get JSON output
./fear-greed.sh --json

# Get historical data
./fear-greed.sh --history
```

## PRISM Endpoint

| Endpoint                 | Description   | Speed |
| ------------------------ | ------------- | ----- |
| `GET /market/fear-greed` | Current index | 229ms |

## Index Values

| Range  | Label         | Meaning          |
| ------ | ------------- | ---------------- |
| 0-25   | Extreme Fear  | Buy opportunity? |
| 26-45  | Fear          | Caution          |
| 46-55  | Neutral       | Wait and see     |
| 56-75  | Greed         | Take profits?    |
| 76-100 | Extreme Greed | Possible top     |

## Output Formats

### Terminal (Default)

```
📊 Crypto Fear & Greed Index

   ┌─────────────────────┐
   │                     │
   │         72          │
   │       GREED         │
   │                     │
   │  ████████████████░░ │
   │                     │
   └─────────────────────┘

   Last updated: 2026-01-28 13:15 UTC
```

### JSON

```json
{
  "value": 72,
  "label": "Greed",
  "timestamp": "2026-01-28T13:15:00Z"
}
```

## Widget Variants

### 1. Gauge (Circle)

```
    ╭───────╮
   ╱    72   ╲
  │   GREED   │
   ╲         ╱
    ╰───────╯
```

### 2. Bar (Horizontal)

```
Fear & Greed: 72 (Greed)
████████████████░░░░░░░░░░
```

### 3. Badge (Compact)

```
┌────────┐
│ FG: 72 │
│   😀   │
└────────┘
```

## Embed Options

### React Component

```jsx
import { FearGreedGauge } from '@strykr/fear-greed-widget'

function Dashboard() {
  return (
    <FearGreedGauge
      theme="dark"
      size="md"
      variant="gauge"
      refreshInterval={300000} // 5 minutes
    />
  )
}
```

### HTML Embed

```html
<div id="fear-greed-widget"></div>
<script src="https://cdn.strykr.com/fear-greed.js"></script>
<script>
  StrykrWidget.FearGreed({
    element: '#fear-greed-widget',
    theme: 'dark',
    variant: 'gauge',
  })
</script>
```

### iframe

```html
<iframe
  src="https://widgets.strykr.com/fear-greed?theme=dark&variant=gauge"
  width="200"
  height="200"
  frameborder="0"
></iframe>
```

## Themes

| Theme         | Background | Text    |
| ------------- | ---------- | ------- |
| `dark`        | #0D0D0D    | #F5F3EF |
| `light`       | #FFFFFF    | #1A1A1A |
| `transparent` | none       | auto    |

## Auto-Refresh

Widget auto-refreshes every 5 minutes by default.

```javascript
// Custom refresh interval (in milliseconds)
FearGreedGauge({ refreshInterval: 60000 }) // 1 minute
```

## Use Cases

1. **Trading Dashboard** — Quick sentiment check
2. **Blog/Newsletter** — Embed in market updates
3. **Discord Server** — Daily sentiment bot
4. **Portfolio App** — Contextual indicator

## Environment Variables

```bash
PRISM_URL=https://strykr-prism.up.railway.app
```

---

Built by [@NextXFrontier](https://x.com/NextXFrontier)
