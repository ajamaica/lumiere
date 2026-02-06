#!/bin/bash
# Value betting strategy - find and bet on undervalued markets

set -e

MIN_EDGE=${1:-0.05}  # 5% minimum edge
MAX_POSITION=${2:-100}  # $100 max per position
CATEGORIES=${3:-"politics,crypto"}

echo "=== Value Betting Strategy ==="
echo "Min Edge: $(echo "$MIN_EDGE * 100" | bc)%"
echo "Max Position: \$$MAX_POSITION"
echo "Categories: $CATEGORIES"
echo ""

# Get top markets in specified categories
IFS=',' read -ra CATEGORY_ARRAY <<< "$CATEGORIES"

for CATEGORY in "${CATEGORY_ARRAY[@]}"; do
  echo "Scanning $CATEGORY markets..."
  
  MARKETS=$(./scripts/list-markets.sh --category "$CATEGORY" --sort volume --limit 20 --format json)
  
  # For each market
  echo "$MARKETS" | jq -r '.[] | @base64' | while read -r MARKET_B64; do
    MARKET=$(echo "$MARKET_B64" | base64 -d)
    
    MARKET_ID=$(echo "$MARKET" | jq -r '.id')
    QUESTION=$(echo "$MARKET" | jq -r '.question')
    YES_PRICE=$(echo "$MARKET" | jq -r '.yes_price')
    NO_PRICE=$(echo "$MARKET" | jq -r '.no_price')
    
    # Calculate implied probability
    IMPLIED_YES=$(echo "scale=4; $YES_PRICE" | bc)
    IMPLIED_NO=$(echo "scale=4; $NO_PRICE" | bc)
    
    # Your model's probability (placeholder - you'd add real ML model here)
    # For demo, we'll use a simple heuristic
    MODEL_PROB=$(echo "scale=4; 0.5 + (0.5 - $IMPLIED_YES) * 0.1" | bc)
    
    # Calculate edge
    EDGE=$(echo "scale=4; $MODEL_PROB - $IMPLIED_YES" | bc)
    
    # Check if edge meets threshold
    MEETS_THRESHOLD=$(echo "$EDGE > $MIN_EDGE" | bc -l)
    
    if [[ "$MEETS_THRESHOLD" == "1" ]]; then
      EDGE_PERCENT=$(echo "scale=2; $EDGE * 100" | bc)
      
      echo ""
      echo "📊 VALUE FOUND!"
      echo "Market: $QUESTION"
      echo "Market Price: $IMPLIED_YES ($(echo "$IMPLIED_YES * 100" | bc)%)"
      echo "Model Probability: $MODEL_PROB ($(echo "$MODEL_PROB * 100" | bc)%)"
      echo "Edge: +$EDGE_PERCENT%"
      
      # Calculate position size using Kelly Criterion
      # Kelly = (edge * prob) / edge = prob
      # We use fractional Kelly (25%) for safety
      KELLY_FRACTION=0.25
      POSITION_SIZE=$(echo "scale=2; $MAX_POSITION * $EDGE * $KELLY_FRACTION" | bc)
      
      # Cap at max position
      if (( $(echo "$POSITION_SIZE > $MAX_POSITION" | bc -l) )); then
        POSITION_SIZE=$MAX_POSITION
      fi
      
      # Minimum $5 bet
      if (( $(echo "$POSITION_SIZE < 5" | bc -l) )); then
        POSITION_SIZE=5
      fi
      
      echo "Recommended Position: \$$POSITION_SIZE"
      echo ""
      
      # Place the order
      read -p "Place this bet? (y/N) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/place-order.sh \
          --market "$MARKET_ID" \
          --side buy \
          --outcome yes \
          --amount "$POSITION_SIZE" \
          --price "$YES_PRICE"
        
        echo "✅ Order placed!"
      else
        echo "⏭️  Skipped"
      fi
      
      echo ""
    fi
  done
done

echo ""
echo "=== Scan Complete ==="
echo "Check your positions:"
echo "./scripts/check-positions.sh --show-pnl"
