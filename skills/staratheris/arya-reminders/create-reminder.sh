#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash skills/arya-reminders/create-reminder.sh "Message" "When"

MESSAGE="${1:-}"
WHEN="${2:-}"

if [[ -z "$MESSAGE" ]]; then
  echo "Error: missing message" >&2
  exit 1
fi
if [[ -z "$WHEN" ]]; then
  echo "Error: missing time description" >&2
  exit 1
fi

WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="$WORKDIR/memory/reminders.md"
TZ_DEFAULT="America/Bogota"

# Allow override via env
TZ_NAME="${TZ_NAME:-$TZ_DEFAULT}"
CHAT_ID="${ARYA_TELEGRAM_CHAT_ID:-5028608085}"

# Parse WHEN -> ISO8601 with timezone offset
ISO_TS=$(python3 "$WORKDIR/skills/arya-reminders/parse_time.py" --tz "$TZ_NAME" --when "$WHEN")

# Create cron job (isolated session; deliver to telegram)
# Using cron tool schema: sessionTarget=isolated requires agentTurn.
# We schedule a systemEvent into isolated session via agentTurn, and it will deliver to requester channel.
# Here we directly schedule a systemEvent to main session (requires main) isn't allowed, so we use agentTurn
# with deliver true.

JOB_REQ=$(python3 "$WORKDIR/skills/arya-reminders/schedule_cron.py" \
  --name "Reminder: $MESSAGE" \
  --at "$ISO_TS" \
  --chat-id "$CHAT_ID" \
  --message "$MESSAGE")

# Print the cron job request JSON to stdout.
# The agent should pass this object to the cron tool and capture the returned job id.
echo "$JOB_REQ"

# Log
mkdir -p "$(dirname "$LOG_FILE")"
# Human display in Bogota
DISPLAY=$(TZ="$TZ_NAME" date -d "$ISO_TS" '+%Y-%m-%d %H:%M %Z')
# Logging is done by the agent after it receives the created job id.
echo "# DISPLAY_TIME=$DISPLAY" >&2
