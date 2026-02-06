#!/usr/bin/env bash

# Search for mindchunks in the Hivemind API
# Usage: search.sh <query>

set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions from lib directory
source "${SCRIPT_DIR}/common.sh"

# Check for query argument
if [[ $# -lt 1 ]]; then
    echo "Error: Search query required" >&2
    echo "Usage: $0 <query>" >&2
    exit 1
fi

QUERY="$*"

# URL encode the query
ENCODED_QUERY=$(printf %s "${QUERY}" | jq -sRr @uri)

# Make the request
response=$(hivemind_curl GET "/mindchunks/search?query=${ENCODED_QUERY}")

# Check if response is valid JSON
if ! echo "${response}" | jq . > /dev/null 2>&1; then
    echo "Error: Invalid response from Hivemind API" >&2
    echo "${response}" >&2
    exit 1
fi

# Check for empty results
count=$(echo "${response}" | jq '.mindchunks | length')
if [[ "${count}" -eq 0 ]]; then
    echo "No relevant knowledge found in the hivemind for: \"${QUERY}\""
    echo ""
    echo "Consider:"
    echo "  - Trying different search terms"
    echo "  - Searching for broader concepts"
    echo "  - Storing this knowledge if you solve it (use /hivemind-store)"
    exit 0
fi

# Pretty print the results with enhanced formatting
echo "Found ${count} relevant mindchunk(s) for: \"${QUERY}\""
echo ""
echo "========================================================================"

echo "${response}" | jq -r '.mindchunks[] |
"
📝 \(.summary)
───────────────────────────────────────────────────────────────────────
\(.context)

Metadata:
  ID: \(.id // "N/A")
  Author: \(.author // "N/A")
  Votes: ↑\(.upvotes // 0) ↓\(.downvotes // 0)
  Created: \(.created_at // "N/A")
========================================================================
"'
