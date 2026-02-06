#!/bin/bash
# Wyze Camera RTSP Capture
# Usage: capture-wyze.sh [output_path] [rtsp_url]

OUTPUT="${1:-/tmp/wyze-capture.jpg}"
RTSP_URL="${2:-${WYZE_RTSP_URL:-"rtsp://192.168.1.XXX/live"}}"

echo "Capturing from Wyze camera..."
echo "RTSP: $RTSP_URL"

# Use ffmpeg to grab a single frame from RTSP stream
ffmpeg -y -i "$RTSP_URL" -ss 00:00:01 -vframes 1 -q:v 2 "$OUTPUT" 2>/dev/null

if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    echo "Captured: $OUTPUT"
    ls -lh "$OUTPUT"
    exit 0
else
    echo "ERROR: Failed to capture from Wyze camera"
    echo "Make sure:"
    echo "1. Wyze app has RTSP enabled (Advanced Settings → RTSP)"
    echo "2. Camera is on same WiFi network"
    echo "3. RTSP URL is correct (check Wyze app for the URL)"
    exit 1
fi
