#!/bin/bash
# Search hippocampus memories with importance-weighted scoring
# Combines keyword matching with importance scores
#
# Usage: recall.sh <query> [--top N] [--min-score 0.5]
#
# Note: Reinforcement happens automatically during encoding cron
#       when similar topics come up in conversation.
#
# Environment:
#   WORKSPACE - OpenClaw workspace directory (default: ~/.openclaw/workspace)

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
INDEX="$WORKSPACE/memory/index.json"

QUERY="$1"
TOP=5
MIN_SCORE=0.3

# Parse args
shift || true
while [ "$#" -gt 0 ]; do
    case "$1" in
        --top) TOP="$2"; shift 2 ;;
        --min-score) MIN_SCORE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

if [ -z "$QUERY" ]; then
    echo "Usage: recall.sh <query> [--top N] [--min-score 0.5]"
    echo ""
    echo "Examples:"
    echo "  recall.sh 'user preferences'"
    echo "  recall.sh 'project deadline' --top 10"
    echo "  recall.sh 'project' --min-score 0.5"
    exit 1
fi

if [ ! -f "$INDEX" ]; then
    echo "❌ index.json not found at $INDEX"
    exit 1
fi

python3 << PYTHON
import json
import re

INDEX_PATH = "$INDEX"
QUERY = "$QUERY".lower()
TOP = $TOP
MIN_SCORE = $MIN_SCORE

def keyword_score(mem, query_terms):
    """Calculate keyword match score (0-1)"""
    text = mem.get('content', mem.get('text', ''))
    searchable = (
        text.lower() + ' ' +
        ' '.join(mem.get('keywords', [])).lower() + ' ' +
        mem.get('domain', '') + ' ' +
        mem.get('category', '')
    )
    
    matches = sum(1 for term in query_terms if term in searchable)
    return matches / len(query_terms) if query_terms else 0

with open(INDEX_PATH, 'r') as f:
    data = json.load(f)

# Parse query into terms
query_terms = [t.strip() for t in QUERY.split() if len(t.strip()) > 2]

results = []
for mem in data.get('memories', []):
    kw_score = keyword_score(mem, query_terms)
    importance = mem['importance']
    
    # Combined score: 40% keyword match + 60% importance
    combined = (0.4 * kw_score) + (0.6 * importance)
    
    if kw_score > 0:  # Only include if there's some match
        results.append({
            'id': mem['id'],
            'content': mem.get('content', mem.get('text', '')),
            'importance': importance,
            'kw_score': kw_score,
            'combined': combined,
            'domain': mem.get('domain', ''),
            'category': mem.get('category', ''),
        })

# Sort by combined score
results.sort(key=lambda x: x['combined'], reverse=True)
results = [r for r in results if r['combined'] >= MIN_SCORE][:TOP]

if not results:
    print(f"No memories found for: {QUERY}")
else:
    print(f"🧠 Hippocampus Recall: '{QUERY}'")
    print(f"   (showing top {len(results)}, min_score={MIN_SCORE})")
    print("")
    
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['domain']}/{r['category']}] (score: {r['combined']:.2f}, imp: {r['importance']:.2f})")
        print(f"   {r['content']}")
        print(f"   ID: {r['id']}")
        print("")
PYTHON
