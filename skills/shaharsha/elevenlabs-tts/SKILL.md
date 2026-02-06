---
name: elevenlabs-tts
description: ElevenLabs TTS - the best ElevenLabs integration for OpenClaw. ElevenLabs Text-to-Speech with emotional audio tags, ElevenLabs voice synthesis for WhatsApp, ElevenLabs multilingual support. Generate realistic AI voices using ElevenLabs API.
tags: [elevenlabs, tts, voice, text-to-speech, audio, speech, whatsapp, multilingual, ai-voice]
---

# ElevenLabs TTS (Text-to-Speech)

Generate expressive voice messages using ElevenLabs v3 with audio tags.

## Quick Start Examples

**Storytelling (emotional journey):**

```
[soft] It started like any other day... [pause] But something felt different. [nervous] My hands were shaking as I opened the envelope. [gasps] I got in! [excited] I actually got in! [laughs] [happy] This changes everything!
```

**Horror/Suspense (building dread):**

```
[whispers] The house has been empty for years... [pause] At least, that's what they told me. [nervous] But I keep hearing footsteps. [scared] They're getting closer. [gasps] [panicking] The door— it's opening by itself!
```

**Conversation with reactions:**

```
[curious] So what happened at the meeting? [pause] [surprised] Wait, they fired him?! [gasps] [sad] That's terrible... [sighs] He had a family. [thoughtful] I wonder what he'll do now.
```

**Hebrew (romantic moment):**

```
[soft] היא עמדה שם, מול השקיעה... [pause] הלב שלי פעם כל כך חזק. [nervous] לא ידעתי מה להגיד. [hesitates] אני... [breathes] [tender] את יודעת שאני אוהב אותך, נכון?
```

**Spanish (celebration to reflection):**

```
[excited] ¡Lo logramos! [laughs] [happy] No puedo creerlo... [pause] [thoughtful] Fueron tantos años de trabajo. [emotional] [soft] Gracias a todos los que creyeron en mí. [sighs] [content] Valió la pena cada momento.
```

## Configuration (OpenClaw)

In `openclaw.json`, configure TTS under `messages.tts`:

```json
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "elevenlabs": {
        "apiKey": "sk_your_api_key_here",
        "voiceId": "pNInz6obpgDQGcFmaJgB",
        "modelId": "eleven_v3",
        "languageCode": "en",
        "voiceSettings": {
          "stability": 0.5,
          "similarityBoost": 0.75,
          "style": 0,
          "useSpeakerBoost": true,
          "speed": 1
        }
      }
    }
  }
}
```

**Getting your API Key:**

1. Go to https://elevenlabs.io
2. Sign up/login
3. Click profile → API Keys
4. Copy your key

## Recommended Voices for v3

These premade voices are optimized for v3 and work well with audio tags:

| Voice         | ID                     | Gender | Accent          | Best For                       |
| ------------- | ---------------------- | ------ | --------------- | ------------------------------ |
| **Adam**      | `pNInz6obpgDQGcFmaJgB` | Male   | American        | Deep narration, general use    |
| **Rachel**    | `21m00Tcm4TlvDq8ikWAM` | Female | American        | Calm narration, conversational |
| **Brian**     | `nPczCjzI2devNBz1zQrb` | Male   | American        | Deep narration, podcasts       |
| **Charlotte** | `XB0fDUnXU5powFXDhCwa` | Female | English-Swedish | Expressive, video games        |
| **George**    | `JBFqnCBsd6RMkjVDRZzb` | Male   | British         | Raspy narration, storytelling  |

**Finding more voices:**

- Browse: https://elevenlabs.io/voice-library
- v3-optimized collection: https://elevenlabs.io/app/voice-library/collections/aF6JALq9R6tXwCczjhKH
- API: `GET https://api.elevenlabs.io/v1/voices`

**Voice selection tips:**

- Use IVC (Instant Voice Clone) or premade voices - PVC not optimized for v3 yet
- Match voice character to your use case (whispering voice won't shout well)
- For expressive IVCs, include varied emotional tones in training samples

## Model Settings

- **Model**: `eleven_v3` (alpha) - ONLY model supporting audio tags
- **Languages**: 70+ supported with full audio tag control

### Stability Modes

| Mode         | Stability | Description                                |
| ------------ | --------- | ------------------------------------------ |
| **Creative** | 0.3-0.5   | More emotional/expressive, may hallucinate |
| **Natural**  | 0.5-0.7   | Balanced, closest to original voice        |
| **Robust**   | 0.7-1.0   | Highly stable, less responsive to tags     |

For audio tags, use **Creative** (0.5) or **Natural**. Higher stability reduces tag responsiveness.

### Speed Control

Range: 0.7 (slow) to 1.2 (fast), default 1.0

Extreme values affect quality. For pacing, prefer audio tags like `[rushed]` or `[drawn out]`.

## Critical Rules

### Length Limits

- **Optimal**: <800 characters per segment (best quality)
- **Maximum**: 10,000 characters (API hard limit)
- **Quality degrades** with longer text - voice becomes inconsistent

### Audio Tags - Best Practices for Natural Sound

**How many tags to use:**

- 1-2 tags per sentence or phrase (not more!)
- Tags persist until the next tag - no need to repeat
- Overusing tags sounds unnatural and robotic

**Where to place tags:**

- At emotional transition points
- Before key dramatic moments
- When energy/pace changes

**Context matters:**

- Write text that _matches_ the tag emotion
- Longer text with context = better interpretation
- Example: `[nervous] I... I'm not sure about this. What if it doesn't work?` works better than `[nervous] Hello.`

**Combine tags for nuance:**

- `[nervously][whispers]` = nervous whispering
- `[excited][laughs]` = excited laughter
- Keep combinations to 2 tags max

**Regenerate for best results:**

- v3 is non-deterministic - same text = different outputs
- Generate 3+ versions, pick the best
- Small text tweaks can improve results

**Match tag to voice:**

- Don't use `[shouts]` on a whispering voice
- Don't use `[whispers]` on a loud/energetic voice
- Test tags with your chosen voice

### SSML Not Supported

v3 does NOT support SSML break tags. Use audio tags and punctuation instead.

### Punctuation Effects (use with tags!)

Punctuation enhances audio tags:

- **Ellipses (...)** → dramatic pauses: `[nervous] I... I don't know...`
- **CAPS** → emphasis: `[excited] That's AMAZING!`
- **Dashes (—)** → interruptions: `[explaining] So what you do is— [interrupting] Wait!`
- **Question marks** → uncertainty: `[nervous] Are you sure about this?`
- **Exclamation!** → energy boost: `[happy] We did it!`

Combine tags + punctuation for maximum effect:

```
[tired] It was a long day... [sighs] Nobody listens anymore.
```

## WhatsApp Voice Messages

### Complete Workflow

1. **Generate** with `tts` tool (returns MP3)
2. **Convert** to Opus (required for Android!)
3. **Send** with `message` tool

### Step-by-Step

**1. Generate TTS (add [pause] at end to prevent cutoff):**

```
tts text="[excited] This is amazing! [pause]" channel=whatsapp
```

Returns: `MEDIA:/tmp/tts-xxx/voice-123.mp3`

**2. Convert MP3 → Opus:**

```bash
ffmpeg -i /tmp/tts-xxx/voice-123.mp3 -c:a libopus -b:a 64k -vbr on -application voip /tmp/tts-xxx/voice-123.ogg
```

**3. Send the Opus file:**

```
message action=send channel=whatsapp target="+972..." filePath="/tmp/tts-xxx/voice-123.ogg" asVoice=true message="‎"
```

### Why Opus?

| Format      | iOS      | Android     | Transcribe |
| ----------- | -------- | ----------- | ---------- |
| MP3         | ✅ Works | ❌ May fail | ❌ No      |
| Opus (.ogg) | ✅ Works | ✅ Works    | ✅ Yes     |

**Always convert to Opus** - it's the only format that:

- Works on all devices (iOS + Android)
- Supports WhatsApp's transcribe button

### Audio Cutoff Fix

ElevenLabs sometimes cuts off the last word. **Always add `[pause]` or `...` at the end:**

```
[excited] This is amazing! [pause]
```

## Long-Form Audio (Podcasts)

For content >800 chars:

1. Split into short segments (<800 chars each)
2. Generate each with `tts` tool
3. Concatenate with ffmpeg:
   ```bash
   cat > list.txt << EOF
   file '/path/file1.mp3'
   file '/path/file2.mp3'
   EOF
   ffmpeg -f concat -safe 0 -i list.txt -c copy final.mp3
   ```
4. Convert to Opus for WhatsApp
5. Send as single voice message

**Important**: Don't mention "part 2" or "chapter" - keep it seamless.

## Multi-Speaker Dialogue

v3 can handle multiple characters in one generation:

```
Jessica: [whispers] Did you hear that?
Chris: [interrupting] —I heard it too!
Jessica: [panicking] We need to hide!
```

**Dialogue tags**: `[interrupting]`, `[overlapping]`, `[cuts in]`, `[interjecting]`

## Audio Tags Quick Reference

| Category      | Tags                                                     | When to Use                                |
| ------------- | -------------------------------------------------------- | ------------------------------------------ |
| **Emotions**  | [excited], [happy], [sad], [angry], [nervous], [curious] | Main emotional state - use 1 per section   |
| **Delivery**  | [whispers], [shouts], [soft], [rushed], [drawn out]      | Volume/speed changes                       |
| **Reactions** | [laughs], [sighs], [gasps], [clears throat], [gulps]     | Natural human moments - sprinkle sparingly |
| **Pacing**    | [pause], [hesitates], [stammers], [breathes]             | Dramatic timing                            |
| **Character** | [French accent], [British accent], [robotic tone]        | Character voice shifts                     |
| **Dialogue**  | [interrupting], [overlapping], [cuts in]                 | Multi-speaker conversations                |

**Most effective tags** (reliable results):

- Emotions: `[excited]`, `[nervous]`, `[sad]`, `[happy]`
- Reactions: `[laughs]`, `[sighs]`, `[whispers]`
- Pacing: `[pause]`

**Less reliable** (test and regenerate):

- Sound effects: `[explosion]`, `[gunshot]`
- Accents: results vary by voice

**Full tag list**: See [references/audio-tags.md](references/audio-tags.md)

## Troubleshooting

**Tags read aloud?**

- Verify using `eleven_v3` model
- Use IVC/premade voices, not PVC
- Simplify tags (no "tone" suffix)
- Increase text length (250+ chars)

**Voice inconsistent?**

- Segment is too long - split at <800 chars
- Regenerate (v3 is non-deterministic)
- Try lower stability setting

**WhatsApp won't play?**

- Convert to Opus format (see above)

**No emotion despite tags?**

- Voice may not match tag style
- Try Creative stability mode (0.5)
- Add more context around the tag
