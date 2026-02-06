#!/usr/bin/env python3
"""Webhook server for receiving Twilio SMS and forwarding to Clawdbot."""

import json
import os
import subprocess
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs

# Import the SMS assistant
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sms_assistant import process_sms

CONVERSATIONS_FILE = "conversations.json"


def load_conversations():
    """Load conversation history from JSON file."""
    if os.path.exists(CONVERSATIONS_FILE):
        with open(CONVERSATIONS_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_conversations(conversations):
    """Save conversation history to JSON file."""
    with open(CONVERSATIONS_FILE, 'w') as f:
        json.dump(conversations, f, indent=2)


def log_message(from_number, to_number, body, direction="inbound"):
    """Log a message to the conversation history."""
    conversations = load_conversations()
    
    # Use the sender's number as the conversation key
    key = from_number if direction == "inbound" else to_number
    
    if key not in conversations:
        conversations[key] = {
            "phone": from_number if direction == "inbound" else to_number,
            "messages": []
        }
    
    conversations[key]["messages"].append({
        "timestamp": datetime.now().isoformat(),
        "from": from_number,
        "to": to_number,
        "body": body,
        "direction": direction
    })
    
    # Keep only last 100 messages per conversation
    conversations[key]["messages"] = conversations[key]["messages"][-100:]
    
    save_conversations(conversations)
    
    # Also log to console/file for Clawdbot to pick up
    log_entry = {
        "type": "sms_received",
        "from": from_number,
        "to": to_number,
        "body": body,
        "timestamp": datetime.now().isoformat()
    }
    
    # Write to a file that Clawdbot can poll
    with open("incoming_sms.log", "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    return log_entry


class SMSHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass
    
    def do_GET(self):
        """Handle GET requests (health check)."""
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Twilio SMS Webhook Server OK")
    
    def do_POST(self):
        """Handle incoming SMS from Twilio."""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        # Parse Twilio's form data
        params = parse_qs(post_data)
        
        # Extract SMS data
        from_number = params.get('From', [''])[0]
        to_number = params.get('To', [''])[0]
        body = params.get('Body', [''])[0]
        message_sid = params.get('MessageSid', [''])[0]
        
        print(f"\n[RECEIVED SMS]")
        print(f"From: {from_number}")
        print(f"To: {to_number}")
        print(f"Body: {body}")
        print(f"Message SID: {message_sid}")
        
        # Log the message
        log_entry = log_message(from_number, to_number, body, "inbound")
        
        # Process with SMS assistant
        result = process_sms(from_number, body)
        
        # Build TwiML response
        if result.get('reply'):
            reply_text = result['reply']
            twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply_text}</Message></Response>'
            print(f"[REPLY] {reply_text[:100]}...")
        else:
            twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        
        self.send_response(200)
        self.send_header('Content-type', 'text/xml')
        self.end_headers()
        self.wfile.write(twiml.encode())
        
        # Notify Eric via Telegram about the action
        if result.get('action'):
            try:
                action_msg = f"📱 Magda sent an SMS command:\n\n'{body}'\n\n→ {result['reply']}"
                # This would ideally call Clawdbot's message API
                # For now, log it for polling
                with open("eric_notifications.log", "a") as f:
                    f.write(json.dumps({
                        "timestamp": datetime.now().isoformat(),
                        "type": "magda_action",
                        "message": action_msg,
                        "result": result
                    }) + "\n")
            except Exception as e:
                print(f"[NOTIFY ERROR] {e}")
        
        print(f"[LOGGED] Message saved and processed")


def run_server(port=5000):
    """Start the webhook server."""
    server = HTTPServer(('0.0.0.0', port), SMSHandler)
    print(f"=" * 60)
    print(f"Twilio SMS Webhook Server")
    print(f"=" * 60)
    print(f"Listening on http://0.0.0.0:{port}")
    print(f"\nTo receive SMS:")
    print(f"1. Expose this server publicly (ngrok http {port})")
    print(f"2. Set Twilio webhook URL to: https://your-ngrok-url/sms")
    print(f"3. Watch incoming_sms.log for new messages")
    print(f"\nPress Ctrl+C to stop")
    print(f"=" * 60)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        server.shutdown()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    run_server(port)
