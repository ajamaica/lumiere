#!/bin/bash

# groq-tts.sh - Flexible script for Groq Orpheus TTS (Arabic/English)
# Part of the groq-orpheus-tts skill for OpenClaw.

TEXT="$1"
OUT_MP3="$2"
VOICE="${3:-fahad}"
LANG="${4:-ar}"
TEMP_WAV="/tmp/groq_temp_$(date +%s).wav"

if [ -z "$TEXT" ] || [ -z "$OUT_MP3" ]; then
    echo "Usage: $0 \"Text\" output.mp3 [voice] [lang: ar|en]"
    exit 1
fi

if [ -z "$GROQ_API_KEY" ]; then
    echo "Error: GROQ_API_KEY environment variable is not set."
    exit 1
fi

# Select model based on language
if [ "$LANG" == "en" ]; then
    MODEL="canopylabs/orpheus-v1-english"
    # Default English voice if user didn't specify or kept Arabic default
    if [ "$VOICE" == "fahad" ]; then VOICE="troy"; fi
else
    MODEL="canopylabs/orpheus-arabic-saudi"
fi

curl -s -X POST "https://api.groq.com/openai/v1/audio/speech" \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d "{
       \"model\": \"$MODEL\",
       \"input\": \"$TEXT\",
       \"voice\": \"$VOICE\",
       \"response_format\": \"wav\"
     }" --output "$TEMP_WAV"

if [ -s "$TEMP_WAV" ]; then
    # Check if the output is actually a JSON error message
    if grep -q "{\"error\":" "$TEMP_WAV"; then
        cat "$TEMP_WAV"
        rm "$TEMP_WAV"
        exit 1
    fi
    ffmpeg -i "$TEMP_WAV" -acodec libmp3lame -y "$OUT_MP3" > /dev/null 2>&1
    rm "$TEMP_WAV"
    echo "SUCCESS: $OUT_MP3"
else
    echo "FAILED: API response was empty."
    exit 1
fi
