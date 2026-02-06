# Progressive Memory

Token-efficient memory system for AI agents. Scan an index first, fetch details on demand. Based on progressive disclosure principles from claude-mem.

## The Problem

Traditional memory dumps everything into context:

- Load 3500 tokens of history
- 94% is irrelevant to current task
- Wastes attention budget, causes context rot

## The Solution

**Progressive disclosure:** Show what exists first, let the agent decide what to fetch.

```
Before: 3500 tokens loaded → 200 relevant (6%)
After:  100 token index → fetch 200 needed (100%)
```

## Memory Format

### Daily Files (`memory/YYYY-MM-DD.md`)

```markdown
# 2026-02-01 (AgentName)

## Index (~70 tokens to scan)

| #   | Type | Summary                             | ~Tok |
| --- | ---- | ----------------------------------- | ---- |
| 1   | 🔴   | Auth bug - use browser not CLI      | 80   |
| 2   | 🟢   | Deployed SEO fixes to 5 pages       | 120  |
| 3   | 🟤   | Decided to split content by account | 60   |

---

### #1 | 🔴 Auth Bug | ~80 tokens

**Context:** Publishing via CLI
**Issue:** "Unauthorized" even with fresh tokens
**Workaround:** Use browser import instead
**Status:** Unresolved
```

### Long-Term Memory (`MEMORY.md`)

```markdown
## 📋 Index (~100 tokens)

| ID  | Type | Category | Summary                  | ~Tok |
| --- | ---- | -------- | ------------------------ | ---- |
| R1  | 🚨   | Rules    | Twitter posting protocol | 150  |
| G1  | 🔴   | Gotcha   | CLI auth broken          | 60   |
| D1  | 🟤   | Decision | Content split by account | 60   |

---

### R1 | Twitter Posting Protocol | ~150 tokens

- POST ALL tweets in ONE session
- NEVER post hook without full thread
- VERIFY everything before reporting done
```

## Observation Types

| Icon | Type      | When to Use                |
| ---- | --------- | -------------------------- |
| 🚨   | rule      | Critical rule, must follow |
| 🔴   | gotcha    | Pitfall, don't repeat this |
| 🟡   | fix       | Bug fix, workaround        |
| 🔵   | how       | Technical explanation      |
| 🟢   | change    | What changed, deployed     |
| 🟣   | discovery | Learning, insight          |
| 🟠   | why       | Design rationale           |
| 🟤   | decision  | Architecture decision      |
| ⚖️   | tradeoff  | Deliberate compromise      |

## Token Estimation

| Content Type      | Tokens    |
| ----------------- | --------- |
| Simple fact       | ~30-50    |
| Short explanation | ~80-150   |
| Detailed context  | ~200-400  |
| Full summary      | ~500-1000 |

## How It Works

1. **Session starts** → Agent scans index tables (~100-200 tokens)
2. **Agent sees types** → Prioritizes 🔴 gotchas over 🟢 changes
3. **Agent sees costs** → Decides if 400-token entry is worth it
4. **Fetch on demand** → Only load what's relevant to current task

## Benefits

- **Token savings:** ~65,000 tokens/day with 20 memory checks
- **Faster scanning:** Icons enable visual pattern recognition
- **Precise references:** IDs like #1, G3, D5 for exact lookup
- **Cost awareness:** Token counts for ROI decisions

## Integration

Works with any markdown-based memory system. No database required.

For Clawdbot users:

1. Update `AGENTS.md` with format instructions
2. Restructure `MEMORY.md` with index
3. Use format in daily `memory/YYYY-MM-DD.md` files

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/progressive-memory) · [Twitter](https://x.com/lxgicstudios)
