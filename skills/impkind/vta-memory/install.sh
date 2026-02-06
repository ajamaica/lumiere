#!/bin/bash
# install.sh — Set up vta-memory for OpenClaw
# Usage: ./install.sh [--with-cron]

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "⭐ Installing vta-memory..."
echo ""

# 1. Create memory directory if needed
mkdir -p "$WORKSPACE/memory"

# 2. Initialize reward-state.json if it doesn't exist
STATE_FILE="$WORKSPACE/memory/reward-state.json"
if [ ! -f "$STATE_FILE" ]; then
  echo "Creating initial reward state..."
  cat > "$STATE_FILE" << 'EOF'
{
  "version": "1.0",
  "lastUpdated": "",
  "drive": 0.5,
  "baseline": {
    "drive": 0.5
  },
  "seeking": [],
  "anticipating": [],
  "recentRewards": [],
  "rewardHistory": {
    "totalRewards": 0,
    "byType": {
      "accomplishment": 0,
      "social": 0,
      "curiosity": 0,
      "connection": 0,
      "creative": 0,
      "competence": 0
    }
  }
}
EOF
  echo "✅ Created $STATE_FILE"
else
  echo "✅ State file already exists"
fi

# 3. Make scripts executable
chmod +x "$SKILL_DIR/scripts/"*.sh
echo "✅ Scripts are executable"

# 4. Generate initial VTA_STATE.md
"$SKILL_DIR/scripts/sync-motivation.sh"

# 5. Set up OpenClaw cron if requested
if [ "$1" = "--with-cron" ]; then
  echo ""
  echo "Setting up OpenClaw cron jobs..."
  
  if ! command -v openclaw &> /dev/null; then
    echo "⚠️  'openclaw' not in PATH. Add these cron jobs manually:"
    echo ""
    echo "# Drive decay (every 8 hours)"
    echo "openclaw cron add --name vta-decay --cron '0 4,12,20 * * *' --session isolated --agent-turn '⭐ Run drive decay: Run $SKILL_DIR/scripts/decay-drive.sh and report new drive level'"
    echo ""
    echo "# Reward encoding (every 3 hours)"
    echo "openclaw cron add --name vta-encoding --cron '45 0,3,6,9,12,15,18,21 * * *' --session isolated --agent-turn 'Run VTA reward encoding. Preprocess signals, detect rewards, log them, sync state.'"
  else
    echo "   Creating vta-decay..."
    openclaw cron add --name vta-decay \
      --cron '0 4,12,20 * * *' \
      --session isolated \
      --agent-turn "⭐ Run drive decay: Run $SKILL_DIR/scripts/decay-drive.sh and report new drive level" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
    
    echo "   Creating vta-encoding..."
    openclaw cron add --name vta-encoding \
      --cron '45 0,3,6,9,12,15,18,21 * * *' \
      --session isolated \
      --agent-turn "Run VTA reward encoding: 1) Run preprocess-rewards.sh 2) Read encode-rewards.md 3) Log rewards found 4) Resolve fulfilled anticipations 5) Sync state 6) Update watermark" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⭐ vta-memory installed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Files created:"
echo "  • $STATE_FILE"
echo "  • $WORKSPACE/VTA_STATE.md (auto-injected)"
echo ""
echo "Usage:"
echo "  # Check motivation"
echo "  $SKILL_DIR/scripts/load-motivation.sh"
echo ""
echo "  # Log a reward"
echo "  $SKILL_DIR/scripts/log-reward.sh --type accomplishment --source \"finished task\""
echo ""
echo "  # Add anticipation"
echo "  $SKILL_DIR/scripts/anticipate.sh --add \"morning chat\""
echo ""

if [ "$1" != "--with-cron" ]; then
  echo "TIP: Run with --with-cron to set up automatic decay & encoding"
  echo "  ./install.sh --with-cron"
  echo ""
fi

# Regenerate brain dashboard
[ -x "$SKILL_DIR/scripts/generate-dashboard.sh" ] && "$SKILL_DIR/scripts/generate-dashboard.sh" 2>/dev/null || true

echo ""
echo "┌────────────────────────────────────────────────────────┐"
echo "│  ⭐ View your agent's DRIVE in the Brain Dashboard     │"
echo "│                                                        │"
echo "│  open ~/.openclaw/workspace/brain-dashboard.html       │"
echo "└────────────────────────────────────────────────────────┘"
echo ""
echo "Done! ⭐"
