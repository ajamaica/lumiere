#!/usr/bin/env python3
"""
SMS Response Tool for Twilio Integration

Send SMS replies to phone numbers that have previously texted you.
Uses conversation history to maintain context.
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path

from twilio.rest import Client

# Configuration
CONVERSATION_DB = Path.home() / ".clawd" / "twilio_conversations.json"
LOG_FILE = Path.home() / ".clawd" / "twilio_webhook.log"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def load_conversations():
    """Load conversation history from JSON file."""
    if CONVERSATION_DB.exists():
        try:
            with open(CONVERSATION_DB, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load conversations: {e}")
            return {}
    return {}


def save_conversations(conversations):
    """Save conversation history to JSON file."""
    try:
        with open(CONVERSATION_DB, 'w') as f:
            json.dump(conversations, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to save conversations: {e}")


def add_message_to_conversation(phone_number, direction, message_body, message_sid=None):
    """Add a message to conversation history."""
    conversations = load_conversations()
    
    if phone_number not in conversations:
        conversations[phone_number] = {
            "phone": phone_number,
            "created_at": datetime.now().isoformat(),
            "last_message_at": None,
            "message_count": 0,
            "messages": []
        }
    
    msg_entry = {
        "timestamp": datetime.now().isoformat(),
        "direction": direction,
        "body": message_body,
        "sid": message_sid
    }
    
    conversations[phone_number]["messages"].append(msg_entry)
    conversations[phone_number]["message_count"] = len(conversations[phone_number]["messages"])
    conversations[phone_number]["last_message_at"] = datetime.now().isoformat()
    
    save_conversations(conversations)
    logger.info(f"Recorded {direction} message to {phone_number}")


def get_conversation_context(phone_number, limit=5):
    """Get recent conversation history for context."""
    conversations = load_conversations()
    
    if phone_number not in conversations:
        return None
    
    messages = conversations[phone_number]["messages"][-limit:]
    return {
        "phone": phone_number,
        "message_count": conversations[phone_number]["message_count"],
        "created_at": conversations[phone_number]["created_at"],
        "last_message_at": conversations[phone_number]["last_message_at"],
        "recent_messages": messages
    }


def send_sms(to_number, message, account_sid, auth_token, from_number):
    """Send an SMS message via Twilio."""
    try:
        client = Client(account_sid, auth_token)
        
        msg = client.messages.create(
            body=message,
            to=to_number,
            from_=from_number
        )
        
        logger.info(f"SMS sent to {to_number}")
        logger.info(f"Message SID: {msg.sid}")
        logger.info(f"Status: {msg.status}")
        
        # Record in conversation history
        add_message_to_conversation(to_number, "outbound", message, msg.sid)
        
        return {
            "status": "success",
            "message_sid": msg.sid,
            "phone": to_number,
            "message": message,
            "from_number": from_number,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        return {
            "status": "error",
            "phone": to_number,
            "error": str(e)
        }


def normalize_phone_number(phone_number):
    """Ensure phone number is in E.164 format."""
    phone = phone_number.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
    
    if not phone.startswith('+'):
        # Assume US number if no country code
        if len(phone) == 10:
            phone = '+1' + phone
        elif len(phone) == 11 and phone.startswith('1'):
            phone = '+' + phone
        else:
            phone = '+' + phone
    
    return phone


def main():
    parser = argparse.ArgumentParser(
        description="Send SMS replies via Twilio",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Send a simple reply
  python respond_sms.py --to "+19152134309" --message "Hello back!"
  
  # Send reply with JSON output
  python respond_sms.py --to "+19152134309" --message "Test" --json
  
  # View recent messages from someone
  python respond_sms.py --to "+19152134309" --view
  
  # List all conversations
  python respond_sms.py --list-conversations
        """
    )
    
    parser.add_argument("--to", "-t", help="Phone number to reply to (E.164 format or 10-digit US number)")
    parser.add_argument("--message", "-m", help="Reply message")
    parser.add_argument("--view", action="store_true", help="View conversation with this number")
    parser.add_argument("--list-conversations", action="store_true", help="List all active conversations")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--account-sid", default=os.getenv("TWILIO_ACCOUNT_SID"), help="Twilio Account SID")
    parser.add_argument("--auth-token", default=os.getenv("TWILIO_AUTH_TOKEN"), help="Twilio Auth Token")
    parser.add_argument("--from", dest="from_number", default=os.getenv("TWILIO_PHONE_NUMBER"), help="Twilio phone number")
    
    args = parser.parse_args()
    
    # List conversations if requested
    if args.list_conversations:
        conversations = load_conversations()
        
        if not conversations:
            print("No conversations yet.")
            return
        
        print(f"\n{'Phone Number':<15} {'Messages':<10} {'Last Message':<30}")
        print("-" * 55)
        
        for phone, conv in sorted(conversations.items()):
            last_msg = conv['last_message_at'][:10] if conv['last_message_at'] else 'N/A'
            print(f"{phone:<15} {conv['message_count']:<10} {last_msg:<30}")
        
        print(f"\nTotal: {len(conversations)} conversations")
        return
    
    # View conversation if requested
    if args.view and args.to:
        phone = normalize_phone_number(args.to)
        context = get_conversation_context(phone)
        
        if not context:
            print(f"No conversation found with {phone}")
            return
        
        print(f"\nConversation with {phone}")
        print(f"Started: {context['created_at']}")
        print(f"Total messages: {context['message_count']}")
        print("\nRecent messages:")
        print("-" * 60)
        
        for msg in context['recent_messages']:
            direction = "→ You" if msg['direction'] == 'outbound' else "← Them"
            timestamp = msg['timestamp'].split('T')[1][:5]  # HH:MM format
            print(f"[{timestamp}] {direction}: {msg['body']}")
        
        return
    
    # Send SMS if requested
    if args.to and args.message:
        # Validate credentials
        if not args.account_sid or not args.auth_token or not args.from_number:
            print("Error: Twilio credentials required", file=sys.stderr)
            print("Set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER", file=sys.stderr)
            sys.exit(1)
        
        # Normalize phone numbers
        to_number = normalize_phone_number(args.to)
        from_number = normalize_phone_number(args.from_number)
        
        # Send SMS
        result = send_sms(to_number, args.message, args.account_sid, args.auth_token, from_number)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result['status'] == 'success':
                print(f"✓ SMS sent to {to_number}")
                print(f"  SID: {result['message_sid']}")
                print(f"  Message: {result['message']}")
            else:
                print(f"✗ Failed to send SMS: {result['error']}", file=sys.stderr)
                sys.exit(1)
        
        return
    
    # Show help if no action specified
    parser.print_help()


if __name__ == "__main__":
    main()
