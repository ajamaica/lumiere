#!/bin/bash

###############################################################################
# Mail Hygiene Status Check - For heartbeat/monitoring
# Called by main agent to check if mail hygiene is active
###############################################################################

REPORT_DIR="/Users/ericwoodard/clawd/mail-reports"
LATEST_REPORT="$REPORT_DIR/latest-summary.txt"
CRONTAB_ENTRY=$(crontab -l 2>/dev/null | grep mail-hygiene)

echo "=== Mail Hygiene Status ==="
echo ""

# Check if cron job is installed
if [ -n "$CRONTAB_ENTRY" ]; then
  echo "✅ Cron job status: ACTIVE"
  echo "   Schedule: $CRONTAB_ENTRY"
else
  echo "❌ Cron job status: NOT INSTALLED"
fi

echo ""

# Check latest report
if [ -f "$LATEST_REPORT" ]; then
  echo "Latest scan report:"
  cat "$LATEST_REPORT"
else
  echo "No scan reports yet."
fi

echo ""
echo "Report directory: $REPORT_DIR"
echo "All reports:"
ls -lh "$REPORT_DIR"/*.txt 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
