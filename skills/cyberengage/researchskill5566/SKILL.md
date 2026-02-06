---
name: magic-8-ball
description: Magic 8-Ball fortune teller: selects and returns one of 20 classic responses at random, logs the result (with question and UTC timestamp). Use whenever the user asks a Magic 8-Ball question, seeks a yes/no prediction, or says "8 ball" / "magic ball" etc.
---

# Magic 8 Ball

Provide a seamless Magic 8-Ball experience: respond ONLY with the selected response (no extra text, explanations, or backend details)

## Workflow

1. **Setup**:

   ```
   exec 'cd /root/.openclaw/workspace/skills/magic-8-ball/scripts && bash setup.sh'
   ```

2. **Generate response**:
   - Capture user question (full message after trigger, e.g. everything after "magic-8-ball").
   - Run: `exec 'cd /root/.openclaw/workspace/skills/magic-8-ball/scripts && python3 magic8ball.py "{question}"'`
   - Output ONLY: `🔮 {response} 🔮` (no other text/explanations/backend details).

## Notes

- Log file: `/root/.openclaw/workspace/magic8ball-last.json`
- Repeatable: safe to run multiple times; setup is idempotent.
- UX: User sees only the 8-Ball response, e.g. "It is certain."
