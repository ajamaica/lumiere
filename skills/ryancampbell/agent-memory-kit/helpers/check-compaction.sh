#!/usr/bin/env bash
# check-compaction.sh
# Quick helper to check if you're approaching compaction limits
# Usage: bash helpers/check-compaction.sh

set -e

# Default threshold (80% of 200K)
THRESHOLD=${COMPACTION_THRESHOLD:-160000}

echo "🧠 Checking context usage..."

# Get current token usage from openclaw status
# This is a placeholder - actual implementation depends on how openclaw exposes token count
# You might need to use: openclaw status --json | jq '.tokens.total'
# Or check environment variables, or use a different method

# For now, provide manual instructions:
echo ""
echo "To check your current token usage:"
echo "  1. Run: /status (in your OpenClaw session)"
echo "  2. Look for token count in the response"
echo ""
echo "⚠️  If you're over ${THRESHOLD} tokens:"
echo "    → Trigger a pre-compaction flush"
echo "    → Update memory/context-snapshot.md"
echo "    → Log recent events to today's daily log"
echo "    → Document any new procedures"
echo ""
echo "📚 See: skills/agent-memory-kit/templates/compaction-survival.md"
echo ""
