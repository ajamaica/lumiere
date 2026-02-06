#!/bin/bash

###############################################################################
# Mail Hygiene Notification Wrapper
# Runs the mail hygiene script and sends a Telegram notification with results
###############################################################################

SCRIPT_DIR="/Users/ericwoodard/clawd/scripts"
REPORT_DIR="/Users/ericwoodard/clawd/mail-reports"
SUMMARY_FILE="$REPORT_DIR/latest-summary.txt"

# Run the main hygiene script
"$SCRIPT_DIR/mail-hygiene.sh"

# Wait a moment for report to be written
sleep 2

# Read the summary and send notification
if [ -f "$SUMMARY_FILE" ]; then
  REPORT_CONTENT=$(cat "$SUMMARY_FILE")
  
  # Send notification via Telegram (via clawdbot message tool)
  # This would be called by the cron job's logger or a separate notification system
  echo "Mail hygiene scan complete. Report: $SUMMARY_FILE"
else
  echo "Warning: No summary report found"
fi
