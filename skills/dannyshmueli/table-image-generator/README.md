# Table Image Generator 📋

Generate clean PNG table images from JSON data. Perfect for messaging platforms where ASCII tables break.

## Why This?

- ✅ **No ASCII hell** — Clean images that render consistently everywhere
- ✅ **No Puppeteer** — Pure Node.js with Sharp, lightweight
- ✅ **Dark mode** — Matches Discord dark theme
- ✅ **Auto-sizing** — Columns adjust to content
- ✅ **Fast** — Generates in <100ms

## Installation

```bash
npm install
```

## Usage

```bash
# Simple table
node scripts/table.mjs \
  --data '[{"Name":"Alice","Score":95},{"Name":"Bob","Score":87}]' \
  --output table.png

# With title and dark mode
node scripts/table.mjs \
  --data '[{"Item":"Coffee","Price":"$4.50"},{"Item":"Tea","Price":"$3.00"}]' \
  --title "Menu" \
  --dark \
  --output menu.png
```

## Options

| Option        | Description               | Default   |
| ------------- | ------------------------- | --------- |
| `--data`      | JSON array of row objects | required  |
| `--output`    | Output file path          | table.png |
| `--title`     | Table title               | none      |
| `--dark`      | Dark mode (Discord-style) | false     |
| `--font-size` | Base font size            | 14        |
| `--padding`   | Cell padding              | 12        |
| `--max-width` | Max table width           | 800       |

## ClawHub

Install via ClawHub:

```bash
clawhub install table-image-generator
```

## License

MIT

## RTL Support (v1.1.0)

Auto-detects Hebrew, Arabic, and other RTL scripts:

```bash
node scripts/table.mjs \
  --data '[{"שם":"דני","גיל":28,"עיר":"תל אביב"}]' \
  --dark --output hebrew.png
```

Or force RTL manually with `--rtl` flag.
