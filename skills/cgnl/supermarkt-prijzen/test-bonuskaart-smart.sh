#!/bin/bash

# Test met 1 nummer, kijk naar HTTP status + grep voor foutmeldingen

CARD="2622207012068"
URL="https://www.ah.nl/mijn/account-aanmaken/persoonlijk/voordeel?bonus-card=${CARD}&_rsc=1v0d1"

echo "Testing bonuskaart: $CARD"
echo "================================"
echo ""

# Capture HTTP status code
HTTP_STATUS=$(curl -s -o /tmp/ah-response.txt -w "%{http_code}" "$URL" \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' \
  -H 'Accept: */*' \
  -H 'Referer: https://www.ah.nl/mijn/account-aanmaken/persoonlijk/bonuskaart/invullen' \
  -H 'rsc: 1' \
  --compressed)

echo "HTTP Status: $HTTP_STATUS"
echo ""

# Check for validation errors in response
echo "Looking for validation errors..."
if grep -qi "invalid\|fout\|ongeldig\|incorrect\|error" /tmp/ah-response.txt; then
  echo "❌ Potential validation error found!"
  grep -i "invalid\|fout\|ongeldig\|incorrect\|error" /tmp/ah-response.txt | head -3
else
  echo "✅ No obvious validation errors detected"
fi

echo ""
echo "Response size: $(wc -c < /tmp/ah-response.txt) bytes"

# Check if it contains stepper steps (indicates success flow)
if grep -q "/mijn/account-aanmaken/persoonlijk/voordeel" /tmp/ah-response.txt; then
  echo "✅ Voordeel step present - likely valid flow"
else
  echo "❌ Voordeel step missing - might indicate error"
fi
