---
name: dropbox
description: Upload, download, and manage files in Dropbox with automatic OAuth token refresh.
homepage: https://www.dropbox.com/developers
metadata: {"clawdbot":{"emoji":"📦","requires":{"env":["DROPBOX_APP_KEY","DROPBOX_APP_SECRET"]}}}
---

# Dropbox

Upload, download, list, and search files in Dropbox. Supports automatic token refresh.

## Initial Setup (One-Time)

### 1. Create a Dropbox App

1. Go to https://www.dropbox.com/developers/apps
2. Click "Create app"
3. Choose "Scoped access"
4. Choose "Full Dropbox" (or "App folder" for limited access)
5. Name your app
6. Note the **App key** and **App secret**

### 2. Set Permissions

In the app settings under "Permissions", enable:
- `files.metadata.read`
- `files.metadata.write`
- `files.content.read`
- `files.content.write`
- `account_info.read`

Click "Submit" to save.

### 3. Run OAuth Flow

Generate the authorization URL:

```python
import urllib.parse

APP_KEY = "your_app_key"

params = {
    "client_id": APP_KEY,
    "response_type": "code",
    "token_access_type": "offline"  # This gets you a refresh token!
}

auth_url = "https://www.dropbox.com/oauth2/authorize?" + urllib.parse.urlencode(params)
print(auth_url)
```

Give the URL to the user. They will:
1. Open it in a browser
2. Authorize the app
3. Receive an **authorization code**

### 4. Exchange Code for Tokens

```bash
curl -X POST "https://api.dropboxapi.com/oauth2/token" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "client_id=APP_KEY" \
  -d "client_secret=APP_SECRET"
```

Response includes:
- `access_token` — Short-lived (~4 hours)
- `refresh_token` — Long-lived (never expires unless revoked)

### 5. Save Credentials

Create `~/.config/atlas/dropbox.env`:

```bash
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
DROPBOX_ACCESS_TOKEN=sl.u.xxx...
DROPBOX_REFRESH_TOKEN=xxx...
```

## Usage

```bash
# Account info
dropbox.py account

# List folder
dropbox.py ls "/path/to/folder"

# Search files
dropbox.py search "query"

# Download file
dropbox.py download "/path/to/file.pdf"

# Upload file
dropbox.py upload local_file.pdf "/Dropbox/path/remote_file.pdf"
```

## Token Refresh

The script automatically handles token refresh:

1. On 401 Unauthorized, it uses the refresh token to get a new access token
2. Updates `dropbox.env` with the new access token
3. Retries the original request

Manual refresh (if needed):

```bash
curl -X POST "https://api.dropboxapi.com/oauth2/token" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=REFRESH_TOKEN" \
  -d "client_id=APP_KEY" \
  -d "client_secret=APP_SECRET"
```

## Token Lifecycle

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | ~4 hours | Updated automatically |
| Refresh Token | Never expires* | Keep secure, don't share |

*Refresh tokens only expire if explicitly revoked or app access is removed.

## Troubleshooting

**401 Unauthorized on refresh:**
- App may have been disconnected — re-run OAuth flow from step 3

**403 Forbidden:**
- Check app permissions in Dropbox console

**Path errors:**
- Dropbox paths start with `/` and are case-insensitive
- Use forward slashes even on Windows

## API Reference

- OAuth Guide: https://developers.dropbox.com/oauth-guide
- API Explorer: https://dropbox.github.io/dropbox-api-v2-explorer/
- HTTP Endpoints: https://www.dropbox.com/developers/documentation/http/documentation
