#!/usr/bin/env bash
#
# basic-caching.sh - Demonstrates basic LangCache workflow
#
# This example shows the cache-aside pattern:
# 1. Check cache for existing response
# 2. If miss, call LLM and store result
# 3. If hit, use cached response

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANGCACHE="${SCRIPT_DIR}/scripts/langcache.sh"

# Example prompt
PROMPT="What is semantic caching and why is it useful?"

echo "=== LangCache Basic Caching Example ==="
echo ""
echo "Prompt: ${PROMPT}"
echo ""

# Step 1: Search cache
echo "Step 1: Searching cache..."
CACHE_RESULT=$("$LANGCACHE" search "$PROMPT" --threshold 0.9 2>/dev/null || echo '{"hit": false}')

# Check if we got a hit
HIT=$(echo "$CACHE_RESULT" | jq -r '.hit // false')

if [[ "$HIT" == "true" ]]; then
    echo "Cache HIT!"
    echo ""
    SIMILARITY=$(echo "$CACHE_RESULT" | jq -r '.similarity')
    RESPONSE=$(echo "$CACHE_RESULT" | jq -r '.response')
    echo "Similarity: ${SIMILARITY}"
    echo "Response: ${RESPONSE}"
else
    echo "Cache MISS - would call LLM here"
    echo ""

    # Simulated LLM response (in real usage, call your LLM API)
    LLM_RESPONSE="Semantic caching stores LLM responses and returns them for semantically similar queries. It reduces API costs and latency by avoiding redundant LLM calls for questions that have already been answered."

    echo "LLM Response: ${LLM_RESPONSE}"
    echo ""

    # Step 2: Store in cache for future use
    echo "Step 2: Storing response in cache..."
    STORE_RESULT=$("$LANGCACHE" store "$PROMPT" "$LLM_RESPONSE" --attr "example=basic" 2>/dev/null || echo '{"error": "store failed"}')

    ENTRY_ID=$(echo "$STORE_RESULT" | jq -r '.entryId // "unknown"')
    echo "Stored with entry ID: ${ENTRY_ID}"
fi

echo ""
echo "=== Done ==="
