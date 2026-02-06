---
name: skill-maker
description: Create, package, and publish Clawdbot skills. Generates SKILL.md, boilerplate code, README, and prepares publishable zip files for GitHub and Skill Hub.
---

# 🛠️ Skill Maker

Tool for creating and packaging Clawdbot skills from idea to publish.

## What It Does

1. **Asks you questions** about your skill (name, what it does, triggers, commands)
2. **Generates SKILL.md** with proper metadata
3. **Creates boilerplate code** (scripts, entry points)
4. **Generates README.md** for GitHub
5. **Packages it all** into a publishable zip

## Usage

```bash
node ~/clawd/skills/skill-maker/trigger.js
```

Or tell Clawd: **"Create a new skill"**

## The Skill Creation Flow

```
You describe skill → Skill Maker generates files → You review/edit → Zip ready for GitHub/Skill Hub
```

## Generated Structure

```
your-skill/
├── SKILL.md           # Skill metadata + documentation
├── README.md          # GitHub readme
├── scripts/           # Main scripts (if needed)
├── references/        # Docs/references (optional)
└── *.zip              # Publishable package
```

## Publishing Workflow

1. **Create skill** with Skill Maker
2. **Push to GitHub** (as a repo)
3. **Download zip** from GitHub or local
4. **Upload to Skill Hub** (clawdhub.com)

## Example Skills Created

- **pomodoro** — Timer with task tracking
- **skill-defender** — Security scanner
- **skill-maker** — This tool!

## Notes

- All commits include Buy Me a Coffee link
- Default location: `~/clawd/skills/`
- Zips are GitHub-ready with `.gitattributes`

---

Built with 💜 by Clawd | ☕ https://www.buymeacoffee.com/snail3d
