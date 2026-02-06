# Tado Smart Thermostat Skill

🌡️ Control your Tado thermostat from OpenClaw

⚠️ **v1.1.0 BREAKING CHANGE:** OAuth2 authentication now required (libtado 4.1.1+). Username/password auth no longer supported. See [Migration Guide](#migration-from-v010) below.

## Quick Start

### 1. Install

```bash
cd ~/clawd/skills/tado
pip3 install libtado --break-system-packages
```

**Requires:** libtado 4.1.1+ (OAuth2 support)

### 2. Authenticate (One-Time Browser Login)

```bash
python3 -m libtado -f ~/.tado_auth.json zones
```

Follow the browser prompt to log in with your Tado credentials. Tokens are saved to `~/.tado_auth.json` and refresh automatically.

### 3. Test

```bash
./scripts/tado.py status
```

## Basic Usage

```bash
# Get status
./scripts/tado.py status
./scripts/tado.py status --zone 1

# Set temperature
./scripts/tado.py set --zone 1 --temperature 21
./scripts/tado.py set --zone "Woonkamer" -t 22 -d 60  # 60 min timer

# Modes
./scripts/tado.py mode home
./scripts/tado.py mode away
./scripts/tado.py mode auto

# Presence
./scripts/tado.py presence

# List zones
./scripts/tado.py zones
```

## Features

- ✅ Multi-zone support
- ✅ Temperature control with timers
- ✅ Home/Away modes
- ✅ Presence detection
- ✅ JSON output for scripting
- ✅ Zone lookup by name or ID
- ✅ OAuth2 authentication (libtado 4.1.1+)

## Documentation

See [SKILL.md](SKILL.md) for complete documentation:

- Full command reference
- Authentication setup (OAuth2 + legacy)
- Troubleshooting guide
- Integration examples
- API limitations

## Requirements

- Python 3.9+
- `libtado` library
- Tado account with configured zones
- Internet connection

## Security

- OAuth2 tokens stored locally in `~/.tado_auth.json` (chmod 600 recommended)
- No telemetry or third-party services
- Direct API communication with Tado servers only
- Tokens refresh automatically via libtado

## Important Notes

⚠️ **OAuth2 Required:** As of libtado 4.1.1+, OAuth2 is mandatory. Username/password authentication is no longer supported.

📊 **Rate Limits:** Don't poll the API more than once per minute to avoid rate limiting.

🔒 **Privacy:** Never commit your token file to git. It's already in `.gitignore`.

## Support

For issues or questions:

1. Check [SKILL.md](SKILL.md) troubleshooting section
2. Verify token file exists: `ls -la ~/.tado_auth.json`
3. Re-authenticate if needed: `python3 -m libtado -f ~/.tado_auth.json zones`
4. Check Tado service status: https://status.tado.com

## Migration from v0.1.0

**If upgrading from username/password auth:**

1. **Delete old credentials file:**

   ```bash
   rm ~/.tado_credentials.json  # No longer used
   ```

2. **Run OAuth2 setup:**

   ```bash
   python3 -m libtado -f ~/.tado_auth.json zones
   ```

3. **Follow browser login** (one-time only)

4. **Test:**
   ```bash
   cd ~/clawd/skills/tado
   ./scripts/tado.py status
   ```

**Why the change?**

- libtado 4.1.1+ removed username/password support
- OAuth2 is more secure and follows Tado's official API
- Tokens refresh automatically (no password storage needed)

## License

Part of OpenClaw skills collection. Use freely.
