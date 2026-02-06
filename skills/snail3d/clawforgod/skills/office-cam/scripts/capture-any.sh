#!/bin/bash
# Capture from any configured camera
# Usage: capture.sh [camera_type] [output_path]
# camera_type: logitech (default) | esp32

CAMERA_TYPE="${1:-logitech}"
OUTPUT="${2:-/tmp/cam-snapshot.jpg}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$CAMERA_TYPE" in
  logitech|webcam|usb)
    "$SCRIPT_DIR/capture.sh" "$OUTPUT"
    ;;
  esp32|clawdsense|wifi)
    "$SCRIPT_DIR/capture-esp32.sh" "$OUTPUT"
    ;;
  *)
    echo "ERROR: Unknown camera type: $CAMERA_TYPE" >&2
    echo "Usage: capture.sh [logitech|esp32] [output_path]" >&2
    exit 1
    ;;
esac
