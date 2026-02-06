#!/usr/bin/env python3
"""
Audio transcription script using Groq API (Whisper).

Requires: GROQ_API_KEY environment variable
Optional: ffmpeg for format conversion (auto-detected)

Usage:
    export GROQ_API_KEY="your-key"
    python3 transcribe.py /path/to/audio.ogg

Output: Transcribed text to stdout
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path
import requests

GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = "whisper-large-v3"  # Groq's fastest Whisper model
FFMPEG = "ffmpeg"


def check_dependencies():
    """Check if required tools are installed."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print(f"Error: GROQ_API_KEY environment variable not set", file=sys.stderr)
        print("Set it with: export GROQ_API_KEY='your-key-here'", file=sys.stderr)
        return False

    # Check for ffmpeg (optional but recommended for format conversion)
    try:
        subprocess.run([FFMPEG, "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"Warning: ffmpeg not found", file=sys.stderr)
        print("Install with: brew install ffmpeg", file=sys.stderr)
        print("Without ffmpeg, only WAV files are supported", file=sys.stderr)

    return True


def convert_to_wav_if_needed(input_path, output_path="/tmp/transcribe_temp.wav"):
    """Convert audio file to WAV format if needed (for ffmpeg support)."""
    # If already WAV, return as-is
    if str(input_path).lower().endswith('.wav'):
        return input_path

    # Try ffmpeg conversion
    try:
        subprocess.run(
            [
                FFMPEG, "-y", "-i", str(input_path),
                "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                str(output_path)
            ],
            capture_output=True,
            check=True
        )
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"Error converting audio: {e.stderr.decode()}", file=sys.stderr)
        return None
    except FileNotFoundError:
        # No ffmpeg available - try direct upload
        print(f"ffmpeg not available, uploading original file", file=sys.stderr)
        return input_path


def transcribe(audio_path):
    """Transcribe audio file using Groq API."""
    api_key = os.environ.get("GROQ_API_KEY")

    try:
        with open(audio_path, "rb") as audio_file:
            response = requests.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}"
                },
                files={
                    "file": audio_file
                },
                data={
                    "model": GROQ_MODEL,
                    "response_format": "text"
                }
            )

        response.raise_for_status()
        return response.text.strip()
    except requests.exceptions.RequestException as e:
        print(f"Error transcribing: {e}", file=sys.stderr)
        if hasattr(e, 'response') and e.response:
            print(f"API response: {e.response.text}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio files using Groq API")
    parser.add_argument("audio_file", help="Path to audio file (ogg, mp3, wav, m4a, etc.)")
    args = parser.parse_args()

    if not check_dependencies():
        sys.exit(1)

    input_path = Path(args.audio_file)
    if not input_path.exists():
        print(f"Error: File not found: {args.audio_file}", file=sys.stderr)
        sys.exit(1)

    # Convert to WAV if needed (for ffmpeg support)
    audio_path = convert_to_wav_if_needed(input_path)
    if not audio_path:
        sys.exit(1)

    # Transcribe using Groq API
    text = transcribe(audio_path)

    # Cleanup temp file if we created one
    temp_file = "/tmp/transcribe_temp.wav"
    if audio_path != str(input_path) and os.path.exists(temp_file):
        os.remove(temp_file)

    if text:
        print(text)
    else:
        print("[No transcription detected]", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
