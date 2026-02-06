#!/bin/bash
# Twice Daily YouTube Comment Management
# Runs at 10:00 AM and 4:00 PM MST

echo "📱 YouTube Comment Check - $(date)"
echo "================================"

cd ~/clawd/skills/daily-devotional-auto

# 1. Check for new comments
echo ""
echo "🔍 Checking YouTube comments..."
node scripts/check-comments.js

# 2. Show summary
echo ""
echo "📊 Summary:"

# Count suggestions
SUGGESTIONS_FILE="$HOME/.clawd-devotional/temp/user-suggestions.json"
if [ -f "$SUGGESTIONS_FILE" ]; then
  UNUSED=$(cat "$SUGGESTIONS_FILE" 2>/dev/null | grep -c '"used": false' || echo "0")
  if [ "$UNUSED" -gt 0 ]; then
    echo "  💡 $UNUSED unused topic suggestions"
  fi
fi

# Count doctrinal alerts
ALERTS_FILE="$HOME/.clawd-devotional/temp/doctrinal-alerts.json"
if [ -f "$ALERTS_FILE" ]; then
  UNREVIEWED=$(cat "$ALERTS_FILE" 2>/dev/null | grep -c '"reviewed": false' || echo "0")
  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "  🚨 $UNREVIEWED doctrinal questions for your review"
  fi
fi

# 3. Generate reply suggestions
echo ""
echo "🤖 Generating reply suggestions..."
node scripts/reply-as-bot.js

echo ""
echo "================================"
echo "✅ Comment check complete!"
echo ""
echo "📋 For Snail's attention:"
[ -f "$ALERTS_FILE" ] && echo "  Review doctrinal alerts: $ALERTS_FILE"
[ -f "$SUGGESTIONS_FILE" ] && echo "  Review suggestions: $SUGGESTIONS_FILE"
echo ""
echo "Next check: $([ $(date +%H) -lt 16 ] && echo "4:00 PM MST" || echo "10:00 AM MST tomorrow")"
