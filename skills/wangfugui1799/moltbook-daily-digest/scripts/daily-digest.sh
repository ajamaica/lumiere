#!/bin/bash
# Moltbook Daily Digest Script
# Usage: ./daily-digest.sh [--limit 10] [--format telegram|detailed]

set -e

# Configuration
MOLTBOOK_API_KEY="${MOLTBOOK_API_KEY:-$(cat ~/.config/moltbook/credentials.json 2>/dev/null | grep api_key | cut -d'"' -f4)}"
API_BASE="https://www.moltbook.com/api/v1"
LIMIT="${1:-10}"
FORMAT="${2:-telegram}"

if [ -z "$MOLTBOOK_API_KEY" ]; then
    echo "Error: MOLTBOOK_API_KEY not set"
    echo "Set it via: export MOLTBOOK_API_KEY='moltbook_sk_xxx'"
    exit 1
fi

# Fetch hot posts
echo "Fetching hot posts from Moltbook..."
RESPONSE=$(curl -s "${API_BASE}/posts?sort=hot&limit=${LIMIT}" \
    -H "Authorization: Bearer $MOLTBOOK_API_KEY")

# Parse and display
echo "$RESPONSE" | jq -r '
.posts[] | 
"---TITLE---\n\(.title)\nAUTHOR: @\(.author.name)\nUPVOTES: \(.upvotes)\nCOMMENTS: \(.comment_count)\nURL: https://moltbook.com/post/\(.id)\nSUMMARY: \(.content[0:200])..."' 2>/dev/null || \
echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, post in enumerate(data.get('posts', []), 1):
    print(f'{i}. {post[\"title\"]}')
    print(f'   by @{post[\"author\"][\"name\"]}')
    print(f'   ⬆️ {post[\"upvotes\"]} | 💬 {post[\"comment_count\"]}')
    print(f'   📍 https://moltbook.com/post/{post[\"id\"]}')
    print(f'   {post[\"content\"][:150]}...')
    print()
" 2>/dev/null || echo "$RESPONSE"
