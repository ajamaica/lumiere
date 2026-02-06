# WHOOP OAuth 2.0 Flow

Complete guide for WHOOP OAuth authentication setup.

## Overview

WHOOP uses OAuth 2.0 authorization code flow with PKCE for secure API access. This guide covers the complete setup process.

## Prerequisites

1. **WHOOP Developer Account**: Register at https://developer.whoop.com
2. **Application Registration**: Create an app in the Developer Dashboard
3. **Credentials**: Obtain `CLIENT_ID` and `CLIENT_SECRET`

## Required Scopes

Request these scopes for full integration:

- `read:sleep` - Sleep data, stages, performance
- `read:recovery` - Recovery scores, HRV, resting HR  
- `read:cycles` - Daily strain and physiological cycles
- `read:profile` - Basic user profile information

## OAuth URLs

- **Authorization URL**: `https://api.prod.whoop.com/oauth/oauth2/auth`
- **Token URL**: `https://api.prod.whoop.com/oauth/oauth2/token`
- **Redirect URI**: `http://localhost:18789/oauth/callback`

## Setup Process

### Step 1: Configure Credentials

Set environment variables or use OpenClaw config:

```bash
# Option 1: Environment variables
export WHOOP_CLIENT_ID="your_client_id"
export WHOOP_CLIENT_SECRET="your_client_secret"

# Option 2: OpenClaw skills config
openclaw skills configure whoop-integration
```

### Step 2: Run OAuth Setup

```bash
python3 scripts/oauth_setup.py
```

This script will:
1. Start a local callback server on port 18789
2. Open your browser to WHOOP authorization page
3. Wait for user authorization
4. Exchange authorization code for access/refresh tokens
5. Save tokens to `~/.openclaw/whoop_tokens.json`

### Step 3: Test Authentication

```bash
python3 scripts/whoop_client.py
```

## Authorization Flow Details

### 1. Authorization Request

User browser is redirected to:
```
https://api.prod.whoop.com/oauth/oauth2/auth?
  client_id={CLIENT_ID}&
  response_type=code&
  redirect_uri=http://localhost:18789/oauth/callback&
  scope=read:sleep read:recovery read:cycles read:profile
```

### 2. User Authorization

User logs into WHOOP and grants permissions to your application.

### 3. Authorization Code

WHOOP redirects back to your callback URL:
```
http://localhost:18789/oauth/callback?code={AUTHORIZATION_CODE}
```

### 4. Token Exchange

Exchange authorization code for tokens:
```http
POST https://api.prod.whoop.com/oauth/oauth2/token

{
  "grant_type": "authorization_code",
  "code": "{AUTHORIZATION_CODE}",
  "client_id": "{CLIENT_ID}", 
  "client_secret": "{CLIENT_SECRET}",
  "redirect_uri": "http://localhost:18789/oauth/callback"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def50200e8d4f...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:sleep read:recovery read:cycles read:profile"
}
```

## Token Management

### Token Storage

Tokens are stored in: `~/.openclaw/whoop_tokens.json`

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def50200e8d4f...",
  "token_type": "Bearer", 
  "expires_in": 3600,
  "scope": "read:sleep read:recovery read:cycles read:profile"
}
```

### Token Refresh

Access tokens expire after 1 hour. The client automatically refreshes tokens using the refresh token:

```http
POST https://api.prod.whoop.com/oauth/oauth2/token

{
  "grant_type": "refresh_token",
  "refresh_token": "{REFRESH_TOKEN}",
  "client_id": "{CLIENT_ID}",
  "client_secret": "{CLIENT_SECRET}"
}
```

### Security Considerations

- Store tokens securely (file permissions 600)
- Never log or expose tokens in debug output
- Refresh tokens automatically before expiration
- Revoke access if compromised

## Troubleshooting

### Common Issues

**"chat not found" error:**
- Verify CLIENT_ID and CLIENT_SECRET are correct
- Check that redirect URI matches exactly
- Ensure scopes are properly formatted

**Token refresh fails:**
- CLIENT_SECRET may be incorrect  
- Refresh token may be expired (re-run OAuth flow)
- Check API endpoint URLs

**No data returned:**
- User may not have recent WHOOP data
- Verify required scopes are granted
- Check API rate limits

### Re-running OAuth

If authentication fails, delete the token file and re-run setup:

```bash
rm ~/.openclaw/whoop_tokens.json
python3 scripts/oauth_setup.py
```

## API Rate Limits

WHOOP API has rate limits (exact limits not documented):
- Implement exponential backoff for failed requests
- Cache responses when appropriate  
- Use webhooks for real-time updates (when available)

## Webhook Integration (Future)

WHOOP supports webhooks for real-time data updates:
- Configure webhook URL in Developer Dashboard
- Receive notifications for new sleep/recovery data
- Eliminate need for polling API

## Testing

Test authentication and data access:

```bash
# Test basic auth and profile
python3 scripts/whoop_client.py

# Test morning check routine  
python3 scripts/morning_check.py
```

Expected output should show user profile and recent sleep/recovery data.