#!/bin/bash
# Resolve a DID on the public Archon network
#
# Usage: archon-resolve.sh <did>
# Example: archon-resolve.sh did:cid:bagaaiera...

if [ -z "$1" ]; then
  echo "Usage: $0 <did>"
  echo "Example: $0 did:cid:bagaaieratn3qejd6mr4y2bk3nliriafoyeftt74tkl7il6bbvakfdupahkla"
  exit 1
fi

DID="$1"

# Add did:cid: prefix if not present
if [[ ! "$DID" =~ ^did:cid: ]]; then
  DID="did:cid:$DID"
fi

echo "Resolving: $DID"
echo ""

RESULT=$(curl -s "https://archon.technology/api/v1/did/$DID")

# Check for errors
ERROR=$(echo "$RESULT" | jq -r '.didResolutionMetadata.error // empty')

if [ -n "$ERROR" ]; then
  echo "Error: $ERROR"
  exit 1
fi

# Pretty print result
echo "$RESULT" | jq '.'
