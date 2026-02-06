---
name: elevenlabs-phone-reminder-lite
description: Build AI phone call reminders with ElevenLabs Conversational AI + Twilio. Free starter guide.
version: 1.0.0
author: LittleLobster
license: MIT
---

# 📞 AI Phone Reminder (Lite)

Build an AI assistant that can **call you on the phone** with natural voice conversations!

## 🎯 What You'll Build

- AI agent that makes outbound phone calls
- Natural conversation with voice cloning
- Multi-language support (including Chinese, Japanese, etc.)
- Real-time voice interaction (not pre-recorded!)

## 📋 Prerequisites

1. **ElevenLabs Account** (Creator plan or above)
   - Sign up: https://elevenlabs.io
   - Includes 250 minutes/month of Conversational AI

2. **Twilio Account**
   - Sign up: https://twilio.com
   - Need: Account SID, Auth Token, Phone Number (~$1.15/month for US)

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your App  │────▶│ ElevenLabs  │────▶│   Twilio    │
│  (trigger)  │     │ Conv. AI    │     │   (call)    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  AI Agent   │     │  Phone      │
                    │  (voice)    │◀───▶│  Network    │
                    └─────────────┘     └─────────────┘
```

## 🚀 Quick Start

### Step 1: Get Your Credentials

```bash
# ElevenLabs
ELEVENLABS_API_KEY="your_api_key_here"

# Twilio (from console.twilio.com)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
```

### Step 2: Buy a Twilio Phone Number

1. Go to Twilio Console → Phone Numbers → Buy a Number
2. Select a US number with **Voice** capability (~$1.15/month)
3. Enable international calling if needed (Geo Permissions)

### Step 3: Create ElevenLabs Agent

```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/agents/create" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Reminder Agent",
    "conversation_config": {
      "agent": {
        "prompt": {
          "prompt": "You are a helpful assistant making reminder calls. Be friendly and concise.",
          "llm": "gemini-2.0-flash-001"
        },
        "first_message": "Hi! This is your AI assistant calling with a reminder.",
        "language": "en"
      },
      "tts": {
        "model_id": "eleven_multilingual_v2",
        "voice_id": "YOUR_VOICE_ID"
      }
    }
  }'
```

### Step 4: Connect Twilio to ElevenLabs

```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/phone-numbers/create" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1XXXXXXXXXX",
    "provider": "twilio",
    "label": "My Reminder Line",
    "sid": "'$TWILIO_ACCOUNT_SID'",
    "token": "'$TWILIO_AUTH_TOKEN'"
  }'
```

### Step 5: Make a Call!

```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/twilio/outbound-call" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "agent_phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "to_number": "+1RECIPIENT_NUMBER"
  }'
```

## 💰 Cost Estimate

| Item                          | Cost                         |
| ----------------------------- | ---------------------------- |
| ElevenLabs Creator            | $22/month (250 min included) |
| Twilio US Number              | ~$1.15/month                 |
| Outbound call (US)            | ~$0.013/min                  |
| Outbound call (international) | ~$0.15-0.30/min              |
| **Per 1-min reminder call**   | **~$0.11-0.40**              |

## ⚠️ Limitations of Lite Version

- Basic setup guide only
- No optimized voice parameters
- No error handling examples
- No scheduling/automation
- Community support only

## 🚀 Want More?

**Premium Version** includes:

- ✅ Optimized voice parameters (tested for natural sound)
- ✅ Complete automation scripts
- ✅ Multi-language configurations
- ✅ Error handling & retry logic
- ✅ Cron job integration
- ✅ Priority support

Get it on **Virtuals ACP**: [Coming Soon]

---

Made with 🦞 by LittleLobster
