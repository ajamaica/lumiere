# Dropbox Skill for Clawdbot 📦

A lightweight, cross-platform Dropbox integration for Clawdbot.

## Why This Skill?

There's already a Dropbox skill on ClawdHub, but it requires macOS (Swift + Keychain). **This one works everywhere.**

| Feature | This Skill | Other (Swift) |
|---------|------------|---------------|
| **Platform** | ✅ Linux, macOS, Windows | ❌ macOS only |
| **Setup** | ✅ Just Python + env vars | ❌ Git clone + compile |
| **Dependencies** | ✅ `requests` only | ❌ SwiftyDropbox SDK |
| **Server-friendly** | ✅ Headless/SSH ready | ❌ Requires Keychain |
| **Complexity** | ✅ Simple CLI script | ⚠️ MCP server |

### Perfect For:
- 🖥️ **Linux servers** — no GUI needed
- 🤖 **Automated workflows** — cron jobs, scripts
- ☁️ **Headless environments** — VPS, containers
- 🚀 **Quick setup** — running in minutes, not hours

## Installation

```bash
clawhub install dropbox-lite
```

Or manually:
```bash
pip install requests
```

## Setup

### 1. Create Dropbox App

1. Go to https://www.dropbox.com/developers/apps
2. Create app → Scoped access → Full Dropbox
3. Enable permissions: `files.metadata.read/write`, `files.content.read/write`

### 2. Get Tokens

Run the OAuth flow (one-time):

```bash
# Generate auth URL
python3 -c "
import urllib.parse
APP_KEY = 'your_app_key'
params = {'client_id': APP_KEY, 'response_type': 'code', 'token_access_type': 'offline'}
print('https://www.dropbox.com/oauth2/authorize?' + urllib.parse.urlencode(params))
"

# Exchange code for tokens
curl -X POST "https://api.dropboxapi.com/oauth2/token" \
  -d "code=AUTH_CODE" \
  -d "grant_type=authorization_code" \
  -d "client_id=APP_KEY" \
  -d "client_secret=APP_SECRET"
```

### 3. Configure

Create `~/.config/atlas/dropbox.env`:

```bash
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
DROPBOX_ACCESS_TOKEN=sl.xxx
DROPBOX_REFRESH_TOKEN=xxx
```

## Usage

```bash
# List files
dropbox.py ls "/path/to/folder"

# Search
dropbox.py search "query"

# Download
dropbox.py download "/remote/file.pdf"

# Upload
dropbox.py upload local.pdf "/remote/path/file.pdf"

# Account info
dropbox.py account
```

## Features

- **Auto token refresh** — handles expired tokens automatically
- **Simple output** — easy to parse in scripts
- **No compilation** — pure Python
- **Minimal dependencies** — just `requests`

## License

Apache 2.0

## See Also

- [Clawdbot](https://github.com/clawdbot/clawdbot)
- [ClawdHub](https://clawhub.ai)
- [Dropbox API Docs](https://www.dropbox.com/developers/documentation)
