# Tado Skill - Quick Start

🌡️ **Get your Tado thermostat working in 3 minutes**

## Step 1: Install (30 seconds)

```bash
cd ~/clawd/skills/tado
pip3 install libtado --break-system-packages
```

**Important:** Requires libtado 4.1.1+ for OAuth2 support.

## Step 2: Authenticate via Browser (1 minute - one time only!)

**Run the OAuth2 login flow:**

```bash
python3 -m libtado -f ~/.tado_auth.json zones
```

**What happens:**

1. ✨ A URL appears in your terminal
2. 🌐 Paste it in your browser (or it opens automatically)
3. 🔐 Log in with your Tado email + password
4. ✅ Tokens saved to `~/.tado_auth.json`
5. 📋 Your zones are listed (confirming success!)

**Security:**

```bash
chmod 600 ~/.tado_auth.json
```

## Step 3: Test (10 seconds)

```bash
cd ~/clawd/skills/tado
./scripts/tado.py status
```

You should see temperature, humidity, and heating status! 🎉

**No more browser login needed** - tokens refresh automatically!

## Common Commands

```bash
# Get current status
./scripts/tado.py status

# Set living room to 21°C
./scripts/tado.py set --zone "Woonkamer" -t 21

# Set 22°C for 1 hour
./scripts/tado.py set --zone 1 -t 22 -d 60

# Check who's home
./scripts/tado.py presence

# Enable away mode
./scripts/tado.py mode away

# Back to auto
./scripts/tado.py mode auto
```

## OpenClaw Integration

Once working, you can use from OpenClaw:

```
@jarvis What's the temperature?
@jarvis Set living room to 21 degrees
@jarvis Is anyone home?
@jarvis Turn on away mode
```

## Need Help?

- **Full docs:** [SKILL.md](SKILL.md)
- **Troubleshooting:** See SKILL.md → Troubleshooting section
- **Test with mock data:** `python3 scripts/test_mock.py`

## Security Note

🔒 Your credentials stay local - never shared with anything except Tado's API!
