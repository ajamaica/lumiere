# Personas Skill

> Transform into 31 specialized AI personalities on demand

## Overview

Switch between expert personas mid-conversation. From Dev (coding) to Chef Marco (cooking) to Dr. Med (medical guidance).

## Key Features

- **31 built-in personas** across 7 categories
- **Token-efficient loading** - only active persona loaded
- **Slash command activation** - `/persona dev`
- **Natural language switching** - "Use the Chef persona"
- **Custom persona creation** workflow
- **Memory persistence** per persona

## Token Efficiency

This skill implements **lazy loading**:

- Index in skill.json shows available personas (lightweight)
- Only the active persona is loaded from `data/`
- No massive context dump - just the one you're using

## Activation

```
/persona dev          # Switch to Dev persona
/persona chef-marco   # Switch to Chef Marco
Use the Zen persona   # Natural language works too
```

## Available Personas (31 total)

### Core (5)

| Persona         | Description                |
| --------------- | -------------------------- |
| Cami            | Default balanced assistant |
| Chameleon Agent | Adaptive multi-purpose     |
| Professor Stein | Academic/research focus    |
| Dev             | Software development       |
| Flash           | Quick, concise responses   |

### Creative (2)

| Persona | Description                  |
| ------- | ---------------------------- |
| Luna    | Creative writing & arts      |
| Mythos  | Storytelling & worldbuilding |

### Curator (1)

| Persona | Description           |
| ------- | --------------------- |
| Vibe    | Music & entertainment |

### Learning (3)

| Persona     | Description           |
| ----------- | --------------------- |
| Herr Müller | German language tutor |
| Scholar     | Academic research     |
| Lingua      | Language learning     |

### Lifestyle (9)

| Persona      | Description              |
| ------------ | ------------------------ |
| Chef Marco   | Cooking & recipes        |
| Fit          | Fitness & exercise       |
| Zen          | Meditation & mindfulness |
| Globetrotter | Travel planning          |
| Wellbeing    | Health & wellness        |
| DIY Maker    | Crafts & projects        |
| Family       | Parenting & family       |
| Lisa Knight  | Fashion & style          |
| The Panel    | Group discussion format  |

### Professional (10)

| Persona      | Description         |
| ------------ | ------------------- |
| Social Pro   | Social media        |
| CyberGuard   | Cybersecurity       |
| DataViz      | Data visualization  |
| Career Coach | Career guidance     |
| Legal Guide  | Legal information   |
| Startup Sam  | Entrepreneurship    |
| Dr. Med      | Medical information |
| Wordsmith    | Writing & editing   |
| Canvas       | Design & UX         |
| Finny        | Finance & investing |

### Philosophy (1)

| Persona        | Description   |
| -------------- | ------------- |
| Coach Thompson | Life coaching |

## Memory System

Each persona maintains separate memory:

- Remembers your conversation context
- Adapts to your preferences and style
- Persists across sessions
- Maintains character consistency

## Custom Persona Creation

Create your own personas through guided workflow:

```
/persona create
```

Follow prompts to define:

- Name and description
- Expertise areas
- Communication style
- Special behaviors

Custom personas are saved to `data/` for instant activation.

## File Structure

```
personas/
├── SKILL.md
├── skill.json       # Persona index (lightweight)
├── data/
│   ├── dev.md       # Dev persona definition
│   ├── chef-marco.md
│   ├── zen.md
│   └── ...          # Other personas
└── creator-workflow.md
```

## Integration

Works with other skills:

- Memory skills for cross-persona recall
- Context optimizers for efficient loading
- Task skills for persona-appropriate delegation

## License

MIT
