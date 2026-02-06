#!/bin/bash
# Motion Detection for USB Webcam
# Uses imagesnap + imagemagick compare

CAPTURE_DIR="$HOME/.clawdbot/motion-captures"
THRESHOLD=10  # Percent difference to trigger
COOLDOWN=5    # Seconds between captures

mkdir -p "$CAPTURE_DIR"

echo "🎥 Motion detection started"
echo "📁 Captures: $CAPTURE_DIR"
echo "🚪 Press Ctrl+C to stop"
echo ""

# Reference frame
REF_FRAME="/tmp/motion-ref.jpg"
imagesnap -q "$REF_FRAME"

if [ ! -f "$REF_FRAME" ]; then
    echo "ERROR: Could not capture from webcam"
    echo "Check: System Settings → Privacy → Camera"
    exit 1
fi

echo "Reference frame captured. Waiting for motion..."

LAST_CAPTURE=0
MOTION_COUNT=0

while true; do
    sleep 0.5
    
    # Capture new frame
    NEW_FRAME="/tmp/motion-new.jpg"
    imagesnap -q "$NEW_FRAME" 2>/dev/null
    
    if [ ! -f "$NEW_FRAME" ]; then
        continue
    fi
    
    # Compare frames using imagemagick
    if command -v compare >/dev/null 2>&1; then
        DIFF=$(compare -metric RMSE "$REF_FRAME" "$NEW_FRAME" null: 2>&1 | awk '{print $1}')
        DIFF_INT=${DIFF%.*}
        
        # Threshold check (RMSE > 1000 indicates motion)
        if [ "$DIFF_INT" -gt 1000 ]; then
            NOW=$(date +%s)
            ELAPSED=$((NOW - LAST_CAPTURE))
            
            if [ $ELAPSED -gt $COOLDOWN ]; then
                TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
                OUTPUT="$CAPTURE_DIR/motion_$TIMESTAMP.jpg"
                cp "$NEW_FRAME" "$OUTPUT"
                SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
                echo "📸 MOTION DETECTED! (diff: $DIFF_INT)"
                echo "   Saved: $OUTPUT ($SIZE)"
                LAST_CAPTURE=$NOW
                ((MOTION_COUNT++))
            else
                REMAIN=$((COOLDOWN - ELAPSED))
                echo "⏳ Motion detected (cooldown: ${REMAIN}s)"
            fi
        fi
    fi
    
    # Update reference
    mv "$NEW_FRAME" "$REF_FRAME"

done

echo ""
echo "✅ Stopped. $MOTION_COUNT motion events."
echo "📁 Captures in: $CAPTURE_DIR"
