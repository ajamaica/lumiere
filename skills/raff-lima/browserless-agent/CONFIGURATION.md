# Browserless Agent - Configuration Guide

## 📋 Environment Variables

This skill uses **two separate environment variables** for maximum flexibility:

### Required: `BROWSERLESS_URL`

The base URL of your Browserless service (WebSocket endpoint).

**Examples:**

```bash
# Cloud service
BROWSERLESS_URL=wss://chrome.browserless.io

# Local instance
BROWSERLESS_URL=ws://localhost:3000

# Custom host
BROWSERLESS_URL=wss://your-host.com

# Specific endpoint
BROWSERLESS_URL=wss://your-host.com/playwright/firefox
```

### Optional: `BROWSERLESS_TOKEN`

Authentication token for your Browserless service.

**Examples:**

```bash
# With token
BROWSERLESS_TOKEN=abc123def456xyz789

# Without token (local/no-auth instances)
BROWSERLESS_TOKEN=
# Or simply don't set it
```

---

## 🎯 Why Two Variables?

### ✅ Flexibility

```bash
# Switch between environments easily
# Development (no auth)
BROWSERLESS_URL=ws://localhost:3000

# Production (with auth)
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=prod-token-here
```

### ✅ Security

```bash
# Share base URL in documentation/repos
BROWSERLESS_URL=wss://chrome.browserless.io  # ✅ Safe to share

# Keep token private in secrets
BROWSERLESS_TOKEN=secret-token-here          # 🔒 Keep secret
```

### ✅ Multiple Endpoints

```bash
# Switch between browsers without changing token
BROWSERLESS_URL=wss://host.com/playwright/chromium
BROWSERLESS_URL=wss://host.com/playwright/firefox
BROWSERLESS_URL=wss://host.com/playwright/webkit
# Same token for all
BROWSERLESS_TOKEN=your-token
```

### ✅ Local Development

```bash
# No token needed for local Docker instance
BROWSERLESS_URL=ws://localhost:3000
# That's it! No token required.
```

---

## 🔧 Configuration Methods

### Method 1: OpenClaw UI (Recommended)

1. Open **OpenClaw Settings**
2. Navigate to **Skills** → **browserless-agent**
3. In the **API Key** field, enter your `BROWSERLESS_URL`:
   ```
   wss://chrome.browserless.io
   ```
4. In the **env** section, add `BROWSERLESS_TOKEN` (if needed):
   ```json
   {
     "BROWSERLESS_TOKEN": "your-secret-token"
   }
   ```

### Method 2: Environment Variables

```bash
# Linux/macOS
export BROWSERLESS_URL="wss://chrome.browserless.io"
export BROWSERLESS_TOKEN="your-token-here"

# Windows PowerShell
$env:BROWSERLESS_URL="wss://chrome.browserless.io"
$env:BROWSERLESS_TOKEN="your-token-here"

# Windows CMD
set BROWSERLESS_URL=wss://chrome.browserless.io
set BROWSERLESS_TOKEN=your-token-here
```

### Method 3: .env File

Create a `.env` file in the skill directory:

```bash
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=your-secret-token
```

---

## 📚 Configuration Examples

### Example 1: Cloud Service with Authentication

```bash
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=abc123def456
```

**Result:** Connects to `wss://chrome.browserless.io/playwright/chromium?token=abc123def456`

### Example 2: Local Docker Instance

```bash
# Start Browserless
docker run -p 3000:3000 browserless/chrome

# Configuration
BROWSERLESS_URL=ws://localhost:3000
# No token needed!
```

**Result:** Connects to `ws://localhost:3000/playwright/chromium`

### Example 3: Custom Endpoint

```bash
BROWSERLESS_URL=wss://your-company.com/playwright/chromium
BROWSERLESS_TOKEN=company-secret-token
```

**Result:** Connects to `wss://your-company.com/playwright/chromium?token=company-secret-token`

### Example 4: Firefox Instead of Chromium

```bash
BROWSERLESS_URL=wss://chrome.browserless.io/playwright/firefox
BROWSERLESS_TOKEN=your-token
```

**Result:** Connects to `wss://chrome.browserless.io/playwright/firefox?token=your-token`

### Example 5: Multiple Environments

```bash
# Development
BROWSERLESS_URL=ws://localhost:3000

# Staging
BROWSERLESS_URL=wss://staging.browserless.io
BROWSERLESS_TOKEN=staging-token

# Production
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=production-token
```

---

## 🔍 How It Works

The skill automatically constructs the WebSocket URL:

1. Takes `BROWSERLESS_URL` as base
2. Adds `/playwright/chromium` if not present
3. Appends `?token=BROWSERLESS_TOKEN` if token is set
4. Removes token from logs for security

**Code logic:**

```python
def get_browserless_ws_url():
    if not BROWSERLESS_URL:
        return None

    url = BROWSERLESS_URL.rstrip('/')

    # Add default endpoint if missing
    if '/playwright' not in url:
        url = f"{url}/playwright/chromium"

    # Add token if provided
    if BROWSERLESS_TOKEN:
        separator = '&' if '?' in url else '?'
        url = f"{url}{separator}token={BROWSERLESS_TOKEN}"

    return url
```

---

## 🛡️ Security Best Practices

### ✅ DO:

- Store `BROWSERLESS_TOKEN` in OpenClaw's secure env storage
- Use environment variables or .env files (add to .gitignore)
- Use `wss://` (not `ws://`) for production
- Rotate tokens regularly
- Use different tokens for different environments

### ❌ DON'T:

- Commit tokens to version control
- Share tokens in documentation
- Use the same token for dev/staging/production
- Log tokens in error messages (skill handles this automatically)

---

## 🔄 Migration from Old Format

If you were using the old single-variable format:

**Old:**

```bash
BROWSERLESS_WS=wss://chrome.browserless.io/playwright/chromium?token=abc123
```

**New:**

```bash
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=abc123
```

**Benefits:**

- ✅ More flexible (easy to change endpoint or token)
- ✅ More secure (token separate from URL)
- ✅ Easier to switch environments
- ✅ Works with or without authentication

---

## ❓ FAQ

### Q: Do I need a token?

**A:** Only if your Browserless service requires authentication. Local Docker instances typically don't need one.

### Q: Can I use different browsers?

**A:** Yes! Set `BROWSERLESS_URL` to include the browser:

```bash
BROWSERLESS_URL=wss://host.com/playwright/firefox
BROWSERLESS_URL=wss://host.com/playwright/webkit
```

### Q: What if I don't have a Browserless service?

**A:** You can:

1. Use the free tier at [browserless.io](https://browserless.io)
2. Run locally: `docker run -p 3000:3000 browserless/chrome`

### Q: How do I know if my configuration is correct?

**A:** Run the test suite:

```bash
python tests/test_browserless.py
```

### Q: Can I use multiple tokens for different skills?

**A:** Yes! OpenClaw's skill configuration is isolated per skill.

---

## 📞 Support

Need help? Check:

- [README.md](README.md) - Complete usage guide
- [SKILL.md](SKILL.md) - All available actions
- Run tests: `python tests/test_browserless.py`
- Ask OpenClaw: _"How do I configure the browserless-agent skill?"_

---

**Last Updated:** February 2026  
**Version:** 2.0.0
