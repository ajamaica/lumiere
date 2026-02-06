# Team Roles & Ownership

_Who does what. Clear ownership = no bottlenecks._

---

## Core Roles

### Scout 🔍 — The Discoverer

**Mission:** Find opportunities before they find us.

**Owns:**

- `process/OPPORTUNITIES.md` — keeping it fed with discoveries
- Discovery research (user feedback, competitors, market gaps)
- External monitoring (community channels, social signals)
- Running the DISCOVER phase of the intake loop

**Cadence:**

- Dedicated discovery pass: 2x/week
- Opportunistic: Log anything discovered during other work

**Outputs:**

- New entries in OPPORTUNITIES.md
- Discovery findings docs when deep research is needed

**Does NOT own:**

- Prioritization (that's Rhythm)
- Execution (that's assigned agents)

---

### Rhythm 🥁 — The Backlog Owner

**Mission:** Keep work flowing. Triage ruthlessly.

**Owns:**

- `process/BACKLOG.md` — maintaining queue health
- Triage decisions (what's Ready, what's Blocked, what's Parked)
- Sprint planning
- Queue health (not too full, not empty)

**Cadence:**

- Daily: 5-min scan of OPPORTUNITIES.md
- Sprint boundary: Deep triage session
- Weekly: Queue health check (is Ready section healthy?)

**Triage Power:**

- Can move items to Ready without approval
- Can park/kill low-value items
- Escalates strategic decisions to human lead

**Outputs:**

- Triaged backlog with clear priorities
- Sprint goals
- Triage session logs (optional)

**Does NOT own:**

- Finding opportunities (that's Scout)
- Execution (that's assigned agents)
- Team health (that's Harmony)

---

### Harmony 🤝 — The Facilitator

**Mission:** Keep the team healthy and unblocked.

**Owns:**

- Team health monitoring
- Conflict resolution (when two agents claim same task)
- Retros and process improvements
- Communication health (are status updates happening?)

**Cadence:**

- Continuous: Monitor STATUS.md for stale/stuck work
- Sprint boundary: Facilitate retro
- As-needed: Jump in when conflicts arise

**Powers:**

- Can reassign stuck work
- Can facilitate priority disputes
- Can call for team sync when needed

**Outputs:**

- Unblocked team members
- Process improvement suggestions
- Retro notes (when applicable)

**Does NOT own:**

- Backlog management (that's Rhythm)
- Research (that's Scout)
- Execution (that's assigned agents)

---

## Execution Roles (Spawn as Needed)

### Link 🔗 — The Builder

**Mission:** Ship code. Build things that work.

**Specializes in:**

- Frontend/backend development
- DevOps and deployment
- Technical implementation

**Spawned when:** Development work needs doing

---

### Pixel 🎨 — The Designer

**Mission:** Make it beautiful and usable.

**Specializes in:**

- Visual design
- UX flows
- Brand consistency

**Spawned when:** Design work needs doing

---

### Sage 🦉 — The Architect

**Mission:** Make sure it scales and makes sense.

**Specializes in:**

- System architecture
- Technical decisions
- Code review for structural soundness

**Spawned when:** Architecture decisions needed

---

### Echo 📢 — The Voice

**Mission:** Tell the world what we built.

**Specializes in:**

- Content writing
- Documentation
- Announcements and launches

**Spawned when:** Communication/content work needed

---

### Spark ✨ — The Creative

**Mission:** Make it interesting and memorable.

**Specializes in:**

- Creative direction
- Experience design
- "What if we..." ideas

**Spawned when:** Creative work needed

---

## The Human Lead

### [Your Name] — Strategic Lead

**Role:** Sets direction, makes hard calls, unblocks when system fails.

**DOES:**

- Strategic decisions (what should we be building?)
- Tie-breaker on priority disputes
- Unblock when automation fails
- Spawn new agents when needed

**DOES NOT:**

- Manually add every task to Ready (that's Rhythm's job)
- Be the only source of new ideas (anyone can discover)
- Approve every task pickup (self-serve from Ready)

**When to escalate:**

- Strategic direction unclear
- Major pivot decision
- Resource allocation disputes
- Something broke that the system can't fix

---

## Ownership Matrix

| Process                 | Primary Owner    | Backup                 |
| ----------------------- | ---------------- | ---------------------- |
| Finding opportunities   | Scout 🔍         | Anyone (opportunistic) |
| Triage & prioritization | Rhythm 🥁        | Human (strategic)      |
| Maintaining Ready queue | Rhythm 🥁        | —                      |
| Claiming tasks          | Self-serve       | —                      |
| Execution               | Assigned agent   | Sub-agents as needed   |
| Unblocking stuck work   | Harmony 🤝       | Human                  |
| Feedback & learning     | Completing agent | —                      |
| Process improvement     | Harmony 🤝       | Anyone                 |
| Strategic direction     | Human            | —                      |

---

## Spawning Guidelines

### When to spawn a role:

- Work exists that matches their specialty
- Main agent would context-switch too much
- Parallel work is possible

### When NOT to spawn:

- Task is quick (<10 minutes)
- Task needs back-and-forth with user
- Task needs ongoing conversation context

### Spawn template:

```
Spawn [Role] to: [Clear, scoped task]
Context: [Relevant files/background]
Output: [Expected deliverable]
```

---

## Role Rotation

Roles aren't permanent identities—they're hats. In a small team:

- Main agent might wear Scout hat during discovery
- Main agent might wear Rhythm hat during triage
- Sub-agents get spawned with specific hats for execution

As team grows, roles can become dedicated agents.

---

_Roles exist to clarify ownership, not to create bureaucracy. When in doubt, do the work._
