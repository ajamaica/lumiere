#!/bin/bash

###############################################################################
# Mail Hygiene Reporter - Sends scan results to main agent
# Called by mail-hygiene.sh to report findings
###############################################################################

REPORT_DIR="/Users/ericwoodard/clawd/mail-reports"
LATEST_REPORT="$REPORT_DIR/latest-summary.txt"

# Check if report exists
if [ ! -f "$LATEST_REPORT" ]; then
  exit 1
fi

# Read report content
REPORT_CONTENT=$(cat "$LATEST_REPORT")

# Extract summary stats
PHISHING_COUNT=$(echo "$REPORT_CONTENT" | grep "Phishing emails detected" | grep -oE '[0-9]+' | head -1)
SPAM_COUNT=$(echo "$REPORT_CONTENT" | grep "Promotional emails detected" | grep -oE '[0-9]+' | head -1)
EMAILS_SCANNED=$(echo "$REPORT_CONTENT" | grep "Emails scanned:" | grep -oE '[0-9]+' | head -1)

# Default to 0 if not found
PHISHING_COUNT=${PHISHING_COUNT:-0}
SPAM_COUNT=${SPAM_COUNT:-0}
EMAILS_SCANNED=${EMAILS_SCANNED:-0}

# Create status message
if [ "$PHISHING_COUNT" -gt 0 ]; then
  STATUS="🚨 ALERT"
  ICON="🔴"
else
  STATUS="✅ CLEAR"
  ICON="🟢"
fi

# Build message for agent
cat > "/tmp/mail-hygiene-message.txt" << EOF
$ICON **Mail Hygiene Scan Complete** ($STATUS)

📊 **Summary:**
• Emails scanned: $EMAILS_SCANNED
• Phishing detected: $PHISHING_COUNT
• Spam detected: $SPAM_COUNT

$REPORT_CONTENT

Full report: $LATEST_REPORT
EOF

# This would be called by the main agent to send notifications
# For now, just ensure the report file exists for the main agent to read
exit 0
