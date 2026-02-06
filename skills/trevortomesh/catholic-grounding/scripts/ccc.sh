#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/ccc.sh "eucharist"
TOPIC=${1:-}
if [ -z "$TOPIC" ]; then
  echo "Usage: $0 <topic>" >&2
  exit 2
fi

MAP_DIR="$(cd "$(dirname "$0")/.." && pwd)/references"
MAP="$MAP_DIR/ccc-topic-map.md"

# crude lookup: show matching lines and nearby headings
# (keeps it simple and fully local)
perl -0777 -ne 'print $_' "$MAP" | \
  awk -v q="${TOPIC}" 'BEGIN{IGNORECASE=1} {print}' | \
  grep -n -i --color=always -E "${TOPIC}|##" || true

echo "\nTip: Open $MAP for the full topic map."