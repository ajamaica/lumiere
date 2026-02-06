#!/bin/bash
# ElevenLabs Voice Studio - Voice Cloning
# Usage: clone.sh [options] <sample_files...>

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"

# Parse arguments
NAME=""
DESCRIPTION=""
LABELS=""
SAMPLES=()
REMOVE_BG_NOISE="false"

usage() {
    cat << EOF
Usage: clone.sh [options] <sample_files...>

Options:
  -n, --name <name>         Name for the cloned voice (required)
  -d, --description <text>  Voice description
  -l, --labels <json>       Labels as JSON (e.g., '{"accent":"american"}')
  --remove-bg-noise         Remove background noise from samples
  -h, --help                Show this help

Examples:
  clone.sh -n MyVoice sample.mp3
  clone.sh -n BusinessVoice -d 'Professional voice' sample1.mp3 sample2.mp3
  clone.sh -n MyVoice --labels '{"gender":"male","age":"adult"}' sample.mp3

Notes:
  - Minimum sample duration: 30 seconds recommended
  - Supported formats: mp3, wav, m4a, ogg, flac
  - Free tier: Limited number of voices
  - Higher quality samples = better results
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
        -n|--name)
            NAME="$2"
            shift 2
            ;;
        -d|--description)
            DESCRIPTION="$2"
            shift 2
            ;;
        -l|--labels)
            LABELS="$2"
            shift 2
            ;;
        --remove-bg-noise)
            REMOVE_BG_NOISE="true"
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
            if [[ -f "$1" ]]; then
                SAMPLES+=("$1")
            else
                log_error "File not found: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate name
if [[ -z "$NAME" ]]; then
    log_error "Voice name is required"
    usage
fi

# Validate samples
if [[ ${#SAMPLES[@]} -eq 0 ]]; then
    log_error "At least one sample file is required"
    usage
fi

# Validate all sample files
for sample in "${SAMPLES[@]}"; do
    validate_file "$sample" || exit 1
    check_file_size "$sample" 52428800  # 50MB per file
    log_info "Sample: $(basename "$sample")"
done

log_info "Cloning voice: $NAME"
log_info "Samples: ${#SAMPLES[@]}"

# Build form data
FORM_DATA=(-F "name=$NAME")
[[ -n "$DESCRIPTION" ]] && FORM_DATA+=(-F "description=$DESCRIPTION")
[[ -n "$LABELS" ]] && FORM_DATA+=(-F "labels=$LABELS")
FORM_DATA+=(-F "remove_background_noise=$REMOVE_BG_NOISE")

# Add sample files
for sample in "${SAMPLES[@]}"; do
    FORM_DATA+=(-F "files=@$sample")
done

# Debug
if [[ -n "${DEBUG:-}" ]]; then
    log_info "curl -X POST https://api.elevenlabs.io/v1/voices/add"
    log_info "Form data: ${FORM_DATA[*]}"
fi

# Make API request
log_info "Uploading samples..."

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "https://api.elevenlabs.io/v1/voices/add" \
    -H "xi-api-key: $API_KEY" \
    "${FORM_DATA[@]}" 2>&1) || {
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

# Extract voice ID
VOICE_ID=$(echo "$RESPONSE" | jq -r '.voice_id // empty')

if [[ -z "$VOICE_ID" || "$VOICE_ID" == "null" ]]; then
    log_error "Voice cloning failed"
    log_info "Response: $RESPONSE"
    exit 1
fi

log_success "Voice cloned successfully! (${DURATION}s)"
echo ""
echo "Voice ID: $VOICE_ID"
echo "Name: $NAME"
echo ""
echo "Use this voice with:"
echo "  speak.sh --voice \"$VOICE_ID\" \"Your text here\""
echo ""
echo "Preview URL:"
echo "$RESPONSE" | jq -r '.preview_url // "N/A"'
