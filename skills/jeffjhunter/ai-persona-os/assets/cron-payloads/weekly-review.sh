# Weekly Review — Cron Job Template
# Deep review of the past week: learnings, archiving, pattern recognition
# Schedule: Monday at 9 AM (adjust timezone)
# Uses Opus model for deeper analysis
#
# Usage:
#   Copy and paste the command below into your terminal.
#   Change --tz to your timezone.
#   Remove --model opus if you prefer your default model.

openclaw cron add \
  --name "ai-persona-weekly-review" \
  --cron "0 9 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --model opus \
  --message "Weekly review protocol:

1. Scan memory/ for the past 7 days. Summarize key themes, decisions, and outcomes.

2. Review .learnings/LEARNINGS.md — promote items with 3+ repetitions to MEMORY.md or AGENTS.md.

3. Archive logs older than 90 days to memory/archive/.

4. Check MEMORY.md size — prune if approaching 4KB.

5. Review WORKFLOWS.md — any new recurring patterns worth documenting?

6. Deliver a weekly summary: wins, issues resolved, lessons learned, and focus areas for the coming week.

Use 🟢🟡🔴 indicators for overall system health." \
  --announce
