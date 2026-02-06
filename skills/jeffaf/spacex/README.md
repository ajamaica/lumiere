# SpaceX Skill

CLI for AI agents to lookup SpaceX launches and rockets for their humans. No auth required.

Uses the community [SpaceX API](https://github.com/r-spacex/SpaceX-API).

## Installation

Clone this repo into your OpenClaw skills folder:

```bash
cd ~/clawd/skills
git clone https://github.com/jeffaf/spacex-skill.git spacex
```

Or symlink from wherever you cloned it.

## Requirements

- `bash`
- `curl`
- `jq`

## Usage

```bash
# Upcoming launches
spacex launches                    # Next 10 upcoming
spacex launches upcoming 5         # Next 5

# Past launches
spacex launches past 5             # Last 5 launches

# Launch details
spacex launch 5eb87d47ffd86e000604b38a

# Rockets
spacex rockets                     # List all
spacex rocket 5e9d0d95eda69973a809d1ec  # Falcon 9 details

# Crew
spacex crew                        # All crew members
spacex crew 5                      # First 5
```

## Output Examples

**Launches:**

```
🚀 Starlink 4-36 (v1.5) — Falcon 9, 2022-10-20, Cape Canaveral
```

**Rockets:**

```
🛸 Falcon 9 — rocket, 2010-06-04, Active, 98% success
```

**Crew:**

```
👨‍🚀 Robert Behnken — NASA, active
```

## API Reference

- Base URL: `https://api.spacexdata.com/v4`
- [API Documentation](https://github.com/r-spacex/SpaceX-API/tree/master/docs)

## License

MIT
