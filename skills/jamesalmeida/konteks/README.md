# 🧠 Konteks — Agent Context Layer

**Give your AI agent persistent memory, tasks, notes, and project context.**

An [OpenClaw](https://github.com/openclaw/openclaw) skill that connects your agent to your [Konteks](https://konteks.app) account. Your agent can read and write tasks, notes, memories, and projects — maintaining context across conversations.

## Why?

AI agents forget everything between sessions. Konteks gives them a persistent layer:

- **Memory** — store decisions, preferences, and learnings that survive restarts
- **Tasks** — create, update, and complete tasks on behalf of your human
- **Notes** — capture insights and tie them to projects
- **Projects & Areas** — organize work into folders your agent understands
- **Daily Plans** — check what's on the agenda today

## What's New

- ✅ **Subscription system** — Free tier + Pro ($5/mo early adopter pricing)
- 🔑 **API key management** — Generate and revoke keys from Settings
- 🌗 **Dark/light mode** — Full theme support
- 📧 **Branded auth emails** — Custom verification, reset, and magic link templates
- 🗑️ **Account deletion** — Full GDPR-compliant account removal
- 🔒 **Priority levels** — High, Normal, Low (renamed from Someday)
- 📌 **Pinned notes** — Pin important notes to top of views
- 🔄 **Sort options** — A-Z, Z-A, Last Updated, Date Created in project/area views
- 🕐 **Timezone-aware** — Today view uses user's local timezone

## Installation

### Via ClawHub

```bash
clawhub install konteks
```

### Manual

```bash
git clone https://github.com/jamesalmeida/openclaw-konteks-skill.git
cp -r openclaw-konteks-skill /path/to/openclaw/skills/konteks
```

## Setup

1. Sign up at [konteks.app](https://konteks.app)
2. Go to **Settings → Generate API Key** (requires Pro subscription)
3. Add to your OpenClaw config:

```yaml
skills:
  konteks:
    apiKey: 'sk_...'
    url: 'https://konteks.app' # optional, this is the default
    agentId: 'my-agent' # optional, defaults to "default"
```

## What Your Agent Can Do

### 💾 Agent Memory

Store and retrieve persistent context across sessions.

```bash
# Write a memory
POST /api/agent/context
{ "category": "memory", "key": "user_preference", "value": "Prefers dark mode" }

# Read memories
GET /api/agent/context?category=memory&limit=10
```

Categories: `memory`, `decision`, `preference`, `learning`, `project_note`

### ✅ Tasks & Notes

Create and manage items in your Konteks workspace.

```bash
# Create a task
POST /api/agent/items
{ "title": "Review PR", "item_type": "task", "smart_list": "inbox", "priority": "high" }

# List items
GET /api/agent/items?completed=false&archived=false

# Complete a task
PATCH /api/agent/items/{id}
{ "completed_at": "2026-01-29T12:00:00Z" }
```

Priority values: `high`, `normal`, `low`

### 📁 Projects & Areas

Organize work into folders.

```bash
# List projects
GET /api/agent/folders?type=project

# Create a project
POST /api/agent/folders
{ "name": "Q1 Launch", "folder_type": "project", "icon": "🚀", "goal": "Ship MVP by March" }
```

### 📋 Daily Plans

Check what's on the agenda.

```bash
GET /api/agent/plans?date=2026-01-29
```

## Usage Patterns

| When                   | What to do                                         |
| ---------------------- | -------------------------------------------------- |
| Session start          | Read recent memories to restore context            |
| Important decision     | Write a memory entry                               |
| Human asks for a task  | Create it in Konteks                               |
| During heartbeats      | Check inbox, triage items, check for overdue tasks |
| Learning something new | Store it for future sessions                       |
| Filing an inbox item   | Move to the right project with `PATCH`             |

## Heartbeat Integration

When installed, agents should proactively check Konteks during heartbeats:

1. **Inbox triage** — Check for new items, file into projects if obvious
2. **Due/overdue tasks** — Alert the user if anything needs attention
3. **Write memories** — Store decisions and learnings after important moments

See [SKILL.md](./SKILL.md) for detailed heartbeat integration instructions.

## API Reference

All endpoints: `{url}/api/agent/...`
Auth: `Authorization: Bearer {apiKey}`

See [SKILL.md](./SKILL.md) for the full API reference with examples.

## Related

- [Konteks Web App](https://konteks.app) — the web dashboard
- [Konteks iOS App](https://github.com/jamesalmeida/konteks-ios) — native iOS app (in development)
- [OpenClaw](https://openclaw.ai/) — the AI agent framework
- [ClawHub](https://clawhub.com/jamesalmeida/konteks) — skill marketplace

## License

MIT

---

_Built with 🐙 by [Tersono](https://github.com/jamesalmeida) for [OpenClaw](https://github.com/openclaw/openclaw)_
