#!/usr/bin/env python3
"""
Manus Webhook Server
Receive real-time notifications when tasks complete.

Usage: python3 webhook_server.py [PORT]
Default port: 8080
"""

import os
import sys
import json
import time
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

API_BASE = "https://api.manus.ai/v1"

def get_api_key():
    api_key = os.environ.get("MANUS_API_KEY")
    config_path = os.path.expanduser("~/.clawdbot/clawdbot.json")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
            api_key = config.get("skills", {}).get("manus", {}).get("apiKey", api_key)
        except:
            pass
    return api_key

class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Custom log format."""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {args[0]}")
    
    def do_POST(self):
        """Handle webhook POST requests."""
        if self.path == "/webhook/manus":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode("utf-8"))
                self.handle_manus_webhook(data)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "ok"}')
                
            except Exception as e:
                print(f"❌ Error processing webhook: {e}")
                self.send_response(400)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()
    
    def handle_manus_webhook(self, data):
        """Process Manus webhook data."""
        event_type = data.get("event", "unknown")
        
        print("\n" + "=" * 60)
        print(f"📢 Manus Webhook: {event_type}")
        print("=" * 60)
        
        if event_type == "task.completed":
            task = data.get("task", {})
            task_id = task.get("id", "N/A")
            title = task.get("metadata", {}).get("task_title", "N/A")
            
            print(f"✅ Task Completed!")
            print(f"   ID: {task_id}")
            print(f"   Title: {title}")
            print(f"   URL: https://manus.im/app/{task_id}")
            
            credit_usage = task.get("credit_usage", 0)
            if credit_usage:
                print(f"   Credits: {credit_usage}")
        
        elif event_type == "task.failed":
            task = data.get("task", {})
            task_id = task.get("id", "N/A")
            error = task.get("error", "Unknown error")
            
            print(f"❌ Task Failed!")
            print(f"   ID: {task_id}")
            print(f"   Error: {error}")
        
        elif event_type == "task.created":
            task = data.get("task", {})
            task_id = task.get("id", "N/A")
            title = task.get("metadata", {}).get("task_title", "N/A")
            
            print(f"📋 Task Created")
            print(f"   ID: {task_id}")
            print(f"   Title: {title}")
        
        print()

def register_webhook(api_key, webhook_url):
    """Register the webhook with Manus."""
    url = f"{API_BASE}/webhooks"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "API_KEY": api_key
    }
    data = {
        "url": webhook_url,
        "events": [
            "task.created",
            "task.completed",
            "task.failed"
        ]
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error registering webhook: {response.text}")
        return None
    
    result = response.json()
    print(f"✅ Webhook registered!")
    print(f"   ID: {result.get('id')}")
    return result.get("id")

def main():
    parser = argparse.ArgumentParser(
        description="Manus Webhook Server"
    )
    parser.add_argument(
        "port",
        type=int,
        nargs="?",
        default=8080,
        help="Port to listen on (default: 8080)"
    )
    parser.add_argument(
        "--register",
        action="store_true",
        help="Register webhook with Manus API"
    )
    parser.add_argument(
        "--url",
        help="Webhook URL for registration (required with --register)"
    )
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    
    if args.register:
        if not args.url:
            print("❌ Error: --url required with --register")
            print("   Example: python3 webhook_server.py 8080 --register --url https://your-domain.com/webhook/manus")
            sys.exit(1)
        
        print("🔗 Registering webhook with Manus...")
        register_webhook(api_key, args.url)
        print()
    
    print("🧠 Manus Webhook Server")
    print("=" * 40)
    print(f"Listening on port: {args.port}")
    print(f"Webhook endpoint: /webhook/manus")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 40)
    
    server = HTTPServer(("0.0.0.0", args.port), WebhookHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.shutdown()

if __name__ == "__main__":
    main()
