---
name: clawbrain
description: 'Claw Brain - Personal AI Memory System. Migrated from brain-v3-skill.'
metadata:
  {
    'clawdbot':
      {
        'emoji': '🧠',
        'requires': { 'dirs': ['clawbrain'] },
        'install':
          [
            {
              'id': 'git',
              'kind': 'git',
              'url': 'https://github.com/clawcolab/clawbrain.git',
              'label': 'Install Claw Brain (git)',
            },
          ],
      },
  }
---

# Claw Brain Skill (Migrated) 🧠

**This skill has migrated to the standalone clawbrain repository.**

## New Repository

Use the dedicated Claw Brain repository:

- **URL:** https://github.com/clawcolab/clawbrain
- **Install:** `pip install git+https://github.com/clawcolab/clawbrain.git`

## Quick Start

```bash
pip install git+https://github.com/clawcolab/clawbrain.git
```

```python
from clawbrain import Brain

brain = Brain()
context = brain.get_full_context(
    session_key="chat_123",
    user_id="user",
    agent_id="agent",
    message="Hey!"
)
```

## Features

- 🎭 Soul/Personality - 6 evolving traits
- 👤 User Profile - Learns preferences
- 💭 Conversation State - Mood/intent detection
- 📚 Learning Insights - Continuous improvement
- 🧠 get_full_context() - Personalized responses

## Storage Options

### SQLite (Default - Zero Setup)

```python
brain = Brain({"storage_backend": "sqlite"})
```

### PostgreSQL + Redis (Production)

```python
# Auto-detects if available
brain = Brain()
```

## For ClawDBot

```bash
git clone https://github.com/clawcolab/clawbrain.git ClawBrain
```

## Migration Notes

This repository previously hosted the brain-v3-skill. It has been merged into the main clawbrain repository at https://github.com/clawcolab/clawbrain
