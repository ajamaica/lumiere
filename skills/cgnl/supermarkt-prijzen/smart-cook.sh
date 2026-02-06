#!/bin/bash
# Smart Cook: Scan fridge → Find recipes → Shopping list
# Complete workflow for fridge-to-recipe automation

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🍳 Smart Cook - Van koelkast tot recept!"
echo ""

# Step 1: Scan fridge
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STAP 1: Koelkast scannen"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FRIDGE_IMAGE=$("$SCRIPT_DIR/fridge-scan.sh")

if [ ! -f "$FRIDGE_IMAGE" ]; then
    echo "❌ Fridge scan failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STAP 2: Ingrediënten herkennen (Vision AI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Image path: $FRIDGE_IMAGE"
echo ""
echo "⚠️  NOTE: This step requires OpenClaw's 'image' tool."
echo "   Ask your assistant to analyze the image with:"
echo ""
echo "   image --image $FRIDGE_IMAGE --prompt 'List all visible food items as comma-separated list'"
echo ""
echo "   Then paste the ingredient list below (or press Ctrl+C to cancel)"
echo ""
read -p "Ingredients: " INGREDIENTS

if [ -z "$INGREDIENTS" ]; then
    echo "❌ No ingredients provided"
    exit 1
fi

echo ""
echo "✅ Ingredients: $INGREDIENTS"

# Step 3: Find recipes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STAP 3: Recepten zoeken"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RECIPES=$("$SCRIPT_DIR/ah-recipes.py" ingredients --ingredients "$INGREDIENTS" --size 5 --pretty)

if [ -z "$RECIPES" ]; then
    echo "❌ No recipes found"
    exit 1
fi

echo "$RECIPES" | jq -r '.[] | "[\(.id)] \(.title) - \(.cookTime) min\n       https://www.ah.nl\(.href)"'

echo ""
read -p "📖 Enter recipe ID for details (or skip): " RECIPE_ID

if [ -n "$RECIPE_ID" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STAP 4: Recept details & shopping list"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    RECIPE_DETAILS=$("$SCRIPT_DIR/ah-recipes.py" details --recipe-id "$RECIPE_ID" --pretty)
    
    RECIPE_TITLE=$(echo "$RECIPE_DETAILS" | jq -r '.title')
    RECIPE_URL=$(echo "$RECIPE_DETAILS" | jq -r '.href')
    
    echo "📖 Recipe: $RECIPE_TITLE"
    echo "🔗 Link: https://www.ah.nl$RECIPE_URL"
    echo ""
    echo "🛒 Ingredients needed:"
    echo "$RECIPE_DETAILS" | jq -r '.ingredients[] | "  - \(.amount) \(.unit) \(.name)"'
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "STAP 5: Check bonussen op missende items"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 TIP: Check bonussen met:"
    echo "   ./ah-api.py bonuses --filter WEB_BONUS_PAGE | jq '.bonuses[] | select(.title | contains(\"tomaat\"))'"
fi

echo ""
echo "✅ Smart Cook complete!"
echo ""
echo "📁 Fridge image saved to: $FRIDGE_IMAGE"
