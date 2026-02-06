#!/bin/bash
# Generate image with Nano Banana Pro + automatic WhatsApp HD optimization
# Usage: ./generate_whatsapp_hd.sh --prompt "your prompt" --filename output.jpg [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_PNG="/tmp/nano-banana-temp-$$.png"

# Parse args to extract filename
FILENAME=""
ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --filename|-f)
            FILENAME="$2"
            shift 2
            ;;
        *)
            ARGS+=("$1")
            shift
            ;;
    esac
done

if [[ -z "$FILENAME" ]]; then
    echo "Error: --filename required" >&2
    exit 1
fi

# Generate with temp PNG name
python3 "$SCRIPT_DIR/generate_image.py" "${ARGS[@]}" --filename "$TEMP_PNG"

# Check if output should be JPEG
if [[ "$FILENAME" == *.jpg ]] || [[ "$FILENAME" == *.jpeg ]]; then
    echo "Converting to progressive JPEG for WhatsApp HD..." >&2
    
    # Get original size
    ORIGINAL_SIZE=$(stat -f%z "$TEMP_PNG" 2>/dev/null || stat -c%s "$TEMP_PNG")
    ORIGINAL_MB=$(echo "scale=2; $ORIGINAL_SIZE / 1048576" | bc)
    
    echo "Original PNG: ${ORIGINAL_MB}MB" >&2
    
    # Convert to progressive JPEG with quality optimization
    # Target: < 6MB for WhatsApp HD
    if (( $(echo "$ORIGINAL_MB > 6.0" | bc -l) )); then
        QUALITY=85
        echo "Large image, using quality $QUALITY to fit under 6MB limit" >&2
    else
        QUALITY=92
        echo "Using quality $QUALITY (image already under 6MB)" >&2
    fi
    
    magick "$TEMP_PNG" \
        -interlace Plane \
        -quality "$QUALITY" \
        "$FILENAME"
    
    # Check final size
    FINAL_SIZE=$(stat -f%z "$FILENAME" 2>/dev/null || stat -c%s "$FILENAME")
    FINAL_MB=$(echo "scale=2; $FINAL_SIZE / 1048576" | bc)
    
    echo "Final JPEG: ${FINAL_MB}MB (progressive)" >&2
    
    if (( $(echo "$FINAL_MB > 6.28" | bc -l) )); then
        echo "⚠️  Warning: Image is ${FINAL_MB}MB (>6.28MB) - WhatsApp may compress!" >&2
    else
        echo "✅ Size OK for WhatsApp HD (<6.28MB)" >&2
    fi
    
    rm "$TEMP_PNG"
    echo "MEDIA:$FILENAME"
else
    # Just move PNG
    mv "$TEMP_PNG" "$FILENAME"
    echo "MEDIA:$FILENAME"
fi
