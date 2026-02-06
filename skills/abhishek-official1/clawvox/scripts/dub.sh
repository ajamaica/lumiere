#!/bin/bash
# ElevenLabs Voice Studio - Audio/Video Dubbing
# Usage: dub.sh [options] <file>

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
SOURCE_LANG=""
TARGET_LANG=""
OUTPUT=""
MODE="automatic"
DUBBING_ID=""
ACTION="create"
NUM_SPEAKERS=""
WATERMARK="true"

usage() {
    cat << EOF
Usage: dub.sh [options] <file>

Actions:
  (no flags)          Create a new dubbing job
  --status --id <id>  Check dubbing status
  --download --id <id> [--out <file>]  Download dubbed audio

Options for create:
  -t, --target <lang>       Target language code (required)
  -s, --source <lang>       Source language (auto-detected if not specified)
  -o, --out <file>          Output file path (for download)
  -m, --mode <mode>         Dubbing mode: automatic (default) or manual
  --speakers <num>          Number of speakers to identify
  --no-watermark            Remove ElevenLabs watermark

Options for status:
  --status                  Check status of dubbing job
  -i, --id <id>             Dubbing ID

Options for download:
  --download                Download dubbed audio
  -i, --id <id>             Dubbing ID
  -o, --out <file>          Output file path

Supported languages: en, es, fr, de, it, pt, pl, hi, ar, zh, ja, ko, nl, ru, tr, vi, sv, da, fi, cs, el, he, id, ms, no, ro, uk, hu, th

Examples:
  dub.sh -t es audio.mp3              # Dub to Spanish
  dub.sh -s en -t ja video.mp4        # English to Japanese
  dub.sh --status -i dub_abc123       # Check status
  dub.sh --download -i dub_abc123 -o output.mp3  # Download
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
        -t|--target)
            TARGET_LANG="$2"
            shift 2
            ;;
        -s|--source)
            SOURCE_LANG="$2"
            shift 2
            ;;
        -o|--out)
            OUTPUT="$2"
            shift 2
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        --speakers)
            NUM_SPEAKERS="$2"
            shift 2
            ;;
        --no-watermark)
            WATERMARK="false"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        --download)
            ACTION="download"
            shift
            ;;
        -i|--id)
            DUBBING_ID="$2"
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
            AUDIO_FILE="$1"
            shift
            ;;
    esac
done

case "$ACTION" in
    create)
        # Validate target language
        if [[ -z "$TARGET_LANG" ]]; then
            log_error "Target language is required"
            usage
        fi

        # Validate audio file
        if [[ -z "$AUDIO_FILE" ]]; then
            log_error "No audio/video file provided"
            usage
        fi

        validate_file "$AUDIO_FILE" || exit 1
        check_file_size "$AUDIO_FILE" 524288000  # 500MB

        log_info "Creating dubbing job..."
        log_info "Target language: $TARGET_LANG"
        [[ -n "$SOURCE_LANG" ]] && log_info "Source language: $SOURCE_LANG"

        # Build form data
        FORM_DATA=(-F "target_lang=$TARGET_LANG")
        FORM_DATA+=(-F "mode=$MODE")
        FORM_DATA+=(-F "watermark=$WATERMARK")
        [[ -n "$SOURCE_LANG" ]] && FORM_DATA+=(-F "source_lang=$SOURCE_LANG")
        [[ -n "$NUM_SPEAKERS" ]] && FORM_DATA+=(-F "num_speakers=$NUM_SPEAKERS")
        FORM_DATA+=(-F "file=@$AUDIO_FILE")

        # Make API request
        START_TIME=$(date +%s)

        RESPONSE=$(curl -s -X POST "https://api.elevenlabs.io/v1/dubbing" \
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

        DUBBING_ID=$(echo "$RESPONSE" | jq -r '.dubbing_id // empty')
        EXPECTED_DURATION=$(echo "$RESPONSE" | jq -r '.expected_duration_sec // empty')

        if [[ -z "$DUBBING_ID" || "$DUBBING_ID" == "null" ]]; then
            log_error "Dubbing creation failed"
            log_info "Response: $RESPONSE"
            exit 1
        fi

        log_success "Dubbing job created! (${DURATION}s)"
        echo ""
        echo "Dubbing ID: $DUBBING_ID"
        [[ -n "$EXPECTED_DURATION" ]] && echo "Expected duration: ${EXPECTED_DURATION}s"
        echo ""
        echo "Check status with:"
        echo "  dub.sh --status --id $DUBBING_ID"
        echo ""
        echo "Download when ready with:"
        echo "  dub.sh --download --id $DUBBING_ID --out dubbed.mp3"
        ;;

    status)
        if [[ -z "$DUBBING_ID" ]]; then
            log_error "Dubbing ID is required"
            usage
        fi

        log_info "Checking status for: $DUBBING_ID"

        RESPONSE=$(curl -s "https://api.elevenlabs.io/v1/dubbing/$DUBBING_ID" \
            -H "xi-api-key: $API_KEY") || {
            log_error "Failed to connect to ElevenLabs API"
            exit 1
        }

        # Check for errors
        if echo "$RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
            log_error "$(echo "$RESPONSE" | jq -r '.detail.message // .detail')"
            exit 1
        fi

        STATUS=$(echo "$RESPONSE" | jq -r '.status // empty')
        echo ""
        echo "Dubbing ID: $DUBBING_ID"
        echo "Status: $STATUS"

        if [[ "$STATUS" == "dubbed" ]]; then
            log_success "Dubbing is complete!"
            echo "Target languages: $(echo "$RESPONSE" | jq -r '.target_languages | join(", ")')"
            echo ""
            echo "Download with:"
            echo "  dub.sh --download --id $DUBBING_ID --out dubbed.mp3"
        elif [[ "$STATUS" == "dubbing" ]]; then
            log_info "Dubbing in progress..."
        elif [[ "$STATUS" == "failed" ]]; then
            log_error "Dubbing failed"
            echo "Error: $(echo "$RESPONSE" | jq -r '.error_message // "Unknown error"')"
        fi
        ;;

    download)
        if [[ -z "$DUBBING_ID" ]]; then
            log_error "Dubbing ID is required"
            usage
        fi

        # Set default output
        if [[ -z "$OUTPUT" ]]; then
            mkdir -p "$OUTPUT_DIR"
            OUTPUT="$OUTPUT_DIR/dubbed_${DUBBING_ID}.mp3"
        fi

        mkdir -p "$(dirname "$OUTPUT")"

        # Use first target language or default to the target specified
        LANG_CODE="${TARGET_LANG:-}"
        if [[ -z "$LANG_CODE" ]]; then
            # Get available languages from status
            LANGS=$(curl -s "https://api.elevenlabs.io/v1/dubbing/$DUBBING_ID" \
                -H "xi-api-key: $API_KEY" | jq -r '.target_languages[0] // empty')
            LANG_CODE="${LANGS:-}"
        fi

        if [[ -z "$LANG_CODE" ]]; then
            log_error "Could not determine target language"
            echo "Please specify with --target <lang>"
            exit 1
        fi

        log_info "Downloading dubbed audio ($LANG_CODE)..."

        START_TIME=$(date +%s)

        TEMP_OUTPUT="${OUTPUT}.tmp.$$"
        HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_OUTPUT" \
            "https://api.elevenlabs.io/v1/dubbing/$DUBBING_ID/audio/$LANG_CODE" \
            -H "xi-api-key: $API_KEY" 2>&1) || {
            log_error "Failed to connect to ElevenLabs API"
            rm -f "$TEMP_OUTPUT"
            exit 1
        }

        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))

        if handle_api_error "$TEMP_OUTPUT" "$HTTP_CODE"; then
            mv "$TEMP_OUTPUT" "$OUTPUT"
            log_success "Dubbed audio saved to: $OUTPUT (${DURATION}s)"
            
            # Show file size
            FILE_SIZE=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null || echo "0")
            log_info "File size: $(( FILE_SIZE / 1024 / 1024 )) MB"
        else
            rm -f "$TEMP_OUTPUT"
            exit 1
        fi
        ;;

    *)
        log_error "Unknown action: $ACTION"
        usage
        ;;
esac
