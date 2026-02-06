#!/bin/bash
# Capture image from ClawdSense ESP32 HTTP camera
# Usage: capture-esp32.sh [output_path] [esp32_ip]

OUTPUT="${1:-/tmp/esp32-cam-snapshot.jpg}"
ESP32_IP="${2:-${ESP32_IP:-"192.168.1.16"}}"
ENDPOINT="http://${ESP32_IP}/capture"

echo "Fetching from ${ENDPOINT}..."

# Download the image
curl -s -o "$OUTPUT" "$ENDPOINT" --max-time 10

if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
    # Check if it's a valid JPEG (starts with JPEG magic bytes)
    if head -c 2 "$OUTPUT" | xxd -p | grep -q "ffd8"; then
        echo "$OUTPUT"
        exit 0
    else
        echo "ERROR: Invalid JPEG response" >&2
        cat "$OUTPUT" >&2
        rm -f "$OUTPUT"
        exit 1
    fi
else
    echo "ERROR: Failed to capture from ESP32 at ${ESP32_IP}" >&2
    echo "Make sure the device is online and the firmware is running." >&2
    exit 1
fi
