#!/usr/bin/env python3
"""Send SMS replies to conversations."""

import argparse
import json
import os
import sys
from twilio.rest import Client


def load_conversations():
    """Load conversation history."""
    conv_file = "conversations.json"
    if os.path.exists(conv_file):
        with open(conv_file, 'r') as f:
            return json.load(f)
    return {}


def send_reply(to_number, message, account_sid=None, auth_token=None, from_number=None):
    """Send an SMS reply."""
    # Get credentials
    account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN")
    from_number = from_number or os.getenv("TWILIO_PHONE_NUMBER")
    
    if not all([account_sid, auth_token, from_number]):
        print("Error: Missing Twilio credentials", file=sys.stderr)
        sys.exit(1)
    
    # Ensure E.164 format
    if not to_number.startswith('+'):
        to_number = f"+1{to_number.replace('-', '').replace(' ', '')}"
    if not from_number.startswith('+'):
        from_number = f"+1{from_number.replace('-', '').replace(' ', '')}"
    
    # Send SMS
    client = Client(account_sid, auth_token)
    
    try:
        msg = client.messages.create(
            body=message,
            to=to_number,
            from_=from_number
        )
        
        # Log the reply
        conversations = load_conversations()
        if to_number not in conversations:
            conversations[to_number] = {"phone": to_number, "messages": []}
        
        conversations[to_number]["messages"].append({
            "timestamp": msg.date_created.isoformat() if msg.date_created else None,
            "from": from_number,
            "to": to_number,
            "body": message,
            "direction": "outbound",
            "message_sid": msg.sid
        })
        
        with open("conversations.json", 'w') as f:
            json.dump(conversations, f, indent=2)
        
        print(f"Reply sent!")
        print(f"  To: {to_number}")
        print(f"  Message: {message}")
        print(f"  Message SID: {msg.sid}")
        
        return msg.sid
        
    except Exception as e:
        print(f"Error sending reply: {e}", file=sys.stderr)
        sys.exit(1)


def list_conversations():
    """List all active conversations."""
    conversations = load_conversations()
    
    if not conversations:
        print("No conversations yet.")
        return
    
    print(f"\n{'Phone':<20} {'Last Message':<50} {'Messages'}")
    print("=" * 90)
    
    for phone, data in conversations.items():
        messages = data.get("messages", [])
        if messages:
            last_msg = messages[-1]
            preview = last_msg.get("body", "")[:47] + "..." if len(last_msg.get("body", "")) > 50 else last_msg.get("body", "")
            print(f"{phone:<20} {preview:<50} {len(messages)}")


def show_conversation(phone):
    """Show full conversation history."""
    conversations = load_conversations()
    
    if phone not in conversations:
        print(f"No conversation found for {phone}")
        return
    
    print(f"\nConversation with {phone}")
    print("=" * 60)
    
    for msg in conversations[phone].get("messages", []):
        direction = "→" if msg.get("direction") == "outbound" else "←"
        timestamp = msg.get("timestamp", "")[11:19] if msg.get("timestamp") else ""
        body = msg.get("body", "")
        print(f"[{timestamp}] {direction} {body}")


def poll_incoming():
    """Poll for incoming messages and print them."""
    log_file = "incoming_sms.log"
    
    if not os.path.exists(log_file):
        print("No incoming messages yet.")
        return
    
    with open(log_file, 'r') as f:
        lines = f.readlines()
    
    if not lines:
        print("No new messages.")
        return
    
    # Clear the log file after reading
    open(log_file, 'w').close()
    
    print(f"\n{'New Incoming Messages':=^60}")
    for line in lines:
        try:
            msg = json.loads(line.strip())
            print(f"\nFrom: {msg.get('from')}")
            print(f"Time: {msg.get('timestamp')}")
            print(f"Message: {msg.get('body')}")
            print("-" * 60)
        except json.JSONDecodeError:
            continue


def main():
    parser = argparse.ArgumentParser(description="Manage SMS conversations and replies")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Reply command
    reply_parser = subparsers.add_parser("reply", help="Send a reply")
    reply_parser.add_argument("--to", "-t", required=True, help="Phone number to reply to")
    reply_parser.add_argument("--message", "-m", required=True, help="Reply message")
    reply_parser.add_argument("--account-sid", help="Twilio Account SID")
    reply_parser.add_argument("--auth-token", help="Twilio Auth Token")
    reply_parser.add_argument("--from", dest="from_number", help="Twilio phone number")
    
    # List command
    subparsers.add_parser("list", help="List all conversations")
    
    # Show command
    show_parser = subparsers.add_parser("show", help="Show conversation history")
    show_parser.add_argument("phone", help="Phone number to show")
    
    # Poll command
    subparsers.add_parser("poll", help="Poll for new incoming messages")
    
    args = parser.parse_args()
    
    if args.command == "reply":
        send_reply(
            args.to, 
            args.message,
            args.account_sid,
            args.auth_token,
            args.from_number
        )
    elif args.command == "list":
        list_conversations()
    elif args.command == "show":
        show_conversation(args.phone)
    elif args.command == "poll":
        poll_incoming()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
