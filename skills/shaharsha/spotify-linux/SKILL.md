---
name: spogo-linux
description: Spotify CLI for headless Linux servers. Control Spotify playback via terminal using cookie auth (no OAuth callback needed). Perfect for remote servers without localhost access.
homepage: https://github.com/steipete/spogo
metadata:
  {
    'openclaw':
      {
        'emoji': '🎵',
        'requires': { 'anyBins': ['spogo'] },
        'install':
          [
            {
              'id': 'go',
              'kind': 'shell',
              'command': 'go install github.com/steipete/spogo/cmd/spogo@latest',
              'bins': ['spogo'],
              'label': 'Install spogo (go)',
            },
          ],
      },
  }
---

# Spogo - Spotify CLI for Linux Servers

Control Spotify from headless Linux servers using cookie-based auth. No OAuth callback needed - perfect for remote servers.

## Why This Skill?

The original `spotify-player` skill by `steipete` on ClawHub assumes local browser access for cookie import (`spogo auth import --browser chrome`). On headless Linux servers without a local browser, this doesn't work.

This skill documents the cookie-based workaround - copy 2 browser cookies and you're done. No OAuth, no localhost needed.

## Requirements

- Spotify Premium account
- Go 1.21+ installed
- User's Spotify browser cookies

## Installation (Linux)

### 1. Install Go (if not installed)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y golang-go

# Or download latest from https://go.dev/dl/
wget https://go.dev/dl/go1.23.4.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.4.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin:~/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### 2. Install spogo

```bash
go install github.com/steipete/spogo/cmd/spogo@latest
```

This installs to `~/go/bin/spogo`. Add to PATH if needed:

```bash
sudo ln -s ~/go/bin/spogo /usr/local/bin/spogo
```

### 3. Verify

```bash
spogo --version
# spogo v0.2.0
```

## Setup (Cookie Auth)

Since OAuth requires localhost callback (impossible on remote servers), we use cookie auth instead.

### 1. Get cookies from browser

Have the user open DevTools → Application → Cookies → `open.spotify.com` and copy:

- `sp_dc` - Main auth token (long string, required)
- `sp_t` - Device ID (UUID format, required for playback)

### 2. Create config

Create `~/.config/spogo/config.toml`:

```toml
default_profile = "default"

[profile.default]
cookie_path = "/root/.config/spogo/cookies/default.json"
market = "IL"
language = "en"
```

### 3. Create cookies file

Create `~/.config/spogo/cookies/default.json`:

```json
[
  {
    "name": "sp_dc",
    "value": "USER_SP_DC_VALUE",
    "domain": ".spotify.com",
    "path": "/",
    "expires": "2027-01-01T00:00:00Z",
    "secure": true,
    "http_only": true
  },
  {
    "name": "sp_t",
    "value": "USER_SP_T_VALUE",
    "domain": ".spotify.com",
    "path": "/",
    "expires": "2027-01-01T00:00:00Z",
    "secure": false,
    "http_only": false
  }
]
```

### 4. Verify

```bash
spogo auth status
# → "Cookies: 2 (file)"
```

## Commands

```bash
# Search
spogo search track "query"
spogo search track "query" --json --limit 5

# Play
spogo play spotify:track:ID
spogo play                    # Resume
spogo pause
spogo next / spogo prev

# Devices
spogo device list --json
spogo device set "DEVICE_ID"

# Status
spogo status
spogo status --json
```

## "missing device id" Error - Browser Fallback

spogo needs an active Spotify session. If no device played recently:

1. **Open track in browser**:

```
browser open https://open.spotify.com/track/TRACK_ID profile=openclaw
```

2. **Click Play** via browser automation

3. **Transfer to target device**:

```bash
spogo device set "DEVICE_ID"
```

The browser profile stays logged in (cookies persist). Session stays active for hours after playback.

## Rate Limits

- Connect API (default): No rate limits ✓
- Web API (`--engine web`): Rate limited (429 errors)
- For library access when rate limited → use browser automation

## Troubleshooting

### "missing device id"

No active Spotify session. Use browser fallback (see above) to start playback first.

### "401 Unauthorized"

Cookies expired. Get fresh cookies from browser and update the JSON file.

### Commands work but no sound

Check `spogo device list` - playback might be on wrong device. Use `spogo device set "DEVICE_ID"` to switch.

## Notes

- **Cookie expiry**: ~1 year, but may invalidate if user logs out or changes password
- **Premium required**: Free accounts can't use Connect API
- **Market setting**: Change `market` in config for correct regional availability (IL, US, etc.)
