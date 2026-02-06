#!/bin/bash

# ElevenLabs Voice Studio - Main CLI

# Usage: elevenlabs <command> [options]

set -euo pipefail

# Get script directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# Colors

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Show help

show_help() {
cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║ ElevenLabs Voice Studio for OpenClaw ║
║ ║
║ A comprehensive voice production studio powered by ElevenLabs ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
elevenlabs <command> [options]

COMMANDS:
speak <text> Convert text to speech
transcribe <file> Transcribe audio to text
clone <samples...> Clone a voice from audio samples
voices <subcommand> Manage voice library
sfx <description> Generate sound effects
isolate <file> Remove background noise from audio
dub <file> Dub audio/video to another language

SPEAK OPTIONS:
-v, --voice <name> Voice name or ID (default: Rachel)
-m, --model <model> TTS model (default: eleven_turbo_v2_5)
-o, --out <file> Output file path
-i, --input <file> Read text from file
--stability <0-1> Voice stability
--similarity <0-1> Similarity boost
--style <0-1> Style exaggeration
--speed <0.5-2> Speech speed
--speaker-boost Enable speaker boost

TRANSCRIBE OPTIONS:
-o, --out <file> Output file path
-l, --language <code> Language hint (e.g., en, es, fr)
-t, --timestamps Include word timestamps
-m, --model <model> Model ID (default: scribe_v1)

CLONE OPTIONS:
-n, --name <name> Name for the cloned voice (required)
-d, --description <text> Voice description
-l, --labels <json> Labels as JSON
--remove-bg-noise Remove background noise from samples

VOICES SUBCOMMANDS:
list List all available voices
info --id <id> Get voice details
delete --id <id> Delete a custom voice
preview --id <id> Get preview URL

SFX OPTIONS:
-d, --duration <seconds> Approximate duration
-o, --out <file> Output file path
--influence <0-1> Prompt influence

ISOLATE OPTIONS:
-o, --out <file> Output file path

DUB OPTIONS:
-t, --target <lang> Target language (required)
-s, --source <lang> Source language
-o, --out <file> Output file path
--status --id <id> Check dubbing status
--download --id <id> Download dubbed audio

ENVIRONMENT:
ELEVENLABS_API_KEY Your ElevenLabs API key (required)
ELEVENLABS_DEFAULT_VOICE Default voice name (default: Rachel)
ELEVENLABS_DEFAULT_MODEL Default TTS model
ELEVENLABS_OUTPUT_DIR Default output directory

VOICES:
Rachel, Adam, Antoni, Bella, Domi, Elli, Josh, Sam,
Callum, Charlie, George, Liam, Matilda, Alice, Bill,
Brian, Chris, Daniel, Eric, Jessica, Laura, Lily,
River, Roger, Sarah, Will

MODELS:
eleven_flash_v2_5 ~75ms latency, 32 languages
eleven_turbo_v2_5 ~250ms latency, 32 languages (default)
eleven_multilingual_v2 ~500ms latency, 29 languages, highest quality

EXAMPLES:
elevenlabs speak "Hello world"
elevenlabs speak -v Adam "Hello from Adam"
elevenlabs transcribe meeting.mp3 -o transcript.txt
elevenlabs clone -n MyVoice sample.mp3
elevenlabs voices list
elevenlabs sfx "Thunder storm"
elevenlabs isolate noisy.mp3 -o clean.mp3
elevenlabs dub -t es audio.mp3

For more information: https://elevenlabs.io/docs
EOF
}

# Show version

show_version() {
echo "ElevenLabs Voice Studio for OpenClaw v1.0.0"
echo "Powered by ElevenLabs API"
}

# Check if scripts directory exists

if [[! -d "$SCRIPTS_DIR"]]; then
echo -e "${RED}Error: Scripts directory not found at $SCRIPTS_DIR${NC}" >&2
exit 1
fi

# Check if no command provided

if [[$# -eq 0]]; then
show_help
exit 0
fi

# Get command

COMMAND="$1"
shift

case "$COMMAND" in
    speak|say|tts)
        if [[ ! -x "$SCRIPTS_DIR/speak.sh" ]]; then
echo -e "${RED}Error: speak.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/speak.sh" "$@"
;;
transcribe|stt|transcription)
if [[! -x "$SCRIPTS_DIR/transcribe.sh"]]; then
echo -e "${RED}Error: transcribe.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/transcribe.sh" "$@"
;;
clone|cloning)
if [[! -x "$SCRIPTS_DIR/clone.sh"]]; then
echo -e "${RED}Error: clone.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/clone.sh" "$@"
;;
voices|voice)
if [[! -x "$SCRIPTS_DIR/voices.sh"]]; then
echo -e "${RED}Error: voices.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/voices.sh" "$@"
;;
sfx|sound|sound-effects)
if [[! -x "$SCRIPTS_DIR/sfx.sh"]]; then
echo -e "${RED}Error: sfx.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/sfx.sh" "$@"
;;
isolate|isolation|clean)
if [[! -x "$SCRIPTS_DIR/isolate.sh"]]; then
echo -e "${RED}Error: isolate.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/isolate.sh" "$@"
;;
dub|dubbing|translate)
if [[! -x "$SCRIPTS_DIR/dub.sh"]]; then
echo -e "${RED}Error: dub.sh not found or not executable${NC}" >&2
exit 1
fi
"$SCRIPTS_DIR/dub.sh" "$@"
;;
help|--help|-h)
show_help
;;
version|--version|-v)
show_version
;;
\*)
echo -e "${RED}Error: Unknown command '$COMMAND'${NC}" >&2
echo "" >&2
show_help
exit 1
;;
esac
