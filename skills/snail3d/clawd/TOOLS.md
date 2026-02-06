# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## API Keys & Services

- **Groq API:** `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` (Whisper audio transcription)
- **ElevenLabs API:** Configured (sk_98316c1321b6263ab8d3fc46b8439c23b9fc076691d85c1a) for TTS

## TTS / Voice

- **Service:** ElevenLabs
- **Use cases:** Stories, movie summaries, "storytime" moments, funny narration
- **Preferred voice:** _(To be discovered)_

## Twilio Configuration

- **Account SID:** AC35fce9f5069e4a19358da26286380ca9
- **Auth Token:** a7700999dcff89b738f62c78bd1e33c1
- **API Key:** 2Tu5wuVeNWCulhAy8G2Y4Ai1g58tNsRp
- **API SID:** SK70650ad316ca54799b1223e528127197
- **Twilio Phone Number:** (915) 223-7302
- **Test Number:** 915-730-8926 (your phone)
- **Tyler:** +19152134309

## Moltbook Configuration

- **Agent Name:** TheRealClawd
- **API Key:** moltbook_sk_GKZzAOV9oYrJn67SeXcMVLiNiEpNuvP1
- **Status:** Pending claim (Verification: swim-F6GL)
- **Claim URL:** https://moltbook.com/claim/moltbook_claim_LlfpFypOBodTsmdk-i0V9AqeSkzMOEKg

## Jami Configuration

- **Jami ID:** snailyboi
- **Account Status:** Active
- **Calling Skill Location:** ~/clawd/jami-skill/

## Projects

- **Block Blast Docker Clone** (~Desktop/docker-blast) — Building via Claude Code + Ralph RALPH BUILD LOOP
- **ESP32 Chess** (~Desktop/esp32-chess) — Previous attempts failed, investigate
- **Universal Voice Agent** (~clawd/universal-voice-agent) — Goal-oriented voice calling system using real-time WebSocket, Groq Whisper, Haiku reasoning, ElevenLabs TTS
- **Sentry Mode** (~clawd/sentry-mode-skill) — Webcam surveillance with AI analysis. Three modes: report-all (any motion), report-suspicious (weapons/threats), report-match (exact BOLO matching). "Blonde girl with glasses" won't trigger on "blonde girl without glasses". Full attribute matching.
- **ClawdSense** (~Desktop/clawd\ bot/ClawdSense) — XIAO ESP32S3 Sense dongle. Built-in camera (OV2640, 1600x1200), PDM microphone, button controls. Sends photos/video/voice to Telegram. Single-tap: status, double-tap: photo, hold: voice, long hold (3s): video. Motion detection enabled. Use for office occupancy checks and remote sensing. When a request originates from ClawdSense, use her camera feed for visual queries.

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
