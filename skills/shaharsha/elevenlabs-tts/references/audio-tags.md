# Audio Tags Reference

Complete guide to ElevenLabs v3 audio tags.

## Prerequisites

- **Model**: `eleven_v3` (alpha) - ONLY this model supports audio tags
- **Voice Type**: IVC (Instant Voice Clone) or designed voices - PVC not optimized yet
- **Prompt Length**: 250+ characters for consistent results
- **Stability**: Creative or Natural mode (Robust reduces tag responsiveness)

## Core Principle

Write NATURAL sentences that tags modify, NOT explanations.

❌ WRONG: `[excited] אני מתרגש!`
✅ RIGHT: `[excited] זה ממש מדהים מה שעשינו היום!`

---

## Tag Categories

### Emotions (High Reliability)

| Tag             | Description             |
| --------------- | ----------------------- |
| `[excited]`     | Energy, enthusiasm      |
| `[happy]`       | Joy, cheerfulness       |
| `[happily]`     | Speaking with happiness |
| `[sad]`         | Sadness, melancholy     |
| `[sorrowful]`   | Deep sadness            |
| `[angry]`       | Anger, intensity        |
| `[curious]`     | Curiosity, interest     |
| `[nervous]`     | Nervousness, anxiety    |
| `[sarcastic]`   | Sarcasm, irony          |
| `[tired]`       | Fatigue, weariness      |
| `[serious]`     | Seriousness             |
| `[confident]`   | Confidence              |
| `[frustrated]`  | Frustration             |
| `[mischievous]` | Playful mischief        |
| `[awe]`         | Wonder, amazement       |
| `[resigned]`    | Acceptance, giving up   |
| `[flustered]`   | Confused embarrassment  |
| `[casual]`      | Relaxed, informal       |
| `[annoyed]`     | Irritation              |

### Delivery & Volume (High Reliability)

| Tag                | Description       |
| ------------------ | ----------------- |
| `[whispers]`       | Quiet, intimate   |
| `[shouts]`         | Loud, intense     |
| `[dramatic tone]`  | Theatrical        |
| `[dramatic]`       | Dramatic delivery |
| `[matter-of-fact]` | Plain, factual    |
| `[whiny]`          | Complaining tone  |
| `[flatly]`         | No emotion        |
| `[quietly]`        | Soft voice        |
| `[suspiciously]`   | Suspicious tone   |

### Pacing & Timing (High Reliability)

| Tag                        | Description          |
| -------------------------- | -------------------- |
| `[pause]`                  | Brief silence        |
| `[breathes]`               | Breathing sound      |
| `[continues after a beat]` | Pause then continue  |
| `[rushed]`                 | Fast, urgent         |
| `[slows down]`             | Decreasing speed     |
| `[deliberate]`             | Careful, intentional |
| `[rapid-fire]`             | Very fast            |
| `[drawn out]`              | Stretched, slow      |
| `[stammers]`               | Stuttering           |
| `[hesitates]`              | Uncertainty          |
| `[timidly]`                | Shy, tentative       |
| `[repeats]`                | Repetition           |

### Emphasis (Medium Reliability)

| Tag                     | Description              |
| ----------------------- | ------------------------ |
| `[emphasized]`          | Strong emphasis          |
| `[stress on next word]` | Emphasize following word |
| `[understated]`         | Downplayed delivery      |

### Reactions & Sounds (Very High Reliability)

| Tag                 | Description         |
| ------------------- | ------------------- |
| `[laughs]`          | Laughter            |
| `[laughs softly]`   | Gentle laugh        |
| `[laughs harder]`   | Increasing laughter |
| `[starts laughing]` | Beginning to laugh  |
| `[nervous laugh]`   | Anxious laughter    |
| `[giggles]`         | Small laugh         |
| `[wheezing]`        | Breathless laugh    |
| `[sighs]`           | Exhale of emotion   |
| `[sigh]`            | Single sigh         |
| `[gasps]`           | Sharp intake        |
| `[exhales]`         | Breathing out       |
| `[clears throat]`   | Throat clearing     |
| `[gulps]`           | Swallowing          |
| `[swallows]`        | Swallowing sound    |
| `[snorts]`          | Snorting sound      |
| `[crying]`          | Sobbing             |

### Character & Accents (Medium Reliability)

| Tag                      | Description           |
| ------------------------ | --------------------- |
| `[French accent]`        | French accent         |
| `[American accent]`      | American accent       |
| `[British accent]`       | British accent        |
| `[Australian accent]`    | Australian accent     |
| `[Southern US accent]`   | Southern American     |
| `[strong X accent]`      | Replace X with accent |
| `[pirate voice]`         | Pirate character      |
| `[evil scientist voice]` | Mad scientist         |
| `[childlike tone]`       | Child-like voice      |
| `[robotic tone]`         | Robot voice           |
| `[deep voice]`           | Lower pitch           |

### Narrative & Genre (Medium Reliability)

| Tag                    | Description        |
| ---------------------- | ------------------ |
| `[storytelling tone]`  | Narrator voice     |
| `[voice-over style]`   | Documentary style  |
| `[fantasy narrator]`   | Epic fantasy       |
| `[sci-fi AI voice]`    | Futuristic AI      |
| `[classic film noir]`  | 1940s detective    |
| `[epic build-up]`      | Building intensity |
| `[narrative flourish]` | Dramatic narration |

### Multi-Speaker Dialogue

| Tag              | Description         |
| ---------------- | ------------------- |
| `[interrupting]` | Cutting off speaker |
| `[overlapping]`  | Speaking over       |
| `[cuts in]`      | Interjecting        |
| `[interjecting]` | Jumping in          |
| `[fast-paced]`   | Quick exchange      |

### Sound Effects (Low-Medium Reliability)

| Tag           | Description       |
| ------------- | ----------------- |
| `[gunshot]`   | Gun sound         |
| `[clapping]`  | Applause          |
| `[applause]`  | Audience clapping |
| `[explosion]` | Blast sound       |
| `[thunder]`   | Thunder           |

### Experimental (Test First)

| Tag           | Description   |
| ------------- | ------------- |
| `[sings]`     | Singing       |
| `[woo]`       | Exclamation   |
| `[fart]`      | Sound effect  |
| `[panicked]`  | Panic         |
| `[trembling]` | Shaking voice |

---

## Usage Guidelines

### ✅ DO:

- Use simple tags: `[excited]` not `[excited tone]`
- Write natural sentences that work without tags
- Use 2-4 tags per paragraph max
- Place tags at sentence start or key moment
- Match tags to voice character
- Test and regenerate (v3 is non-deterministic)
- Combine tags: `[whispering][pause] Did you hear that?`

### ❌ DON'T:

- Don't add "tone" suffix: `[serious tone]` ❌
- Don't overload with tags
- Don't explain what the tag does
- Don't use incompatible combos (whisper voice + shout tag)
- Don't expect consistency (regenerate if needed)

---

## Examples

### Emotional Monologue

```
[sighs] I've been thinking about what you said. [pause]
And you're right. [sadly] I should have listened earlier.
[determined] But I'm going to fix this. Starting now.
```

### Multi-Character Dialogue

```
Sarah: [whispers] I think someone's coming.
Mike: [interrupting] —I heard it too! [panicked] Hide!
Sarah: [annoyed] I was TRYING to tell you that!
```

### Comedic Timing

```
[confident] So I walked up to the boss and said...
[pause] [nervous laugh] Actually, I didn't say anything.
[sighs] I just stood there. [laughs] Classic me.
```

### Accent Performance

```
[British accent] Terribly sorry, but I must insist.
[switches to Southern US accent] Well now, that's mighty kind of y'all.
[French accent] Mon ami, you simply must try ze croissant!
```

---

## Troubleshooting

**Tags being read aloud?**

- Check you're using `eleven_v3` (not turbo_v3 or v2.5)
- Use IVC/designed voices, not PVC
- Simplify tags (remove "tone", "sound", etc.)
- Increase prompt length (250+ chars)

**Tags not working?**

- Generate multiple times (v3 is variable)
- Use Creative or Natural stability (not Robust)
- Add surrounding context text
- Try different tag placement
- Voice may not match tag style

**Multi-speaker not distinct?**

- Add character cues: `[deep voice]`, `[higher pitch]`
- Use accent tags for differentiation
- Add emotional contrast between speakers
