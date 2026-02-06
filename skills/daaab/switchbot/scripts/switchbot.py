#!/usr/bin/env python3
"""
SwitchBot Cloud API Controller
Requires: ~/.config/switchbot/credentials.json with token and secret
"""

import json
import time
import hashlib
import hmac
import base64
import urllib.request
import urllib.error
import sys
import os
from pathlib import Path

CREDENTIALS_PATH = Path.home() / ".config" / "switchbot" / "credentials.json"
API_BASE = "https://api.switch-bot.com/v1.1"

def load_credentials():
    """Load API credentials from config file."""
    if not CREDENTIALS_PATH.exists():
        print(f"❌ Credentials not found at {CREDENTIALS_PATH}")
        print("\nSetup required! Ask your human to:")
        print("1. Open SwitchBot App → Profile → Preferences → About → Developer Options")
        print("2. Copy Token and Secret Key")
        print("\nThen create the credentials file:")
        print(f"  mkdir -p {CREDENTIALS_PATH.parent}")
        print(f"  chmod 700 {CREDENTIALS_PATH.parent}")
        print(f'  echo \'{{"token": "YOUR_TOKEN", "secret": "YOUR_SECRET"}}\' > {CREDENTIALS_PATH}')
        print(f"  chmod 600 {CREDENTIALS_PATH}")
        sys.exit(1)
    
    with open(CREDENTIALS_PATH) as f:
        return json.load(f)

def get_headers(token: str, secret: str) -> dict:
    """Generate API headers with HMAC-SHA256 signature."""
    t = int(time.time() * 1000)
    nonce = f"clawdbot{t}"
    string_to_sign = f"{token}{t}{nonce}"
    
    sign = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')
    
    return {
        "Authorization": token,
        "sign": sign,
        "t": str(t),
        "nonce": nonce,
        "Content-Type": "application/json"
    }

def api_request(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    """Make an API request to SwitchBot Cloud."""
    creds = load_credentials()
    headers = get_headers(creds['token'], creds['secret'])
    url = f"{API_BASE}{endpoint}"
    
    if data:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method=method
        )
    else:
        req = urllib.request.Request(url, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return {"statusCode": e.code, "message": str(e)}
    except urllib.error.URLError as e:
        return {"statusCode": -1, "message": f"Network error: {e}"}

def list_devices():
    """List all SwitchBot devices."""
    result = api_request("/devices")
    
    if result.get('statusCode') != 100:
        print(f"❌ Error: {result.get('message', 'Unknown error')}")
        return
    
    devices = result.get('body', {}).get('deviceList', [])
    infrared = result.get('body', {}).get('infraredRemoteList', [])
    
    print(f"📱 Found {len(devices)} devices:\n")
    
    for d in devices:
        hub_id = d.get('hubDeviceId', '')
        hub_info = f" (via {hub_id})" if hub_id else ""
        print(f"  {d.get('deviceName')}")
        print(f"    ID: {d.get('deviceId')}")
        print(f"    Type: {d.get('deviceType')}{hub_info}")
        print()
    
    if infrared:
        print(f"📡 Found {len(infrared)} IR devices:\n")
        for d in infrared:
            print(f"  {d.get('deviceName')}: {d.get('deviceId')} ({d.get('remoteType')})")

def get_device_status(device_id: str):
    """Get status of a device."""
    result = api_request(f"/devices/{device_id}/status")
    
    if result.get('statusCode') != 100:
        print(f"❌ Error: {result.get('message', 'Unknown error')}")
        return
    
    body = result.get('body', {})
    print(f"📊 Device Status: {device_id}\n")
    
    for key, value in body.items():
        if key != 'deviceId':
            print(f"  {key}: {value}")

def send_command(device_id: str, command: str, parameter: str = "default"):
    """Send a command to a device."""
    data = {
        "command": command,
        "parameter": parameter,
        "commandType": "command"
    }
    
    result = api_request(f"/devices/{device_id}/commands", method="POST", data=data)
    
    status_code = result.get('statusCode')
    if status_code == 100:
        print(f"✅ Command sent successfully")
    else:
        error_messages = {
            151: "Device offline - check Hub connection",
            152: "Command not supported by this device",
            160: "Unknown command",
            161: "Invalid parameters",
            190: "Internal server error"
        }
        msg = error_messages.get(status_code, result.get('message', 'Unknown error'))
        print(f"❌ Error ({status_code}): {msg}")

def control_curtain(device_id: str, action: str):
    """Control a curtain device."""
    if action == "open":
        position = "0"
    elif action == "close":
        position = "100"
    elif action.isdigit():
        position = action
    else:
        print(f"❌ Invalid action: {action}")
        print("Use: open, close, or a number 0-100")
        return
    
    # Curtain3 uses: index, mode, position
    # index: 0=both/single, 1=left, 2=right
    # mode: 0=performance, 1=silent, ff=default
    send_command(device_id, "setPosition", f"0,ff,{position}")
    
    if position == "0":
        print("🪟 Curtain opening...")
    elif position == "100":
        print("🪟 Curtain closing...")
    else:
        print(f"🪟 Curtain moving to {position}%...")

def control_plug(device_id: str, action: str):
    """Control a plug or switch device."""
    if action == "on":
        send_command(device_id, "turnOn")
        print("💡 Turning on...")
    elif action == "off":
        send_command(device_id, "turnOff")
        print("💡 Turning off...")
    elif action == "toggle":
        send_command(device_id, "toggle")
        print("💡 Toggling...")
    else:
        print(f"❌ Invalid action: {action}")
        print("Use: on, off, or toggle")

def print_usage():
    """Print usage information."""
    print("""
SwitchBot Controller 🏠

Usage:
  switchbot.py list                          - List all devices
  switchbot.py status <device_id>            - Get device status
  switchbot.py curtain <device_id> <action>  - Control curtain (open/close/0-100)
  switchbot.py plug <device_id> <action>     - Control plug/light (on/off/toggle)
  switchbot.py command <device_id> <cmd> [param] - Send raw command

Examples:
  switchbot.py list
  switchbot.py curtain ABC123DEF456 open
  switchbot.py plug XYZ789 off
  switchbot.py command ABC123 setBrightness 50
""")

def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "list":
        list_devices()
    
    elif cmd == "status":
        if len(sys.argv) < 3:
            print("❌ Usage: switchbot.py status <device_id>")
            sys.exit(1)
        get_device_status(sys.argv[2])
    
    elif cmd == "curtain":
        if len(sys.argv) < 4:
            print("❌ Usage: switchbot.py curtain <device_id> <open|close|0-100>")
            sys.exit(1)
        control_curtain(sys.argv[2], sys.argv[3])
    
    elif cmd == "plug":
        if len(sys.argv) < 4:
            print("❌ Usage: switchbot.py plug <device_id> <on|off|toggle>")
            sys.exit(1)
        control_plug(sys.argv[2], sys.argv[3])
    
    elif cmd == "command":
        if len(sys.argv) < 4:
            print("❌ Usage: switchbot.py command <device_id> <command> [parameter]")
            sys.exit(1)
        device_id = sys.argv[2]
        command = sys.argv[3]
        parameter = sys.argv[4] if len(sys.argv) > 4 else "default"
        send_command(device_id, command, parameter)
    
    else:
        print(f"❌ Unknown command: {cmd}")
        print_usage()
        sys.exit(1)

if __name__ == "__main__":
    main()
