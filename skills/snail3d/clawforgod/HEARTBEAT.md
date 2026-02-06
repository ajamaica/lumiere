# HEARTBEAT.md

## Overwatch Monitoring (Check Every Heartbeat)

If smart-overwatch is running, check for motion triggers:

```bash
ls ~/.clawdbot/overwatch/triggers/trigger_*.json 2>/dev/null
```

If triggers exist:

1. Read the trigger JSON
2. Analyze the image for people
3. If person detected: Send alert, start continuous monitoring
4. If no person: Delete trigger, continue
5. Mark trigger as "analyzed" or delete it

## Memory Consolidation

Check if there are significant items from today's daily log that should be added to MEMORY.md. Look for:

- New skills or tools built
- Important context/decisions
- Patterns or lessons learned
- Any recurring issues to remember

Only update MEMORY.md if there's something worth keeping long-term. (Don't spam it with every chat.)
