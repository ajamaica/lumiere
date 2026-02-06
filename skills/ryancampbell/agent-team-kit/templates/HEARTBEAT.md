# HEARTBEAT.md — Team Operations

## Autonomous Team Operations

Heartbeat = keep the team running. NOT "check and chill." Spawn agents, keep work flowing.

### 1. Human First (always)

- [ ] Human messages waiting? → Handle immediately
- [ ] Direct request? → Respond or delegate

### 2. Check Task Queue (`tasks/QUEUE.md`)

- [ ] Any Critical/High priority tasks in Ready?
- [ ] If yes → spawn agent for top task (queue takes priority over discovery loop)
- [ ] Queue tasks = explicit work. Loop tasks = generative work. Explicit > generative.

### 4. Run the Intake Loop (if queue empty)

**Discovery:** Is Scout finding opportunities?

- Check `process/OPPORTUNITIES.md` last modified
- If stale (>4 hours) or empty → spawn Scout to discover

**Triage:** Is Rhythm processing the backlog?

- Check `process/BACKLOG.md` Ready section
- If opportunities sitting untriaged → spawn Rhythm to triage

**Execution:** Is work getting done?

- Check `process/BACKLOG.md` Ready section
- If tasks sitting >2 hours → spawn appropriate agent (Link for dev, Pixel for design, etc.)

### 5. Health Checks

- [ ] Any blockers that need escalation?
- [ ] Any agents stuck or erroring?
- [ ] Status files reflect reality?

### 6. Keep State Updated

- [ ] `process/STATUS.md` — accurate?
- [ ] `process/BACKLOG.md` — queue healthy (5-15 items in Ready)?

### 7. Log Activity

- [ ] Update `memory/YYYY-MM-DD.md` with what happened

---

## The Rule

**If the team isn't working, spawn them.**

Don't do the work yourself. Don't just say HEARTBEAT_OK. Check the loop, spawn agents, keep it moving.

You're the coordinator. The team does the work. Your job is to make sure they're working.

---

## Spawn Quick Reference

| Situation                    | Spawn      |
| ---------------------------- | ---------- |
| No new opportunities in 4h   | Scout 🔍   |
| Untriaged items piling up    | Rhythm 🥁  |
| Work stuck, needs unblocking | Harmony 🤝 |
| Dev task ready               | Link 🔗    |
| Design task ready            | Pixel 🎨   |
| Architecture decision needed | Sage 🦉    |
| Content/comms task ready     | Echo 📢    |
| Creative task ready          | Spark ✨   |

---

## ❌ Anti-Patterns (Don't Do This)

| Bad                                      | Why                                 | Fix                               |
| ---------------------------------------- | ----------------------------------- | --------------------------------- |
| Return HEARTBEAT_OK without checking     | Loop dies silently                  | Actually run the checklist        |
| Do the work yourself instead of spawning | You become the bottleneck           | Spawn specialists                 |
| Ask "what's next?"                       | That's the team's job to figure out | Check backlog, spawn who's needed |
| Wait for human direction                 | Defeats autonomy                    | Execute from Ready queue          |
| Spawn and forget                         | Work may stall                      | Monitor running agents, follow up |

**The test:** If YOU are doing the work instead of coordinating agents, you're in Task Dispatcher mode. Stop. Spawn. Coordinate.

---

_Idle team = broken autonomy. Fix it._
