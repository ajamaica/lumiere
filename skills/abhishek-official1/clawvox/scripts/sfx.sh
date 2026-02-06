#!/bin/bash
# ElevenLabs Voice Studio - Sound Effects Generation
# Usage: sfx.sh [options] <description>

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"
OUTPUT_DIR="${ELEVENLABS_OUTPUT_DIR:-$HOME/.openclaw/audio}"

# Parse arguments
DESCRIPTION=""
DURATION=""
OUTPUT=""
PROMPT_INFLUENCE=""

usage() {
    cat << EOF
Usage: sfx.sh [options] <description>

Options:
  -d, --duration <seconds>  Approximate duration (default: auto)
  -o, --out <file>          Output file path
  --influence <0-1>         Prompt influence (higher = more accurate to prompt)
  -h, --help                Show this help

Examples:
  sfx.sh 'Heavy rain on a tin roof'
  sfx.sh -d 5 'Forest ambiance with birds'
  sfx.sh -o effects/thunder.mp3 'Rolling thunder'
  sfx.sh --influence 0.8 'Sci-fi laser gun firing'

Notes:
  - Duration: 0.5 to 22 seconds (will be rounded to nearest 0.5)
  - Free tier: Limited generations per month
  - Higher influence = more accurate but less variety
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
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -o|--out)
            OUTPUT="$2"
            shift 2
            ;;
        --influence)
            PROMPT_INFLUENCE="$2"
            validate_number "$PROMPT_INFLUENCE" 0 1 "prompt influence" || exit 1
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            ;;
        *)
            DESCRIPTION="$1"
            shift
            ;;
    esac
done

# Validate description
if [[ -z "$DESCRIPTION" ]]; then
    log_error "No description provided"
    usage
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Set default output if not specified
if [[ -z "$OUTPUT" ]]; then
    # Sanitize description for filename
    SAFE_DESC=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_' | cut -c1-30)
    OUTPUT="$OUTPUT_DIR/sfx_${SAFE_DESC}_$(date +%Y%m%d_%H%M%S).mp3"
fi

mkdir -p "$(dirname "$OUTPUT")"

log_info "Generating sound effect: $DESCRIPTION"

# Build request JSON
REQUEST="{"
REQUEST="$REQUEST\"text\": $(echo "$DESCRIPTION" | jq -Rs .)"
[[ -n "$DURATION" ]] && REQUEST="$REQUEST, \"duration_seconds\": $DURATION"
[[ -n "$PROMPT_INFLUENCE" ]] && REQUEST="$REQUEST, \"prompt_influence\": $PROMPT_INFLUENCE"
REQUEST="$REQUEST}"

# Debug
if [[ -n "${DEBUG:-}" ]]; then
    log_info "Request: $REQUEST"
fi

# Make API request
START_TIME=$(date +%s)

TEMP_OUTPUT="${OUTPUT}.tmp.$$"
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_OUTPUT" \
    -X POST "https://api.elevenlabs.io/v1/sound-generation" \
    -H "xi-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$REQUEST" 2>&1) || {
    log_error "Failed to connect to ElevenLabs API"
    rm -f "$TEMP_OUTPUT"
    exit 1
}

END_TIME=$(date +%s)
DURATION_TIME=$((END_TIME - START_TIME))

if handle_api_error "$TEMP_OUTPUT" "$HTTP_CODE"; then
    mv "$TEMP_OUTPUT" "$OUTPUT"
    log_success "Sound effect saved to: $OUTPUT (${DURATION_TIME}s)"
    
    # Show file size
    FILE_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "0")
    log_info "File size: $(( FILE_SIZE / 1024 )) KB"
    
    # Try to play if available and terminal is interactive
    if [[ -t 0 ]]; then
        play_audio "$OUTPUT" || true
    fi
else
    rm -f "$TEMP_OUTPUT"
    exit 1
fi
