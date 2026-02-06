# Context Death Resilience

**Problem:** When an agent hits context overflow, it dies mid-thought with no chance to save state. The next session starts fresh with no memory of what was happening.

**Solution:** Multi-layered defense against context death.

## Architecture

### Layer 1: Periodic Checkpoints (HEARTBEAT)

- Add `clawvault checkpoint` to HEARTBEAT.md
- Quick, lightweight save every few heartbeats
- Captures: working-on, recent decisions, current focus

### Layer 2: Pre-Compaction Flush

- OpenClaw already has `compaction.memoryFlush`
- Hook into this to also run `clawvault handoff --pre-compact`
- Gives agent one last chance to save before context shrinks

### Layer 3: Emergency Handoff (Gateway Hook)

- New hook: `agent:context_overflow`
- Runs `clawvault emergency-save` from last known state
- Parses session transcript to extract what was happening
- Works even when agent can't respond

### Layer 4: Auto-Recap on Bootstrap

- Check for "dirty death" flag on startup
- If found, inject recap + context death notice
- Agent knows it died and can resume

## Commands

### `clawvault checkpoint`

Quick state save (runs in <1s):

```bash
clawvault checkpoint --working-on "docs study" --focus "config parsing"
```

### `clawvault emergency-save`

Called by gateway when context overflows:

```bash
clawvault emergency-save --session-file ~/.openclaw/sessions/xxx.jsonl
```

- Parses last N messages from transcript
- Extracts what agent was doing
- Creates emergency handoff

### `clawvault recover`

Check for dirty death and get recovery info:

```bash
clawvault recover
# Returns: { died: true, recap: "...", lastHandoff: "..." }
```

## State Files

```
memory/
├── .clawvault/
│   ├── session-state.json    # Current session tracker
│   ├── last-checkpoint.json  # Quick checkpoint data
│   └── dirty-death.flag      # Set on crash, cleared on clean exit
```

## Integration Points

### AGENTS.md Bootstrap

```markdown
## Every Session

1. Run `clawvault recover` - check if last session died
2. If died: load emergency handoff, acknowledge context death
3. Run `clawvault recap` for normal continuity
```

### HEARTBEAT.md

```markdown
## Checkpoint (every 4-6 heartbeats)

- Run `clawvault checkpoint` with current focus
```

### OpenClaw Hook (context-death-handler)

```typescript
const handler: HookHandler = async (event) => {
  if (event.type === 'agent' && event.action === 'context_overflow') {
    await execSync('clawvault emergency-save --session-file ' + event.context.sessionFile)
  }
}
```

## Implementation Priority

1. ✅ `clawvault handoff` - Already exists
2. 🔲 `clawvault checkpoint` - Quick version of handoff
3. 🔲 `clawvault emergency-save` - Parse transcript on crash
4. 🔲 `clawvault recover` - Detect dirty death
5. 🔲 OpenClaw hook - Trigger emergency save
6. 🔲 Bootstrap integration - Auto-inject on restart

## Open Questions

- Does OpenClaw emit an event on context overflow? Need to check.
- Can we detect "about to overflow" before it happens?
- Should checkpoint be a cron job or HEARTBEAT task?
