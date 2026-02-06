#!/bin/bash
# SearXNG Search Tool for OpenClaw
# Usage: searxng_search <query> [options]
#
# Configure SEARXNG_URL environment variable:
#   export SEARXNG_URL="http://your-searxng-instance:port"

set -e

# Check if SEARXNG_URL is set
if [ -z "$SEARXNG_URL" ]; then
    cat << 'EOF'
Error: SEARXNG_URL environment variable not set.

Please set your SearXNG instance URL:
    export SEARXNG_URL="http://your-searxng-instance:port"

Usage: searxng_search <query> [options]

Options:
  --limit N      Limit results to N (default: 10)
  --json         Output raw JSON
  --format       Output format: text (default), json, or markdown

Examples:
  searxng_search "OpenClaw tutorial"
  searxng_search "docker compose" --limit 5
  searxng_search "kubernetes" --format markdown
EOF
    exit 1
fi

QUERY="$1"
shift

# Default values
LIMIT=10
FORMAT="text"
RAW_JSON=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --json)
            RAW_JSON=true
            shift
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# URL encode the query
ENCODED_QUERY=$(printf '%s' "$QUERY" | jq -sRr @uri)

# Perform search
RESPONSE=$(curl -s "${SEARXNG_URL}/search?q=${ENCODED_QUERY}&format=json")

if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to SearXNG at $SEARXNG_URL"
    exit 1
fi

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq -e . > /dev/null 2>&1; then
    echo "Error: Invalid response from SearXNG"
    exit 1
fi

# Output raw JSON if requested
if [ "$RAW_JSON" = true ]; then
    echo "$RESPONSE"
    exit 0
fi

# Format output based on requested format
case "$FORMAT" in
    json)
        echo "$RESPONSE" | jq --arg limit "$LIMIT" '{query, number_of_results, results: .results[:($limit | tonumber)]}'
        ;;
    markdown)
        echo "# Search Results for: $QUERY"
        echo ""
        echo "$RESPONSE" | jq -r --arg limit "$LIMIT" '
            .results[:($limit | tonumber)] | 
            to_entries | 
            .[] | 
            "## \((.key + 1)). \(.value.title)\n" +
            "**URL:** \(.value.url)\n\n" +
            "\(.value.content)\n\n" +
            "*Source: \(.value.engine)*\n---\n"
        '
        ;;
    text|*)
        echo "Search Results for: $QUERY"
        echo "================================"
        echo ""
        echo "$RESPONSE" | jq -r --arg limit "$LIMIT" '
            .results[:($limit | tonumber)] | 
            to_entries | 
            .[] | 
            "\((.key + 1)). \(.value.title)\n" +
            "   URL: \(.value.url)\n" +
            "   Content: \(.value.content)\n" +
            "   Source: \(.value.engine)\n"
        '
        ;;
esac
