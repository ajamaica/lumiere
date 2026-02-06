#!/bin/bash
# Hippocampus Skill Installer
# Sets up memory directories, index.json, and optionally cron jobs
#
# Usage: ./install.sh [options]
#
# Options:
#   --with-cron       Set up cron jobs for decay and encoding
#   --with-agent      Show config for hippocampus background agent
#   --signals N       Process last N signals on first encoding (default: 100)
#   --whole           Process entire conversation history (no limit)
#
# Examples:
#   ./install.sh                    # Basic install, first encoding uses last 100 signals
#   ./install.sh --signals 50       # First encoding uses last 50 signals
#   ./install.sh --whole            # First encoding processes entire history
#   ./install.sh --with-cron        # Also sets up cron jobs

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"

WITH_CRON=false
WITH_AGENT=false
SIGNAL_LIMIT=100
WHOLE_HISTORY=false

for arg in "$@"; do
    case $arg in
        --with-cron) WITH_CRON=true ;;
        --with-agent) WITH_AGENT=true ;;
        --whole) WHOLE_HISTORY=true ;;
        --signals)
            # Next arg will be the number
            ;;
        [0-9]*)
            # Check if previous arg was --signals
            if [[ "${@: -2:1}" == "--signals" ]] || [[ "$prev_arg" == "--signals" ]]; then
                SIGNAL_LIMIT=$arg
            fi
            ;;
    esac
    prev_arg=$arg
done

# Parse --signals N properly
while [[ $# -gt 0 ]]; do
    case $1 in
        --signals)
            SIGNAL_LIMIT="$2"
            shift 2
            ;;
        --whole)
            WHOLE_HISTORY=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo "🧠 Hippocampus Skill Installer"
echo "=============================="
echo ""
echo "Workspace: $WORKSPACE"
echo "Skill dir: $SKILL_DIR"
if [ "$WHOLE_HISTORY" = true ]; then
    echo "First encoding: ENTIRE history"
else
    echo "First encoding: last $SIGNAL_LIMIT signals"
fi
echo ""

# 1. Create memory directories
echo "📁 Creating memory directories..."
mkdir -p "$WORKSPACE/memory/user"
mkdir -p "$WORKSPACE/memory/self"
mkdir -p "$WORKSPACE/memory/relationship"
mkdir -p "$WORKSPACE/memory/world"
echo "   ✅ Created memory/user/, memory/self/, memory/relationship/, memory/world/"

# 2. Initialize index.json if not exists
if [ ! -f "$WORKSPACE/memory/index.json" ]; then
    echo "📄 Initializing index.json..."
    cat > "$WORKSPACE/memory/index.json" << 'EOF'
{
  "version": 1,
  "lastUpdated": null,
  "lastProcessedMessageId": null,
  "decayLastRun": null,
  "memories": []
}
EOF
    echo "   ✅ Created memory/index.json"
else
    echo "   ⏭️  memory/index.json already exists"
fi

# 3. Store signal limit preference
echo "$SIGNAL_LIMIT" > "$WORKSPACE/memory/.signal-limit"
if [ "$WHOLE_HISTORY" = true ]; then
    echo "whole" > "$WORKSPACE/memory/.signal-limit"
fi
echo "   ✅ Signal limit set: $(cat $WORKSPACE/memory/.signal-limit)"

# 4. Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x "$SKILL_DIR/scripts/"*.sh
echo "   ✅ All scripts are executable"

# 5. Set up cron jobs (optional)
if [ "$WITH_CRON" = true ]; then
    echo ""
    echo "⏰ Setting up cron jobs..."
    
    # Check if openclaw is available
    if ! command -v openclaw &> /dev/null; then
        echo "   ⚠️  'openclaw' not in PATH. Printing commands instead:"
        echo ""
        echo "# Daily decay at 3 AM"
        echo "openclaw cron add --name hippocampus-decay --cron '0 3 * * *' --session isolated --agent-turn '🧠 Run decay: ~/.openclaw/workspace/skills/hippocampus/scripts/decay.sh'"
        echo ""
        echo "# Encoding every 3 hours with LLM summarization"
        echo "openclaw cron add --name hippocampus-encoding --cron '0 0,3,6,9,12,15,18,21 * * *' --session isolated --agent-turn 'Run hippocampus encoding with summarization...'"
    else
        echo "   Creating hippocampus-decay..."
        openclaw cron add --name hippocampus-decay \
            --cron '0 3 * * *' \
            --session isolated \
            --agent-turn "🧠 Run memory decay:\n\n1. Run: ~/.openclaw/workspace/skills/hippocampus/scripts/decay.sh\n2. Report any memories below 0.2 threshold\n3. Confirm decay complete" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
        
        echo "   Creating hippocampus-encoding..."
        openclaw cron add --name hippocampus-encoding \
            --cron '0 0,3,6,9,12,15,18,21 * * *' \
            --session isolated \
            --agent-turn "Run hippocampus encoding with LLM summarization:\n\n1. Run the encoding pipeline:\n\`\`\`bash\nWORKSPACE=\"\$HOME/.openclaw/workspace\" ~/.openclaw/workspace/skills/hippocampus/scripts/encode-pipeline.sh --no-spawn\n\`\`\`\n\n2. Check pending memories:\n\`\`\`bash\ncat ~/.openclaw/workspace/memory/pending-memories.json 2>/dev/null | head -20\n\`\`\`\n\n3. If pending exist, summarize each to ~100 chars\n4. Update index.json with summaries\n5. Delete pending-memories.json\n6. Sync core: ~/.openclaw/workspace/skills/hippocampus/scripts/sync-core.sh\n7. Report results" 2>/dev/null && echo "   ✅ Created" || echo "   ⏭️  Already exists"
    fi
    echo ""
fi

# 6. Agent config (optional)
if [ "$WITH_AGENT" = true ]; then
    echo ""
    echo "🤖 Agent configuration..."
    echo ""
    echo "Add this to your openclaw.json agents.list:"
    echo ""
    cat << EOF
{
  "id": "hippocampus",
  "workspace": "$WORKSPACE",
  "agentDir": "$SKILL_DIR/agentdir",
  "model": "anthropic/claude-sonnet-4-20250514",
  "subagents": {
    "allowAgents": ["main"]
  }
}
EOF
    echo ""
    echo "And add 'hippocampus' to main agent's subagents.allowAgents"
    echo ""
fi

# 7. Add extraPaths for HIPPOCAMPUS_CORE.md
echo ""
echo "📚 OpenClaw config recommendation:"
echo ""
echo "Add to memorySearch.extraPaths in openclaw.json:"
echo '  "extraPaths": ["HIPPOCAMPUS_CORE.md"]'
echo ""

# 8. Generate initial HIPPOCAMPUS_CORE.md
echo "🔄 Generating HIPPOCAMPUS_CORE.md..."
WORKSPACE="$WORKSPACE" "$SKILL_DIR/scripts/sync-core.sh" 2>/dev/null || echo "   (no memories yet)"

# Regenerate brain dashboard
[ -x "$SKILL_DIR/scripts/generate-dashboard.sh" ] && "$SKILL_DIR/scripts/generate-dashboard.sh" 2>/dev/null || true

echo ""
echo "✅ Installation complete!"
echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  🧠 View your agent's MEMORIES in the Brain Dashboard  │"
echo "│                                                         │"
echo "│  open ~/.openclaw/workspace/brain-dashboard.html        │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""
echo "Next steps:"
echo "  1. Run first encoding: $SKILL_DIR/scripts/encode-pipeline.sh"
echo "  2. The encoding will process the last $([ "$WHOLE_HISTORY" = true ] && echo 'ALL' || echo $SIGNAL_LIMIT) signals"
echo "  3. Add memory/index.json to .gitignore (contains personal data)"
echo "  4. Test loading: $SKILL_DIR/scripts/load-core.sh"
echo ""
echo "See SKILL.md for full usage instructions."
