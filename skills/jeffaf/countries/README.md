# countries-skill 🌍

CLI for AI agents to lookup country info for their humans. Uses [REST Countries API](https://restcountries.com). No auth required.

## Installation

```bash
# Clone to your skills directory
git clone https://github.com/jeffaf/countries-skill.git ~/clawd/skills/countries

# Or symlink the wrapper to your PATH
ln -s ~/clawd/skills/countries/countries ~/bin/countries
```

## Requirements

- bash
- curl
- jq
- bc

## Usage

```bash
countries search "united states"   # Find country by name
countries info US                  # Get full details by code
countries region europe            # All European countries
countries capital tokyo            # Find country by capital
countries all                      # List all countries
```

## Output Examples

**List format:**

```
[US] United States — Washington D.C., Americas, Pop: 331M, 🇺🇸
[JP] Japan — Tokyo, Asia, Pop: 125.8M, 🇯🇵
[DE] Germany — Berlin, Europe, Pop: 83.2M, 🇩🇪
```

**Detailed info:**

```
🌍 Japan
   Official: Japan
   Code: JP / JPN / 392
   Capital: Tokyo
   Region: Asia — Eastern Asia
   Population: 125.8M
   Area: 377930 km²
   Languages: Japanese
   Currencies: Japanese yen (JPY)
   Timezones: UTC+09:00
   Borders: None (island/isolated)
   Driving: left side
   Flag: 🇯🇵

🗺️ Map: https://goo.gl/maps/...
```

## Commands

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `search <name>`   | Search countries by name            |
| `info <code>`     | Get details by alpha-2/alpha-3 code |
| `region <region>` | List countries in a region          |
| `capital <city>`  | Find country by capital city        |
| `all`             | List all countries                  |

**Regions:** africa, americas, asia, europe, oceania

## API

Uses [REST Countries API v3.1](https://restcountries.com). No API key required, no rate limits.

## License

MIT
