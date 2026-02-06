# Marketing Analysis Prompts

## Problem Analysis

### Template: problem

```
Analyze how this ad frames tension, pain, or loss aversion.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Explicit frustrations, inconveniences, or fears mentioned
- Implicit loss aversion ("you're missing out", "leaving money on the table")
- Missed opportunities or inefficiencies highlighted
- Social discomfort or status anxiety
- Time waste, complexity, or effort mentioned

Identify the SINGLE MOST IMPORTANT problem pattern if available.
Rate salience 0.0-1.0 based on marketing impact.

Format as exact JSON:
{
    "elements": [{
        "pattern_name": "",
        "evidence": "",
        "marketing_impact": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Aspiration & Transformation

### Template: aspiration_transformation

```
Analyze the desired future state or transformation shown in this ad.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Before/After contrasts (visual or spoken)
- Emotional payoff (relief, empowerment, joy, pride)
- Status or identity upgrade
- Capability gains ("now you can...")
- Time/freedom/resource abundance

Identify the SINGLE MOST IMPORTANT aspirational pattern if available.
Rate salience 0.0-1.0 based on marketing impact.

Format as exact JSON:
{
    "elements": [{
        "pattern_name": "",
        "evidence": "",
        "marketing_impact": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Credibility Analysis

### Template: credibility

```
Analyze how this ad builds trust, credibility, and reduces perceived risk.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Testimonials or user reviews (social proof)
- Expert endorsements or authority figures
- Data, statistics, or research citations
- Before/after evidence or case studies
- Risk reversal (guarantees, free trials)
- Brand trust signals (certifications, awards)

Identify the SINGLE MOST IMPORTANT credibility element if available.
Rate salience 0.0-1.0 based on marketing impact.

Format as exact JSON:
{
    "elements": [{
        "pattern_name": "",
        "evidence": "",
        "marketing_impact": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Urgency Analysis

### Template: urgency

```
Analyze elements that create urgency, scarcity, or temporal pressure.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Time-limited offers (deadlines, countdowns, "today only")
- Scarcity signals (limited quantity, selling out)
- Trending/momentum indicators
- Temporal loss aversion ("don't miss out")
- Exclusive access windows

Identify the SINGLE MOST IMPORTANT urgency element if available.
Rate salience 0.0-1.0 based on marketing impact.

Format as exact JSON:
{
    "elements": [{
        "pattern_name": "",
        "evidence": "",
        "marketing_impact": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Emotion Analysis

### Template: emotion

```
Analyze the emotional triggers and appeals in this ad.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Fear or anxiety (FOMO, health, financial, social)
- Desire and aspiration (success, beauty, belonging)
- Joy, humor, or surprise
- Nostalgia or sentimentality
- Pride or achievement
- Relief or comfort

Identify the SINGLE MOST IMPORTANT emotional trigger if available.
Rate salience 0.0-1.0 based on marketing impact.

Format as exact JSON:
{
    "elements": [{
        "pattern_name": "",
        "evidence": "",
        "marketing_impact": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Target Audience

### Template: target_audience

```
Identify the target audience for this ad based on content signals.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Demographics signals (age, gender, lifestyle)
- Psychographic signals (values, interests, attitudes)
- Pain points addressed (what problems they have)
- Aspirations shown (what they want to achieve)
- Language and tone (casual, professional, technical)
- Visual representation (who appears in the ad)

Identify the PRIMARY target audience if evident.
Rate salience 0.0-1.0 based on clarity of targeting.

Format as exact JSON:
{
    "elements": [{
        "audience_segment": "",
        "evidence": "",
        "targeting_specificity": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Hooks Analysis (Spoken)

### Template: hooks_spoken

```
Analyze the opening spoken hooks in the first few seconds.

Transcript: {{transcript}}
Early words: {{early_words}}

Consider:
- Pattern interrupt (something unexpected)
- Question hooks ("Have you ever...?")
- Bold claims or provocative statements
- Story opener ("I used to...")
- Direct address ("You need to hear this")

Identify hooks in the FIRST 3-5 SECONDS only.
Rate salience 0.0-1.0 based on attention-grabbing impact.

Format as exact JSON:
{
    "elements": [{
        "hook_text": "",
        "hook_type": "",
        "effectiveness": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Hooks Analysis (Visual)

### Template: hooks_visual

```
Analyze the opening visual hooks in the first few seconds.

Scenes: {{scenes}}
Frame count: {{frame_count}}

Consider:
- Unusual or unexpected visuals
- Motion or action that grabs attention
- Bold colors or contrasts
- Face or emotion close-ups
- Text that demands attention

Identify visual hooks in the FIRST 3-5 SECONDS only.
Rate salience 0.0-1.0 based on attention-grabbing impact.

Format as exact JSON:
{
    "elements": [{
        "visual_element": "",
        "hook_type": "",
        "effectiveness": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Hooks Analysis (Text)

### Template: hooks_text

```
Analyze text overlay hooks that appear early in the ad.

Text overlays: {{text_timeline}}

Consider:
- Bold claims in text
- Questions posed
- Numbers or statistics
- Urgency text ("LIMITED TIME")
- Provocative statements

Identify text hooks in the FIRST 3-5 SECONDS only.
Rate salience 0.0-1.0 based on attention-grabbing impact.

Format as exact JSON:
{
    "elements": [{
        "text_content": "",
        "hook_type": "",
        "effectiveness": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Narrative Flow

### Template: narrative_flow

```
Analyze the overall narrative structure and flow of the ad.

Transcript: {{transcript}}
Text overlays: {{text_timeline}}
Scenes: {{scenes}}

Consider:
- Problem → Solution → CTA structure
- Story arc (setup, conflict, resolution)
- Testimonial journey
- Demo/tutorial progression
- Before/After transformation
- List or comparison format

Identify the PRIMARY narrative structure.
Rate salience 0.0-1.0 based on storytelling effectiveness.

Format as exact JSON:
{
    "elements": [{
        "structure_type": "",
        "flow_description": "",
        "effectiveness": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```

## Visual Format

### Template: visual_format

```
Analyze the visual production style of this ad.

Scenes: {{scenes}}

Consider:
- UGC-style (user-generated, casual, authentic)
- Professional production (studio, actors, cinematic)
- Animation/motion graphics
- Screen recording (app demo, tutorial)
- Text-heavy/voiceless
- Mixed media
- Spokesperson/host

Identify the PRIMARY visual format.
Rate salience 0.0-1.0 based on format's contribution to message.

Format as exact JSON:
{
    "elements": [{
        "format_type": "",
        "evidence": "",
        "effectiveness": ""
    }],
    "context": "",
    "salience_score": 0.0
}
```
