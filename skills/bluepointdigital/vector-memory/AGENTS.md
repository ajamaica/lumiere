## Memory Recall - Vector Memory Skill

Before answering questions about prior work, decisions, dates, people, preferences, or todos:

1. **Run memory_search** with relevant query

   ```javascript
   const results = await memory_search('what we discussed about projects', 5)
   ```

2. **Use memory_get** to pull full context if needed

   ```javascript
   const fullContent = memory_get('MEMORY.md', 1, 20)
   ```

3. **If low confidence after search**, say you checked
   > "I searched my memory but don't see specific notes about this topic."

### When to Search

**Always search before:**

- Answering questions about past conversations
- Referencing previous decisions
- Recalling user preferences
- Continuing work on prior projects
- Summarizing what was discussed

**Search queries should be:**

- Natural language (e.g., "James values and principles")
- Conceptual (e.g., "Nyx origin story")
- Not just keywords (semantic search understands meaning)

### How It Works

This agent uses **vector memory** with automatic fallback:

1. **If synced:** Uses neural embeddings for semantic search
   - Finds conceptually related content
   - Understands synonyms ("principles" finds "values")
   - Better relevance, more context

2. **If not synced:** Uses built-in keyword search
   - Works immediately after install
   - No configuration needed
   - Graceful fallback

3. **Sync to improve:**
   ```bash
   node vector-memory/smart_memory.js --sync
   ```

### Memory Structure

```
workspace/
├── MEMORY.md              # Curated long-term memory
└── memory/
    ├── logs/              # Daily logs (YYYY-MM-DD.md)
    ├── projects/          # Project-specific notes
    ├── decisions/         # Important choices
    └── lessons/           # Mistakes learned
```

### Verification

Test that memory is working:

```bash
node vector-memory/smart_memory.js --test
```

Expected: Shows vector status, chunk count, and confirms search functional.

### Troubleshooting

| Issue              | Solution                                         |
| ------------------ | ------------------------------------------------ |
| "Vector not ready" | Run: `node vector-memory/smart_memory.js --sync` |
| No results         | Check that MEMORY.md or memory/ files exist      |
| First sync slow    | Normal - downloading ~80MB model                 |
| Search irrelevant  | Sync again after editing memory files            |

---

_Part of Vector Memory skill for OpenClaw_
_100% local semantic search with zero configuration_
