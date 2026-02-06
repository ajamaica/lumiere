# Jasper Recall Work Queue

**Goal:** Bidirectional memory sharing between agents with privacy controls  
**Updated:** 2026-02-05 04:20 UTC

---

### HIGH

- [x] **JR-10:** Memory tagging convention ([public]/[private] in daily notes) - **DONE @JASPER done:2026-02-05 30m**
- [x] **JR-11:** Shared memory directory (memory/shared/ + symlink to sandboxed workspaces) - **DONE @JASPER done:2026-02-05 15m**
- [x] **JR-12:** Public-only recall flag (--public-only filters to shared content) - **DONE @JASPER done:2026-02-05**
- [x] **JR-13:** Privacy filter for memory writes (privacy-check.py script) - **DONE @JASPER done:2026-02-05 45m**
- [x] **JR-14:** Bidirectional sync cron (sync-shared 2x daily via OpenClaw cron) - **DONE @JASPER done:2026-02-05** `depends_on:[jr-10, jr-11]`
- [x] **JR-15:** Moltbook learnings capture (post-comment.js logs to shared/moltbook/) - **DONE @JASPER done:2026-02-05**

### MEDIUM

- [x] **JR-16:** Reflection before post workflow (privacy checklist in moltbook AGENTS.md) - **DONE @JASPER done:2026-02-05 10m**
- [x] **JR-17:** Shared ChromaDB collections (private_memories, shared_memories, agent_learnings) - **DONE @QWEN done:2026-02-05 25m** `depends_on:[jr-12]`

### LOW

- [x] **JR-18:** Memory summarization (compress old entries to save tokens) - **DONE @QWEN done:2026-02-05 20m**
- [x] **JR-19:** Multi-agent mesh (N agents sharing memory, not just 2) `branch:feat/jr-19-multi-agent-mesh` - **DONE @SONNET done:2026-02-05 45m**

---

## Completed (v0.1.0)

- [x] **JR-1:** Core recall command - **DONE**
- [x] **JR-2:** digest-sessions script - **DONE**
- [x] **JR-3:** index-digests script - **DONE**
- [x] **JR-4:** npm package published - **DONE**
- [x] **JR-5:** ClawHub skill published - **DONE**
- [x] **JR-6:** Product page on exohaven - **DONE**
- [x] **JR-7:** Blog post guide - **DONE**

---

## v0.2.0 Target: Shared Agent Memory

**Release date:** Feb 7, 2026

New features:

- Memory tagging ([public] vs [private])
- Shared memory directory with symlinks
- Privacy filter for sandboxed agents
- Bidirectional sync (main ↔ sandboxed)
- Public-only recall mode
