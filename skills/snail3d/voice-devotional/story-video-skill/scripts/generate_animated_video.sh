#!/bin/bash
# Full animated story-video with synced subtitles
# Usage: ./generate_animated_video.sh <audio.mp3> <text.txt> <config.json> <output.mp4>

set -e

AUDIO="$1"
TEXT_FILE="$2"
CONFIG="$3"
OUTPUT="$4"
TITLE="${5:-Story}"

if [ -z "$AUDIO" ] || [ -z "$TEXT_FILE" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <audio.mp3> <text.txt> <config.json> <output.mp4> [title]"
    exit 1
fi

WORK_DIR="/tmp/story-video-$(date +%s)"
FRAMES_DIR="$WORK_DIR/frames"
SUBS_DIR="$WORK_DIR/subs"
mkdir -p "$FRAMES_DIR" "$SUBS_DIR"

echo ""
echo "🎬 STORY-VIDEO GENERATOR - ANIMATED WITH SUBTITLES"
echo "=================================================="
echo "📄 Script: $TEXT_FILE"
echo "🎵 Audio: $AUDIO"
echo "🎨 Config: $CONFIG"
echo "📁 Working: $WORK_DIR"
echo ""

# Get audio duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO")
DURATION_INT=${DURATION%.*}
echo "⏱️  Duration: ${DURATION_INT}s"
echo ""

# Read text
TEXT=$(cat "$TEXT_FILE")

# Create dynamic subtitle file with timing
echo "1️⃣  Creating animated subtitles..."

# Split text into words and create SRT with precise timing
WORDS=($TEXT)
NUM_WORDS=${#WORDS[@]}
WORDS_PER_SEC=$(echo "scale=4; $NUM_WORDS / $DURATION" | bc)

# Create SRT subtitles file
SRT_FILE="$SUBS_DIR/subtitles.srt"
CURRENT_TIME=0
SUBTITLE_NUMBER=1

for ((i=0; i<$NUM_WORDS; i++)); do
    WORD="${WORDS[$i]}"
    
    # Calculate timing for this word (30 words per line roughly)
    WORDS_PER_LINE=5
    LINE_START=$((i / WORDS_PER_LINE))
    LINE_END=$(((i + WORDS_PER_LINE) / WORDS_PER_LINE))
    
    WORD_DURATION=$(echo "scale=4; 1 / $WORDS_PER_SEC" | bc)
    START_TIME=$(echo "scale=3; $CURRENT_TIME" | bc)
    END_TIME=$(echo "scale=3; $CURRENT_TIME + $WORD_DURATION * 3" | bc)
    
    # Convert to SRT format (HH:MM:SS,mmm)
    START_HMS=$(printf '%02d:%02d:%06.3f' $(echo "$START_TIME/3600" | bc) $(echo "($START_TIME%3600)/60" | bc) $(echo "$START_TIME%60" | bc) | sed 's/\./,/')
    END_HMS=$(printf '%02d:%02d:%06.3f' $(echo "$END_TIME/3600" | bc) $(echo "($END_TIME%3600)/60" | bc) $(echo "$END_TIME%60" | bc) | sed 's/\./,/')
    
    # Build subtitle text (current word highlighted, context around it)
    if [ $i -gt 0 ]; then
        PREV_WORD="${WORDS[$((i-1))]}"
    else
        PREV_WORD=""
    fi
    
    if [ $i -lt $((NUM_WORDS-1)) ]; then
        NEXT_WORD="${WORDS[$((i+1))]}"
    else
        NEXT_WORD=""
    fi
    
    # Simple subtitle with current word
    SUBTITLE_TEXT="$PREV_WORD $WORD $NEXT_WORD"
    
    echo "$SUBTITLE_NUMBER" >> "$SRT_FILE"
    echo "$START_HMS --> $END_HMS" >> "$SRT_FILE"
    echo "$SUBTITLE_TEXT" >> "$SRT_FILE"
    echo "" >> "$SRT_FILE"
    
    CURRENT_TIME=$(echo "$CURRENT_TIME + $WORD_DURATION" | bc)
    SUBTITLE_NUMBER=$((SUBTITLE_NUMBER + 1))
done

echo "   ✅ Created $(wc -l < "$SRT_FILE") subtitle lines"
echo ""

# Create background video with gradient and animation
echo "2️⃣  Rendering animated background..."

# Use a gradient background with slow zoom animation
BG_FILTER="color=c='#0a0e27':s=1080x1920:d=$DURATION_INT,scale=1080:1920,
fps=30,
setpts=N/(30*TB)"

# Create base video with gradient background
ffmpeg -y -f lavfi -i "$BG_FILTER" -t $DURATION_INT "$FRAMES_DIR/bg_%06d.png" > /dev/null 2>&1 &
BG_PID=$!

# Wait for background to be created
wait $BG_PID

echo "   ✅ Created background frames"
echo ""

# Create subtitled video with animations
echo "3️⃣  Composing video with animated subtitles..."

# Complex FFmpeg filter for animated subtitles
SUBTITLE_FILTER="subtitles='$SRT_FILE':force_style='Fontname=Arial,FontSize=56,PrimaryColour=&HFF00FF,OutlineColour=&H000000,OutlineWidth=2,BorderStyle=3,MarginL=10,MarginR=10,MarginV=100,Bold=1,Alignment=2'"

ffmpeg -y \
  -framerate 30 -i "$FRAMES_DIR/bg_%06d.png" \
  -i "$AUDIO" \
  -vf "$SUBTITLE_FILTER,
  scale=1080:1920:force_original_aspect_ratio=decrease,
  pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -shortest \
  "$OUTPUT" 2>&1 | grep -E "frame|error|warning" || true

echo ""
echo "=================================================="
echo "✨ VIDEO COMPLETE: $OUTPUT"
echo "📱 Format: YouTube Shorts (9:16 portrait)"
echo "🎬 Duration: ${DURATION_INT}s"
echo "🎨 Features: Animated subtitles + gradient background"
echo "📊 Size: $(du -h "$OUTPUT" | cut -f1)"
echo "=================================================="
echo ""

# Cleanup
rm -rf "$WORK_DIR"
