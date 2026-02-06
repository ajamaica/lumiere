# Real-Time Voice Agent Architecture

## Overview

The universal voice agent is a real-time, goal-oriented calling system that:

1. Makes phone calls via Twilio
2. Listens to responses via speech-to-text (Groq Whisper)
3. Thinks in real-time using Claude Haiku
4. Speaks naturally via TTS (ElevenLabs)
5. Handles silence, holds, and timeouts intelligently
6. Sends SMS summaries

## Components

### 1. Twilio Integration

- **Initiates call** to target phone number
- **WebSocket stream** for real-time audio (bi-directional)
- **Hangup detection** when goal achieved or timeout
- **SMS delivery** for summaries

### 2. Speech-to-Text (Groq Whisper)

- **Real-time transcription** of what the other party says
- **Latency**: ~1-2 seconds per transcription
- **Triggers**: After silence detected or timeout

### 3. Haiku Reasoning Engine

- **Input**: Goal + conversation history
- **Process**: Decides next response in context
- **Output**: What to say next (1-2 sentences)
- **Speed**: <500ms thinking time (Haiku is fast)
- **Approach**: Raw reasoning, not scripts

### 4. ElevenLabs TTS

- **Input**: Text response from Haiku
- **Output**: Audio in your voice
- **Speed**: <1 second for typical response
- **Quality**: Natural, conversational

### 5. Silence/Hold Detection

- **Silent threshold**: 5 seconds with no speech detected
- **Action at 5s**: Wait and listen longer
- **Action at 10s**: Ask "Hello? Are you still there?"
- **Action at 5 min**: Hang up intelligently

## Real-Time Loop

```
[CALL INITIATED]
       ↓
[LOOP: while call_active and turns < max]
  ├─ LISTEN (Groq Whisper)
  │  └─ Transcribe other party's speech
  │
  ├─ DETECT SILENCE
  │  ├─ If <5s: Continue
  │  ├─ If 5-10s: Ask "Hello?"
  │  └─ If >5min: Hang up
  │
  ├─ THINK (Haiku)
  │  ├─ Input: goal + conversation history
  │  ├─ Reason: What to say next?
  │  └─ Output: Response text
  │
  ├─ CHECK GOAL
  │  ├─ If achieved: Break loop
  │  └─ If not: Continue
  │
  ├─ SPEAK (ElevenLabs)
  │  └─ Output audio response
  │
  └─ UPDATE HISTORY
     └─ Add turn to conversation log

[CALL ENDED]
       ↓
[SEND SMS SUMMARY]
```

## Latency Budget

Target: **<2 seconds total response time** (feels natural in conversation)

- Groq Whisper: ~1-2s (transcription)
- Haiku: <500ms (reasoning, fast model)
- ElevenLabs: <1s (TTS generation)
- Network: <200ms (Twilio)

**Total**: ~2-3.5 seconds per turn (acceptable for phone conversation)

## Conversation Context

Haiku receives:

1. **The goal** ("Order 2 large pepperonis")
2. **Full conversation history** (what was said so far)
3. **Optional context** (restaurant name, budget, etc.)

Haiku decides:

- Should I continue toward the goal?
- What's the most natural response?
- Have we achieved the goal?
- Should I ask clarifying questions?

**Key**: No scripts. Haiku reasons in real-time based on context.

## Silence & Hold Handling

### Scenario 1: Short Silence (On Hold)

```
[You speak order]
[5 seconds of silence]
[Haiku: Maybe they're looking up prices]
[Haiku waits, doesn't hang up]
[They return: "That'll be $35"]
```

### Scenario 2: Extended Silence

```
[You speak]
[10 seconds of silence]
[Haiku: They might be away]
[Haiku says: "Hello? Are you still there?"]
[Wait 5 seconds for response]
[If no response: Hang up intelligently]
```

### Scenario 3: Put Down Phone

```
[Long background noise → silence]
[>5 minutes of near-silence]
[Haiku: They forgot about the call]
[Haiku: "Thank you for your time, goodbye"]
[Hang up]
```

## Goal Achievement Detection

Haiku monitors conversation for goal completion signals:

**Order placement**:

- "Order confirmed", "Total is $X", "See you at 6pm"
- Detect: Price agreed, time confirmed, item count confirmed

**Customer service**:

- "Refund processed", "Issue resolved", "Ticket created"
- Detect: Confirmation of action taken

**Encouragement**:

- "Thanks for calling", "Really appreciate that", "Feel better"
- Detect: Emotional response, conversation wound down

## Timeout Strategy

**Per-turn timeout**: 20 minutes max

- If reaching 20 minutes, gracefully end: "Thank you, I have everything I need"

**Hold timeout**: 5 minutes max

- If >5 min of silence, hang up after asking "Hello?"

**Silent timeout**: 30 seconds per turn

- If no response to question for 30s, repeat or end

## SMS Summary Format

After call ends:

```
✅ Order placed: 2 large pepperoni
• Pickup at 6pm
• Total: $35
• No onions as requested
Duration: 2m 15s
```

Or on failure:

```
⚠️ Customer service call (partial)
• Policy: Cancellation fee $50
• Fee: Non-waivable
• Refund: $0
Duration: 4m 30s
Status: Ended by agent (timeout)
```

## Production Considerations

### WebSocket vs HTTP Polling

- **WebSocket**: Real-time bi-directional (preferred)
- **HTTP**: Polling-based (fallback)
- Twilio's WebSocket provides lower latency for real-time audio

### Audio Codec

- **Preferred**: PCM 8kHz (standard for phone calls)
- **Alternative**: Opus, AAC

### Error Handling

- Network timeout → automatic reconnect
- Groq failure → use fallback response
- Haiku timeout → use generic response
- ElevenLabs failure → retry with standard voice

### Monitoring

- Track latency per turn
- Monitor success rate (goal achieved %)
- Log full conversation for analysis
- Alert on unusual patterns (infinite loops, crashes)
