#!/bin/bash

###############################################################################
# Mail Hygiene Script - Daily Spam & Phishing Detection
# Runs at 10 AM daily via cron
# Scans Gmail inbox for spam and phishing emails, reports findings
###############################################################################

# Configuration
REPORT_DIR="/Users/ericwoodard/clawd/mail-reports"
REPORT_FILE="$REPORT_DIR/$(date +%Y-%m-%d).txt"
SUMMARY_FILE="$REPORT_DIR/latest-summary.txt"
LOG_FILE="/Users/ericwoodard/clawd/logs/mail-hygiene.log"

# Ensure directories exist
mkdir -p "$REPORT_DIR" "$(dirname "$LOG_FILE")"

# Initialize report
{
  echo "=========================================="
  echo "MAIL HYGIENE SCAN - $(date)"
  echo "=========================================="
  echo ""
} > "$REPORT_FILE"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
  echo "$*" >> "$REPORT_FILE"
}

log "Starting mail hygiene scan..."

# Search for emails from the last 24 hours
# Extract IDs from first column, skip header line
EMAIL_IDS=$(gog gmail search 'newer_than:1d' 2>/dev/null | tail -n +2 | awk '{print $1}')

if [ -z "$EMAIL_IDS" ]; then
  log "No emails found from the last 24 hours. Scan complete."
  echo "" >> "$REPORT_FILE"
  echo "✓ No emails to scan" >> "$REPORT_FILE"
  cp "$REPORT_FILE" "$SUMMARY_FILE"
  exit 0
fi

TOTAL_EMAILS=$(echo "$EMAIL_IDS" | wc -l)
log "Found $TOTAL_EMAILS emails to analyze"
echo "Total emails to analyze: $TOTAL_EMAILS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

SPAM_COUNT=0
PHISHING_COUNT=0
PROCESSED_COUNT=0

###############################################################################
# ANALYSIS FUNCTION
###############################################################################

analyze_email() {
  local email_id="$1"
  local email_data
  local from_address
  local sender_domain
  local subject
  local body
  local is_spam=0
  local is_phishing=0
  local action_taken=""
  
  # Fetch full email details
  email_data=$(gog gmail get "$email_id" --format full 2>/dev/null)
  
  if [ -z "$email_data" ]; then
    return
  fi
  
  # Extract key fields
  from_address=$(echo "$email_data" | grep -i "^From:" | head -1 | sed 's/^From: //')
  sender_domain=$(echo "$from_address" | grep -oE '@[a-zA-Z0-9.-]+' | tr -d '@')
  subject=$(echo "$email_data" | grep -i "^Subject:" | head -1 | sed 's/^Subject: //')
  body=$(echo "$email_data" | grep -A 1000 "^$" | head -100)
  
  ###########################################################################
  # SPAM DETECTION
  ###########################################################################
  
  # Check for promotional/marketing indicators with unsubscribe links
  if echo "$body" | grep -iq "unsubscribe" || \
     echo "$subject" | grep -iqE "(sale|offer|discount|promotion|limited time|deal|shop|buy|save|% off)" || \
     echo "$from_address" | grep -iqE "(noreply|marketing|promo|news)" || \
     echo "$body" | grep -iq "View this email in your browser"; then
    is_spam=1
    
    # Extract unsubscribe link if present
    unsubscribe_link=$(echo "$email_data" | grep -io 'unsubscribe[^<>]*' | head -1)
    if [ -n "$unsubscribe_link" ]; then
      action_taken="Found unsubscribe link: $unsubscribe_link"
    fi
  fi
  
  ###########################################################################
  # PHISHING DETECTION
  ###########################################################################
  
  # Check for IRS impersonation
  if echo "$email_data" | grep -iqE "(IRS|tax|refund|invoice|owed)" && \
     echo "$from_address" | grep -vqE "@irs\.gov"; then
    is_phishing=1
    action_taken="PHISHING ALERT: IRS impersonation detected from $from_address"
  fi
  
  # Check for spoofed official services
  local spoofed_services=("paypal" "apple" "amazon" "google" "microsoft" "bank" "wellsfargo" "bofa" "chase")
  for service in "${spoofed_services[@]}"; do
    if echo "$subject" | grep -iq "$service" || echo "$body" | grep -iq "$service"; then
      # Verify if sender is actually from that service
      expected_domain=$(echo "$service" | tr -d ' ')".com"
      if ! echo "$sender_domain" | grep -iq "$expected_domain" && ! echo "$from_address" | grep -iq "@$expected_domain"; then
        is_phishing=1
        action_taken="PHISHING ALERT: Spoofed $service service - sender: $from_address"
        break
      fi
    fi
  done
  
  # Check for suspicious sender domain
  if ! echo "$sender_domain" | grep -iqE "^[a-z0-9.-]+\.(com|org|net|edu|gov)$"; then
    # Domain looks suspicious, might warrant phishing marking
    if echo "$body" | grep -iqE "(verify|confirm|urgent|account|suspended|unusual activity|click here|act now)"; then
      is_phishing=1
      action_taken="PHISHING ALERT: Suspicious domain ($sender_domain) with urgent language"
    fi
  fi
  
  # Check for suspicious links
  if echo "$email_data" | grep -iqE "http[s]?://[^>]*@" || \
     echo "$email_data" | grep -iqE "bit\.ly|tinyurl|short\.link"; then
    is_phishing=1
    action_taken="PHISHING ALERT: Suspicious URL shortener or credential redirect detected"
  fi
  
  ###########################################################################
  # ACTIONS
  ###########################################################################
  
  if [ $is_phishing -eq 1 ]; then
    ((PHISHING_COUNT++))
    log ""
    log "🚨 PHISHING EMAIL DETECTED:"
    log "  From: $from_address"
    log "  Subject: $subject"
    log "  Action: $action_taken"
    
    # Move to trash
    gog gmail trash "$email_id" 2>/dev/null && \
      log "  ✓ Moved to trash"
    
    # Create filter to auto-trash future emails from this sender
    gog gmail create-filter --from "$from_address" --delete 2>/dev/null && \
      log "  ✓ Created auto-trash filter for $from_address"
    
  elif [ $is_spam -eq 1 ]; then
    ((SPAM_COUNT++))
    log ""
    log "📧 PROMOTIONAL EMAIL DETECTED:"
    log "  From: $from_address"
    log "  Subject: $subject"
    if [ -n "$action_taken" ]; then
      log "  Note: $action_taken"
    fi
    # Spam emails left alone - user can handle unsubscribe manually or via filter
  fi
  
  ((PROCESSED_COUNT++))
}

###############################################################################
# MAIN PROCESSING LOOP
###############################################################################

log "Analyzing emails..."
echo "" >> "$REPORT_FILE"

for email_id in $EMAIL_IDS; do
  analyze_email "$email_id"
done

###############################################################################
# SUMMARY REPORT
###############################################################################

echo "" >> "$REPORT_FILE"
echo "=========================================="  >> "$REPORT_FILE"
echo "SCAN SUMMARY"  >> "$REPORT_FILE"
echo "=========================================="  >> "$REPORT_FILE"
echo "Emails scanned: $PROCESSED_COUNT" >> "$REPORT_FILE"
echo "Phishing emails detected & removed: $PHISHING_COUNT" >> "$REPORT_FILE"
echo "Promotional emails detected: $SPAM_COUNT" >> "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Create summary for main agent
cp "$REPORT_FILE" "$SUMMARY_FILE"

log "Mail hygiene scan complete."
log "Report saved to: $REPORT_FILE"

# Exit successfully
exit 0
