---
name: progressive-memory
description: Meta-skill for implementing the Progressive Memory pattern. Offloads heavy details to indexed sub-files to keep the main context window light.
---

# Progressive Memory Skill

A meta-skill that formalizes the "Progressive Memory" pattern for AI agents.

**The Problem**: `MEMORY.md` grows indefinitely, consuming context tokens and confusing the agent with too much detail.
**The Solution**: Keep `MEMORY.md` as a lightweight **Index**, and offload heavy details (logs, lists, configs) to `memory/topic.md`. The Agent only reads the sub-file when the Index points to it being relevant.

## Tools

### memorize

Save content to a sub-file and automatically index it in `MEMORY.md`.

```bash
node skills/progressive-memory/index.js memorize "Visual Identity" "White hair, red eyes..."
```

- Creates/Updates `memory/visual_identity.md`.
- Adds `- **Visual Identity**: See memory/visual_identity.md` to `MEMORY.md`.

### recall

Read a specific memory topic file.

```bash
node skills/progressive-memory/index.js recall "Visual Identity"
```

## Best Practices

1.  **Index First**: Before adding 50 lines to `MEMORY.md`, ask "Do I need this _every_ turn?". If no, use Progressive Memory.
2.  **Naming**: Use clear, searchable topic names (e.g., `suno_presets`, `project_alpha_specs`).
3.  **Context**: The Index entry in `MEMORY.md` should have a short description so the Agent knows _why_ to recall it.
