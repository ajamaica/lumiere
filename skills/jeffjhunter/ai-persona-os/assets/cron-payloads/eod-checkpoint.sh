# End-of-Day Checkpoint — Cron Job Template
# Writes a full context checkpoint and reviews the day
# Schedule: Daily at 6 PM (adjust timezone)
#
# Usage:
#   Copy and paste the command below into your terminal.
#   Change --tz to your timezone.

openclaw cron add \
  --name "ai-persona-eod-checkpoint" \
  --cron "0 18 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "End-of-day checkpoint protocol:

1. Write a full checkpoint to today's memory log with all decisions, action items, and open threads.

2. Review MEMORY.md — promote any repeated learnings from today. Prune anything stale or no longer relevant.

3. Check .learnings/ — any pending items with 3+ repetitions? Promote to MEMORY.md or AGENTS.md.

4. Deliver a brief end-of-day summary: what was accomplished, what carries over to tomorrow, and any blockers.

Use 🟢🟡🔴 indicators for system health. Keep it concise." \
  --announce
