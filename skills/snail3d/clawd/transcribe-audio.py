#!/usr/bin/env python3
"""
Transcribe audio files using Groq's Whisper API.
"""

import sys
import os
import requests
import json
from pathlib import Path

def transcribe_audio(audio_path: str, api_key: str) -> str:
    """
    Transcribe audio using Groq Whisper API.
    
    Args:
        audio_path: Path to audio file (ogg, mp3, wav, etc.)
        api_key: Groq API key
    
    Returns:
        Transcribed text
    """
    
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)
    
    # Groq Whisper API endpoint
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    
    # Read audio file
    with open(audio_path, 'rb') as f:
        files = {
            'file': (Path(audio_path).name, f, 'audio/ogg')
        }
        data = {
            'model': 'whisper-large-v3',
            'language': 'en'
        }
        headers = {
            'Authorization': f'Bearer {api_key}'
        }
        
        try:
            response = requests.post(url, files=files, data=data, headers=headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result.get('text', '')
        
        except requests.exceptions.RequestException as e:
            print(f"Error: API request failed: {e}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Failed to parse API response: {e}", file=sys.stderr)
            sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Usage: transcribe-audio.py <audio_file> [--api-key <key>]", file=sys.stderr)
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Get API key from argument or environment
    api_key = None
    if len(sys.argv) > 3 and sys.argv[2] == "--api-key":
        api_key = sys.argv[3]
    else:
        api_key = os.environ.get('GROQ_API_KEY')
    
    if not api_key:
        print("Error: No Groq API key provided. Set GROQ_API_KEY environment variable or use --api-key", file=sys.stderr)
        sys.exit(1)
    
    # Transcribe
    print(f"📝 Transcribing {Path(audio_path).name}...", file=sys.stderr)
    text = transcribe_audio(audio_path, api_key)
    
    if text:
        print(text)
        print(f"\n✅ Transcription complete", file=sys.stderr)
    else:
        print("Error: No transcription returned", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
