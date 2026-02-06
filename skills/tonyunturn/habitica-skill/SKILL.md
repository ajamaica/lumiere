---
name: habitica
description: Habitica gamified habit tracker integration. Use for listing/creating/completing habits, dailies, todos, and rewards. Trigger on "habitica", "习惯", "待办", "日常任务", or requests to check off tasks.
---

# Habitica Skill

Full-featured CLI for Habitica's gamified task manager.

## Setup

Credentials in `~/.habitica`:
```bash
HABITICA_USER_ID="your-user-id"
HABITICA_API_TOKEN="your-api-token"
```

Get from: Habitica → Settings → Site Data → Show API Token

## Commands

### Tasks
```bash
./scripts/habitica.sh list [habits|dailys|todos|rewards|all]
./scripts/habitica.sh create <type> "text" ["notes"]
./scripts/habitica.sh score <task-id> [up|down]
./scripts/habitica.sh update <task-id> --text "new" --notes "new"
./scripts/habitica.sh delete <task-id>
```

### User & Stats
```bash
./scripts/habitica.sh user          # Basic stats
./scripts/habitica.sh stats         # Full stats (STR/INT/CON/PER)
```

### Collections
```bash
./scripts/habitica.sh pets          # Your pets
./scripts/habitica.sh mounts        # Your mounts
./scripts/habitica.sh achievements  # Achievement list
./scripts/habitica.sh inventory     # Eggs, potions, food, quest scrolls
```

### Party & Social
```bash
./scripts/habitica.sh party         # Party info + chat
./scripts/habitica.sh party-chat 10 # Last N messages
./scripts/habitica.sh party-send "message"
./scripts/habitica.sh guilds        # Guild list
```

### Skills (Class Abilities)
```bash
./scripts/habitica.sh skills        # List available skills
./scripts/habitica.sh cast <skill> [taskId]
```

**Rogue:** pickPocket, backStab, toolsOfTrade, stealth
**Warrior:** smash, defensiveStance, valorousPresence, intimidate
**Mage:** fireball, mpheal, earth, frost
**Healer:** heal, healAll, protectAura, brightness

### Quest
```bash
./scripts/habitica.sh quest         # Current quest status
./scripts/habitica.sh quest-accept  # Check and accept pending quest invitations
```

### Other
```bash
./scripts/habitica.sh history [exp|todos]
./scripts/habitica.sh cron          # Force new day
```

## Notes

- Dailies use `dailys` (Habitica's spelling)
- Task IDs are UUIDs from `list` output
- Rate limit: 30s between automated calls
## Background Execution (Sub-agents)

For batch operations (e.g., scoring multiple tasks) or slow operations, spawn a sub-agent to keep the main chat responsive.

**Prompt Pattern:**
```text
Task: Habitica Batch Operation
- Score task 123 (up)
- Score task 456 (up)
- Create todo "New Task"
Report back briefly when done.
```

**When to use:**
- User asks to complete >1 task at once
- User asks for a summary/analysis that requires multiple API calls (e.g., "check all my tasks and tell me what to do")
- Network latency is high
