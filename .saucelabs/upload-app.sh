#!/usr/bin/env bash
#
# Upload an app binary to SauceLabs storage.
#
# Usage:
#   ./upload-app.sh <path-to-app> [custom-filename]
#
# Environment variables required:
#   SAUCE_USERNAME   - SauceLabs username
#   SAUCE_ACCESS_KEY - SauceLabs access key
#   SAUCE_REGION     - (optional) "us" or "eu", defaults to "us"
#
# Example:
#   SAUCE_USERNAME=user SAUCE_ACCESS_KEY=key ./upload-app.sh ./build/lumiere.ipa

set -euo pipefail

APP_PATH="${1:?Usage: upload-app.sh <path-to-app> [custom-filename]}"
FILENAME="${2:-$(basename "$APP_PATH")}"
REGION="${SAUCE_REGION:-us}"

if [ "$REGION" = "eu" ]; then
  API_BASE="https://api.eu-central-1.saucelabs.com"
else
  API_BASE="https://api.us-west-1.saucelabs.com"
fi

echo "Uploading $APP_PATH as $FILENAME to SauceLabs ($REGION)..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -u "$SAUCE_USERNAME:$SAUCE_ACCESS_KEY" \
  -X POST "$API_BASE/v1/storage/upload" \
  -F "payload=@$APP_PATH" \
  -F "name=$FILENAME" \
  -F "description=Lumiere app build")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Upload successful!"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "Upload failed with HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
