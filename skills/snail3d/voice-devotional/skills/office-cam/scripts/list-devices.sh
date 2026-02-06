#!/bin/bash
# List available video devices

echo "=== Available Video Devices ==="

if command -v imagesnap &> /dev/null; then
    echo ""
    echo "Using imagesnap:"
    imagesnap -l 2>/dev/null || echo "  (no devices found or imagesnap error)"
fi

if command -v ffmpeg &> /dev/null; then
    echo ""
    echo "Using ffmpeg avfoundation:"
    ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[avfoundation|AVFoundation" || echo "  (run 'ffmpeg -f avfoundation -list_devices true -i \"\"' manually to see devices)"
fi

echo ""
echo "=== Current Settings ==="
echo "WEBCAM_DEVICE: ${WEBCAM_DEVICE:-'(not set, using default)'}"
