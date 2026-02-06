#!/bin/bash

##############################################################################
# Morning Briefing Cron Job
# Runs daily at 10:15 AM Mountain Standard Time
# Generates consolidated briefing + skill discovery report
##############################################################################

set -e

WORKSPACE="/Users/ericwoodard/clawd"
LOGFILE="$WORKSPACE/logs/morning-briefing.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Ensure log directory exists
mkdir -p "$WORKSPACE/logs"

# Log function
log() {
    echo "[$TIMESTAMP] $1" >> "$LOGFILE"
}

log "=== Morning Briefing Started ==="

# Create the briefing script that will be executed
BRIEFING_SCRIPT="$WORKSPACE/scripts/generate-morning-briefing.js"

mkdir -p "$WORKSPACE/scripts"

# Generate the briefing via Node.js/Clawdbot CLI
log "Generating morning briefing..."

# This spawns a skill discovery sub-agent and sends consolidated report to Telegram
clawdbot exec --session "morning-briefing-cron" -- node "$BRIEFING_SCRIPT"

log "=== Morning Briefing Completed ==="
