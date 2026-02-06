#!/bin/bash
# Qlik Cloud Apps List
# List apps with optional space filtering
#
# Usage: qlik-apps.sh [--space <personal|spaceId>] [--limit <n>]
#
# Examples:
#   qlik-apps.sh                           # List all accessible apps (default 50)
#   qlik-apps.sh --limit 100               # List 100 apps
#   qlik-apps.sh --space personal          # List apps in personal space
#   qlik-apps.sh --space abc-123-uuid      # List apps in specific space
#
# Note: Personal space is VIRTUAL in Qlik Cloud - requires /items API

set -euo pipefail

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LIMIT=50
SPACE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --space)
      SPACE="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    *)
      # Legacy: first positional arg is limit
      if [[ -z "$SPACE" ]] && [[ "$1" =~ ^[0-9]+$ ]]; then
        LIMIT="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "${QLIK_TENANT:-}" ]] || [[ -z "${QLIK_API_KEY:-}" ]]; then
  echo "{\"success\":false,\"error\":\"QLIK_TENANT and QLIK_API_KEY required\",\"timestamp\":\"$TIMESTAMP\"}"
  exit 1
fi

TENANT="${QLIK_TENANT%/}"
[[ "$TENANT" != http* ]] && TENANT="https://$TENANT"

# Choose API based on space parameter
if [[ -n "$SPACE" ]]; then
  # Use /items API for space filtering (personal or specific space)
  URL="${TENANT}/api/v1/items?resourceType=app&spaceId=${SPACE}&limit=${LIMIT}"
  
  curl -sL \
    -H "Authorization: Bearer ${QLIK_API_KEY}" \
    -H "Content-Type: application/json" \
    "$URL" | python3 -c "
import json
import sys

timestamp = '$TIMESTAMP'
space = '$SPACE'

try:
    data = json.load(sys.stdin)
    if 'errors' in data:
        print(json.dumps({'success': False, 'error': data['errors'][0].get('title', 'Unknown error'), 'timestamp': timestamp}, indent=2))
        sys.exit(1)
    
    apps = []
    for item in data.get('data', []):
        apps.append({
            'resourceId': item.get('resourceId'),
            'id': item.get('id'),
            'name': item.get('name'),
            'description': item.get('description', '')[:100] if item.get('description') else None,
            'spaceId': item.get('spaceId'),
            'ownerId': item.get('ownerId'),
            'updatedAt': item.get('updatedAt'),
            'createdAt': item.get('createdAt')
        })
    
    space_label = 'personal space' if space == 'personal' else f'space {space}'
    print(json.dumps({
        'success': True, 
        'space': space,
        'apps': apps, 
        'totalCount': len(apps), 
        'timestamp': timestamp
    }, indent=2))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e), 'timestamp': timestamp}, indent=2))
    sys.exit(1)
"
else
  # Use /apps API for all apps (no space filter)
  curl -sL \
    -H "Authorization: Bearer ${QLIK_API_KEY}" \
    -H "Content-Type: application/json" \
    "${TENANT}/api/v1/apps?limit=${LIMIT}" | python3 -c "
import json
import sys

timestamp = '$TIMESTAMP'

try:
    data = json.load(sys.stdin)
    if 'errors' in data:
        print(json.dumps({'success': False, 'error': data['errors'][0].get('title', 'Unknown error'), 'timestamp': timestamp}, indent=2))
        sys.exit(1)
    
    apps = []
    for item in data.get('data', []):
        attrs = item.get('attributes', item)
        apps.append({
            'resourceId': attrs.get('id'),
            'name': attrs.get('name'),
            'description': attrs.get('description', '')[:100] if attrs.get('description') else None,
            'spaceId': attrs.get('spaceId'),
            'published': attrs.get('published'),
            'lastReloadTime': attrs.get('lastReloadTime'),
            'modified': attrs.get('modifiedDate')
        })
    
    print(json.dumps({'success': True, 'apps': apps, 'totalCount': len(apps), 'timestamp': timestamp}, indent=2))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e), 'timestamp': timestamp}, indent=2))
    sys.exit(1)
"
fi
