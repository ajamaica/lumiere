---
name: chart-image
version: 1.1.0
description: Generate publication-quality chart images from data. Supports line, bar, area, point, candlestick, pie/donut, heatmap, multi-series, and stacked charts. Use when visualizing data, creating graphs, plotting time series, or generating chart images for reports/alerts. Designed for Fly.io/VPS deployments - no native compilation, no Puppeteer, no browser required. Pure Node.js with prebuilt binaries.
provides:
  - capability: chart-generation
    methods: [lineChart, barChart, areaChart, pieChart, candlestickChart, heatmap]
---

# Chart Image Generator

Generate PNG chart images from data using Vega-Lite. Perfect for headless server environments.

## Why This Skill?

**Built for Fly.io / VPS / Docker deployments:**

- ✅ **No native compilation** - Uses Sharp with prebuilt binaries (unlike `canvas` which requires build tools)
- ✅ **No Puppeteer/browser** - Pure Node.js, no Chrome download, no headless browser overhead
- ✅ **Lightweight** - ~15MB total dependencies vs 400MB+ for Puppeteer-based solutions
- ✅ **Fast cold starts** - No browser spinup delay, generates charts in <500ms
- ✅ **Works offline** - No external API calls (unlike QuickChart.io)

## Setup (one-time)

```bash
cd /data/clawd/skills/chart-image/scripts && npm install
```

## Quick Usage

```bash
node /data/clawd/skills/chart-image/scripts/chart.mjs \
  --type line \
  --data '[{"x":"10:00","y":25},{"x":"10:30","y":27},{"x":"11:00","y":31}]' \
  --title "Price Over Time" \
  --output chart.png
```

## Chart Types

### Line Chart (default)

```bash
node chart.mjs --type line --data '[{"x":"A","y":10},{"x":"B","y":15}]' --output line.png
```

### Bar Chart

```bash
node chart.mjs --type bar --data '[{"x":"A","y":10},{"x":"B","y":15}]' --output bar.png
```

### Area Chart

```bash
node chart.mjs --type area --data '[{"x":"A","y":10},{"x":"B","y":15}]' --output area.png
```

### Pie / Donut Chart

```bash
# Pie
node chart.mjs --type pie --data '[{"category":"A","value":30},{"category":"B","value":70}]' \
  --category-field category --y-field value --output pie.png

# Donut (with hole)
node chart.mjs --type donut --data '[{"category":"A","value":30},{"category":"B","value":70}]' \
  --category-field category --y-field value --output donut.png
```

### Candlestick Chart (OHLC)

```bash
node chart.mjs --type candlestick \
  --data '[{"x":"Mon","open":100,"high":110,"low":95,"close":105}]' \
  --open-field open --high-field high --low-field low --close-field close \
  --title "Stock Price" --output candle.png
```

### Heatmap

```bash
node chart.mjs --type heatmap \
  --data '[{"x":"Mon","y":"Week1","value":5},{"x":"Tue","y":"Week1","value":8}]' \
  --color-value-field value --color-scheme viridis \
  --title "Activity Heatmap" --output heatmap.png
```

### Multi-Series Line Chart

Compare multiple trends on one chart:

```bash
node chart.mjs --type line --series-field "market" \
  --data '[{"x":"Jan","y":10,"market":"A"},{"x":"Jan","y":15,"market":"B"}]' \
  --title "Comparison" --output multi.png
```

### Stacked Bar Chart

```bash
node chart.mjs --type bar --stacked --color-field "category" \
  --data '[{"x":"Mon","y":10,"category":"Work"},{"x":"Mon","y":5,"category":"Personal"}]' \
  --title "Hours by Category" --output stacked.png
```

### Volume Overlay (Dual Y-axis)

Price line with volume bars:

```bash
node chart.mjs --type line --volume-field volume \
  --data '[{"x":"10:00","y":100,"volume":5000},{"x":"11:00","y":105,"volume":3000}]' \
  --title "Price + Volume" --output volume.png
```

### Sparkline (mini inline chart)

```bash
node chart.mjs --sparkline --data '[{"x":"1","y":10},{"x":"2","y":15}]' --output spark.png
```

Sparklines are 80x20 by default, transparent, no axes.

## Options Reference

### Basic Options

| Option     | Description                                                          | Default   |
| ---------- | -------------------------------------------------------------------- | --------- |
| `--type`   | Chart type: line, bar, area, point, pie, donut, candlestick, heatmap | line      |
| `--data`   | JSON array of data points                                            | -         |
| `--output` | Output file path                                                     | chart.png |
| `--title`  | Chart title                                                          | -         |
| `--width`  | Width in pixels                                                      | 600       |
| `--height` | Height in pixels                                                     | 300       |

### Axis Options

| Option       | Description                                  | Default    |
| ------------ | -------------------------------------------- | ---------- |
| `--x-field`  | Field name for X axis                        | x          |
| `--y-field`  | Field name for Y axis                        | y          |
| `--x-title`  | X axis label                                 | field name |
| `--y-title`  | Y axis label                                 | field name |
| `--x-type`   | X axis type: ordinal, temporal, quantitative | ordinal    |
| `--y-domain` | Y scale as "min,max"                         | auto       |

### Visual Options

| Option           | Description                                   | Default |
| ---------------- | --------------------------------------------- | ------- |
| `--color`        | Line/bar color                                | #e63946 |
| `--dark`         | Dark mode theme                               | false   |
| `--svg`          | Output SVG instead of PNG                     | false   |
| `--color-scheme` | Vega color scheme (category10, viridis, etc.) | -       |

### Alert/Monitor Options

| Option             | Description                               | Default |
| ------------------ | ----------------------------------------- | ------- |
| `--show-change`    | Show +/-% change annotation at last point | false   |
| `--focus-change`   | Zoom Y-axis to 2x data range              | false   |
| `--focus-recent N` | Show only last N data points              | all     |
| `--show-values`    | Label min/max peak points                 | false   |

### Multi-Series/Stacked Options

| Option           | Description                        | Default |
| ---------------- | ---------------------------------- | ------- |
| `--series-field` | Field for multi-series line charts | -       |
| `--stacked`      | Enable stacked bar mode            | false   |
| `--color-field`  | Field for stack/color categories   | -       |

### Candlestick Options

| Option          | Description      | Default |
| --------------- | ---------------- | ------- |
| `--open-field`  | OHLC open field  | open    |
| `--high-field`  | OHLC high field  | high    |
| `--low-field`   | OHLC low field   | low     |
| `--close-field` | OHLC close field | close   |

### Pie/Donut Options

| Option             | Description                        | Default |
| ------------------ | ---------------------------------- | ------- |
| `--category-field` | Field for pie slice categories     | x       |
| `--donut`          | Render as donut (with center hole) | false   |

### Heatmap Options

| Option                | Description                 | Default |
| --------------------- | --------------------------- | ------- |
| `--color-value-field` | Field for heatmap intensity | value   |
| `--y-category-field`  | Y axis category field       | y       |

### Volume Overlay Options

| Option           | Description                               | Default |
| ---------------- | ----------------------------------------- | ------- |
| `--volume-field` | Field for volume bars (enables dual-axis) | -       |
| `--volume-color` | Color for volume bars                     | #4a5568 |

### Annotation Options

| Option          | Description                 | Default |
| --------------- | --------------------------- | ------- |
| `--annotation`  | Static text annotation      | -       |
| `--annotations` | JSON array of event markers | -       |

## Alert-Style Chart (recommended for monitors)

```bash
node chart.mjs --type line --data '[...]' \
  --title "Iran Strike Odds (48h)" \
  --show-change --focus-change --show-values --dark \
  --output alert.png
```

For recent action only:

```bash
node chart.mjs --type line --data '[hourly data...]' \
  --focus-recent 4 --show-change --focus-change --dark \
  --output recent.png
```

## Timeline Annotations

Mark events on the chart:

```bash
node chart.mjs --type line --data '[...]' \
  --annotations '[{"x":"14:00","label":"News broke"},{"x":"16:30","label":"Press conf"}]' \
  --output annotated.png
```

## Temporal X-Axis

For proper time series with date gaps:

```bash
node chart.mjs --type line --x-type temporal \
  --data '[{"x":"2026-01-01","y":10},{"x":"2026-01-15","y":20}]' \
  --output temporal.png
```

Use `--x-type temporal` when X values are ISO dates and you want spacing to reflect actual time gaps (not evenly spaced).

## Theme Selection

Use `--dark` for dark mode. Auto-select based on time:

- **Night (20:00-07:00 local)**: `--dark`
- **Day (07:00-20:00 local)**: light mode (default)

## Piping Data

```bash
echo '[{"x":"A","y":1},{"x":"B","y":2}]' | node chart.mjs --output out.png
```

## Custom Vega-Lite Spec

For advanced charts:

```bash
node chart.mjs --spec my-spec.json --output custom.png
```

---

_Updated: 2026-02-02 - Added x-type temporal, documented all chart types_
