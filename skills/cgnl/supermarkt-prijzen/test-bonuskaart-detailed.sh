#!/bin/bash
# Gedetailleerde test met response parsing

ENDPOINT="https://www.ah.nl/mijn/account-aanmaken/persoonlijk/voordeel"

test_card="2621138446638"

echo "Testing card: $test_card"
echo "========================"
echo ""

# Haal volledige response op
response=$(curl -s "${ENDPOINT}?bonus-card=${test_card}&_rsc=1v0d1" \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' \
  -H 'Accept: */*' \
  -H 'Referer: https://www.ah.nl/mijn/account-aanmaken/persoonlijk/bonuskaart/invullen' \
  -H 'rsc: 1' \
  --compressed)

echo "Full response:"
echo "$response"
echo ""
echo "---"
echo ""

# Zoek naar error patterns
if echo "$response" | grep -iq "error\|fout\|ongeldig\|incorrect"; then
  echo "❌ Error found in response!"
  echo "$response" | grep -i "error\|fout\|ongeldig\|incorrect"
else
  echo "✅ No obvious errors detected"
fi

echo ""
echo "Response length: $(echo "$response" | wc -c) bytes"
