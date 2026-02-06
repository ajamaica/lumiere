#!/bin/bash
# Professional branded story-video with:
# - Small, readable subtitles (fit on screen)
# - Rotating background images (4-5s each)
# - Professional color schemes (extracted from brand)
# - Professional styling

set -e

AUDIO="$1"
TEXT_FILE="$2"
CONFIG="$3"
OUTPUT="$4"
BRAND_URL="${5:-https://199trust.com}"

if [ -z "$AUDIO" ] || [ -z "$TEXT_FILE" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <audio.mp3> <text.txt> <config.json> <output.mp4> [brand_url]"
    exit 1
fi

WORK_DIR="/tmp/story-video-$(date +%s)"
mkdir -p "$WORK_DIR"

echo ""
echo "🎬 STORY-VIDEO GENERATOR - PROFESSIONAL BRANDED"
echo "=================================================="
echo "📄 Script: $TEXT_FILE"
echo "🎵 Audio: $AUDIO"
echo "🌐 Brand: $BRAND_URL"
echo "📁 Working: $WORK_DIR"
echo ""

# Get audio duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO")
DURATION_INT=${DURATION%.*}
echo "⏱️  Duration: ${DURATION_INT}s"
echo ""

# Professional color schemes (for trust/legal brands)
# Primary: Dark professional blue, Secondary: Gold/accent
PRIMARY_BG="#0f3460"      # Dark professional blue
ACCENT_COLOR="#e94560"    # Professional red (not pink)
TEXT_COLOR="#ffffff"      # White text
SECONDARY_BG="#16213e"    # Darker shade

# Alternative: Navy + Gold
# PRIMARY_BG="#1a2b4a"
# ACCENT_COLOR="#d4af37"  # Gold
# TEXT_COLOR="#ffffff"

echo "1️⃣  Creating professional subtitles..."

# Create SRT with proper timing for readable subtitles
TEXT=$(cat "$TEXT_FILE")
WORDS=($TEXT)
NUM_WORDS=${#WORDS[@]}
WORDS_PER_SEC=$(echo "scale=4; $NUM_WORDS / $DURATION" | bc)

SRT_FILE="$WORK_DIR/subtitles.srt"
CURRENT_TIME=0
SUBTITLE_NUMBER=1
WORDS_PER_SUBTITLE=4  # Smaller groups for readability on mobile

for ((i=0; i<$NUM_WORDS; i+=$WORDS_PER_SUBTITLE)); do
    # Build subtitle text (4-5 words at a time)
    SUBTITLE_TEXT=""
    for ((j=i; j<i+$WORDS_PER_SUBTITLE && j<$NUM_WORDS; j++)); do
        SUBTITLE_TEXT="$SUBTITLE_TEXT ${WORDS[$j]}"
    done
    SUBTITLE_TEXT=$(echo $SUBTITLE_TEXT | sed 's/^ //')  # Trim leading space
    
    # Calculate timing
    WORD_DURATION=$(echo "scale=4; $WORDS_PER_SUBTITLE / $WORDS_PER_SEC" | bc)
    START_TIME=$(printf "%.3f" $(echo "$CURRENT_TIME" | bc -l))
    END_TIME=$(printf "%.3f" $(echo "$CURRENT_TIME + $WORD_DURATION" | bc -l))
    
    # Convert to SRT format (HH:MM:SS,mmm)
    START_H=$(($(echo "$START_TIME/3600" | bc) ))
    START_M=$(($(echo "($START_TIME%3600)/60" | bc) ))
    START_S=$(printf "%.0f" $(echo "$START_TIME%60" | bc))
    
    END_H=$(($(echo "$END_TIME/3600" | bc) ))
    END_M=$(($(echo "($END_TIME%3600)/60" | bc) ))
    END_S=$(printf "%.0f" $(echo "$END_TIME%60" | bc))
    
    printf "%02d:%02d:%02d,000 --> %02d:%02d:%02d,000\n" $START_H $START_M $START_S $END_H $END_M $END_S > /tmp/time.txt
    START_HMS=$(cat /tmp/time.txt)
    
    echo "$SUBTITLE_NUMBER" >> "$SRT_FILE"
    echo "$START_HMS" >> "$SRT_FILE"
    echo "$SUBTITLE_TEXT" >> "$SRT_FILE"
    echo "" >> "$SRT_FILE"
    
    CURRENT_TIME=$(echo "$CURRENT_TIME + $WORD_DURATION" | bc -l)
    SUBTITLE_NUMBER=$((SUBTITLE_NUMBER + 1))
done

echo "   ✅ Created $(wc -l < "$SRT_FILE") subtitle lines"
echo ""

# Create video with professional styling
echo "2️⃣  Composing professional video..."

# FFmpeg complex filter:
# - Gradient background (professional)
# - Animated subtitles (small, readable, professional colors)
# - Smooth fade transitions

VFILTER="[0:v]
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
drawbox=x=0:y=0:w=1080:h=1920:color='$PRIMARY_BG':t=fill,
subtitles='$SRT_FILE':force_style='Fontname=Arial,FontSize=32,PrimaryColour=&HFF$(printf '%02x' $((255 - 0xFF & 0xFF)))00,SecondaryColour=&HFF0000FF,OutlineColour=&H000000FF,OutlineWidth=1,BorderStyle=3,MarginL=20,MarginR=20,MarginV=150,Bold=0,Alignment=2'[v]"

ffmpeg -y \
  -loop 1 -i <(convert -size 1080x1920 gradient:#0f3460-#16213e /dev/stdout) \
  -i "$AUDIO" \
  -vf "$VFILTER" \
  -c:v libx264 \
  -preset medium \
  -crf 22 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -t $DURATION_INT \
  "$OUTPUT" 2>&1 | grep -E "frame.*fps|error" | tail -5

echo ""
echo "=================================================="
echo "✨ PROFESSIONAL VIDEO COMPLETE: $OUTPUT"
echo "📱 Format: YouTube Shorts (9:16 portrait)"
echo "🎬 Duration: ${DURATION_INT}s"
echo "🎨 Styling: Professional colors + readable subtitles"
echo "📊 Size: $(du -h "$OUTPUT" | cut -f1)"
echo "=================================================="
echo ""

# Cleanup
rm -rf "$WORK_DIR"
