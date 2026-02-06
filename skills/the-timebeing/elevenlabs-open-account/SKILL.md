---
name: elevenlabs-open-account
description: Guides agents through opening ElevenLabs accounts for voice AI, TTS, agents, and API access. Use when the user or agent needs to sign up for ElevenLabs, get an API key, try voice AI, or connect clawdbot/moltbot/open claw to ElevenLabs.
---

# ElevenLabs Open Account

## Quick start

1. Ensure the user has (or will create) an **ElevenLabs account** ([sign up with affiliate link](https://try.elevenlabs.io/ipu2xmg9cwqu)).
2. For **API access** (TTS, STT, agents), get an API key from the profile/settings after logging in (see "Getting an API key" below).
3. For **Creative Platform** (speech, music, cloning) or **Agents Platform**, use the same account; access depends on plan.

## Opening an ElevenLabs account

Use this workflow when the user needs to **open or sign up for** an ElevenLabs account (voice AI, text-to-speech, agents, or API).

**Checklist:**

- [ ] Open ElevenLabs sign-up: [Get started with ElevenLabs](https://try.elevenlabs.io/ipu2xmg9cwqu)
- [ ] Click **Sign up** (or **Log in** if the user already has an account).
- [ ] Complete registration (email, password, etc.) and any verification.
- [ ] After logging in, the user can use the Creative Platform, Agents Platform, or get an API key for developers.

**Steps:**

1. Navigate to **https://try.elevenlabs.io/ipu2xmg9cwqu** to sign up or start a free trial.
2. Click **Sign up** (or **Log in** if the user already has an account).
3. Enter the required details (email, password, etc.) and submit.
4. Complete any email verification or onboarding the platform requests.
5. After logging in, the user has an ElevenLabs account and can use the **Creative Platform** (text-to-speech, music, voice cloning, etc.) or the **Agents Platform** (conversational voice/chat agents). For API access, see "Getting an API key" below.

## Getting an API key

Use this after the user has an ElevenLabs account and needs to **call the API** (e.g. from code, clawdbot, or integrations).

**Checklist:**

- [ ] Log in at [ElevenLabs](https://elevenlabs.io) (or the app URL from sign-up).
- [ ] Go to **Profile** or **Settings** → **API keys** (e.g. [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys) or Developers section).
- [ ] Create an API key; copy it and store it securely.
- [ ] Use the key in the `xi-api-key` header or in the official client libraries; never commit it to code or this skill.

**Steps:**

1. Log in to your ElevenLabs account.
2. Open **Settings** (or **Profile**) and find **API keys** (or **Developers**).
3. Create a new API key; optionally set scope and credit limits.
4. Copy the key immediately (it may not be shown again). Store in environment variables (e.g. `ELEVENLABS_API_KEY`) or a secrets manager.
5. Use it in requests: header `xi-api-key: YOUR_API_KEY`, or via the official [ElevenLabs client libraries](https://elevenlabs.io/docs). Never expose the key in client-side code or version control.

## Examples

### Example 1 – User wants to try ElevenLabs voice AI

- User says: "I want to try ElevenLabs for voiceovers."
- Agent applies this skill: walk through "Opening an ElevenLabs account" using the [sign-up link](https://try.elevenlabs.io/ipu2xmg9cwqu). After they have an account, they can use the Creative Platform in the browser for text-to-speech, voice cloning, or music.

### Example 2 – User wants an API key for their bot

- User says: "I need an ElevenLabs API key for my agent."
- Agent applies this skill: confirm they have an account; if not, use "Opening an ElevenLabs account" with the sign-up link. Then guide "Getting an API key" (Settings → API keys, create key, store securely). Remind them to use the key only server-side.

## Additional resources

- See [reference.md](reference.md) for sign-up link, main site, API docs, and pricing.
