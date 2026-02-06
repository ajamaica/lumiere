# Morning Briefing — Cron Job Template
# Runs the full 4-step AI Persona OS daily protocol
# Schedule: Daily at 8 AM (adjust timezone)
#
# Usage:
#   Copy and paste the command below into your terminal.
#   Change --tz to your timezone.
#   Change --announce to --no-deliver if you want internal-only processing.

openclaw cron add \
  --name "ai-persona-morning-briefing" \
  --cron "0 8 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Execute the full AI Persona OS daily protocol:

Step 1: Load previous context — Read today's and yesterday's memory logs. Summarize key state, pending items, and open threads.

Step 2: System status — Check MEMORY.md size (<4KB), workspace structure, stale logs (>90 days), and file accessibility.

Step 3: Priority scan — Check channels in priority order (P1 critical → P4 background). Surface anything requiring attention.

Step 4: Assessment — Summarize system health, blocking issues, time-sensitive items, and recommended first action.

Format as a daily briefing. Use 🟢🟡🔴 indicators for each section. End with today's top 3 priorities." \
  --announce
