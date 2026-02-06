#!/bin/bash
# Qlik Cloud Insight Advisor (Natural Language Query)
# Ask questions about your data in natural language - returns actual data!
# Works with any language - auto-handles Qlik API requirements internally
# Usage: qlik-insight.sh "question" [app-id]

set -euo pipefail

QUESTION="${1:-}"
APP_ID="${2:-}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [[ -z "${QLIK_TENANT:-}" ]] || [[ -z "${QLIK_API_KEY:-}" ]]; then
  echo "{\"success\":false,\"error\":\"QLIK_TENANT and QLIK_API_KEY required\",\"timestamp\":\"$TIMESTAMP\"}"
  exit 1
fi

if [[ -z "$QUESTION" ]]; then
  echo "{\"success\":false,\"error\":\"Question required. Usage: qlik-insight.sh \\\"question\\\" [app-id]\",\"timestamp\":\"$TIMESTAMP\"}"
  exit 1
fi

TENANT="${QLIK_TENANT%/}"
[[ "$TENANT" != http* ]] && TENANT="https://$TENANT"

# Function to query Insight Advisor
query_insight() {
  local q="$1"
  local aid="$2"
  
  local body
  body=$(printf '%s' "$q" | python3 -c "
import json
import sys
question = sys.stdin.read()
body = {
    'text': question,
    'enableVisualizations': True,
    'visualizationOptions': {'includeCellData': True}
}
app_id = '$aid'
if app_id:
    body['app'] = {'id': app_id}
print(json.dumps(body))
")

  curl -sL -X POST \
    -H "Authorization: Bearer ${QLIK_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "${TENANT}/api/v1/questions/actions/ask"
}

# Query with original question
RESPONSE=$(query_insight "$QUESTION" "$APP_ID")

# Process response - extract data intelligently
echo "$RESPONSE" | QUESTION="$QUESTION" APP_ID="$APP_ID" TIMESTAMP="$TIMESTAMP" python3 -c "
import json
import sys
import os
import re

question = os.environ.get('QUESTION', '')
app_id = os.environ.get('APP_ID', '')
timestamp = os.environ.get('TIMESTAMP', '')

def has_non_ascii(s):
    return bool(re.search(r'[^\x00-\x7F]', s))

def extract_result(data, original_question):
    '''Extract best possible result from Qlik response'''
    result = {
        'success': True,
        'question': original_question,
        'timestamp': timestamp
    }
    
    if 'errors' in data:
        return {'success': False, 'error': data['errors'][0].get('title', 'Unknown error'), 'timestamp': timestamp}
    
    if 'conversationalResponse' not in data:
        return {'success': False, 'error': 'No response from Insight Advisor', 'timestamp': timestamp}
    
    resp = data['conversationalResponse']
    has_narrative = False
    has_data = False
    
    # Extract from responses
    for r in resp.get('responses', []):
        # Get narrative (the actual answer)
        if 'narrative' in r:
            narr = r['narrative']
            text = narr.get('text', '') if isinstance(narr, dict) else str(narr)
            if text and text.strip():
                result['narrative'] = text
                has_narrative = True
        
        # Extract data from qHyperCube
        if 'renderVisualization' in r:
            viz = r['renderVisualization']
            qdata = viz.get('data', {})
            cube = qdata.get('qHyperCube', {})
            
            dims = [d.get('qFallbackTitle') for d in cube.get('qDimensionInfo', []) if d.get('qFallbackTitle')]
            measures = [m.get('qFallbackTitle') for m in cube.get('qMeasureInfo', []) if m.get('qFallbackTitle')]
            
            rows = []
            for page in cube.get('qDataPages', []):
                for row in page.get('qMatrix', [])[:50]:  # Up to 50 rows
                    row_data = []
                    for cell in row:
                        val = cell.get('qText') or cell.get('qNum')
                        if val is not None:
                            row_data.append(val)
                    if row_data:
                        rows.append(row_data)
            
            if dims or measures or rows:
                result['data'] = {
                    'dimensions': dims,
                    'measures': measures,
                    'rows': rows[:20],  # Return top 20
                    'totalRows': len(rows)
                }
                has_data = True
    
    # App info
    if resp.get('apps'):
        result['app'] = {
            'id': resp['apps'][0].get('id'),
            'name': resp['apps'][0].get('name')
        }
    
    # Recommendations for follow-up
    if resp.get('recommendations'):
        result['recommendations'] = [
            {'name': rec.get('name'), 'id': rec.get('recId')}
            for rec in resp['recommendations'][:5]
        ]
    
    # Drill-down link (always useful)
    if resp.get('drillDownURI'):
        result['drillDownLink'] = resp['drillDownURI']
    
    # If no narrative but have drill-down, provide guidance
    if not has_narrative and not has_data:
        if resp.get('drillDownURI'):
            result['hint'] = 'Try rephrasing your question or use the drill-down link to explore interactively'
        else:
            result['hint'] = 'Question not understood. Try simpler phrasing like: \"total sales\", \"count by region\"'
    
    return result

try:
    data = json.load(sys.stdin)
    result = extract_result(data, question)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e), 'timestamp': timestamp}, indent=2))
    sys.exit(1)
"
