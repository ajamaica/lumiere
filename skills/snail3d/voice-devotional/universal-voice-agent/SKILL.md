---
name: universal-voice-agent
description: Real-time goal-oriented voice calling agent. Use when you need to make phone calls with a specific objective: place orders, make reservations, customer service, encouragement calls, or any conversational goal. Haiku runs the call in real-time with your voice (ElevenLabs), transcribes responses (Groq Whisper), adapts intelligently to conversation flow, handles silence/holds, and sends you an SMS summary. No scripts, pure real-time reasoning.
---

# Universal Voice Agent

Make phone calls to achieve any goal. Haiku converses naturally, adapts in real-time, and handles the entire flow autonomously.

## Quick Start

### Make a Call

```bash
universal-voice-agent call \
  --goal "Order 2 large pepperonis for pickup at 6pm" \
  --phone "+1-555-123-4567" \
  --notify-to "+1-555-730-8926"
```

Haiku:

1. Calls the number via Twilio
2. Listens to responses (Groq Whisper transcription)
3. Thinks about next move toward goal (Claude Haiku real-time reasoning)
4. Speaks in your voice (ElevenLabs TTS)
5. Repeats until goal achieved or timeout
6. Sends SMS summary to you

### Examples

**Ordering:**

```bash
universal-voice-agent call \
  --goal "Order 2 large pepperonis for pickup at 6pm" \
  --phone "+1-555-123-4567"
```

**Customer Service:**

```bash
universal-voice-agent call \
  --goal "Find out the cancellation policy and confirm my appointment" \
  --phone "+1-555-987-6543"
```

**Encouragement:**

```bash
universal-voice-agent call \
  --goal "Call John and encourage him about his recent wins" \
  --phone "+1-555-555-5555"
```

**Support:**

```bash
universal-voice-agent call \
  --goal "Get a refund for order #12345" \
  --phone "+1-800-123-4567"
```

## How It Works

### Real-Time Voice Loop

```
Goal: "Order 2 large pepperonis"
Phone: 555-123-4567

[DIAL]
  ↓
[LISTEN] (Groq Whisper) → "Hi, Mario's Pizza!"
  ↓
[THINK] (Haiku) → "They answered, now I'll state my order"
  ↓
[SPEAK] (ElevenLabs) → "Hi! I'd like to order 2 large pepperonis..."
  ↓
[LISTEN] (Groq Whisper) → "Sure, what else?"
  ↓
[THINK] (Haiku) → "They're ready. I should give toppings and details."
  ↓
[SPEAK] (ElevenLabs) → "No onions, and pickup at 6pm"
  ↓
[LISTEN] (Groq Whisper) → "$35, see you at 6."
  ↓
[THINK] (Haiku) → "Goal achieved! Order confirmed."
  ↓
[SEND SMS] → "✅ Order placed: 2 large pepperoni, pickup 6pm, $35"
  ↓
[HANGUP]
```

### Key Features

**Real-time Reasoning:**

- Haiku gets full conversation history
- Decides next response based on context, not scripts
- Adapts to unexpected responses naturally

**Silence Handling:**

- Detects when other party goes silent (on hold, put down phone, etc)
- After 5 seconds of silence: waits
- After 10 seconds: asks "Hello? Are you still there?"
- After 5 minutes: hangs up intelligently

**Natural Pacing:**

- Response latency <2 seconds (Haiku is fast)
- Speaks at human pace (ElevenLabs)
- Pauses for listening naturally

**Smart Timeout:**

- Conversation timeout: 20 minutes max
- Hold timeout: 5 minutes max
- Asks "Is anyone there?" before giving up

**SMS Summary:**

- After call ends, sends you a text with:
  - Status (✅ ✅ with issues, ❌ failed)
  - Brief recap of what happened
  - Key confirmations/details
  - Call duration

## Configuration

### Goal Definition

Any natural language phrase:

- "Order 2 large pepperonis for pickup at 6pm"
- "Find out the cancellation policy"
- "Call John and encourage him"
- "Get a refund for order #12345"

Haiku interprets the goal and adapts the conversation to achieve it.

### Phone Number

E.164 format: `+1-555-123-4567` or just `555-123-4567`

### Optional Context

```bash
universal-voice-agent call \
  --goal "Order 2 large pepperonis" \
  --phone "555-123-4567" \
  --context "Restaurant: Mario's Pizza, Budget: $40, Dietary: no onions" \
  --notify-to "555-730-8926"
```

## Scripts

- **agent.js** - Main orchestrator, Twilio loop, SMS summary
- **transcriber.js** - Groq Whisper transcription pipeline
- **thinker.js** - Haiku reasoning engine
- **speaker.js** - ElevenLabs TTS output
- **silence-handler.js** - Detect holds, silence, timeout

## References

- **ARCHITECTURE.md** - Real-time voice loop design
- **LATENCY.md** - Optimization for sub-2s response times

## Credentials Required

- **Twilio**: Account SID, Auth Token, phone number
- **ElevenLabs**: API key + your voice ID
- **Groq**: API key for Whisper transcription
- **Claude API** or **Clawdbot Gateway**: For Haiku reasoning

Store in environment or TOOLS.md.
