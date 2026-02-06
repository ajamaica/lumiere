#!/bin/bash
# Capture an image from the default webcam (Logitech)
# Usage: capture.sh [output_path]

OUTPUT="${1:-/tmp/office-cam-snapshot.jpg}"
DEVICE="${WEBCAM_DEVICE:-""}"

# Try imagesnap first (simpler, macOS native)
if command -v imagesnap &> /dev/null; then
    if [ -n "$DEVICE" ]; then
        imagesnap -d "$DEVICE" "$OUTPUT" 2>/dev/null
    else
        # Capture from default camera
        imagesnap "$OUTPUT" 2>/dev/null
    fi
    
    if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
        echo "$OUTPUT"
        exit 0
    fi
fi

# Fallback to ffmpeg with avfoundation
if command -v ffmpeg &> /dev/null; then
    # List devices: ffmpeg -f avfoundation -list_devices true -i ""
    # Default device is usually 0 for video
    ffmpeg -f avfoundation -video_size 1280x720 -framerate 30 -i "0" -frames:v 1 -q:v 2 "$OUTPUT" -y 2>/dev/null
    
    if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
        echo "$OUTPUT"
        exit 0
    fi
fi

echo "ERROR: Failed to capture image. Install imagesnap (brew install imagesnap) or ffmpeg." >&2
exit 1
