#!/bin/bash
# ElevenLabs Voice Studio - Voice Isolation
# Usage: isolate.sh [options] <audio_file>

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"
OUTPUT_DIR="${ELEVENLABS_OUTPUT_DIR:-$HOME/.openclaw/audio}"

# Parse arguments
AUDIO_FILE=""
OUTPUT=""
TAG_AUDIO_EVENTS="true"

usage() {
    cat << EOF
Usage: isolate.sh [options] <audio_file>

Options:
  -o, --out <file>          Output file path
  --no-audio-events         Don't tag audio events
  -h, --help                Show this help

Examples:
  isolate.sh noisy_recording.mp3
  isolate.sh -o clean_voice.mp3 meeting_recording.mp3

Notes:
  - Minimum duration: 4.6 seconds
  - Supported formats: mp3, wav, m4a, ogg, flac
  - This removes background noise and isolates the primary speaker
EOF
    exit 1
}

# Check API key
check_api_key || exit 1

# Check for jq
check_command jq || exit 1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--out)
            OUTPUT="$2"
            shift 2
            ;;
        --no-audio-events)
            TAG_AUDIO_EVENTS="false"
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            ;;
        *)
            AUDIO_FILE="$1"
            shift
            ;;
    esac
done

# Validate audio file
if [[ -z "$AUDIO_FILE" ]]; then
    log_error "No audio file provided"
    usage
fi

validate_file "$AUDIO_FILE" || exit 1
check_file_size "$AUDIO_FILE" 104857600  # 100MB

# Set default output
if [[ -z "$OUTPUT" ]]; then
    BASENAME=$(basename "$AUDIO_FILE" | sed 's/\.[^.]*$//')
    OUTPUT="$OUTPUT_DIR/${BASENAME}_isolated.mp3"
fi

mkdir -p "$(dirname "$OUTPUT")"

log_info "Isolating voice from: $(basename "$AUDIO_FILE")"
log_info "This removes background noise and isolates the primary speaker..."

# Build form data
FORM_DATA=(-F "audio=@$AUDIO_FILE")
FORM_DATA+=(-F "tag_audio_events=$TAG_AUDIO_EVENTS")

# Make API request
START_TIME=$(date +%s)

TEMP_OUTPUT="${OUTPUT}.tmp.$$"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_OUTPUT" \
    -X POST "https://api.elevenlabs.io/v1/audio-isolation" \
    -H "xi-api-key: $API_KEY" \
    "${FORM_DATA[@]}" 2>&1) || {
    log_error "Failed to connect to ElevenLabs API"
    rm -f "$TEMP_OUTPUT"
    exit 1
}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if handle_api_error "$TEMP_OUTPUT" "$HTTP_CODE"; then
    mv "$TEMP_OUTPUT" "$OUTPUT"
    log_success "Isolated audio saved to: $OUTPUT (${DURATION}s)"
    
    # Show file size
    FILE_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "0")
    log_info "File size: $(( FILE_SIZE / 1024 )) KB"
else
    rm -f "$TEMP_OUTPUT"
    exit 1
fi
