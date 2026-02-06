---
name: engram
description: 'Persistent semantic memory for AI agents — local, fast, free. Use when agent needs to recall past decisions, store new facts/preferences, search conversation history, or maintain context across sessions.'
metadata:
  openclaw:
    emoji: '🧠'
    requires:
      bins: ['engram']
    install:
      - id: node
        kind: node
        package: engram-memory
        bins: ['engram']
        label: 'Install Engram (npm)'
---

# Engram — Agent Memory

Local semantic memory with biological decay, typed memories, and relationship graphs. No API keys. No cloud.

## Boot Sequence

```bash
engram search "<current task or context>" --limit 10
```

Always recall before working. Accessed memories get salience-boosted.

## Storing

```bash
engram add "Client uses React with TypeScript" --type fact --tags react,client
engram add "We decided to pause ads" --type decision --tags ads
echo "Raw conversation text" | engram ingest
```

Types: fact, decision, preference, event, relationship

## Searching

```bash
engram search "what tech stack"
engram search "pricing decisions" --type decision
engram search "client status" --agent client-agent
```

## Relationships

```bash
engram relate <src> <tgt> --type supports
engram auto-relate <id>
engram relations <id>
```

Types: related_to, supports, contradicts, caused_by, supersedes, part_of, references

## Key Concepts

- **Decay**: Unused memories lose salience daily. Recalled ones get boosted.
- **Types**: Filter by fact, decision, preference, event, relationship.
- **Scoping**: global, agent, private, shared.
- **Dedup**: >92% similarity auto-merges.

## Quick Reference

```bash
engram stats
engram recall --limit 10
engram export > backup.json
engram import backup.json
```
