# ClawVault Auto-Linking Spec

## Problem

Agents forget to use `[[wiki-links]]` when writing memories, making the Obsidian graph sparse and connections invisible.

## Solution: Automatic Entity Linking

### 1. Entity Registry (`memory/.entities.json`)

```json
{
  "people": {
    "pedro": {
      "path": "people/pedro",
      "aliases": ["Pedro", "Chief", "my human", "the boss"]
    },
    "justin-dukes": {
      "path": "people/justin-dukes",
      "aliases": ["Justin", "Justin Dukes", "Hale contact"]
    }
  },
  "projects": {
    "site-machine": {
      "path": "projects/site-machine",
      "aliases": ["Site Machine", "the business", "income project"]
    }
  },
  "agents": {
    "forge": {
      "path": "agents/forge",
      "aliases": ["Forge", "business agent", "the sales agent"]
    }
  }
}
```

### 2. Auto-Link on Write

When `clawvault remember` saves a file:

1. Load entity registry
2. Scan content for alias matches (case-insensitive, word-boundary)
3. Replace first occurrence of each entity with `[[path|alias]]`
4. Skip if already inside a link or code block

### 3. CLI Commands

```bash
# Register new entity
clawvault entity add pedro --path people/pedro --aliases "Pedro,Chief,my human"

# Link a single file
clawvault link memory/2026-01-31.md

# Link all files in vault
clawvault link --all

# Show unlinked entity mentions
clawvault link --dry-run
```

### 4. Integration Points

- `clawvault remember` — auto-link before write
- `clawvault handoff` — auto-link the handoff content
- New `clawvault link` command for batch processing

### 5. Edge Cases

- Don't link inside code blocks or frontmatter
- Don't double-link (check if text is already `[[linked]]`)
- Prefer longer aliases first ("Justin Dukes" before "Justin")
- Only link first occurrence per entity per file (avoid spam)

## Implementation Priority

1. Entity registry JSON structure
2. `clawvault entity add/list/remove` commands
3. Link scanner utility
4. Integration with `remember` command
5. Batch `link --all` command
