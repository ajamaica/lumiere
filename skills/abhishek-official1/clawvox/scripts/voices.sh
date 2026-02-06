#!/bin/bash
# ElevenLabs Voice Studio - Voice Library Management
# Usage: voices.sh <command> [options]

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

# Configuration
API_KEY="${ELEVENLABS_API_KEY:-}"

usage() {
    cat << EOF
Usage: voices.sh <command> [options]

Commands:
  list              List all available voices
  info              Get details about a specific voice
  delete            Delete a custom voice
  preview           Get preview URL for a voice

Options for 'list':
  --category <cat>  Filter by category (premade, cloned, generated)
  --json            Output raw JSON

Options for 'info':
  -i, --id <id>     Voice ID
  -n, --name <name> Voice name (for premade voices)
  --json            Output raw JSON

Options for 'delete':
  -i, --id <id>     Voice ID (required)
  --force           Skip confirmation

Options for 'preview':
  -i, --id <id>     Voice ID
  -n, --name <name> Voice name
  -o, --out <file>  Download preview to file

Examples:
  voices.sh list
  voices.sh list | grep -i "female"
  voices.sh info --name Rachel
  voices.sh info --id 21m00Tcm4TlvDq8ikWAM
  voices.sh delete --id voice_id_here
  voices.sh preview --name Rachel -o preview.mp3
EOF
    exit 1
}

# Check API key
check_api_key || exit 1

# Check for jq
check_command jq || exit 1

# Get command
COMMAND="${1:-}"

# Handle help
if [[ "$COMMAND" == "--help" ]] || [[ "$COMMAND" == "-h" ]] || [[ -z "$COMMAND" ]]; then
    usage
fi

shift || true

case "$COMMAND" in
    list)
        CATEGORY=""
        JSON_OUTPUT=""
        while [[ $# -gt 0 ]]; do
            case $1 in
                --category)
                    CATEGORY="$2"
                    shift 2
                    ;;
                --json)
                    JSON_OUTPUT="true"
                    shift
                    ;;
                -h|--help)
                    usage
                    ;;
                *)
                    log_error "Unknown option: $1"
                    usage
                    ;;
            esac
        done

        log_info "Fetching voices..."
        
        RESPONSE=$(curl -s "https://api.elevenlabs.io/v1/voices" \
            -H "xi-api-key: $API_KEY") || {
            log_error "Failed to connect to ElevenLabs API"
            exit 1
        }

        # Check for errors
        if echo "$RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
            log_error "$(echo "$RESPONSE" | jq -r '.detail.message // .detail')"
            exit 1
        fi

        # Raw JSON output
        if [[ -n "$JSON_OUTPUT" ]]; then
            echo "$RESPONSE" | jq .
            exit 0
        fi

        # Filter by category if specified
        if [[ -n "$CATEGORY" ]]; then
            VOICES=$(echo "$RESPONSE" | jq -r --arg cat "$CATEGORY" '.voices[] | select(.category == $cat) | "\(.voice_id)\t\(.name)\t\(.category // "unknown")\t\(.labels.accent // "")\t\(.labels.gender // "")\t\(.labels.age // "")"')
        else
            VOICES=$(echo "$RESPONSE" | jq -r '.voices[] | "\(.voice_id)\t\(.name)\t\(.category // "unknown")\t\(.labels.accent // "")\t\(.labels.gender // "")\t\(.labels.age // "")"')
        fi

        # Print header
        printf "%-40s %-30s %-12s %-12s %-8s %-8s\n" "VOICE_ID" "NAME" "CATEGORY" "ACCENT" "GENDER" "AGE"
        printf "%-40s %-30s %-12s %-12s %-8s %-8s\n" "$(printf '%*s' 40 '' | tr ' ' '-')" "$(printf '%*s' 30 '' | tr ' ' '-')" "$(printf '%*s' 12 '' | tr ' ' '-')" "$(printf '%*s' 12 '' | tr ' ' '-')" "$(printf '%*s' 8 '' | tr ' ' '-')" "$(printf '%*s' 8 '' | tr ' ' '-')"

        # Print voices
        echo "$VOICES" | while IFS=$'\t' read -r id name category accent gender age; do
            printf "%-40s %-30s %-12s %-12s %-8s %-8s\n" "$id" "$name" "$category" "$accent" "$gender" "$age"
        done

        COUNT=$(echo "$VOICES" | grep -c . || true)
        echo ""
        log_success "Total voices: $COUNT"
        ;;

    info)
        VOICE_ID=""
        JSON_OUTPUT=""
        while [[ $# -gt 0 ]]; do
            case $1 in
                -i|--id)
                    VOICE_ID="$2"
                    shift 2
                    ;;
                -n|--name)
                    # Map common names to IDs
                    VOICE_ID=$(resolve_voice_id "$2")
                    shift 2
                    ;;
                --json)
                    JSON_OUTPUT="true"
                    shift
                    ;;
                -h|--help)
                    usage
                    ;;
                *)
                    log_error "Unknown option: $1"
                    usage
                    ;;
            esac
        done

        if [[ -z "$VOICE_ID" ]]; then
            log_error "Voice ID or name is required"
            usage
        fi

        log_info "Fetching voice info..."
        
        RESPONSE=$(curl -s "https://api.elevenlabs.io/v1/voices/$VOICE_ID" \
            -H "xi-api-key: $API_KEY") || {
            log_error "Failed to connect to ElevenLabs API"
            exit 1
        }

        # Check for errors
        if echo "$RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
            log_error "$(echo "$RESPONSE" | jq -r '.detail.message // .detail')"
            exit 1
        fi

        # Raw JSON output
        if [[ -n "$JSON_OUTPUT" ]]; then
            echo "$RESPONSE" | jq .
            exit 0
        fi

        # Pretty print
        echo ""
        echo "=== Voice Information ==="
        echo ""
        echo "Name:        $(echo "$RESPONSE" | jq -r '.name')"
        echo "ID:          $(echo "$RESPONSE" | jq -r '.voice_id')"
        echo "Category:    $(echo "$RESPONSE" | jq -r '.category // "N/A"')"
        echo "Description: $(echo "$RESPONSE" | jq -r '.description // "N/A"')"
        echo ""
        echo "=== Labels ==="
        echo "$RESPONSE" | jq -r '.labels | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  No labels"
        echo ""
        echo "=== Settings ==="
        echo "$RESPONSE" | jq -r '.settings // {} | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || echo "  No settings"
        echo ""
        
        PREVIEW_URL=$(echo "$RESPONSE" | jq -r '.preview_url // empty')
        if [[ -n "$PREVIEW_URL" ]]; then
            echo "Preview URL: $PREVIEW_URL"
        fi
        ;;

    delete)
        VOICE_ID=""
        FORCE=""
        while [[ $# -gt 0 ]]; do
            case $1 in
                -i|--id)
                    VOICE_ID="$2"
                    shift 2
                    ;;
                --force)
                    FORCE="true"
                    shift
                    ;;
                -h|--help)
                    usage
                    ;;
                *)
                    log_error "Unknown option: $1"
                    usage
                    ;;
            esac
        done

        if [[ -z "$VOICE_ID" ]]; then
            log_error "Voice ID is required"
            usage
        fi

        log_warning "Deleting voice: $VOICE_ID"
        
        if [[ -z "$FORCE" ]]; then
            echo -n "Are you sure? This cannot be undone. (yes/no): "
            read -r CONFIRM
            if [[ "$CONFIRM" != "yes" ]]; then
                log_info "Cancelled"
                exit 0
            fi
        fi

        RESPONSE=$(curl -s -X DELETE "https://api.elevenlabs.io/v1/voices/$VOICE_ID" \
            -H "xi-api-key: $API_KEY") || {
            log_error "Failed to connect to ElevenLabs API"
            exit 1
        }

        # Check for errors
        if echo "$RESPONSE" | jq -e '.detail' > /dev/null 2>&1; then
            log_error "$(echo "$RESPONSE" | jq -r '.detail.message // .detail')"
            exit 1
        fi

        log_success "Voice deleted successfully"
        ;;

    preview)
        VOICE_ID=""
        OUTPUT=""
        while [[ $# -gt 0 ]]; do
            case $1 in
                -i|--id)
                    VOICE_ID="$2"
                    shift 2
                    ;;
                -n|--name)
                    VOICE_ID=$(resolve_voice_id "$2")
                    shift 2
                    ;;
                -o|--out)
                    OUTPUT="$2"
                    shift 2
                    ;;
                -h|--help)
                    usage
                    ;;
                *)
                    log_error "Unknown option: $1"
                    usage
                    ;;
            esac
        done

        if [[ -z "$VOICE_ID" ]]; then
            log_error "Voice ID or name is required"
            usage
        fi

        log_info "Fetching voice preview..."
        
        RESPONSE=$(curl -s "https://api.elevenlabs.io/v1/voices/$VOICE_ID" \
            -H "xi-api-key: $API_KEY") || {
            log_error "Failed to connect to ElevenLabs API"
            exit 1
        }

        PREVIEW_URL=$(echo "$RESPONSE" | jq -r '.preview_url // empty')
        
        if [[ -z "$PREVIEW_URL" ]]; then
            log_error "No preview available for this voice"
            exit 1
        fi

        if [[ -n "$OUTPUT" ]]; then
            curl -s -L "$PREVIEW_URL" -o "$OUTPUT" || {
                log_error "Failed to download preview"
                exit 1
            }
            log_success "Preview saved to: $OUTPUT"
        else
            echo "$PREVIEW_URL"
        fi
        ;;

    *)
        log_error "Unknown command: ${COMMAND:-""}"
        usage
        ;;
esac
