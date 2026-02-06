#!/bin/bash

# Check for calendar reminders and send notifications

REMINDERS_SCRIPT="/home/ubuntu/.openclaw/workspace/calendar_app/remind_user.py"

if [ ! -f "$REMINDERS_SCRIPT" ]; then
    echo "Error: Reminders script not found at $REMINDERS_SCRIPT"
    exit 1
fi

python3 "$REMINDERS_SCRIPT"