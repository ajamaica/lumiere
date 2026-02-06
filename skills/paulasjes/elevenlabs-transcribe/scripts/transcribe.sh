#!/usr/bin/env bash
set -euo pipefail

# ElevenLabs Speech-to-Text transcription script
# Thin wrapper that manages Python venv and delegates to transcribe.py

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON_SCRIPT="$SCRIPT_DIR/transcribe.py"
REQUIREMENTS="$SCRIPT_DIR/requirements.txt"

show_help() {
    cat << EOF
Usage: $(basename "$0") <audio_file> [options]
       $(basename "$0") --url <url> [options]
       $(basename "$0") --mic [options]

Batch transcription:
  $(basename "$0") audio.mp3              Transcribe file
  $(basename "$0") audio.mp3 --diarize    With speaker labels

Realtime streaming:
  $(basename "$0") audio.mp3 --realtime   Stream from file
  $(basename "$0") --url <url>            Stream from URL
  $(basename "$0") --mic                  Stream from microphone

Options:
  --diarize       Enable speaker diarization
  --lang CODE     ISO language code (e.g., en, pt, es)
  --json          Output full JSON response
  --events        Tag audio events (laughter, music, etc.)
  --partials      Show partial transcripts in realtime mode
  -q, --quiet     Suppress status messages on stderr
  -h, --help      Show this help

Environment:
  ELEVENLABS_API_KEY  Required API key

Note: Requires ffmpeg for audio format conversion.
      First run will create .venv/ and install dependencies.
EOF
    exit 0
}

# Check for help and quiet flags early
QUIET=false
for arg in "$@"; do
    case "$arg" in
        -h|--help) show_help ;;
        -q|--quiet) QUIET=true ;;
    esac
done

# Helper for conditional stderr output
log() {
    if [[ "$QUIET" == "false" ]]; then
        echo "$@" >&2
    fi
}

# Check Python availability
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found. Please install Python 3.8+." >&2
    exit 1
fi

# Check ffmpeg availability (required for audio format conversion)
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg not found." >&2
    echo "" >&2
    echo "ffmpeg is required for audio format conversion. Install it with:" >&2
    echo "  macOS:   brew install ffmpeg" >&2
    echo "  Ubuntu:  sudo apt install ffmpeg" >&2
    echo "  Windows: choco install ffmpeg" >&2
    exit 1
fi

# Setup virtual environment if needed
setup_venv() {
    if [[ ! -d "$VENV_DIR" ]]; then
        log "Setting up virtual environment..."
        python3 -m venv "$VENV_DIR"
    fi

    # Activate venv
    source "$VENV_DIR/bin/activate"

    # Check if dependencies need to be installed
    if [[ ! -f "$VENV_DIR/.installed" ]] || [[ "$REQUIREMENTS" -nt "$VENV_DIR/.installed" ]]; then
        log "Installing dependencies..."
        pip install -q --upgrade pip
        pip install -q -r "$REQUIREMENTS"
        touch "$VENV_DIR/.installed"
    fi
}

# Main
setup_venv

# Run Python script with all arguments
exec python3 "$PYTHON_SCRIPT" "$@"
