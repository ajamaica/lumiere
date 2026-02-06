#!/bin/bash
# Scan koelkast en extraheer ingrediënten via vision analysis

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_IMAGE="${1:-/tmp/fridge-scan.jpg}"
ANALYSIS_FILE="/tmp/fridge-ingredients.txt"

echo "🔍 Fridge Scanner - Scan je koelkast en vind recepten!"
echo ""

# Check if peekaboo is available
if ! command -v peekaboo &> /dev/null; then
    echo "❌ Peekaboo not found. Install with: brew install steipete/tap/peekaboo"
    exit 1
fi

# Check permissions
if ! peekaboo permissions 2>&1 | grep -q "Screen Recording.*Granted"; then
    echo "⚠️  Screen Recording permission required!"
    echo "   System Settings → Privacy & Security → Screen Recording"
    exit 1
fi

echo "📸 Method selection:"
echo "  1) Open Camera app and capture"
echo "  2) Use existing image file"
echo "  3) Cancel"
read -p "Choose (1-3): " method

case $method in
    1)
        echo "📸 Opening Camera app..."
        peekaboo app launch "Camera" || peekaboo app launch "Photo Booth"
        sleep 2
        
        echo ""
        echo "📷 Position your camera to show the INSIDE of your fridge"
        echo "   Press ENTER when ready to capture..."
        read
        
        # Capture screen (camera preview)
        peekaboo image --mode frontmost --path "$OUTPUT_IMAGE" --retina
        echo "✅ Captured to: $OUTPUT_IMAGE"
        ;;
    2)
        read -p "📁 Enter image path: " img_path
        if [ ! -f "$img_path" ]; then
            echo "❌ File not found: $img_path"
            exit 1
        fi
        cp "$img_path" "$OUTPUT_IMAGE"
        echo "✅ Using: $OUTPUT_IMAGE"
        ;;
    3)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🤖 Analyzing image with vision model..."
echo "   (This uses OpenClaw's image tool internally)"
echo ""

# Output path for parent process to read
echo "$OUTPUT_IMAGE"
