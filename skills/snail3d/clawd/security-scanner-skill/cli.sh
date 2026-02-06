#!/bin/bash
# CLI wrapper for security-scanner skill
# Makes it easy to invoke from command line or sub-agents

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER="$SCRIPT_DIR/scripts/scanner.js"

# Pass all arguments to scanner
node "$SCANNER" "$@"
