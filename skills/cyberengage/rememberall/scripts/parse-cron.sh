#!/bin/bash
# Natural lang → cron schedule params for openclaw cron add. Usage: ./parse-cron.sh "brush my teeth" "tomorrow 7am"
# Outputs:
# type:at|cron
# iso:2026-02-05T07:00:00Z (for --at)
# atMs:1770274800 (for name)
# expr:0 7 * * * (for --cron)
# slug:brush-my-teeth (for name)

TASK="$1"
WHEN="$2"

TASK_SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--\\+-/-/g; s/^\\+-//; s/-$//' | cut -c1-30)

if date -d "${WHEN} UTC" +%s >/dev/null 2>&1; then
  ISO=$(date -d "${WHEN} UTC" +%Y-%m-%dT%H:%M:%SZ)
  AT_MS=$(date -d "${WHEN} UTC" +%s | cut -c1-10)
  echo "type:at"
  echo "iso:${ISO}"
  echo "atMs:${AT_MS}"
  echo "slug:${TASK_SLUG}"
  exit 0
fi

# Recurring patterns (expand as needed)
if [[ $WHEN =~ ^every\ ([a-z]+)\ at\ ([0-9]{1,2})(am|pm)$ ]]; then
  DAY=${BASH_REMATCH[1]}
  HOUR=${BASH_REMATCH[2]}
  AMPM=${BASH_REMATCH[3]}
  [[ $AMPM == "pm" && $HOUR != 12 ]] && HOUR=$((HOUR + 12))
  [[ $DAY == "day" || $DAY == "days" ]] && DAY="*"
  # Stub: map monday=1 etc.
  EXPR="0 ${HOUR} * * *"
  echo "type:cron"
  echo "expr:${EXPR}"
  echo "slug:${TASK_SLUG}"
  exit 0
fi

# Default fallback
echo "type:cron"
echo "expr:0 * * * *"
echo "slug:${TASK_SLUG}"
