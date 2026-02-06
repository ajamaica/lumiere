#!/bin/bash
# Wrapper for Bankr skill
# Looks for bankr.sh in common locations

set -e

# Find bankr.sh
BANKR_SCRIPT=""
POSSIBLE_PATHS=(
    "$HOME/.clawdbot/skills/bankr/scripts/bankr.sh"
    "$HOME/clawd/skills/bankr/scripts/bankr.sh"
    "$(dirname "$0")/../../bankr/scripts/bankr.sh"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -x "$path" ]; then
        BANKR_SCRIPT="$path"
        break
    fi
done

if [ -z "$BANKR_SCRIPT" ]; then
    echo "Error: Bankr skill not found. Install it first:"
    echo "  clawdhub install bankr"
    exit 1
fi

exec "$BANKR_SCRIPT" "$@"
