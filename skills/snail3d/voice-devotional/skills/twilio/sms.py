#!/usr/bin/env python3
"""Send SMS messages using Twilio."""

import argparse
import os
import sys
from twilio.rest import Client


def send_sms(to_number: str, message: str, account_sid: str, auth_token: str, from_number: str):
    """Send an SMS message."""
    client = Client(account_sid, auth_token)
    
    msg = client.messages.create(
        body=message,
        to=to_number,
        from_=from_number
    )
    
    print(f"SMS sent!")
    print(f"Message SID: {msg.sid}")
    print(f"Status: {msg.status}")
    return msg.sid


def main():
    parser = argparse.ArgumentParser(description="Send SMS with Twilio")
    parser.add_argument("--to", required=True, help="Phone number to message (E.164 format)")
    parser.add_argument("--message", "-m", required=True, help="Message text")
    parser.add_argument("--account-sid", default=os.getenv("TWILIO_ACCOUNT_SID"), help="Twilio Account SID")
    parser.add_argument("--auth-token", default=os.getenv("TWILIO_AUTH_TOKEN"), help="Twilio Auth Token")
    parser.add_argument("--from", dest="from_number", default=os.getenv("TWILIO_PHONE_NUMBER"), help="Twilio phone number")
    
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
    
    send_sms(to_number, args.message, args.account_sid, args.auth_token, from_number)


if __name__ == "__main__":
    main()
