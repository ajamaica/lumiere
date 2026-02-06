#!/usr/bin/env python3
"""
IMAP IDLE Listener - Event-driven email notifications for OpenClaw

Monitors IMAP accounts using IDLE protocol and triggers OpenClaw webhooks
when new emails arrive. Zero tokens while waiting, instant notifications.

Usage:
    python3 listener.py [--config CONFIG_PATH]

Config format (JSON):
{
  "accounts": [
    {
      "host": "mail.example.com",
      "port": 993,
      "username": "user@example.com",
      "password": "password",
      "ssl": true
    }
  ],
  "webhook_url": "http://127.0.0.1:18789/hooks/wake",
  "webhook_token": "your-webhook-token",
  "log_file": null,
  "idle_timeout": 300,
  "reconnect_interval": 900
}
"""

import sys
import json
import time
import logging
import threading
import urllib.request
from pathlib import Path
from datetime import datetime

try:
    from imapclient import IMAPClient
except ImportError:
    print("ERROR: imapclient library not found", file=sys.stderr)
    print("Install with: pip3 install imapclient --user", file=sys.stderr)
    sys.exit(1)


class IMAPIdleListener:
    def __init__(self, config):
        self.config = config
        self.webhook_url = config['webhook_url']
        self.webhook_token = config['webhook_token']
        self.idle_timeout = config.get('idle_timeout', 300)  # 5 min default
        self.reconnect_interval = config.get('reconnect_interval', 900)  # 15 min default
        
        # Setup logging
        log_file = config.get('log_file')
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler(log_file) if log_file else logging.StreamHandler(),
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def trigger_webhook(self, account, from_addr, subject):
        """Trigger OpenClaw webhook with email notification"""
        try:
            # Truncate message to reasonable length
            text = f"📧 New email in {account}:\nFrom: {from_addr}\nSubject: {subject}"
            text = text[:500]
            
            payload = {
                "text": text,
                "mode": "now"
            }
            
            headers = {
                "Authorization": f"Bearer {self.webhook_token}",
                "Content-Type": "application/json"
            }
            
            req = urllib.request.Request(
                self.webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                self.logger.info(f"✅ Webhook triggered for {account}: {from_addr[:50]}")
                
        except Exception as e:
            self.logger.error(f"❌ Webhook failed for {account}: {e}")
    
    def parse_email_headers(self, header_data):
        """Parse From and Subject from email headers"""
        headers_text = header_data.decode('utf-8', errors='ignore')
        lines = headers_text.split('\n')
        
        from_addr = ""
        subject = ""
        
        for line in lines:
            line_lower = line.lower()
            if line_lower.startswith('from:'):
                from_addr = line[5:].strip()
            elif line_lower.startswith('subject:'):
                subject = line[8:].strip()
        
        return from_addr or "Unknown", subject or "(no subject)"
    
    def listen_account(self, account_config):
        """Monitor one IMAP account with IDLE"""
        host = account_config['host']
        port = account_config.get('port', 993)
        username = account_config['username']
        password = account_config['password']
        ssl = account_config.get('ssl', True)
        
        # Track last processed UID to prevent duplicates
        last_uid = None
        
        # Exponential backoff for reconnects
        backoff = 5
        max_backoff = 300
        
        while True:
            try:
                self.logger.info(f"🔌 Connecting to {username}@{host}...")
                
                # Connect to IMAP server
                client = IMAPClient(host, port=port, ssl=ssl, timeout=30)
                client.login(username, password)
                client.select_folder('INBOX')
                
                # Get current latest UID (don't process old emails on startup)
                messages = client.search(['ALL'])
                if messages:
                    last_uid = max(messages)
                    self.logger.info(f"📬 {username}: Starting from UID {last_uid}")
                
                # Start IDLE mode
                client.idle()
                self.logger.info(f"✅ {username}: IDLE monitoring active")
                
                # Reset backoff on successful connect
                backoff = 5
                
                # Track when we started IDLE for periodic reconnect
                idle_start = time.time()
                
                while True:
                    # Check for IDLE responses (5 min timeout)
                    responses = client.idle_check(timeout=self.idle_timeout)
                    
                    # If we got responses, new mail arrived
                    if responses:
                        self.logger.info(f"📨 {username}: IDLE notification received")
                        
                        # Exit IDLE to check messages
                        client.idle_done()
                        
                        # Search for new messages
                        messages = client.search(['ALL'])
                        if messages:
                            latest_uid = max(messages)
                            
                            # Only process if this is a NEW message
                            if latest_uid != last_uid:
                                # Fetch headers
                                msg_data = client.fetch(
                                    [latest_uid],
                                    ['BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)]']
                                )
                                
                                header_data = msg_data[latest_uid][b'BODY[HEADER.FIELDS (FROM SUBJECT)]']
                                from_addr, subject = self.parse_email_headers(header_data)
                                
                                # Trigger webhook
                                self.trigger_webhook(username, from_addr, subject)
                                
                                # Update last processed UID
                                last_uid = latest_uid
                        
                        # Re-enter IDLE mode
                        client.idle()
                        idle_start = time.time()
                    
                    # Periodic reconnect (every 15 min by default)
                    if time.time() - idle_start > self.reconnect_interval:
                        self.logger.info(f"🔄 {username}: Periodic reconnect")
                        client.idle_done()
                        client.noop()  # Keep-alive
                        client.idle()
                        idle_start = time.time()
                
            except KeyboardInterrupt:
                self.logger.info(f"⏹️  {username}: Stopped by user")
                break
                
            except Exception as e:
                self.logger.error(f"❌ {username}: Connection error: {e}")
                self.logger.info(f"🔁 {username}: Reconnecting in {backoff}s...")
                time.sleep(backoff)
                
                # Exponential backoff
                backoff = min(backoff * 2, max_backoff)
    
    def start(self):
        """Start monitoring all configured accounts"""
        accounts = self.config.get('accounts', [])
        
        if not accounts:
            self.logger.error("❌ No accounts configured")
            return
        
        self.logger.info(f"🚀 Starting IMAP IDLE listener for {len(accounts)} account(s)")
        
        # Start one thread per account
        threads = []
        for account in accounts:
            t = threading.Thread(
                target=self.listen_account,
                args=(account,),
                daemon=True,
                name=f"IMAP-{account['username']}"
            )
            t.start()
            threads.append(t)
        
        # Wait for all threads (blocks until Ctrl+C)
        try:
            for t in threads:
                t.join()
        except KeyboardInterrupt:
            self.logger.info("⏹️  Shutting down...")


def load_config(config_path=None):
    """Load configuration from file"""
    if config_path is None:
        # Default config locations
        default_paths = [
            Path.home() / '.openclaw' / 'imap-idle.json',
            Path.home() / '.config' / 'imap-idle' / 'config.json',
        ]
        
        for path in default_paths:
            if path.exists():
                config_path = path
                break
        
        if config_path is None:
            print("ERROR: No config file found", file=sys.stderr)
            print("Searched:", file=sys.stderr)
            for path in default_paths:
                print(f"  - {path}", file=sys.stderr)
            print("\nRun 'imap-idle-setup' to create config", file=sys.stderr)
            sys.exit(1)
    
    config_path = Path(config_path)
    if not config_path.exists():
        print(f"ERROR: Config file not found: {config_path}", file=sys.stderr)
        sys.exit(1)
    
    with open(config_path) as f:
        return json.load(f)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='IMAP IDLE listener for OpenClaw webhook notifications'
    )
    parser.add_argument(
        '--config',
        help='Path to config file (default: ~/.openclaw/imap-idle.json)'
    )
    
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    
    # Start listener
    listener = IMAPIdleListener(config)
    listener.start()


if __name__ == '__main__':
    main()
