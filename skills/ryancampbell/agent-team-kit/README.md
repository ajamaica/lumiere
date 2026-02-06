# Agent Team Kit

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenClaw Skill](https://img.shields.io/badge/openclaw-skill-purple.svg)](https://github.com/openclaw/openclaw)

**A self-sustaining process framework for AI agent teams.**

Built for [OpenClaw](https://github.com/openclaw/openclaw) but adaptable to any multi-agent setup.

---

## Why This Exists

AI agents working together hit the same problems as human teams:

- Work piles up waiting for one person to triage
- Nobody knows who owns what
- Great ideas get forgotten
- Nothing happens unless someone pushes

This kit solves that with:

✅ **Self-service work queues** — Agents pick tasks without bottlenecks  
✅ **Clear role ownership** — No ambiguity about responsibilities  
✅ **Continuous discovery** — Work flows in automatically  
✅ **Heartbeat-driven operation** — The team runs itself

---

## The Loop

```
     ┌────────────────────────────────────────────────────┐
     │                                                    │
     ▼                                                    │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│ DISCOVER│───▶│  TRIAGE │───▶│  READY  │───▶│ EXECUTE │─┘
│ Scout 🔍│    │Rhythm 🥁│    │Self-Srv │    │ Agents  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                   │
                              FEEDBACK ◀───────────┘
```

1. **Discover** — Find opportunities and problems
2. **Triage** — Decide what's ready to work
3. **Ready** — Self-service queue (anyone can pick up)
4. **Execute** — Do the work
5. **Feedback** — Learn, improve, spawn new opportunities

---

## Roles

| Role    | Emoji | Mission                                |
| ------- | ----- | -------------------------------------- |
| Scout   | 🔍    | Find opportunities before they find us |
| Rhythm  | 🥁    | Keep work flowing, triage ruthlessly   |
| Harmony | 🤝    | Keep the team healthy and unblocked    |
| Human   | 🌊    | Strategic direction, hard calls        |

**Execution roles** (spawned as needed): Link 🔗 (build), Pixel 🎨 (design), Sage 🦉 (architecture), Echo 📢 (communication), Spark ✨ (creative)

---

## Installation

### For OpenClaw

```bash
# Clone into your skills directory
git clone https://github.com/reflectt/agent-team-kit skills/agent-team-kit

# Copy templates to your workspace
cp -r skills/agent-team-kit/templates/process ./process
```

### Manual Setup

Copy these files to your workspace:

- `templates/process/INTAKE.md`
- `templates/process/ROLES.md`
- `templates/HEARTBEAT.md`

Create empty process files:

- `process/OPPORTUNITIES.md`
- `process/BACKLOG.md`
- `process/STATUS.md`

---

## Quick Start

1. **Read** `process/INTAKE.md` to understand the loop
2. **Customize** `process/ROLES.md` with your role names
3. **Add** heartbeat checks from `HEARTBEAT.md`
4. **Start discovering** — add first opportunities to `OPPORTUNITIES.md`
5. **Let it run** — the heartbeat keeps the loop spinning

---

## Key Principles

### 1. Self-Service

If work is in the Ready queue, any agent can pick it up. No approval needed. First claim wins.

### 2. Clear Ownership

Every phase has ONE owner. No "shared responsibility" (which means no responsibility).

### 3. Log Everything

Ideas, discoveries, completions — if it's not logged, it didn't happen. Memory is limited; files persist.

### 4. Spawn, Don't Solo

The main agent coordinates. Sub-agents execute. Don't try to do everything in one context.

### 5. Trust the System

Once it's set up, let it run. The heartbeat keeps things moving. Intervene only when something breaks.

---

## File Structure

```
your-workspace/
├── process/
│   ├── INTAKE.md         # The 5-phase loop (reference doc)
│   ├── ROLES.md          # Role definitions
│   ├── OPPORTUNITIES.md  # Raw discoveries (anyone adds)
│   ├── BACKLOG.md        # Triaged work queue
│   └── STATUS.md         # Current activity
├── HEARTBEAT.md          # Proactive operation triggers
└── skills/
    └── agent-team-kit/   # This skill
```

---

## Customization

The kit is designed to be adapted:

- **Rename roles** to fit your domain (Scout → Researcher, Link → Developer)
- **Add specialized roles** for your work type
- **Adjust cadences** based on your team's rhythm
- **Modify the loop** — add gates, split phases, whatever works

See `SKILL.md` for detailed customization instructions.

---

## Anti-Patterns

These kill autonomous teams:

| ❌ Don't                  | ✅ Do Instead                    |
| ------------------------- | -------------------------------- |
| Human adds every task     | Rhythm triages, anyone discovers |
| Wait for approval         | Ready = fair game                |
| One agent does everything | Spawn specialists                |
| Keep ideas in your head   | Log to OPPORTUNITIES.md          |
| Heartbeat just returns OK | Actually check the loop          |

---

## Contributing

PRs welcome. This framework evolved from real multi-agent team operation.

Especially interested in:

- Adaptations for different domains
- Additional role templates
- Metrics and observability patterns
- Integration with other agent frameworks

---

## Related Kits

Part of the Reflectt agent kit family:

- **[agent-memory-kit](https://github.com/reflectt/agent-memory-kit)** — Structured memory patterns for persistent agent context
- **[agent-autonomy-kit](https://github.com/reflectt/agent-autonomy-kit)** — Self-directed operation via heartbeats, cron, and proactive behavior

These kits work great together — memory for continuity, autonomy for self-operation, and team for coordination.

---

## License

MIT — use it, fork it, adapt it.

---

_Built with 📝 by teams that got tired of being bottlenecks._
