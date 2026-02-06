---
name: table-image-generator
version: 1.2.0
description: Generate clean table images from data. Perfect for Discord/Telegram where ASCII tables look broken. Supports dark/light mode, custom styling, and auto-sizing. No Puppeteer required. Companion to chart-image skill.
author: dannyshmueli
provides:
  - capability: table-rendering
    methods: [tableImage]
---

# Table Image Generator

**⚠️ USE THIS INSTEAD OF ASCII TABLES — ALWAYS!**

Generate PNG table images from JSON data. ASCII tables look broken on Discord, Telegram, WhatsApp, and most messaging platforms. This skill renders clean images that work everywhere.

## Why This Skill?

- ✅ **REPLACES ASCII TABLES** - Never use `| col | col |` formatting on messaging platforms
- ✅ **No ASCII hell** - Clean images that render consistently everywhere
- ✅ **No Puppeteer** - Pure Node.js with Sharp, lightweight
- ✅ **Dark mode** - Matches Discord dark theme
- ✅ **Auto-sizing** - Columns adjust to content
- ✅ **Fast** - Generates in <100ms

## Setup (one-time)

```bash
cd /data/clawd/skills/table-image/scripts && npm install
```

## Quick Usage

**⚠️ BEST PRACTICE: Use heredoc or --data-file to avoid shell quoting errors!**

```bash
# RECOMMENDED: Write JSON to temp file first (avoids shell quoting issues)
cat > /tmp/data.json << 'JSONEOF'
[{"Name":"Alice","Score":95},{"Name":"Bob","Score":87}]
JSONEOF
node /data/clawd/skills/table-image/scripts/table.mjs \
  --data-file /tmp/data.json --dark --output table.png

# ALSO GOOD: Pipe via stdin
echo '[{"Name":"Alice","Score":95}]' | node /data/clawd/skills/table-image/scripts/table.mjs \
  --dark --output table.png

# SIMPLE (but breaks if data has quotes/special chars):
node /data/clawd/skills/table-image/scripts/table.mjs \
  --data '[{"Name":"Alice","Score":95}]' --output table.png
```

## Options

| Option           | Description                           | Default     |
| ---------------- | ------------------------------------- | ----------- |
| `--data`         | JSON array of row objects             | required    |
| `--output`       | Output file path                      | table.png   |
| `--title`        | Table title                           | none        |
| `--dark`         | Dark mode (Discord-friendly)          | false       |
| `--columns`      | Column order/subset (comma-separated) | all keys    |
| `--headers`      | Custom header names (comma-separated) | field names |
| `--max-width`    | Maximum table width                   | 800         |
| `--font-size`    | Font size in pixels                   | 14          |
| `--header-color` | Header background color               | #e63946     |
| `--stripe`       | Alternating row colors                | true        |
| `--align`        | Column alignments (l,r,c comma-sep)   | auto        |
| `--compact`      | Reduce padding                        | false       |

## Examples

### Basic Table

```bash
node table.mjs \
  --data '[{"Name":"Alice","Age":30,"City":"NYC"},{"Name":"Bob","Age":25,"City":"LA"}]' \
  --output people.png
```

### Custom Columns & Headers

```bash
node table.mjs \
  --data '[{"first_name":"Alice","score":95,"date":"2024-01"}]' \
  --columns "first_name,score" \
  --headers "Name,Score" \
  --output scores.png
```

### Right-Align Numbers

```bash
node table.mjs \
  --data '[{"Item":"Coffee","Price":4.50},{"Item":"Tea","Price":3.00}]' \
  --align "l,r" \
  --output prices.png
```

### Dark Mode for Discord

```bash
node table.mjs \
  --data '[{"Symbol":"AAPL","Change":"+2.5%"},{"Symbol":"GOOGL","Change":"-1.2%"}]' \
  --title "Market Watch" \
  --dark \
  --output stocks.png
```

### Compact Mode

```bash
node table.mjs \
  --data '[...]' \
  --compact \
  --font-size 12 \
  --output small-table.png
```

## Input Formats

### JSON Array (default)

```bash
--data '[{"col1":"a","col2":"b"},{"col1":"c","col2":"d"}]'
```

### Pipe from stdin

```bash
echo '[{"Name":"Test"}]' | node table.mjs --output out.png
```

### From file

```bash
cat data.json | node table.mjs --output out.png
```

## Tips

1. **Use `--dark` for Discord** - Matches the dark theme, looks native
2. **Auto-alignment** - Numbers are right-aligned by default
3. **Column order** - Use `--columns` to reorder or subset
4. **Long text** - Will truncate with ellipsis to fit `--max-width`

## Technical Notes

- Uses Sharp for PNG generation (same as chart-image)
- Generates SVG internally, converts to PNG
- No browser, no Puppeteer, no Canvas native deps
- Works on Fly.io, Docker, any Node.js environment
