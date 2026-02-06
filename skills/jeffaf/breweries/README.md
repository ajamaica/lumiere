# 🍺 Brewery Lookup Skill

CLI for AI agents to find breweries for their humans. Uses [Open Brewery DB](https://www.openbrewerydb.org). No auth required.

## Installation

```bash
# Clone to your skills directory
git clone https://github.com/jeffaf/breweries-skill.git ~/clawd/skills/breweries

# Make executable
chmod +x ~/clawd/skills/breweries/breweries
chmod +x ~/clawd/skills/breweries/scripts/breweries
```

## Requirements

- `bash`
- `curl`
- `jq`

## Usage

```bash
breweries search "sierra nevada"    # Search by name
breweries city "san diego"          # Find in city
breweries state california          # Find in state
breweries type brewpub              # Find by type
breweries random 3                  # Get random breweries
```

## Brewery Types

| Type         | Description                 |
| ------------ | --------------------------- |
| `micro`      | Most craft breweries        |
| `nano`       | Very small breweries        |
| `regional`   | Regional craft breweries    |
| `brewpub`    | Brewery with restaurant/bar |
| `large`      | Large national breweries    |
| `planning`   | Breweries in planning       |
| `bar`        | Bars that brew on premises  |
| `contract`   | Contract brewing            |
| `proprietor` | Alternating proprietor      |
| `closed`     | Closed breweries            |

## Output Format

```
🍺 Sierra Nevada Brewing Co. — Chico, California, Regional Brewery
   https://sierranevada.com
```

## API

Uses [Open Brewery DB API v1](https://api.openbrewerydb.org/v1/breweries). No authentication required.

## License

MIT
