# Groupon Deal Finder Skill

An AI agent skill that finds cheap and discounted local deals on Groupon for services like oil changes, yoga, massages, fitness classes, dining, and more.

## What This Skill Does

This skill teaches AI agents how to:

- 🔍 Search Groupon for deals by service type and location
- 📍 Navigate Groupon's category and city pages
- 💰 Extract and present deal information (prices, discounts, ratings)
- 🎯 Handle common user requests for local discounts

## Supported Categories

| Category             | Examples                                |
| -------------------- | --------------------------------------- |
| **Beauty & Spas**    | Massage, facials, nails, haircuts       |
| **Health & Fitness** | Yoga, gym, Solidcore, Pilates, CrossFit |
| **Automotive**       | Oil change, car wash, detailing         |
| **Food & Drink**     | Restaurant deals, wine tastings         |
| **Things To Do**     | Activities, escape rooms, tours         |
| **Home Services**    | Cleaning, HVAC, handyman                |

## Example Queries

- "Find me a cheap oil change in Austin"
- "What massage deals are available near me in Chicago?"
- "Show me yoga class discounts in San Francisco"
- "Find something fun to do this weekend in NYC"
- "Any Solidcore or Pilates deals in LA?"

## Installation

Add `skill.md` to your agent's skill library. The skill uses web search and web browsing capabilities that most AI agents already have.

### For ClawHub/OpenClaw

1. Fork or download this repository
2. Add to your agent's skills collection
3. The agent will automatically use this skill when users ask about deals or discounts

## Files

- `skill.md` — Main skill file with instructions for the agent
- `README.md` — This documentation

## How It Works

The skill teaches agents two methods for finding deals:

1. **Web Search** — Using `site:groupon.com {service} {city}` queries
2. **Direct URLs** — Navigating to `groupon.com/local/{city}/{category}`

The agent then extracts deal information and presents it to users with prices, discounts, ratings, and locations.

## Contributing

Suggestions and improvements welcome! Feel free to open an issue or PR.

## License

MIT
