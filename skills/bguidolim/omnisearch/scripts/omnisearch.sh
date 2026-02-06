#!/bin/bash
# OmniSearch helper script
# Usage: ./omnisearch.sh <type> <query> [provider]
# Types: ai (Perplexity), web (Brave/Kagi/Tavily/Exa)

TYPE="$1"
QUERY="$2"
PROVIDER="${3:-perplexity}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <ai|web> <query> [provider]"
    exit 1
fi

if [ "$TYPE" = "ai" ]; then
    mcporter call omnisearch.ai_search query="$QUERY" provider="$PROVIDER"
else
    mcporter call omnisearch.web_search query="$QUERY" provider="$PROVIDER"
fi
