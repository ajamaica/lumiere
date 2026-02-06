#!/bin/bash
# Standalone story-video generator using ffmpeg + imagemagick

set -e

AUDIO="$1"
TEXT_FILE="$2"
CONFIG="$3"
OUTPUT="$4"

if [ -z "$AUDIO" ] || [ -z "$TEXT_FILE" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <audio.mp3> <text.txt> <config.json> <output.mp4>"
    exit 1
fi

WORK_DIR="/tmp/story-video-$(date +%s)"
FRAMES_DIR="$WORK_DIR/frames"
mkdir -p "$FRAMES_DIR"

echo "🎬 STORY-VIDEO GENERATOR (STANDALONE)"
echo "======================================"
echo "📄 Text: $TEXT_FILE"
echo "🎵 Audio: $AUDIO"
echo "📁 Working: $WORK_DIR"
echo ""

# Get audio duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO")
echo "⏱️  Duration: ${DURATION%.*}s"
echo ""

# Create text frames with ffmpeg drawtext filter
echo "1️⃣  Rendering subtitle frames..."

# Create a simple black background video with text overlay
ffmpeg -y -f lavfi -i color=c=black:s=1080x1920:d=$DURATION -vf "
  drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='$(cat $TEXT_FILE | tr '\n' ' ')':fontsize=48:fontcolor=white:x='(w-text_w)/2':y='(h-text_h)/2':line_spacing=10
" -c:v libx264 -preset ultrafast -frames:v "$((${DURATION%.*} * 30))" "$FRAMES_DIR/%06d.png" > /dev/null 2>&1

echo "   ✅ Created $(ls $FRAMES_DIR | wc -l) frames"
echo ""

# Compose video with audio
echo "2️⃣  Composing video with audio..."
ffmpeg -y -framerate 30 -i "$FRAMES_DIR/%06d.png" -i "$AUDIO" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -pix_fmt yuv420p -shortest "$OUTPUT" 2>&1 | grep -i "error\|warning\|frame" || true

echo ""
echo "======================================"
echo "✨ VIDEO READY: $OUTPUT"
echo "📱 Format: YouTube Shorts (9:16)"
echo "🎬 Duration: ${DURATION%.*}s"
echo "📊 Size: $(du -h "$OUTPUT" | cut -f1)"
echo "======================================"

# Cleanup
rm -rf "$WORK_DIR"
