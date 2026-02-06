# Migration Guide: v0.1.0 → v1.1.0

## ⚠️ Breaking Changes

**OAuth2 authentication is now mandatory.** Username/password authentication has been removed.

## Why This Change?

- **libtado 4.1.1+** removed username/password support
- **OAuth2** is more secure and follows Tado's official API guidelines
- **Automatic token refresh** - no need to store passwords
- **Future-proof** - aligns with Tado's authentication roadmap

## Migration Steps

### Step 1: Remove Old Credentials

```bash
# Delete old credentials file (if it exists)
rm ~/.tado_credentials.json

# Remove old environment variables (if set)
unset TADO_USERNAME
unset TADO_PASSWORD
unset TADO_CLIENT_SECRET
```

### Step 2: Update libtado (Optional)

```bash
# Get the latest version with OAuth2 support
pip3 install --upgrade libtado
```

### Step 3: Authenticate via Browser (One-Time)

```bash
# Run the OAuth2 login flow
python3 -m libtado -f ~/.tado_auth.json zones
```

**What happens:**

1. A URL appears in your terminal (or opens in your browser)
2. Log in with your Tado email + password via the browser
3. libtado saves OAuth2 tokens to `~/.tado_auth.json`
4. Your zones are listed, confirming success

### Step 4: Verify

```bash
cd ~/clawd/skills/tado
./scripts/tado.py status
```

You should see your zones' temperature and status!

## What Changed in the Code

### Old Authentication (v0.1.0)

```python
from libtado.api import Tado

# ❌ No longer works
tado = Tado(username='email@example.com', password='password')
```

### New Authentication (v1.1.0)

```python
from libtado.api import Tado

# ✅ OAuth2 token file
tado = Tado(token_file_path='~/.tado_auth.json')
```

## Token File Location

- **File:** `~/.tado_auth.json`
- **Permissions:** `chmod 600 ~/.tado_auth.json` (recommended)
- **Git:** Already in `.gitignore` - never commit this file!

## Token Structure (Managed by libtado)

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890
}
```

**Do NOT manually edit this file!** libtado manages it automatically.

## Troubleshooting

### Error: "Tado OAuth2 token not found!"

**Solution:**

```bash
python3 -m libtado -f ~/.tado_auth.json zones
```

### Error: "401 Unauthorized"

**Possible causes:**

- Token expired or corrupted
- Tado service issue

**Solution:**

```bash
# Re-authenticate
python3 -m libtado -f ~/.tado_auth.json zones

# Verify file exists
ls -la ~/.tado_auth.json

# Check permissions
chmod 600 ~/.tado_auth.json
```

### Error: "Token file not readable"

**Solution:**

```bash
# Fix permissions
chmod 600 ~/.tado_auth.json

# Verify ownership
ls -la ~/.tado_auth.json
```

## FAQ

### Q: Can I still use environment variables?

**A:** No. OAuth2 requires a token file. Environment variables for username/password are no longer supported.

### Q: How long do tokens last?

**A:** Access tokens expire after ~1 hour, but libtado automatically refreshes them using the refresh token. You won't notice this happening.

### Q: What if I have multiple Tado accounts?

**A:** Use different token files:

```bash
python3 -m libtado -f ~/.tado_home.json zones
python3 -m libtado -f ~/.tado_office.json zones
```

Then specify the token file in your script calls.

### Q: Is my password stored anywhere?

**A:** No! OAuth2 tokens are stored in `~/.tado_auth.json`, but your password is never saved. You only enter it once during browser login.

### Q: Can I automate the login flow?

**A:** No. OAuth2 requires human interaction (browser login). This is a security feature. However, once you log in once, tokens refresh automatically forever.

## Support

- **Full docs:** [SKILL.md](SKILL.md)
- **Quick start:** [QUICKSTART.md](QUICKSTART.md)
- **Tado status:** https://status.tado.com

## Rollback (Not Recommended)

If you absolutely need the old version:

```bash
# Install old libtado
pip3 uninstall libtado
pip3 install libtado==0.16.0  # Or earlier version

# Checkout old skill version
cd ~/clawd/skills/tado
git checkout v0.1.0
```

**Warning:** Old versions will stop working when Tado fully deprecates username/password auth.
