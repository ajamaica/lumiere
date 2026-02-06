#!/usr/bin/env python3
"""Make voice calls using Twilio + ElevenLabs TTS."""

import argparse
import os
import sys
import requests
from twilio.rest import Client

ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Default voice


def generate_tts_audio(text: str, api_key: str) -> str:
    """Generate TTS audio with ElevenLabs and return a public URL."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    # For a real implementation, you'd upload this to a public URL
    # For now, we'll use Twilio's <Say> verb instead which doesn't need hosted audio
    return None


def make_call(to_number: str, message: str, account_sid: str, auth_token: str, from_number: str):
    """Make a voice call using Twilio's <Say> verb."""
    client = Client(account_sid, auth_token)
    
    # Use TwiML to speak the message directly
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Say>{message}</Say></Response>'
    
    call = client.calls.create(
        twiml=twiml,
        to=to_number,
        from_=from_number
    )
    
    print(f"Call initiated!")
    print(f"Call SID: {call.sid}")
    print(f"Status: {call.status}")
    return call.sid


def main():
    parser = argparse.ArgumentParser(description="Make a voice call with Twilio")
    parser.add_argument("--to", required=True, help="Phone number to call (E.164 format)")
    parser.add_argument("--message", "-m", required=True, help="Message to speak")
    parser.add_argument("--account-sid", default=os.getenv("TWILIO_ACCOUNT_SID"), help="Twilio Account SID")
    parser.add_argument("--auth-token", default=os.getenv("TWILIO_AUTH_TOKEN"), help="Twilio Auth Token")
    parser.add_argument("--from", dest="from_number", default=os.getenv("TWILIO_PHONE_NUMBER"), help="Twilio phone number")
    parser.add_argument("--elevenlabs-key", default=os.getenv("ELEVENLABS_API_KEY"), help="ElevenLabs API key (optional)")
    
    args = parser.parse_args()
    
    # Validate credentials
    if not args.account_sid or not args.auth_token:
        print("Error: Twilio credentials required. Set env vars or pass --account-sid/--auth-token", file=sys.stderr)
        sys.exit(1)
    
    if not args.from_number:
        print("Error: From number required. Set TWILIO_PHONE_NUMBER or pass --from", file=sys.stderr)
        sys.exit(1)
    
    # Ensure proper E.164 format
    to_number = args.to if args.to.startswith("+") else f"+1{args.to.replace('-', '').replace(' ', '')}"
    from_number = args.from_number if args.from_number.startswith("+") else f"+1{args.from_number.replace('-', '').replace(' ', '')}"
    
    make_call(to_number, args.message, args.account_sid, args.auth_token, from_number)


if __name__ == "__main__":
    main()
