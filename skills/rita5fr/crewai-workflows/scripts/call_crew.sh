#!/bin/bash
# CrewAI Workflow Caller
# Usage: ./call_crew.sh <crew_name> '<json_input>' [api_key]

set -e

CREW_NAME="$1"
INPUT_JSON="$2"
API_KEY="${3:-$CREWAI_API_KEY}"

if [ -z "$CREW_NAME" ]; then
  echo "Error: Crew name required"
  echo "Usage: $0 <crew_name> '<json_input>' [api_key]"
  echo ""
  echo "Available crews: marketing, support, analysis, social_media"
  echo ""
  echo "Examples:"
  echo "  $0 marketing '{\"topic\": \"sleep therapy\", \"target_audience\": \"professionals\"}'"
  echo "  $0 support '{\"issue\": \"Client wants refund\"}'"
  echo "  $0 analysis '{\"data_description\": \"Q4 revenue trends\"}'"
  echo "  $0 social_media '{\"industry\": \"wellness\", \"company_name\": \"Calm Studio\"}'"
  exit 1
fi

if [ -z "$INPUT_JSON" ]; then
  echo "Error: Input JSON required"
  echo "Usage: $0 <crew_name> '<json_input>' [api_key]"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: API key not found"
  echo "Set CREWAI_API_KEY environment variable or pass as third argument"
  exit 1
fi

# Set timeout based on crew type
if [ "$CREW_NAME" = "social_media" ]; then
  TIMEOUT=600  # 10 minutes for social media crew
else
  TIMEOUT=60   # 1 minute for other crews
fi

# Build request payload
PAYLOAD=$(jq -n --argjson input "$INPUT_JSON" '{input: $input}')

# Make the request
echo "🚀 Calling $CREW_NAME crew..."
echo ""

RESPONSE=$(curl -s --max-time "$TIMEOUT" \
  -X POST "https://crew.iclautomation.me/crews/$CREW_NAME/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$PAYLOAD")

# Check for errors
if echo "$RESPONSE" | jq -e '.error != null' >/dev/null 2>&1; then
  echo "❌ Error occurred:"
  echo "$RESPONSE" | jq -r '.error'
  exit 1
fi

# Extract and display result
if echo "$RESPONSE" | jq -e '.ok == true' >/dev/null 2>&1; then
  echo "✅ Success!"
  echo ""
  echo "📋 Trace ID: $(echo "$RESPONSE" | jq -r '.trace_id')"
  echo ""
  echo "📄 Output:"
  echo "─────────────────────────────────────────────────────────────"
  echo "$RESPONSE" | jq -r '.result.output'
  echo "─────────────────────────────────────────────────────────────"
  echo ""
  
  # Save full response to temp file for inspection
  TEMP_FILE="/tmp/crewai_response_$(date +%s).json"
  echo "$RESPONSE" | jq '.' > "$TEMP_FILE"
  echo "💾 Full response saved to: $TEMP_FILE"
else
  echo "❌ Unexpected response format:"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
