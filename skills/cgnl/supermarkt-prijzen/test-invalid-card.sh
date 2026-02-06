#!/bin/bash

# Test met BEWUST ongeldig nummer
# - Verkeerde checksum
# - Te kort/lang
# - Verkeerd prefix

echo "Testing INVALID bonuskaart numbers"
echo "===================================="
echo ""

test_card() {
  local card=$1
  local desc=$2
  
  echo "Test: $desc"
  echo "Card: $card"
  
  response=$(curl -s "https://www.ah.nl/mijn/account-aanmaken/persoonlijk/voordeel?bonus-card=${card}&_rsc=1v0d1" \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' \
    -H 'Accept: */*' \
    -H 'Referer: https://www.ah.nl/mijn/account-aanmaken/persoonlijk/bonuskaart/invullen' \
    -H 'rsc: 1' \
    --compressed 2>&1)
  
  # Check for error patterns
  if echo "$response" | grep -qi "invalid\|ongeldig\|incorrect\|niet geldig\|fout"; then
    echo "❌ Validation error detected!"
    echo "$response" | grep -i "invalid\|ongeldig\|incorrect\|niet geldig\|fout" | head -2
  elif echo "$response" | grep -q "voordeel"; then
    echo "✅ No validation error (suspicious for invalid number!)"
  else
    echo "⚠️ Unexpected response"
  fi
  
  echo "Response size: $(echo "$response" | wc -c) bytes"
  echo "---"
  echo ""
}

# Test 1: Verkeerde checksum (laatste cijfer +1)
test_card "2622207012069" "Verkeerde checksum (8→9)"

# Test 2: Te kort (12 cijfers i.p.v. 13)
test_card "262220701206" "Te kort (12 cijfers)"

# Test 3: Te lang (14 cijfers)
test_card "26222070120688" "Te lang (14 cijfers)"

# Test 4: Verkeerd prefix (999 i.p.v. 262)
test_card "9992207012068" "Verkeerd prefix (999)"

# Test 5: Allemaal nullen
test_card "0000000000000" "Alleen nullen"

