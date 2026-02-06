# Interactive Installation Guide for OpenClaw

This guide is designed to be followed by OpenClaw to help users set up the Trakt integration interactively.

## Overview

OpenClaw should guide the user through each step, asking questions and creating files automatically.

## Step 1: Verify Prerequisites

**Check:** Python dependencies installed

```bash
python3 -c "import requests" 2>&1
```

**If fails:** Install requests

```bash
pip3 install requests --break-system-packages
```

## Step 2: Create Trakt Application

**Action:** Open browser to Trakt application creation page

**Tell user:**
"I'm going to help you set up Trakt integration. First, you need to create a Trakt application.

I'll open the Trakt applications page in your browser. Please:

1. Click 'New Application'
2. Fill in these fields:
   - **Name:** OpenClaw Assistant
   - **Description:** Personal AI assistant integration
   - **Redirect URI:** `urn:ietf:wg:oauth:2.0:oob`
3. Check the permissions you want (recommend all)
4. Click 'Save App'

Let me know when you're ready!"

**Browser command:**

```bash
open https://trakt.tv/oauth/applications
```

**Wait for user confirmation:** "Have you created the application? (Type 'yes' when done)"

## Step 3: Collect Credentials

**Ask user:**
"Great! Now I need two pieces of information from your new Trakt application:

1. What is your **Client ID**?"

**Wait for response, store as:** `CLIENT_ID`

**Ask user:**
"2. What is your **Client Secret**?"

**Wait for response, store as:** `CLIENT_SECRET`

## Step 4: Create Configuration File

**Action:** Create `~/.openclaw/trakt_config.json`

**Tell user:**
"Perfect! I'm creating your configuration file now..."

**Create file:**

```bash
mkdir -p ~/.openclaw
cat > ~/.openclaw/trakt_config.json << EOF
{
  "client_id": "${CLIENT_ID}",
  "client_secret": "${CLIENT_SECRET}",
  "access_token": "",
  "refresh_token": ""
}
EOF
```

**Confirm:**
"✓ Configuration file created at ~/.openclaw/trakt_config.json"

## Step 5: Authenticate with PIN

**Action:** Get PIN URL

**Tell user:**
"Now we need to authenticate with Trakt. I'm going to open a page where you can authorize OpenClaw.

Please:

1. Log in to Trakt if prompted
2. Click 'Authorize' or 'Yes'
3. Copy the PIN code that appears

Opening authorization page now..."

**Run command:**

```bash
python3 ~/.openclaw/skills/openclaw-trakt/scripts/trakt_client.py auth
```

**This outputs the PIN URL - extract it and open in browser:**

```bash
open <PIN_URL_FROM_OUTPUT>
```

**Ask user:**
"What is the PIN code you received?"

**Wait for response, store as:** `PIN`

## Step 6: Complete Authentication

**Run command:**

```bash
python3 ~/.openclaw/skills/openclaw-trakt/scripts/trakt_client.py auth ${PIN}
```

**If successful:**
"✓ Authentication successful! Your tokens have been saved."

**If failed:**
"✗ Authentication failed. Let me check your configuration..."
[Offer to retry or troubleshoot]

## Step 7: Test the Integration

**Tell user:**
"Let's test it out! I'll fetch some recommendations for you..."

**Run command:**

```bash
python3 ~/.openclaw/skills/openclaw-trakt/scripts/trakt_client.py recommend
```

**If successful (returns JSON with shows):**
"🎬 Success! The Trakt integration is working!

Here are some shows you might like:
[Parse and display recommendations]

You can now ask me things like:

- 'What should I watch?'
- 'What have I been watching lately?'
- 'What's trending?'
- 'Search for Breaking Bad'

Setup complete! 🎉"

**If failed:**
"Hmm, something's not working. Let me help troubleshoot..."
[Check config file, check auth tokens, offer to retry]

## Troubleshooting Steps

### Authentication Failed

- Verify Client ID and Secret in config file
- Check if PIN was copied correctly (case-sensitive)
- Verify Trakt application has proper permissions
- Try regenerating Client Secret in Trakt

### No Recommendations

- User may need to rate some shows on Trakt first
- Encourage user to connect streaming services (Trakt Pro)
- Can fall back to trending content

### Module Not Found

- Reinstall requests: `pip3 install requests --break-system-packages`

## Quick Reference

**Config file location:** `~/.openclaw/trakt_config.json`
**Script location:** `~/.openclaw/skills/openclaw-trakt/scripts/trakt_client.py`
**Commands:**

- Auth: `python3 scripts/trakt_client.py auth [PIN]`
- Recommend: `python3 scripts/trakt_client.py recommend`
- History: `python3 scripts/trakt_client.py history`
- Trending: `python3 scripts/trakt_client.py trending`
- Search: `python3 scripts/trakt_client.py search "query"`
