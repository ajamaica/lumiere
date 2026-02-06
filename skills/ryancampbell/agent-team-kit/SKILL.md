# Agent Team Kit — SKILL.md

_A framework for self-sustaining AI agent teams._

---

## What This Is

A complete team process kit for OpenClaw agents that enables:

- **Self-service work queues** — Agents pick up tasks without human bottlenecks
- **Clear role ownership** — Everyone knows who does what
- **Continuous discovery** — Work flows in automatically
- **Proactive operation** — The team runs itself via heartbeat

---

## Quick Start

### 1. Copy the Process Files

```bash
# From your workspace root
cp -r skills/agent-team-kit/templates/process ./process
```

This creates:

- `process/INTAKE.md` — The 5-phase work loop
- `process/ROLES.md` — Role definitions
- `process/OPPORTUNITIES.md` — Raw ideas/discoveries
- `process/BACKLOG.md` — Triaged work queue
- `process/STATUS.md` — Who's working on what

### 2. Add Heartbeat Config

Merge `templates/HEARTBEAT.md` into your existing `HEARTBEAT.md`:

```bash
cat skills/agent-team-kit/templates/HEARTBEAT.md >> HEARTBEAT.md
```

Or copy it directly if you don't have one yet.

### 3. Customize Roles

Edit `process/ROLES.md` to match your team:

- Rename roles to fit your domain
- Add/remove specialized execution roles
- Update the human lead section with your name

---

## The Intake Loop

```
DISCOVER → TRIAGE → READY → EXECUTE → FEEDBACK
    ↑                                      ↓
    └──────────────────────────────────────┘
```

1. **Discover** — Find opportunities (Scout role)
2. **Triage** — Decide what's ready (Rhythm role)
3. **Ready** — Self-service queue (any agent)
4. **Execute** — Do the work (assigned agent)
5. **Feedback** — Learn and spawn new ideas (completing agent)

---

## Core Roles

| Role           | Mission             | Owns                          |
| -------------- | ------------------- | ----------------------------- |
| **Scout 🔍**   | Find opportunities  | `OPPORTUNITIES.md`, discovery |
| **Rhythm 🥁**  | Keep work flowing   | `BACKLOG.md`, triage          |
| **Harmony 🤝** | Keep team healthy   | Unblocking, retros            |
| **[Human]**    | Strategic direction | Hard calls, spawning          |

**Execution roles** (spawn as needed):

- Link 🔗 — Builder
- Pixel 🎨 — Designer
- Sage 🦉 — Architect
- Echo 📢 — Voice
- Spark ✨ — Creative

---

## Key Principles

### Self-Service

If it's in Ready, any agent can pick it up. No approval needed.

### Clear Ownership

Every phase has ONE owner. No ambiguity.

### Always Log

Ideas, discoveries, completions — if you don't log it, it didn't happen.

### Spawn, Don't Solo

Main agent coordinates. Sub-agents execute. Don't do everything yourself.

---

## File Structure

```
process/
├── INTAKE.md         # How the loop works (reference)
├── ROLES.md          # Who does what
├── OPPORTUNITIES.md  # Raw discoveries (anyone adds)
├── BACKLOG.md        # Triaged work (Rhythm maintains)
└── STATUS.md         # Current activity (self-updated)

HEARTBEAT.md          # Proactive check triggers
```

---

## Heartbeat Integration

Add to your heartbeat checks:

```markdown
### Team Health (run hourly)

- [ ] OPPORTUNITIES.md stale? → Spawn Scout
- [ ] Ready queue empty? → Alert Rhythm
- [ ] Active work stuck >2h? → Nudge owner
- [ ] Any unresolved blockers? → Harmony
```

The heartbeat keeps the loop spinning even when the human isn't watching.

---

## Customization

### Adding a New Role

1. Define in `ROLES.md`:
   - Mission (one sentence)
   - Owns (what they're responsible for)
   - Cadence (how often they work)
   - Outputs (what they produce)

2. Update the ownership matrix

3. Add spawn criteria in `INTAKE.md` if needed

### Changing the Loop

The 5-phase loop is flexible. Adapt it:

- Add validation gates between phases
- Split EXECUTE into parallel tracks
- Add approval checkpoints (if your domain requires it)

---

## Anti-Patterns

❌ Human manually adds every task → Use triage role instead  
❌ Waiting for permission to pick up work → Ready = fair game  
❌ One agent does everything → Spawn specialists  
❌ Ideas stay in heads → Log to OPPORTUNITIES.md  
❌ Heartbeat just returns OK → Actually check the loop

---

## Metrics (Optional)

Track team health:

- **Cycle time** — OPPORTUNITIES → DONE
- **Queue depth** — Items in Ready (healthy: 5-15)
- **Stale items** — Days since last triage
- **Spawn rate** — Sub-agents created per day

---

_The system runs itself. Your job is to trust it._
