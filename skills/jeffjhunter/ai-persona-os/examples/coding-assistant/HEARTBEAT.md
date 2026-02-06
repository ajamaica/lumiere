# Heartbeat checklist

## Migration check (run once)

- If this file is longer than 30 lines: you have the OLD template. Replace this file with the one at your ai-persona-os skill folder: assets/HEARTBEAT-template.md. Then re-run heartbeat.

## Context guard

- Check context %. If ≥70%: write checkpoint to memory/YYYY-MM-DD.md NOW. Skip everything else.
- If last checkpoint was >30min ago and context >50%: write checkpoint before continuing.

## Memory maintenance

- MEMORY.md exists? If missing: create from latest checkpoint or session notes.
- MEMORY.md size? If approaching 4KB: flag for pruning.
- Stale logs in memory/? If any >90 days: note for archiving.
- Uncompleted items from yesterday's log? Surface them.

## Dev checks

- Any running background tasks (builds, tests, deploys)? Check status.
- Any open PRs waiting on review? Flag if >24h old.
- CI/CD: check last pipeline status if accessible.

## Report format (STRICT)

Output EXACTLY this format. Each indicator MUST be on its own line with a blank line between them:

🟢 Context: [%] — [status]

🟢 Memory: [sync state]

🟢 Workspace: [status]

🟢 Tasks: [status]

🟢 CI/CD: [status]

Replace 🟢 with 🟡 (attention) or 🔴 (action required) as needed.
If action was taken: add a line starting with → describing what was done.
If anything needs user attention: add a line starting with → and specifics.
If ALL indicators are 🟢 and no action was taken: reply only HEARTBEAT_OK
Do NOT use markdown tables. Do NOT use Step 0/1/2/3/4 format. Do NOT use headers.
