#!/bin/bash

# Reminders checker for OpenClaw calendar

REMINDERS_SCRIPT="/home/ubuntu/.openclaw/workspace/calendar_app/reminders.py"

if [ ! -f "$REMINDERS_SCRIPT" ]; then
    echo "Error: Reminders script not found at $REMINDERS_SCRIPT"
    exit 1
fi

python3 "$REMINDERS_SCRIPT"