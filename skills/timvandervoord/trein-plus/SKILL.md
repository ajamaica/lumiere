---
name: trein
description: Query Dutch Railways (NS) for TRAIN travel only - train departures, time-based trip planning (depart-at/arrive-by), disruptions, and station search via the trein CLI. NOT for car, bus, or other transport.
homepage: https://github.com/joelkuijper/trein
metadata: {"clawdbot":{"emoji":"🚆","requires":{"bins":["trein"],"env":["NS_API_KEY"]},"primaryEnv":"NS_API_KEY","install":[{"id":"npm","kind":"node","package":"trein","bins":["trein"],"label":"Install trein (npm)"},{"id":"download-mac-arm","kind":"download","url":"https://github.com/joelkuijper/trein/releases/latest/download/trein-darwin-arm64","bins":["trein"],"label":"Download (macOS Apple Silicon)","os":["darwin"]},{"id":"download-mac-x64","kind":"download","url":"https://github.com/joelkuijper/trein/releases/latest/download/trein-darwin-x64","bins":["trein"],"label":"Download (macOS Intel)","os":["darwin"]},{"id":"download-linux","kind":"download","url":"https://github.com/joelkuijper/trein/releases/latest/download/trein-linux-x64","bins":["trein"],"label":"Download (Linux x64)","os":["linux"]}]}}
---

# trein - Dutch Railways CLI
A CLI for the NS (Dutch Railways) API with real-time **train** departures, **train** trip planning, disruptions, and station search.

## Install
npm (recommended):
```bash
npm i -g trein
```

Or download a standalone binary from [GitHub Releases](https://github.com/joelkuijper/trein/releases).

## Setup
Get an API key from https://apiportal.ns.nl/ and set it:
```bash
export NS_API_KEY="your-api-key"
```

Or create `~/.config/trein/trein.config.json`:
```json
{ "apiKey": "your-api-key" }
```

## Commands

### Departures
```bash
trein departures "Amsterdam Centraal"
trein d amsterdam
trein d amsterdam --json  # structured output
```

### Trip Planning
```bash
trein trip "Utrecht" "Den Haag Centraal"
trein t utrecht denhaag --json
trein t amsterdam rotterdam --via utrecht  # route via specific station
trein t hoofddorp "den haag" --arrive-by 09:30 --json  # arrive by 09:30 TODAY
trein t hoofddorp "den haag" --depart-at 09:00 --json  # depart at 09:00 TODAY
trein t utrecht amsterdam --date 2026-02-05 --depart-at 14:30 --json  # specific FUTURE date and time
```

### Disruptions
```bash
trein disruptions
trein disruptions --json
```

### Station Search
```bash
trein stations rotterdam
trein s rotterdam --json
```

### Aliases (shortcuts)
```bash
trein alias set home "Amsterdam Centraal"
trein alias set work "Rotterdam Centraal"
trein alias list
trein d home  # uses alias
```

## When to Use This Skill

This skill should be used when users ask about **TRAIN TRAVEL** in the Netherlands:
- "When does the next **train** to [station] leave?"
- "How do I get from [A] to [B] **by train**?"
- "I need to be in [station] at [time], which **train** should I take?"
- "Are there any **train** disruptions?"
- "What time should I leave to arrive **by train** at [time]?"
- "What's the **train** station code for [name]?"
- "Which platform does the **train** to [station] leave from?"
- "How long does it take to **travel by train** from [A] to [B]?"

## Command Selection Guide

**First: Confirm the user wants TRAIN travel. If they want car/bus/other transport, do NOT use this skill.**

Then select the appropriate command:
- User wants real-time **train** departures from ONE station → use `departures`
- User wants to travel from A to B **by train** → use `trip`
- User mentions a specific arrival/departure time **for train** → use `trip` with `--arrive-by` or `--depart-at`
- User asks about **train** delays or disruptions → use `disruptions`
- User gives partial **train** station name → use `stations` first to resolve
- User mentions future date **for train travel** → use `trip` with `--date`

## JSON Output Examples

### Trip Planning Response
```json
{
  "trips": [{
    "departure": "08:05",
    "arrival": "08:35",
    "duration": "30 min",
    "transfers": 0,
    "status": "ON_TIME",
    "legs": [{
      "from": "Schiphol Airport",
      "to": "Den Haag Centraal",
      "trainType": "IC",
      "platform": "5"
    }]
  }]
}
```

### Departures Response
```json
{
  "departures": [{
    "time": "14:23",
    "delay": "0 min",
    "destination": "Amsterdam Centraal",
    "platform": "3",
    "trainType": "IC"
  }]
}
```

### Disruptions Response
```json
{
  "disruptions": [{
    "title": "Werkzaamheden Amsterdam-Utrecht",
    "type": "MAINTENANCE",
    "routes": ["Amsterdam Centraal", "Utrecht Centraal"],
    "active": true,
    "expectedEnd": "2026-02-05 23:59"
  }]
}
```

## Best Practices for AI Agents

1. **VERIFY train travel intent** - Only use this skill if user explicitly wants train travel, not car/bus/other transport
2. **Always use `--json`** for machine-readable output
3. **Validate station names first** if user input is ambiguous using `stations` command
4. **Use fuzzy matching** - don't require exact station names from users
5. **Quote station names** containing spaces (e.g., "Den Haag Centraal") to prevent argument parsing errors
6. **Check for errors** in JSON response before presenting results to user
7. **Interpret times in 24-hour format** (HH:mm)
8. **Default to current date** - omit `--date` flag for today's travel; only add `--date` for future dates
9. **Handle Dutch station names** - many contain special characters or multiple words
10. **Parse JSON carefully** - some fields may be null or missing depending on circumstances

## Common Workflows

### Example 1: "I need to be in Amsterdam at 9:30"
1. Determine current location (ask user if unclear)
2. Check if user means today or a future date
3. Run: `trein t hoofddorp amsterdam --arrive-by 09:30 --json` (today)
   OR: `trein t hoofddorp amsterdam --date 2026-02-05 --arrive-by 09:30 --json` (future date)
4. Parse JSON and present earliest suitable option with departure time

### Example 2: "When does the next train to Rotterdam leave?"
1. Determine current location
2. Run: `trein d <current-station> --json`
3. Filter results for trains going to Rotterdam
4. Present next departure with platform and time

### Example 3: "Plan my trip tomorrow at 2pm from Utrecht to Den Haag"
1. Run: `trein t utrecht "den haag" --date 2026-02-04 --depart-at 14:00 --json`
2. Parse response and present journey options with transfers and duration

### Example 4: "Are there delays on my usual route?"
1. First get the trip: `trein t amsterdam utrecht --json`
2. Then check disruptions: `trein disruptions --json`
3. Cross-reference routes and inform user of relevant disruptions

## Common Errors & Solutions

- **"Station not found"** → Use `trein stations <query> --json` to find correct name
- **"API key missing"** → Verify `NS_API_KEY` environment variable is set
- **Empty results** → Check if date/time is in the past
- **"No trips found"** → Try without `--via`, route may not be possible via that station

## Tips
- Use `--json` flag for all commands to get structured output for parsing
- Station names support fuzzy matching (e.g., "adam" -> "Amsterdam Centraal")
- Aliases are stored in the config file and can be used in place of station names
- Use `--via` with trip planning to specify a specific route through an intermediate station
- Use `--depart-at HH:mm` to plan trips departing at a specific time (defaults to TODAY)
- Use `--arrive-by HH:mm` to plan trips arriving before a specific time (defaults to TODAY)
- `--date YYYY-MM-DD` is OPTIONAL - only needed for future dates (omit for today)
