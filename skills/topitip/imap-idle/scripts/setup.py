#!/usr/bin/env python3
"""
Interactive setup for IMAP IDLE listener

Guides user through configuration and creates config file.
"""

import sys
import json
import getpass
from pathlib import Path


def get_input(prompt, default=None):
    """Get user input with optional default"""
    if default:
        prompt = f"{prompt} [{default}]"
    prompt += ": "
    
    value = input(prompt).strip()
    return value if value else default


def get_yes_no(prompt, default=True):
    """Get yes/no answer"""
    default_str = "Y/n" if default else "y/N"
    value = input(f"{prompt} [{default_str}]: ").strip().lower()
    
    if not value:
        return default
    return value in ('y', 'yes')


def setup_account():
    """Interactive account setup"""
    print("\n" + "="*60)
    print("IMAP Account Configuration")
    print("="*60)
    
    host = get_input("IMAP server hostname (e.g., mail.example.com)")
    port = get_input("IMAP port", "993")
    username = get_input("Username/Email")
    password = getpass.getpass("Password: ")
    ssl = get_yes_no("Use SSL/TLS", True)
    
    return {
        "host": host,
        "port": int(port),
        "username": username,
        "password": password,
        "ssl": ssl
    }


def setup_webhook():
    """Interactive webhook setup"""
    print("\n" + "="*60)
    print("OpenClaw Webhook Configuration")
    print("="*60)
    print("\nWebhook config can be found in ~/.openclaw/openclaw.json")
    print("Look for 'hooks.enabled' and 'hooks.token'")
    print()
    
    url = get_input("Webhook URL", "http://127.0.0.1:18789/hooks/wake")
    token = get_input("Webhook token")
    
    return url, token


def main():
    print("="*60)
    print("IMAP IDLE Listener - Setup Wizard")
    print("="*60)
    
    # Accounts
    accounts = []
    while True:
        account = setup_account()
        accounts.append(account)
        
        if not get_yes_no("\nAdd another account?", False):
            break
    
    # Webhook
    webhook_url, webhook_token = setup_webhook()
    
    # Log file (optional)
    print("\n" + "="*60)
    print("Logging Configuration")
    print("="*60)
    
    use_log_file = get_yes_no("Write logs to file?", True)
    log_file = None
    
    if use_log_file:
        default_log = str(Path.home() / '.openclaw' / 'logs' / 'imap-idle.log')
        log_file = get_input("Log file path", default_log)
        
        # Create log directory if needed
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Build config
    config = {
        "accounts": accounts,
        "webhook_url": webhook_url,
        "webhook_token": webhook_token,
        "log_file": log_file,
        "idle_timeout": 300,
        "reconnect_interval": 900
    }
    
    # Choose config location
    print("\n" + "="*60)
    print("Save Configuration")
    print("="*60)
    
    default_config_path = Path.home() / '.openclaw' / 'imap-idle.json'
    config_path = get_input("Config file path", str(default_config_path))
    config_path = Path(config_path)
    
    # Create directory if needed
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write config
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"\n✅ Configuration saved to: {config_path}")
    print(f"✅ Configured {len(accounts)} account(s)")
    
    print("\n" + "="*60)
    print("Next Steps")
    print("="*60)
    print("1. Test the listener:")
    print(f"   python3 listener.py --config {config_path}")
    print("\n2. Send yourself an email to test webhook")
    print("\n3. Run in background:")
    print(f"   nohup python3 listener.py --config {config_path} &")
    print("\n4. Or install as systemd service (see SKILL.md)")
    
    # Test connection offer
    if get_yes_no("\n\nTest IMAP connection now?", True):
        print("\nTesting connection...")
        test_connection(accounts[0])


def test_connection(account):
    """Test IMAP connection"""
    try:
        from imapclient import IMAPClient
    except ImportError:
        print("❌ imapclient library not installed")
        print("Run: pip3 install imapclient --user")
        return
    
    try:
        print(f"Connecting to {account['username']}@{account['host']}...")
        
        client = IMAPClient(
            account['host'],
            port=account['port'],
            ssl=account['ssl'],
            timeout=10
        )
        
        client.login(account['username'], account['password'])
        client.select_folder('INBOX')
        
        messages = client.search(['ALL'])
        count = len(messages) if messages else 0
        
        client.logout()
        
        print(f"✅ Connection successful! Found {count} messages in INBOX")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")


if __name__ == '__main__':
    main()
