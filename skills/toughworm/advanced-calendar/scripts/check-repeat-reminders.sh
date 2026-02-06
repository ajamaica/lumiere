#!/bin/bash

# Check for calendar reminders with repeat functionality and send notifications

REMINDERS_SCRIPT="/home/ubuntu/.openclaw/workspace/calendar_app/repeat_reminder.py"

if [ ! -f "$REMINDERS_SCRIPT" ]; then
    echo "Error: Repeat reminders script not found at $REMINDERS_SCRIPT"
    exit 1
fi

python3 "$REMINDERS_SCRIPT"