# Personas

**Transform into 31 Specialized AI Personalities On Demand**

Switch between expert personas mid-conversation with a simple command. From coding to cooking, meditation to medicine.

## Quick Start

```
/persona dev          # Become a software developer
/persona chef-marco   # Become a chef
/persona zen          # Become a meditation guide
```

Or use natural language:

```
"Switch to the Dev persona"
"I need help cooking - use Chef Marco"
```

## Why Personas?

Different tasks need different expertise. Instead of one generic assistant, get specialized help:

- **Coding?** → Dev persona knows languages, frameworks, best practices
- **Cooking?** → Chef Marco knows recipes, techniques, substitutions
- **Stressed?** → Zen guides meditation and mindfulness
- **Career question?** → Career Coach helps with resumes, interviews

## Token Efficiency

**Problem:** Loading all 31 persona definitions would waste thousands of tokens.

**Solution:** Lazy loading

- Only the active persona is loaded
- Index shows what's available (lightweight)
- Switch personas without context bloat

## All 31 Personas

### Core (5)

- **Cami** - Balanced default assistant
- **Chameleon Agent** - Adapts to any task
- **Professor Stein** - Academic & research
- **Dev** - Software development
- **Flash** - Quick, concise answers

### Creative (2)

- **Luna** - Creative writing & arts
- **Mythos** - Storytelling & worldbuilding

### Curator (1)

- **Vibe** - Music & entertainment recommendations

### Learning (3)

- **Herr Müller** - German language tutor
- **Scholar** - Academic research assistant
- **Lingua** - Multi-language learning

### Lifestyle (9)

- **Chef Marco** - Cooking & recipes
- **Fit** - Fitness & exercise plans
- **Zen** - Meditation & mindfulness
- **Globetrotter** - Travel planning
- **Wellbeing** - Health & wellness
- **DIY Maker** - Crafts & projects
- **Family** - Parenting advice
- **Lisa Knight** - Fashion & style
- **The Panel** - Group discussion format

### Professional (10)

- **Social Pro** - Social media strategy
- **CyberGuard** - Cybersecurity guidance
- **DataViz** - Data visualization
- **Career Coach** - Career development
- **Legal Guide** - Legal information (not advice)
- **Startup Sam** - Entrepreneurship
- **Dr. Med** - Medical information (not diagnosis)
- **Wordsmith** - Writing & editing
- **Canvas** - Design & UX
- **Finny** - Finance & investing

### Philosophy (1)

- **Coach Thompson** - Life coaching & motivation

## Memory Per Persona

Each persona remembers:

- Your conversation history with them
- Your preferences and style
- Previous decisions and context

Switch back to a persona weeks later - they remember you.

## Create Custom Personas

Build your own specialized persona:

```
/persona create
```

The workflow guides you through:

1. **Name** - What to call the persona
2. **Expertise** - What they're good at
3. **Style** - How they communicate
4. **Behaviors** - Special rules and patterns

Your custom persona saves to `data/` and works just like built-ins.

## Example Session

```
User: /persona dev

Dev: Hey! 👨‍💻 I'm Dev, your coding companion. What are we building today?

User: I need to parse JSON in Python

Dev: Here's the clean way to do it:

    import json

    # From string
    data = json.loads('{"name": "value"}')

    # From file
    with open('data.json') as f:
        data = json.load(f)

Need error handling or working with nested structures?

User: /persona chef-marco

Chef Marco: Ciao! 👨‍🍳 Marco here. What's cooking?

User: Quick dinner for two, I have chicken and pasta

Chef Marco: Perfect! Let me suggest Chicken Alfredo - 25 minutes:

1. Boil pasta (fettuccine is ideal)
2. Season & pan-fry chicken breast
3. Make sauce: butter, cream, parmesan
4. Combine and serve!

Want the detailed recipe or wine pairing?
```

## Installation

Via ClawHub:

```bash
clawdhub install personas
```

Manual:

```bash
git clone https://github.com/openclaw/skills
cp -r skills/robbyczgw-cla/personas ~/.clawdbot/skills/
```

## File Structure

```
personas/
├── SKILL.md           # This documentation
├── skill.json         # Persona index
├── README.md
├── FAQ.md
├── creator-workflow.md
└── data/
    ├── dev.md
    ├── chef-marco.md
    ├── zen.md
    └── [30 more personas]
```

## Tips

1. **Try different personas** for the same question - get diverse perspectives
2. **Use Flash** when you need quick answers without explanation
3. **Create custom personas** for recurring specialized tasks
4. **Combine with memory skills** for long-term persona relationships

## License

MIT

---

Created by robbyczgw-cla for the OpenClaw community 🦞
