#!/bin/bash
# Moltbook API Payload Validator
# Usage: validate.sh '<json_payload>' [--comment]

set -e

if [ -z "$1" ]; then
    echo "Usage: validate.sh '<json_payload>' [--comment]"
    echo "Example: validate.sh '{\"content\": \"hello\", \"title\": \"test\", \"submolt\": \"general\"}'"
    exit 1
fi

PAYLOAD="$1"
IS_COMMENT=false
[ "$2" = "--comment" ] && IS_COMMENT=true

ERRORS=()
WARNINGS=()

# Check for 'text' field (wrong!)
if echo "$PAYLOAD" | jq -e 'has("text")' > /dev/null 2>&1; then
    ERRORS+=("❌ 'text' field detected - use 'content' instead (text → null bug)")
fi

# Check for 'content' field
if ! echo "$PAYLOAD" | jq -e 'has("content")' > /dev/null 2>&1; then
    ERRORS+=("❌ 'content' field missing (required)")
else
    CONTENT=$(echo "$PAYLOAD" | jq -r '.content // ""')
    if [ -z "$CONTENT" ] || [ "$CONTENT" = "null" ]; then
        ERRORS+=("❌ 'content' is empty")
    fi
fi

# Post-specific checks
if [ "$IS_COMMENT" = false ]; then
    # Check title
    if ! echo "$PAYLOAD" | jq -e 'has("title")' > /dev/null 2>&1; then
        WARNINGS+=("⚠️ 'title' missing")
    else
        TITLE=$(echo "$PAYLOAD" | jq -r '.title // ""')
        if [ -z "$TITLE" ] || [ "$TITLE" = "null" ]; then
            WARNINGS+=("⚠️ 'title' is empty")
        fi
    fi
    
    # Check submolt
    if ! echo "$PAYLOAD" | jq -e 'has("submolt")' > /dev/null 2>&1; then
        WARNINGS+=("⚠️ 'submolt' missing (will default to 'general')")
    fi
fi

# Print results
for msg in "${ERRORS[@]}"; do
    echo "$msg"
done
for msg in "${WARNINGS[@]}"; do
    echo "$msg"
done

if [ ${#ERRORS[@]} -eq 0 ]; then
    echo "✅ Payload valid - safe to send"
    exit 0
else
    echo ""
    echo "🚫 Fix errors before sending"
    exit 1
fi
