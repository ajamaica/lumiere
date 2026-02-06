#!/bin/bash
# Final professional branded video (ffmpeg only, no external deps)

AUDIO="$1"
TEXT_FILE="$2"
CONFIG="$3"
OUTPUT="$4"

if [ -z "$AUDIO" ] || [ -z "$TEXT_FILE" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <audio.mp3> <text.txt> <config.json> <output.mp4>"
    exit 1
fi

WORK_DIR="/tmp/story-video-final"
mkdir -p "$WORK_DIR"

DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO")
DURATION_INT=${DURATION%.*}

echo "🎬 PROFESSIONAL VIDEO - 199TRUST BRANDING"
echo "========================================="
echo "📄 Script: $TEXT_FILE"
echo "🎵 Audio: $AUDIO"
echo "⏱️  Duration: ${DURATION_INT}s"
echo ""

echo "1️⃣  Creating readable subtitles..."

# Create SRT with small, readable text (4-5 words per line)
TEXT=$(cat "$TEXT_FILE")
WORDS=($TEXT)
NUM_WORDS=${#WORDS[@]}
WORDS_PER_SEC=$(echo "scale=4; $NUM_WORDS / $DURATION_INT" | bc)

SRT_FILE="$WORK_DIR/subs.srt"
CURRENT_TIME=0
SUBTITLE_NUM=1
WORDS_PER_SUB=4

for ((i=0; i<$NUM_WORDS; i+=$WORDS_PER_SUB)); do
    SUB_TEXT=""
    for ((j=i; j<i+$WORDS_PER_SUB && j<$NUM_WORDS; j++)); do
        SUB_TEXT="$SUB_TEXT ${WORDS[$j]}"
    done
    SUB_TEXT=$(echo "$SUB_TEXT" | xargs)  # Trim
    
    SUB_DUR=$(echo "scale=4; $WORDS_PER_SUB / $WORDS_PER_SEC" | bc)
    START=$(echo "$CURRENT_TIME" | awk '{printf "%.0f", $1}')
    END=$(echo "$CURRENT_TIME + $SUB_DUR" | bc | awk '{printf "%.0f", $1}')
    
    START_MS=$((START * 1000))
    END_MS=$((END * 1000))
    
    START_HMS=$(printf "%02d:%02d:%02d,%03d" $((START/3600)) $(((START%3600)/60)) $((START%60)) $((START_MS%1000)))
    END_HMS=$(printf "%02d:%02d:%02d,%03d" $((END/3600)) $(((END%3600)/60)) $((END%60)) $((END_MS%1000)))
    
    echo "$SUBTITLE_NUM" >> "$SRT_FILE"
    echo "$START_HMS --> $END_HMS" >> "$SRT_FILE"
    echo "$SUB_TEXT" >> "$SRT_FILE"
    echo "" >> "$SRT_FILE"
    
    CURRENT_TIME=$(echo "$CURRENT_TIME + $SUB_DUR" | bc)
    SUBTITLE_NUM=$((SUBTITLE_NUM + 1))
done

echo "   ✅ $(wc -l < "$SRT_FILE") lines"
echo ""

echo "2️⃣  Rendering professional video..."

# Professional colors: Dark navy + red accent
# Text: White (readable on dark background)
# Font size: 36 (readable on mobile)

ffmpeg -y \
  -f lavfi -i "color=c='#0f3460':s=1080x1920:d=$DURATION_INT" \
  -i "$AUDIO" \
  -vf "subtitles='$SRT_FILE':force_style='Fontname=Arial,FontSize=36,PrimaryColour=&HFFFFFF,SecondaryColour=&HFFFFFF,OutlineColour=&H000000,OutlineWidth=2,BorderStyle=3,MarginL=30,MarginR=30,MarginV=200,Bold=0,Alignment=2'" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -shortest \
  "$OUTPUT" 2>&1 | tail -5

SIZE=$(du -h "$OUTPUT" 2>/dev/null | cut -f1)

echo ""
echo "========================================="
echo "✨ VIDEO READY: $OUTPUT"
echo "📱 YouTube Shorts (9:16 portrait)"
echo "🎬 ${DURATION_INT}s with professional subtitles"
echo "🎨 199Trust branded colors"
echo "📊 $SIZE"
echo "========================================="

rm -rf "$WORK_DIR"
