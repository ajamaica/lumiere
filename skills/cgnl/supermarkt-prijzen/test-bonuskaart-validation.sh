#!/bin/bash
# Test AH bonuskaart validation endpoint

ENDPOINT="https://www.ah.nl/mijn/account-aanmaken/persoonlijk/voordeel"

# Test eerste 5 nummers
test_cards=(
  "2621138446638"
  "2623015138124"
  "2622021304240"
  "2623028870769"
  "2621119719898"
)

echo "Testing AH Bonuskaart Validation Endpoint"
echo "=========================================="
echo ""

for card in "${test_cards[@]}"; do
  echo "Testing card: $card"
  
  response=$(curl -s "${ENDPOINT}?bonus-card=${card}&_rsc=1v0d1" \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' \
    -H 'Accept: */*' \
    -H 'Referer: https://www.ah.nl/mijn/account-aanmaken/persoonlijk/bonuskaart/invullen' \
    -H 'rsc: 1' \
    --compressed)
  
  echo "Response:"
  echo "$response" | head -c 500
  echo ""
  echo "---"
  echo ""
  
  sleep 2
done
