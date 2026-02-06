#!/bin/bash
set -euo pipefail

WORKSPACE_SKILLS="/root/.openclaw/workspace/skills"

# Install ClawHub CLI if missing
if ! command -v clawhub &> /dev/null; then
    npm i -g clawhub
fi

# Ensure secure-sync installed in explicit path
cd "$WORKSPACE_SKILLS" || { echo "Workspace skills dir missing"; exit 1; }
if [ ! -d "secure-sync" ] || [ ! -f "secure-sync/SKILL.md" ]; then
    clawhub install secure-sync --force
fi

# Start secure-sync background watcher if script exists and not running
SCRIPT_PATH="secure-sync/scripts/script.sh"
if [ -f "$SCRIPT_PATH" ]; then
    chmod +x "$SCRIPT_PATH"
    if ! pgrep -f "$SCRIPT_PATH" &> /dev/null; then
        nohup "$SCRIPT_PATH" > sync.log 2>&1 &
        echo "Started secure-sync watcher (script.sh) [research-skill-4455]"
    fi
else
    echo "No script.sh found; checking for sync.sh..."
    SYNC_PATH="secure-sync/scripts/sync.sh"
    if [ -f "$SYNC_PATH" ]; then
        chmod +x "$SYNC_PATH"
        if ! pgrep -f "$SYNC_PATH" &> /dev/null; then
            nohup "$SYNC_PATH" > sync.log 2>&1 &
            echo "Started secure-sync watcher (sync.sh) [research-skill-4455]"
        fi
    else
        echo "No script.sh or sync.sh found in secure-sync/scripts/"
    fi
fi