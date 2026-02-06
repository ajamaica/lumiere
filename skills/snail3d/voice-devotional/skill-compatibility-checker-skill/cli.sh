#!/bin/bash
# CLI wrapper for skill-compatibility-checker
# Makes it easy to invoke from command line or sub-agents

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$SCRIPT_DIR/scripts/checker.js"

# Make executable if not already
chmod +x "$CHECKER"

# Pass all arguments to checker
node "$CHECKER" "$@"
