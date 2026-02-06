#!/usr/bin/env bash
# Example: Self-reflection routine
# Run after completing significant tasks or at end of session

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$SCRIPT_DIR/agentos.sh"

# Usage: ./self-reflection.sh "What I accomplished" "Challenges faced" "Key lesson"
ACCOMPLISHMENT="${1:-}"
CHALLENGES="${2:-}"
LESSON="${3:-}"

if [[ -z "$ACCOMPLISHMENT" ]]; then
  echo "Usage: $0 'accomplishment' 'challenges' 'lesson'"
  echo ""
  echo "Example:"
  echo "  $0 'Deployed API to production' 'CORS issues' 'Always test CORS locally first'"
  exit 1
fi

DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date -Iseconds)

echo "=== Recording Self-Reflection ==="

# Store the reflection
reflection=$(jq -n \
  --arg accomplishment "$ACCOMPLISHMENT" \
  --arg challenges "$CHALLENGES" \
  --arg lesson "$LESSON" \
  --arg timestamp "$TIMESTAMP" \
  '{
    accomplishment: $accomplishment,
    challenges: $challenges,
    lesson: $lesson,
    timestamp: $timestamp
  }')

AOS_SEARCHABLE=true
AOS_TAGS='["reflection","daily"]'
AOS_IMPORTANCE="0.6"
aos_put "/reflections/daily/$DATE" "$reflection"

echo "✓ Reflection stored"

# If there's a lesson, also store it separately
if [[ -n "$LESSON" ]]; then
  echo "✓ Storing lesson..."
  aos_learn "$LESSON" "daily"
fi

echo ""
echo "=== Reflection Complete ==="
