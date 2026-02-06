#!/bin/bash
# ElevenLabs Voice Studio - Speech to Text (Transcription)
# Usage: transcribe.sh [options] <audio_file>

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"
DEFAULT_MODEL="scribe_v1"

# Parse arguments
AUDIO_FILE=""
OUTPUT=""
LANGUAGE=""
TIMESTAMPS=""
TAG_AUDIO_EVENTS="true"
MODEL="$DEFAULT_MODEL"

usage() {
    cat << EOF
Usage: transcribe.sh [options] <audio_file>

Options:
  -o, --out <file>        Output file path (default: stdout)
  -l, --language <code>   Language hint (e.g., en, es, fr)
  -t, --timestamps        Include word timestamps
  -m, --model <model>     Model ID (default: scribe_v1)
  --no-audio-events       Don't tag audio events like [music], [noise]
  -h, --help              Show this help

Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm

Examples:
  transcribe.sh recording.mp3
  transcribe.sh -o transcript.txt meeting.mp3
  transcribe.sh -l es spanish_audio.mp3
  transcribe.sh -t podcast.mp3
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
        -l|--language)
            LANGUAGE="$2"
            shift 2
            ;;
        -t|--timestamps)
            TIMESTAMPS="word"
            shift
            ;;
        -m|--model)
            MODEL="$2"
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

# Get file extension and validate
EXT="${AUDIO_FILE##*.}"
EXT_LOWER=$(echo "$EXT" | tr '[:upper:]' '[:lower:]')

VALID_TYPES="mp3 mp4 mpeg mpga m4a wav webm"
if [[ ! "$VALID_TYPES" =~ $EXT_LOWER ]]; then
    log_warning "File type .$EXT may not be supported"
    log_info "Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm"
fi

# Check file size
check_file_size "$AUDIO_FILE" 104857600  # 100MB

log_info "Transcribing: $(basename "$AUDIO_FILE")"
log_info "Model: $MODEL"

# Build curl command
CURL_CMD=(curl -s -X POST "https://api.elevenlabs.io/v1/speech-to-text" \
    -H "xi-api-key: $API_KEY")

# Build form data
FORM_DATA=(-F "model_id=$MODEL")
FORM_DATA+=(-F "file=@$AUDIO_FILE")
[[ -n "$LANGUAGE" ]] && FORM_DATA+=(-F "language_code=$LANGUAGE")
[[ -n "$TIMESTAMPS" ]] && FORM_DATA+=(-F "timestamps_granularity=$TIMESTAMPS")
FORM_DATA+=(-F "tag_audio_events=$TAG_AUDIO_EVENTS")

# Debug
if [[ -n "${DEBUG:-}" ]]; then
    log_info "curl ${CURL_CMD[*]} ${FORM_DATA[*]}"
fi

# Make API request
START_TIME=$(date +%s)

RESPONSE=$("${CURL_CMD[@]}" "${FORM_DATA[@]}") || {
    log_error "Failed to connect to ElevenLabs API"
    exit 1
}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check for errors
if echo "$RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
    log_error "$(echo "$RESPONSE" | jq -r '.detail.message // .detail')"
    exit 1
fi

# Extract text
TEXT=$(echo "$RESPONSE" | jq -r '.text // empty')

if [[ -z "$TEXT" ]]; then
    log_error "No transcription returned"
    log_info "Response: $RESPONSE"
    exit 1
fi

# Output
if [[ -n "$OUTPUT" ]]; then
    echo "$TEXT" > "$OUTPUT"
    log_success "Transcription saved to: $OUTPUT"
else
    echo "$TEXT"
fi

# Show statistics
WORD_COUNT=$(echo "$TEXT" | wc -w)
CHAR_COUNT=${#TEXT}
log_info "Words: $WORD_COUNT | Characters: $CHAR_COUNT | Time: ${DURATION}s"

# Show timestamps if requested
if [[ -n "$TIMESTAMPS" ]]; then
    log_info "Word-level timestamps available in raw response"
    if [[ -n "${VERBOSE:-}" ]]; then
        echo "$RESPONSE" | jq '.words // .word_timestamps // empty' 2>/dev/null || true
    fi
fi

# Show language if detected
DETECTED_LANG=$(echo "$RESPONSE" | jq -r '.language_code // empty' 2>/dev/null || true)
if [[ -n "$DETECTED_LANG" ]]; then
    log_info "Detected language: $DETECTED_LANG"
fi
