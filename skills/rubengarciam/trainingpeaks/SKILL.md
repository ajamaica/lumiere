---
name: trainingpeaks
description: Pull real-time training plans, workouts, fitness metrics (CTL/ATL/TSB), and personal records from TrainingPeaks. Uses cookie-based authentication (no API key needed). Use in conjunction with other endurance, cycling, running or swimming triathlon coach skills for best results.
---

# TrainingPeaks Skill

CLI access to the TrainingPeaks internal API. Pure Python stdlib — no pip dependencies.

## Setup: Getting Your Auth Cookie

1. Log in to [TrainingPeaks](https://app.trainingpeaks.com) in your browser
2. Open DevTools → Application → Cookies → `app.trainingpeaks.com`
3. Find the cookie named `Production_tpAuth`
4. Copy its value (long encoded string)

Then authenticate:

```bash
python3 scripts/tp.py auth "<paste_cookie_value_here>"
```

Or set the environment variable (useful for CI/scripts):

```bash
export TP_AUTH_COOKIE="<cookie_value>"
```

Credentials are stored in `~/.trainingpeaks/` with `0600` permissions.

## Commands

### `auth <cookie>` — Authenticate

Store and validate a `Production_tpAuth` cookie. Exchanges it for a Bearer token and caches the athlete ID.

```bash
python3 scripts/tp.py auth "eyJhbGci..."
# ✓ Authenticated successfully!
#   Account: user@example.com
#   Athlete ID: 12345
#   Token expires in: 60 minutes
```

### `auth-status` — Check Authentication

```bash
python3 scripts/tp.py auth-status
# Cookie: stored (file)
# Token: valid (42m remaining)
# Athlete ID: 12345
# ✓ Ready
```

### `profile [--json]` — Athlete Profile

```bash
python3 scripts/tp.py profile
# Profile
# ════════════════════════════════════════
#   Name:        Ruben Example
#   Email:       ruben@example.com
#   Athlete ID:  12345
#   Account:     Premium
#   Bike FTP:    280 W
```

### `workouts <start> <end> [--filter all|planned|completed] [--json]`

List workouts in a date range (max 90 days).

```bash
# All workouts this week
python3 scripts/tp.py workouts 2026-01-26 2026-02-01

# Only completed workouts
python3 scripts/tp.py workouts 2026-01-01 2026-01-31 --filter completed

# Raw JSON for scripting
python3 scripts/tp.py workouts 2026-01-26 2026-02-01 --json
```

Output columns: Date, Title, Sport, Status (✓/○), Planned duration, Actual duration, TSS, Distance.

### `workout <id> [--json]` — Workout Detail

Get full details for a single workout including description, coach comments, and all metrics.

```bash
python3 scripts/tp.py workout 123456789
# Workout: Tempo Intervals 3x10min
# ══════════════════════════════════════════════════
#   Date:         2026-01-28
#   Sport:        Bike
#   Status:       Completed ✓
#   ...
```

### `fitness [--days 90] [--json]` — CTL/ATL/TSB

Get fitness (CTL), fatigue (ATL), and form (TSB) data.

```bash
# Last 90 days (default)
python3 scripts/tp.py fitness

# Full season
python3 scripts/tp.py fitness --days 365

# JSON for charts
python3 scripts/tp.py fitness --json
```

Shows a summary with current CTL/ATL/TSB and status interpretation, plus a 14-day daily table.

### `peaks <sport> <pr_type> [--days 3650] [--json]` — Personal Records

Get ranked personal records by sport and metric.

```bash
# Best 20-minute power (all time)
python3 scripts/tp.py peaks Bike power20min

# 5K running PRs from last year
python3 scripts/tp.py peaks Run speed5K --days 365

# 5-second max power
python3 scripts/tp.py peaks Bike power5sec
```

**Valid PR types:**

| Sport | Types                                                                                                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bike  | `power5sec`, `power1min`, `power5min`, `power10min`, `power20min`, `power60min`, `power90min`, `hR5sec`, `hR1min`, `hR5min`, `hR10min`, `hR20min`, `hR60min`, `hR90min`       |
| Run   | `hR5sec`–`hR90min`, `speed400Meter`, `speed800Meter`, `speed1K`, `speed1Mi`, `speed5K`, `speed5Mi`, `speed10K`, `speed10Mi`, `speedHalfMarathon`, `speedMarathon`, `speed50K` |

## Token Management

- Bearer tokens are cached in `~/.trainingpeaks/token.json`
- Tokens expire in ~1 hour; auto-refreshed from stored cookie
- Cookie lasts weeks; stored in `~/.trainingpeaks/cookie`
- If the cookie expires, you'll get a clear error to re-authenticate

## File Locations

| File                           | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `~/.trainingpeaks/cookie`      | Stored `Production_tpAuth` cookie  |
| `~/.trainingpeaks/token.json`  | Cached OAuth Bearer token + expiry |
| `~/.trainingpeaks/config.json` | Cached athlete ID and account info |

## Notes

- All dates use `YYYY-MM-DD` format
- Maximum workout query range: 90 days
- Rate limiting: 150ms minimum between API requests
- `TP_AUTH_COOKIE` environment variable overrides stored cookie
- Default output is human-readable; `--json` gives raw API responses
