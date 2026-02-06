---
name: fearbot
description: CBT-based therapy for anxiety, depression, stress, and trauma. Provides structured cognitive behavioral therapy using Beck's model with validated clinical assessments (GAD-7, PHQ-9, DASS-21, PCL-5). Includes crisis detection, thought records, differential diagnosis, and session tracking. Activate with "therapy mode", "fearbot", or "start therapy".
version: 1.0.0
author: Samoppakiks
homepage: https://clawhub.ai/Samoppakiks/fearbot
tags: [therapy, cbt, mental-health, anxiety, depression, ptsd, wellness, psychology]
---

# FearBot 🧠

> **CBT-based therapy for anxiety, depression, stress & trauma**

A comprehensive Cognitive Behavioral Therapy skill that turns your OpenClaw agent into a structured therapy companion. Handles the full spectrum of common mental health concerns using evidence-based techniques.

## ⚠️ Important Disclaimers

**THIS IS NOT A REPLACEMENT FOR PROFESSIONAL MENTAL HEALTH CARE.**

- FearBot is a supportive tool, not a licensed therapist
- For serious mental health concerns, please see a qualified professional
- If you're in crisis, contact emergency services or a crisis helpline immediately
- This skill is designed for mild-to-moderate anxiety, depression, stress, and trauma symptoms
- Not appropriate for: active suicidality, psychosis, severe/treatment-resistant depression, eating disorders, substance abuse, or bipolar disorder

**By using this skill, you acknowledge these limitations.**

## Why FearBot?

Traditional therapy apps are isolated — they don't know your life context. FearBot works best as part of a fully-integrated OpenClaw agent that already knows:

- Your daily stressors (from your messages)
- Your sleep patterns
- Your work pressures
- Your relationships
- Everything between sessions

This context advantage is what makes AI-assisted therapy genuinely useful.

## Features

- **Validated Assessments**: GAD-7 (anxiety), PHQ-9 (depression), DASS-21 (stress), PCL-5 (trauma)
- **Differential Diagnosis**: Screens for GAD, social anxiety, panic, OCD, PTSD, depression
- **Session Tracking**: Persistent session history, mood tracking, homework
- **Thought Records**: Quick logging between sessions for any distressing moment
- **Crisis Detection**: Three-tier safety system with automatic escalation
- **CBT Techniques**: Cognitive restructuring, behavioral activation, exposure, grounding
- **Full Transparency**: Shows scores, explains diagnoses, treats you like an adult

## Activation

Say any of these to your agent:

- "therapy mode" / "start therapy" / "therapy session"
- "fearbot" / "fear bot"
- "let's do therapy"

For quick anxiety logging (without full session):

- "I'm anxious" / "feeling anxious"
- "thought record" / "log this anxiety"

## Session Flow

### First Session (Intake)

1. Baseline GAD-7 + PHQ-9 assessment
2. Differential diagnosis screening
3. Clinical impression with full transparency
4. Homework assignment
5. All data saved to local database

### Ongoing Sessions

1. Mood check-in (0-10)
2. Bridge from last session + homework review
3. Due assessments (GAD-7 weekly, PHQ-9 bi-weekly)
4. Collaborative agenda setting
5. Core CBT work (matched to presentation)
6. Summary + new homework

## Crisis Safety

FearBot includes a three-tier crisis detection system that monitors ALL messages:

| Tier     | Trigger                     | Response                                     |
| -------- | --------------------------- | -------------------------------------------- |
| HIGH     | Active suicidal intent/plan | Stop therapy, safety protocol, helplines     |
| MODERATE | Passive ideation            | Pause, assess, provide resources             |
| LOW      | Distress markers            | Acknowledge, screen, continue with awareness |

**Included Crisis Resources:**

- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/
- Crisis Text Line (US): Text HOME to 741741
- Samaritans (UK): 116 123
- Tele-MANAS (India): 14416
- Lifeline (Australia): 13 11 14

## Data Storage

All therapy data stays LOCAL on your machine:

- `~/clawd/data/therapy/sessions.json` — Session history
- `~/clawd/data/therapy/assessments.json` — Assessment scores over time
- `~/clawd/data/therapy/thought-records.md` — Thought record journal
- `~/clawd/data/therapy/mood-log.json` — Mood tracking

Nothing is sent to external servers. Your mental health data is yours.

## Technical Requirements

- OpenClaw 2026.1.0+
- Bash shell (for therapy-db.sh script)
- jq (for JSON processing)

## Professional Referral Triggers

FearBot will recommend seeing a human professional when:

- PHQ-9 ≥ 15 (moderately severe depression)
- GAD-7 ≥ 15 (severe anxiety)
- Any suicidal ideation with plan
- No improvement after 4-6 weeks
- Disclosure of: substance abuse, self-harm, psychosis, eating disorders

## The Philosophy

> "Therapy shouldn't be a 1-hour/week information bottleneck. Your AI agent already knows your week. Use that."

FearBot is built on the belief that:

1. CBT is evidence-based and genuinely helps
2. Access to mental health support shouldn't be gated by cost/availability
3. Context-aware AI can provide something traditional apps can't
4. Full transparency builds trust (we show you the scores, explain the diagnoses)
5. You're an adult who can handle clinical information

## Credits

- Built with CBT framework based on Aaron Beck's cognitive model
- Assessments: GAD-7 (Spitzer et al.), PHQ-9 (Kroenke et al.), DASS-21 (Lovibond), PCL-5 (Weathers et al.)
- Crisis protocol informed by Columbia Suicide Severity Rating Scale

## License

MIT — Use freely, modify freely, help people freely.

---

_Built by someone with anxiety, for people with anxiety._ 🧠
