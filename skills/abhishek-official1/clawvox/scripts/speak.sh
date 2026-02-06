#!/bin/bash
# ElevenLabs Voice Studio - Text to Speech
# Usage: speak.sh [options] <text>

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"
DEFAULT_VOICE="${ELEVENLABS_DEFAULT_VOICE:-Rachel}"
DEFAULT_MODEL="${ELEVENLABS_DEFAULT_MODEL:-eleven_turbo_v2_5}"
OUTPUT_DIR="${ELEVENLABS_OUTPUT_DIR:-$HOME/.openclaw/audio}"

# Parse arguments
VOICE="$DEFAULT_VOICE"
MODEL="$DEFAULT_MODEL"
OUTPUT=""
INPUT_FILE=""
STABILITY=""
SIMILARITY=""
STYLE=""
SPEAKER_BOOST=""
SPEED=""
TEXT=""

usage() {
    cat << EOF
Usage: speak.sh [options] <text>

Options:
  -v, --voice <name>      Voice name or ID (default: $DEFAULT_VOICE)
  -m, --model <model>     TTS model (default: $DEFAULT_MODEL)
  -o, --out <file>        Output file path
  -i, --input <file>      Read text from file
  --stability <0-1>       Voice stability
  --similarity <0-1>      Similarity boost
  --style <0-1>           Style exaggeration
  --speaker-boost         Enable speaker boost
  --speed <0.5-2>         Speech speed (default: 1.0)
  -h, --help              Show this help

Models:
  eleven_flash_v2_5        ~75ms latency, 32 languages
  eleven_turbo_v2_5        ~250ms latency, 32 languages (default)
  eleven_multilingual_v2   ~500ms latency, 29 languages, highest quality

Examples:
  speak.sh "Hello world"
  speak.sh -v Adam "Hello from Adam"
  speak.sh -o greeting.mp3 "Welcome!"
  speak.sh -v Rachel --stability 0.5 --similarity 0.8 "Expressive speech!"
EOF
}

# Show help and exit
show_help() {
    usage
    exit 0
}

# Check API key
check_api_key || exit 1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--voice)
            VOICE="$2"
            shift 2
            ;;
        -m|--model)
            MODEL="$2"
            shift 2
            ;;
        -o|--out)
            OUTPUT="$2"
            shift 2
            ;;
        -i|--input)
            INPUT_FILE="$2"
            shift 2
            ;;
        --stability)
            STABILITY="$2"
            validate_number "$STABILITY" 0 1 "stability" || exit 1
            shift 2
            ;;
        --similarity)
            SIMILARITY="$2"
            validate_number "$SIMILARITY" 0 1 "similarity" || exit 1
            shift 2
            ;;
        --style)
            STYLE="$2"
            validate_number "$STYLE" 0 1 "style" || exit 1
            shift 2
            ;;
        --speed)
            SPEED="$2"
            validate_number "$SPEED" 0.5 2 "speed" || exit 1
            shift 2
            ;;
        --speaker-boost)
            SPEAKER_BOOST="true"
            shift
            ;;
        -h|--help)
            show_help
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            TEXT="$1"
            shift
            ;;
    esac
done

# Read from file if specified
if [[ -n "$INPUT_FILE" ]]; then
    validate_file "$INPUT_FILE" || exit 1
    TEXT=$(cat "$INPUT_FILE")
fi

# Validate text
if [[ -z "$TEXT" ]]; then
    log_error "No text provided"
    usage
    exit 1
fi

# Check text length (ElevenLabs has limits)
TEXT_LENGTH=${#TEXT}
if (( TEXT_LENGTH > 50000 )); then
    log_warning "Text is very long ($TEXT_LENGTH chars). This may fail or take a while."
fi

# Resolve voice ID
VOICE_ID=$(resolve_voice_id "$VOICE")

# Create output directory if needed
if [[ -n "$OUTPUT" ]]; then
    mkdir -p "$(dirname "$OUTPUT")"
else
    mkdir -p "$OUTPUT_DIR"
    OUTPUT="$OUTPUT_DIR/tts_$(date +%Y%m%d_%H%M%S).mp3"
fi

# Build voice settings JSON
VOICE_SETTINGS=""
if [[ -n "$STABILITY" ]] || [[ -n "$SIMILARITY" ]] || [[ -n "$STYLE" ]] || [[ -n "$SPEAKER_BOOST" ]] || [[ -n "$SPEED" ]]; then
    SETTINGS="{"
    [[ -n "$STABILITY" ]] && SETTINGS="$SETTINGS\"stability\": $STABILITY,"
    [[ -n "$SIMILARITY" ]] && SETTINGS="$SETTINGS\"similarity_boost\": $SIMILARITY,"
    [[ -n "$STYLE" ]] && SETTINGS="$SETTINGS\"style\": $STYLE,"
    [[ -n "$SPEED" ]] && SETTINGS="$SETTINGS\"speed\": $SPEED,"
    [[ -n "$SPEAKER_BOOST" ]] && SETTINGS="$SETTINGS\"use_speaker_boost\": true,"
    # Remove trailing comma
    SETTINGS="${SETTINGS%,}"
    SETTINGS="$SETTINGS}"
    VOICE_SETTINGS="\"voice_settings\": $SETTINGS,"
fi

# Build request JSON
REQUEST="{"
REQUEST="$REQUEST\"text\": $(echo "$TEXT" | jq -Rs .),"
REQUEST="$REQUEST\"model_id\": \"$MODEL\","
[[ -n "$VOICE_SETTINGS" ]] && REQUEST="$REQUEST$VOICE_SETTINGS"
REQUEST="${REQUEST%,}"
REQUEST="$REQUEST}"

# Debug output
if [[ -n "${DEBUG:-}" ]]; then
    log_info "Request: $REQUEST"
    log_info "Voice ID: $VOICE_ID"
    log_info "Output: $OUTPUT"
fi

# Make API request
log_info "Generating speech with voice: $VOICE..."
START_TIME=$(date +%s)

TEMP_OUTPUT="${OUTPUT}.tmp.$$"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_OUTPUT" \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
    -H "xi-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$REQUEST" 2>&1) || {
    log_error "Failed to connect to ElevenLabs API"
    rm -f "$TEMP_OUTPUT"
    exit 1
}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if handle_api_error "$TEMP_OUTPUT" "$HTTP_CODE"; then
    mv "$TEMP_OUTPUT" "$OUTPUT"
    log_success "Audio saved to: $OUTPUT (${DURATION}s)"
    
    # Show file size
    FILE_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "0")
    log_info "File size: $(( FILE_SIZE / 1024 )) KB"
    
    # Try to play if no output file was explicitly specified
    if [[ -z "${1:-}" ]] && [[ -t 0 ]]; then
        play_audio "$OUTPUT" || true
    fi
else
    rm -f "$TEMP_OUTPUT"
    exit 1
fi
