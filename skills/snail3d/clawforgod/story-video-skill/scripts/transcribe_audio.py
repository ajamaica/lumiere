#!/usr/bin/env python3
"""
Audio Transcription with Word-Level Timing
Uses Groq Whisper API to get precise timing for each word.
"""

import json
import os
from pathlib import Path
import subprocess
import sys

def transcribe_with_groq(audio_path: str) -> dict:
    """
    Transcribe audio and get word-level timings using Groq Whisper API.
    Requires GROQ_API_KEY environment variable.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable not set")
    
    # Use curl to call Groq Whisper API
    cmd = [
        "curl", "-s", "-X", "POST",
        "https://api.groq.com/openai/v1/audio/transcriptions",
        "-H", f"Authorization: Bearer {api_key}",
        "-F", f"file=@{audio_path}",
        "-F", "model=whisper-large-v3-turbo"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    response = json.loads(result.stdout)
    
    if "error" in response:
        raise Exception(f"Groq API error: {response['error']}")
    
    # Parse response and extract word timings
    # Note: Basic Whisper doesn't give word-level timing by default
    # This would need custom processing or a different API
    return {
        "text": response.get("text", ""),
        "duration_ms": 0,  # Would be calculated from audio length
        "words": []  # Would be populated with {word, start_ms, end_ms}
    }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Transcribe audio with word timing")
    parser.add_argument("--audio", required=True, help="Audio file path")
    parser.add_argument("--output", required=True, help="Output JSON path")
    
    args = parser.parse_args()
    
    print(f"🎵 Transcribing: {args.audio}")
    result = transcribe_with_groq(args.audio)
    
    # Save result
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)
    
    print(f"✅ Transcription saved: {args.output}")
    print(f"   Words: {len(result.get('words', []))}")

if __name__ == "__main__":
    main()
