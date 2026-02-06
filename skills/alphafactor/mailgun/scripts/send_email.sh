#!/bin/bash

# Mailgun 邮件发送脚本
# Usage: send_email.sh <subject> <body> [to_email] [from_email]

SUBJECT="$1"
BODY="$2"
TO="${3:-$MAILGUN_DEFAULT_TO}"
FROM="${4:-$MAILGUN_FROM}"

if [ -z "$SUBJECT" ] || [ -z "$BODY" ]; then
    echo "Error: Subject and body are required"
    echo "Usage: $0 \"Subject\" \"Body\" [to@email.com] [from@email.com]"
    exit 1
fi

if [ -z "$MAILGUN_API_KEY" ] || [ -z "$MAILGUN_DOMAIN" ]; then
    echo "Error: MAILGUN_API_KEY and MAILGUN_DOMAIN must be set"
    echo "Please configure these in your environment or ~/.zshrc"
    exit 1
fi

# Send email via Mailgun API
RESPONSE=$(curl -s -w "\n%{http_code}" --user "api:$MAILGUN_API_KEY" \
    "https://api.mailgun.net/v3/$MAILGUN_DOMAIN/messages" \
    -F from="$FROM" \
    -F to="$TO" \
    -F subject="$SUBJECT" \
    -F text="$BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Email sent successfully to $TO"
    echo "Response: $BODY"
    exit 0
else
    echo "❌ Failed to send email (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi
