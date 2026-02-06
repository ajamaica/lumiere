#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/prayer.sh "hail mary"
#   ./scripts/prayer.sh "glory be"
NAME=${1:-}
if [ -z "$NAME" ]; then
  echo "Usage: $0 <prayer name>" >&2
  exit 2
fi

REF_DIR="$(cd "$(dirname "$0")/.." && pwd)/references"
PR="$REF_DIR/prayers.md"

# Print the header block that matches the prayer name.
python3 - <<'PY'
import re,sys
name=sys.argv[1].strip().lower()
path=sys.argv[2]
text=open(path,'r',encoding='utf-8').read().splitlines()

# headers are like: ## Hail Mary
hits=[]
for i,line in enumerate(text):
  if line.startswith('## '):
    title=line[3:].strip().lower()
    if name in title:
      hits.append(i)

if not hits:
  print('Not found. Available prayers:')
  for line in text:
    if line.startswith('## '):
      print('-', line[3:].strip())
  sys.exit(0)

start=hits[0]
end=len(text)
for j in range(start+1,len(text)):
  if text[j].startswith('## '):
    end=j
    break

print('\n'.join(text[start:end]).strip())
PY
"$NAME" "$PR"