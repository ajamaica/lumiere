---
name: location-awareness
description: Location awareness via privacy-friendly GPS tracking (Home Assistant, OwnTracks, GPS Logger). Set location-based reminders and ask about movement history, travel time, and nearby POIs.
metadata: { 'clawdbot': { 'emoji': '📍', 'requires': { 'bins': ['python3'] } } }
---

# Location Awareness

**This skill provides commands to execute. When the user asks about location, RUN the appropriate command below.**

## ⚠️ IMPORTANT: All commands use `scripts/location.sh`

Every command must be run via `scripts/location.sh`. Example:

**User asks:** "How long to walk home?"  
**You run:**

```bash
scripts/location.sh eta home --mode walk
```

**Output:** `4.6 km, about 45 min walk`  
**You reply with the output directly.**

Do NOT run `eta` or other subcommands directly — they don't exist as standalone commands.

## Quick Reference — What to Run

| User says                           | Run this (copy exactly)                                       | Reply with              |
| ----------------------------------- | ------------------------------------------------------------- | ----------------------- |
| "Where am I?"                       | `scripts/location.sh status`                                  | Zone name only          |
| "Map" / "map link"                  | `scripts/location.sh herewego`                                | Just the URL            |
| "What are my coordinates?"          | `scripts/location.sh status`                                  | Lat/lon from output     |
| "How long to walk home?"            | `scripts/location.sh eta home --mode walk`                    | Distance + duration     |
| "How long to bike to X?"            | `scripts/location.sh eta X --mode bike`                       | Distance + duration     |
| "How far is X by car?"              | `scripts/location.sh eta X --mode car`                        | Distance + duration     |
| "Remind me to X when I get to Y"    | `scripts/location.sh remind "X" Y`                            | Brief confirm           |
| "What reminders do I have?"         | `scripts/location.sh reminders`                               | Bullet list or "None"   |
| "List my places"                    | `scripts/location.sh places`                                  | Bullet list             |
| "List places nearby"                | `scripts/location.sh places --near`                           | Sorted by distance      |
| "List my pubs downtown"             | `scripts/location.sh places --region downtown --category pub` | Filtered list           |
| "Save this spot as X"               | `scripts/location.sh addplace "X"`                            | Confirm                 |
| "Delete place X"                    | `scripts/location.sh delplace X`                              | Confirm                 |
| "Disable the grocery rule"          | `scripts/location.sh disable grocery`                         | Confirm                 |
| "List my geofence rules"            | `scripts/location.sh geofences`                               | Bullet list             |
| "When was I last at X?"             | `scripts/location.sh history X`                               | Date/time               |
| "Where have I been today?"          | `scripts/location.sh history --days 1`                        | List of places          |
| "Find me a cafe nearby"             | `scripts/location.sh nearby cafe`                             | POI list with distances |
| "Any pubs within 1km?"              | `scripts/location.sh nearby pub 1000`                         | Filtered POI list       |
| "How long was I at work this week?" | `scripts/location.sh stats --days 7`                          | Hours per place         |

**Response style:** Terse. No preamble. No "Here's your location:". Just the answer.

## All Commands

All via `scripts/location.sh <command>`:

| Command                                                                              | Description                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `status`                                                                             | Current location, geofences inside, map link         |
| `herewego`                                                                           | Just the HERE WeGo map link                          |
| `check`                                                                              | Check for triggered actions/reminders (used by cron) |
| `places [--near] [--region R] [--category C]`                                        | List saved places                                    |
| `geofences`                                                                          | List all geofences with full details                 |
| `remind <text> <place_id>`                                                           | Add one-shot location reminder                       |
| `reminders`                                                                          | List pending reminders                               |
| `addplace <name> [radius] [--region R] [--category C]`                               | Save current location                                |
| `editplace <id> [--name] [--radius] [--region] [--category] [--action] [--cooldown]` | Modify a place                                       |
| `delplace <id>`                                                                      | Delete a place                                       |
| `enable <id>` / `disable <id>`                                                       | Toggle geofence on/off                               |
| `history [place] [--days N]`                                                         | When was I last at a place?                          |
| `nearby <category> [radius]`                                                         | Find nearby POIs (cafe, pub, restaurant, etc.)       |
| `stats [--days N]`                                                                   | Time spent at each place, visit counts               |
| `proximity <text> <place/lat> [lon] [radius]`                                        | Alert when approaching a location                    |
| `eta <place> [--mode walk\|bike\|car]`                                               | Travel time and distance to a place                  |

**Note:** `eta` accepts saved place names, coordinates (`lat,lon`), or any place name (geocoded via OpenStreetMap, biased to current location).

**Note:** `status` returns the zone name if in a known place, otherwise reverse geocodes to a street address (e.g., "123 Main Street, Downtown").

## Concepts

**Geofences** — Saved places with lat/lon, radius, and optional action. Persistent.

**Reminders** — One-shot alerts tied to a place. Deleted after delivery.

**Region/Category** — Optional tags for filtering (e.g., "downtown", "pub").

---

## Setup (for administrators)

### Provider Configuration

Edit `scripts/config.json`:

**Home Assistant (default):**

```json
{
  "provider": "homeassistant",
  "homeassistant": {
    "url": "https://your-ha.example.com",
    "token": "your-long-lived-token",
    "entity_id": "device_tracker.phone"
  }
}
```

**OwnTracks:**

```json
{
  "provider": "owntracks",
  "owntracks": {
    "url": "https://owntracks.example.com",
    "user": "username",
    "device": "phone"
  }
}
```

**Generic HTTP:**

```json
{
  "provider": "http",
  "http": {
    "url": "https://your-api.com/location",
    "headers": { "Authorization": "Bearer token" }
  }
}
```

**GPSLogger (file-based):**

```json
{
  "provider": "gpslogger",
  "gpslogger": {
    "file": "/path/to/location.json"
  }
}
```

Secrets support: `"env:VAR"`, `"pass:path"`, `"cmd:command"`, or plain string.

**Alternative:** Set `HA_URL` and `HA_TOKEN` environment variables instead of editing config.json.

**Output format:** Most query commands output human-readable text by default. Add `--json` for JSON output (useful for scripting).

### Travel Speeds

Customize walking/biking speeds for ETA calculations in `scripts/config.json`:

```json
{
  "speeds_kmh": {
    "walk": 6,
    "bike": 15
  }
}
```

### Geofence Config

Edit `scripts/geofences.json`:

```json
{
  "geofences": [
    {
      "id": "grocery",
      "name": "Grocery Store",
      "lat": 40.7128,
      "lon": -74.006,
      "radius_m": 30,
      "action": "shopping_tasks",
      "cooldown_hours": 4,
      "enabled": true,
      "region": "downtown",
      "category": "shop"
    }
  ],
  "location_reminders": [],
  "proximity_alerts": []
}
```

### Cron Setup (Automatic Notifications)

For automatic location-based notifications, set up a systemd timer:

1. **Configure notification target** (env var):

```bash
export CLAWDBOT_NOTIFY_TARGET="+1234567890"  # or @telegram_user, etc.
```

2. **Create systemd service** (`~/.config/systemd/user/location-check.service`):

```ini
[Unit]
Description=Location check

[Service]
Type=oneshot
Environment=CLAWDBOT_NOTIFY_TARGET=+1234567890
ExecStart=%h/clawd/skills/location-awareness/scripts/location_cron.sh
```

3. **Create timer** (`~/.config/systemd/user/location-check.timer`):

```ini
[Unit]
Description=Run location check every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

4. **Enable**: `systemctl --user enable --now location-check.timer`

Notifications use `clawdbot message send`, so they work with any configured channel (Signal, Telegram, etc.).
