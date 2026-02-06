#!/bin/bash
# install.sh — Set up amygdala-memory for OpenClaw
# Usage: ./install.sh [--with-cron]

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎭 Installing amygdala-memory..."
echo ""

# 1. Create memory directory if needed
mkdir -p "$WORKSPACE/memory"

# 2. Initialize emotional-state.json if it doesn't exist
STATE_FILE="$WORKSPACE/memory/emotional-state.json"
if [ ! -f "$STATE_FILE" ]; then
  echo "Creating initial emotional state..."
  cat > "$STATE_FILE" << 'EOF'
{
  "version": "1.0",
  "lastUpdated": "",
  "dimensions": {
    "valence": 0.1,
    "arousal": 0.3,
    "connection": 0.4,
    "curiosity": 0.5,
    "energy": 0.5
  },
  "baseline": {
    "valence": 0.1,
    "arousal": 0.3,
    "connection": 0.4,
    "curiosity": 0.5,
    "energy": 0.5
  },
  "recentEmotions": []
}
EOF
  echo "✅ Created $STATE_FILE"
else
  echo "✅ State file already exists"
fi

# 3. Make scripts executable
chmod +x "$SKILL_DIR/scripts/"*.sh
echo "✅ Scripts are executable"

# 4. Generate initial AMYGDALA_STATE.md
"$SKILL_DIR/scripts/sync-state.sh"

# 5. Set up OpenClaw cron if requested
if [ "$1" = "--with-cron" ]; then
  echo ""
  echo "Setting up OpenClaw cron jobs..."
  
  if ! command -v openclaw &> /dev/null; then
    echo "⚠️  'openclaw' not in PATH. Add these cron jobs manually:"
    echo ""
    echo "# Emotional decay (every 6 hours)"
    echo "openclaw cron add --name amygdala-decay --cron '0 */6 * * *' --session isolated --agent-turn '🎭 Run emotional decay: Run $SKILL_DIR/scripts/decay-emotion.sh and sync state'"
    echo ""
    echo "# Emotional encoding (every 3 hours)"  
    echo "openclaw cron add --name amygdala-encoding --cron '30 0,3,6,9,12,15,18,21 * * *' --session isolated --agent-turn 'Run amygdala emotional encoding. Preprocess signals, detect emotions, update state.'"
  else
    echo "   Creating amygdala-decay..."
    openclaw cron add --name amygdala-decay \
      --cron '0 */6 * * *' \
      --session isolated \
      --agent-turn "🎭 Run emotional decay: Run $SKILL_DIR/scripts/decay-emotion.sh and report results" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
    
    echo "   Creating amygdala-encoding..."
    openclaw cron add --name amygdala-encoding \
      --cron '30 0,3,6,9,12,15,18,21 * * *' \
      --session isolated \
      --agent-turn "Run amygdala emotional encoding: 1) Run preprocess-emotions.sh 2) Read encode-emotions.md 3) Update state for significant emotions 4) Update watermark 5) Sync state" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎭 amygdala-memory installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Files created:"
echo "  • $STATE_FILE"
echo "  • $WORKSPACE/AMYGDALA_STATE.md (auto-injected)"
echo ""
echo "Usage:"
echo "  # Check your emotional state"
echo "  $SKILL_DIR/scripts/load-emotion.sh"
echo ""
echo "  # Log an emotion"
echo "  $SKILL_DIR/scripts/update-state.sh --emotion joy --trigger \"reason\""
echo ""

if [ "$1" != "--with-cron" ]; then
  echo "TIP: Run with --with-cron to set up automatic decay & encoding"
  echo "  ./install.sh --with-cron"
  echo ""
fi

echo "┌────────────────────────────────────────────────────────┐"
echo "│  🎭 View your agent's MOOD in the Brain Dashboard      │"
echo "│                                                        │"
echo "│  open ~/.openclaw/workspace/brain-dashboard.html       │"
echo "└────────────────────────────────────────────────────────┘"
echo ""
echo "Done! 🎭"
