#!/bin/bash
# Common utilities for ElevenLabs Voice Studio scripts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if API key is set
check_api_key() {
    if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
        log_error "ELEVENLABS_API_KEY not set"
        echo "Set it via:" >&2
        echo "  - Environment variable: export ELEVENLABS_API_KEY='your_key'" >&2
        echo "  - Config file: ~/.openclaw/openclaw.json" >&2
        echo "    { skills: { entries: { clawvox: { apiKey: 'your_key' } } } }" >&2
        return 1
    fi
    return 0
}

# Validate API key format (basic check)
validate_api_key_format() {
    local key="$1"
    if [[ ${#key} -lt 20 ]]; then
        log_error "API key appears to be invalid (too short)"
        return 1
    fi
    return 0
}

# Validate number within range
validate_number() {
    local val="$1" min="$2" max="$3" name="$4"
    if ! [[ "$val" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        log_error "$name must be a number"
        return 1
    fi
    if (( $(echo "$val < $min" | bc -l 2>/dev/null || echo "0") )) || (( $(echo "$val > $max" | bc -l 2>/dev/null || echo "0") )); then
        log_error "$name must be between $min and $max"
        return 1
    fi
    return 0
}

# Validate file exists
validate_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return 1
    fi
    if [[ ! -r "$file" ]]; then
        log_error "File not readable: $file"
        return 1
    fi
    return 0
}

# Check if required command exists
check_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is required but not installed"
        return 1
    fi
    return 0
}

# Handle API errors
handle_api_error() {
    local response_file="$1"
    local http_code="$2"
    
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "201" ]]; then
        return 0
    fi
    
    log_error "API request failed (HTTP $http_code)"
    
    # Try to parse error message
    if [[ -f "$response_file" ]]; then
        local error_msg
        error_msg=$(cat "$response_file" | jq -r '.detail.message // .detail // .message // "Unknown error"' 2>/dev/null || cat "$response_file")
        echo "  $error_msg" >&2
        rm -f "$response_file"
    fi
    
    # Provide helpful error messages for common codes
    case "$http_code" in
        401)
            echo "  Authentication failed. Check your API key." >&2
            ;;
        403)
            echo "  Permission denied. Your API key may not have access to this feature." >&2
            ;;
        429)
            echo "  Rate limit exceeded. Please wait before trying again." >&2
            ;;
        500|502|503)
            echo "  ElevenLabs API is experiencing issues. Please try again later." >&2
            ;;
    esac
    
    return 1
}

# Get voice ID from name or return as-is if it's already an ID
resolve_voice_id() {
    local voice="$1"
    
    # Common voice mappings
    declare -A VOICE_IDS=(
        ["Rachel"]="21m00Tcm4TlvDq8ikWAM"
        ["Adam"]="pNInz6obpgDQGcFmaJgB"
        ["Antoni"]="ErXwobaYiN019PkySvjV"
        ["Bella"]="EXAVITQu4vr4xnSDxMaL"
        ["Domi"]="AZnzlk1XvdvUeBnXmlld"
        ["Elli"]="MF3mGyEYCl7XYWbV9V6O"
        ["Josh"]="TxGEqnHWrfWFTfGW9XjX"
        ["Sam"]="yoZ06aMxZJJ28mfd3POQ"
        ["Callum"]="N2lVS1w4EtoT3dr4eOWO"
        ["Charlie"]="IKne3meq5aSn9XLyUdCD"
        ["George"]="JBFqnCBsd6RMkjVDRZzb"
        ["Liam"]="TX3LPaxmHKxFdv7VOQHJ"
        ["Matilda"]="XrExE9yKIg1WjnnlVkGX"
        ["Alice"]="Xb7hH8MSUJpSbSDYk0k2"
        ["Bill"]="pqHfZKP75CvOlQylNhV4"
        ["Brian"]="nPczCjzI2devNBz1zQrb"
        ["Chris"]="iP95p4xoKVk53GoZ742B"
        ["Daniel"]="onwK4e9ZLuTAKqWW03F9"
        ["Eric"]="cjVigY5qzO86Huf0OWal"
        ["Jessica"]="cgSgspJ2msm6clMCkdW9"
        ["Laura"]="FGY2WhTYpPnrIDTdsKH5"
        ["Lily"]="pFZP5JQG7iQjIQuC4Bku"
        ["River"]="SAz9YHcvj6GT2YYXdXww"
        ["Roger"]="CwhRBWXzGAHq8TQ4Fs17"
        ["Sarah"]="EXAVITQu4vr4xnSDxMaL"
        ["Will"]="bIHbv24MWmeRgasZH58o"
    )
    
    # Check if it's a known name (case-insensitive)
    for name in "${!VOICE_IDS[@]}"; do
        if [[ "${name,,}" == "${voice,,}" ]]; then
            echo "${VOICE_IDS[$name]}"
            return 0
        fi
    done
    
    # Return as-is (assume it's already a voice ID)
    echo "$voice"
    return 0
}

# Play audio file if possible
play_audio() {
    local file="$1"
    
    if command -v mpv &> /dev/null; then
        mpv "$file" &>/dev/null &
    elif command -v afplay &> /dev/null; then
        afplay "$file" &
    elif command -v aplay &> /dev/null; then
        aplay "$file" &>/dev/null &
    elif command -v play &> /dev/null; then
        play "$file" &>/dev/null &
    else
        return 1
    fi
    return 0
}

# Format duration from seconds
format_duration() {
    local seconds="$1"
    if (( seconds < 60 )); then
        echo "${seconds}s"
    elif (( seconds < 3600 )); then
        echo "$(( seconds / 60 ))m $(( seconds % 60 ))s"
    else
        echo "$(( seconds / 3600 ))h $(( (seconds % 3600) / 60 ))m"
    fi
}

# Check file size and warn if too large
check_file_size() {
    local file="$1"
    local max_size="${2:-104857600}"  # Default 100MB
    
    local size
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
    
    if (( size > max_size )); then
        log_warning "File is large ($(( size / 1024 / 1024 ))MB). This may take a while."
    fi
    
    return 0
}
