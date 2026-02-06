#!/bin/bash

# Calendar skill wrapper for OpenClaw
# This script interfaces with the Python calendar implementation

CALENDAR_SCRIPT="/home/ubuntu/.openclaw/workspace/calendar_app/calendar_app.py"

if [ ! -f "$CALENDAR_SCRIPT" ]; then
    echo "Error: Calendar script not found at $CALENDAR_SCRIPT"
    exit 1
fi

python3 "$CALENDAR_SCRIPT" "$@"