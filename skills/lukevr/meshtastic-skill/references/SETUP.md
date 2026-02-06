# Meshtastic Setup Guide

Complete installation and configuration guide for the Meshtastic skill.

## Hardware Requirements

### Recommended Devices

| Device            | Pros                          | Cons                      |
| ----------------- | ----------------------------- | ------------------------- |
| **RAK4631**       | Reliable, modular, good range | Requires WisBlock base    |
| **T-Beam**        | Built-in GPS, battery holder  | Larger form factor        |
| **Heltec V3**     | Budget-friendly, OLED display | Smaller antenna connector |
| **LilyGo T-Echo** | E-paper, low power            | Limited buttons           |

### What You Need

- Meshtastic device (any supported hardware)
- USB cable (data-capable, not charge-only!)
- Antenna matched to your region (868MHz EU / 915MHz US)
- Host machine (Raspberry Pi, Linux PC, etc.)

## Step 1: Install Dependencies

```bash
# Create project directory
mkdir -p ~/projects/meshtastic-skill
cd ~/projects/meshtastic-skill

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install required packages
pip install meshtastic paho-mqtt

# For development/debugging
pip install bleak  # BLE support (optional)
```

## Step 2: Connect Device

### USB Connection (Recommended)

```bash
# Check if device detected
lsusb | grep -iE "(rak|esp32|silicon|cp210|ch340)"

# Find serial port
ls /dev/ttyACM* /dev/ttyUSB* 2>/dev/null

# Common ports:
# - /dev/ttyACM0 (RAK, native USB)
# - /dev/ttyUSB0 (CP2102/CH340 adapters)

# Test connection
meshtastic --port /dev/ttyACM0 --info
```

### Troubleshooting USB

**Device not detected:**

- Try different USB cable (must be data cable)
- Try different USB port
- Check `dmesg | tail -20` for errors
- Ensure user is in `dialout` group: `sudo usermod -a -G dialout $USER`

**Permission denied:**

```bash
sudo chmod 666 /dev/ttyACM0
# Or add udev rule for permanent fix
```

## Step 3: Configure Node

### Basic Settings

```bash
# Set your node identity
meshtastic --set-owner "YourNodeName"
meshtastic --set-owner-short "YN"

# Set device role
meshtastic --set device.role CLIENT      # Mobile/personal
# meshtastic --set device.role ROUTER    # Fixed relay node

# Set region (required!)
meshtastic --set lora.region EU_868      # Europe
# meshtastic --set lora.region US        # Americas
# meshtastic --set lora.region ANZ       # Australia/NZ
```

### For Always-On Nodes

```bash
# Keep Bluetooth alive (if needed)
meshtastic --set power.wait_bluetooth_secs 86400

# Disable sleep modes
meshtastic --set power.ls_secs 0   # Light sleep off
meshtastic --set power.sds_secs 0  # Deep sleep off
```

### Set Position (if no GPS)

```bash
# Set fixed location (use approximate coords for privacy!)
meshtastic --setlat 48.85 --setlon 2.35  # Example: Paris area
```

## Step 4: Set Up MQTT Bridge

### Create Bridge Script

Save as `~/projects/meshtastic-skill/mqtt_bridge.py`:

```python
#!/usr/bin/env python3
"""
Meshtastic MQTT Bridge
- Receives global mesh traffic via MQTT
- Provides socket interface for sending
- Logs messages to file
"""

import json
import time
import socket
import threading
import paho.mqtt.client as mqtt
from datetime import datetime
from pathlib import Path

# === CONFIGURATION ===
SERIAL_PORT = "/dev/ttyACM0"
SOCKET_HOST = "127.0.0.1"
SOCKET_PORT = 7331

MQTT_BROKER = "mqtt.meshtastic.org"
MQTT_PORT = 1883
MQTT_USER = "meshdev"
MQTT_PASS = "large4cats"
MQTT_TOPIC = "msh/EU_868/2/json/#"  # Change for your region

MESSAGE_LOG = Path("/tmp/mesh_messages.txt")
NODES_CACHE = Path("/tmp/mesh_nodes.json")
MAX_LOG_LINES = 1000

# === GLOBALS ===
nodes_cache = {}
meshtastic_interface = None

def setup_meshtastic():
    """Initialize Meshtastic serial connection."""
    global meshtastic_interface
    try:
        import meshtastic.serial_interface
        meshtastic_interface = meshtastic.serial_interface.SerialInterface(SERIAL_PORT)
        print(f"Connected to Meshtastic on {SERIAL_PORT}")
        return True
    except Exception as e:
        print(f"Meshtastic connection failed: {e}")
        return False

def on_mqtt_message(client, userdata, msg):
    """Handle incoming MQTT messages."""
    try:
        payload = json.loads(msg.payload.decode())

        # Extract message info
        sender = payload.get("sender", "unknown")
        text = payload.get("payload", {}).get("text", "")
        channel = payload.get("channel", 0)

        if not text:
            return

        # Calculate distance if position available
        distance = "?"
        if sender in nodes_cache:
            # Add distance calculation here based on your location
            pass

        # Log message
        timestamp = datetime.now().isoformat(timespec='seconds')
        log_line = f"{timestamp}|{channel}|{sender}|{distance}|{text}\n"

        with open(MESSAGE_LOG, "a") as f:
            f.write(log_line)

        # Trim log if too long
        trim_log()

        print(f"[MQTT] {sender}: {text[:50]}...")

    except Exception as e:
        print(f"MQTT parse error: {e}")

def trim_log():
    """Keep log file under MAX_LOG_LINES."""
    try:
        lines = MESSAGE_LOG.read_text().splitlines()
        if len(lines) > MAX_LOG_LINES:
            MESSAGE_LOG.write_text("\n".join(lines[-MAX_LOG_LINES:]) + "\n")
    except:
        pass

def handle_socket_command(data):
    """Process socket commands."""
    try:
        cmd = json.loads(data)
        action = cmd.get("cmd", "")

        if action == "send":
            text = cmd.get("text", "")
            to = cmd.get("to")
            if meshtastic_interface and text:
                meshtastic_interface.sendText(text, destinationId=to)
                return {"ok": True, "sent": text}
            return {"ok": False, "error": "No connection or empty text"}

        elif action == "status":
            return {
                "ok": True,
                "mqtt": "connected",
                "serial": SERIAL_PORT,
                "messages": sum(1 for _ in open(MESSAGE_LOG)) if MESSAGE_LOG.exists() else 0
            }

        elif action == "nodes":
            if meshtastic_interface:
                nodes = meshtastic_interface.nodes
                return {"ok": True, "nodes": list(nodes.keys())}
            return {"ok": False, "error": "No connection"}

        else:
            return {"ok": False, "error": f"Unknown command: {action}"}

    except Exception as e:
        return {"ok": False, "error": str(e)}

def socket_server():
    """Run socket server for commands."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((SOCKET_HOST, SOCKET_PORT))
    server.listen(5)
    print(f"Socket server on {SOCKET_HOST}:{SOCKET_PORT}")

    while True:
        conn, addr = server.accept()
        try:
            data = conn.recv(4096).decode().strip()
            if data:
                result = handle_socket_command(data)
                conn.send(json.dumps(result).encode())
        except Exception as e:
            conn.send(json.dumps({"ok": False, "error": str(e)}).encode())
        finally:
            conn.close()

def main():
    # Initialize message log
    MESSAGE_LOG.touch()

    # Connect to Meshtastic
    setup_meshtastic()

    # Start socket server thread
    threading.Thread(target=socket_server, daemon=True).start()

    # Connect to MQTT
    mqtt_client = mqtt.Client()
    mqtt_client.username_pw_set(MQTT_USER, MQTT_PASS)
    mqtt_client.on_message = on_mqtt_message

    print(f"Connecting to MQTT {MQTT_BROKER}...")
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT)
    mqtt_client.subscribe(MQTT_TOPIC)
    print(f"Subscribed to {MQTT_TOPIC}")

    # Run forever
    mqtt_client.loop_forever()

if __name__ == "__main__":
    main()
```

### Create Systemd Service

Save as `/etc/systemd/system/meshtastic-bridge.service`:

```ini
[Unit]
Description=Meshtastic MQTT Bridge
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/projects/meshtastic-skill
ExecStart=/home/YOUR_USER/projects/meshtastic-skill/venv/bin/python mqtt_bridge.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable Service

```bash
# Edit service file with your username
sudo nano /etc/systemd/system/meshtastic-bridge.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable meshtastic-bridge
sudo systemctl start meshtastic-bridge

# Check status
sudo systemctl status meshtastic-bridge
```

## Step 5: Configure Skill

Edit `~/.openclaw/skills/meshtastic/CONFIG.md` with your settings:

- Node name and ID
- Serial port
- MQTT broker (if different)
- Alert destinations

## Step 6: Test

```bash
# Check bridge status
echo '{"cmd":"status"}' | nc -w 2 127.0.0.1 7331

# Send test message
echo '{"cmd":"send","text":"Test from OpenClaw!"}' | nc -w 2 127.0.0.1 7331

# View messages
tail -f /tmp/mesh_messages.txt
```

## Optional: Map Publishing

To appear on community maps (meshtastic.org, regional maps):

### Option A: Bridge-based (recommended)

Add to your bridge script:

- Secondary MQTT connection to map broker
- Protobuf encoding for position packets
- Position fuzzing for privacy

### Option B: Node-based

```bash
# Enable MQTT on the node itself
meshtastic --set mqtt.enabled true
meshtastic --set mqtt.address mqtt.meshtastic.org
meshtastic --set mqtt.username meshdev
meshtastic --set mqtt.password large4cats
meshtastic --set mqtt.json_enabled true
```

## Connection Methods: USB vs BLE

### USB (Recommended) ✅

**Always use USB when possible.** It's:

- Instantly reliable with no pairing hassle
- Persistent across reboots
- Works with all Meshtastic CLI/Python features
- No Bluetooth stack bugs to fight

Tested: RAK4631 on Raspberry Pi 5 — rock solid on `/dev/ttyACM0`.

### BLE (Not Recommended) ⚠️

**Avoid BLE on Linux for automation.** After extensive testing (Feb 2026):

| Issue                       | Details                                              |
| --------------------------- | ---------------------------------------------------- |
| **Pairing inconsistency**   | Device pairs but won't connect; disappears from scan |
| **BlueZ notification bugs** | `bleak` can see services but notifications fail      |
| **Advertising stops**       | Node stops BLE advertising unexpectedly              |
| **No reliable reconnect**   | Scripts can't auto-recover from disconnects          |
| **DBus instability**        | EOFError, unmarshaller failures on Pi                |

Even with `bluetooth.mode 2` (no PIN) and `wait_bluetooth_secs 86400`:

- Device scans successfully (shows `YourNode_1234`)
- Connects briefly, discovers Meshtastic service + characteristics
- Fails on notification setup or disconnects during operation
- Cannot establish persistent data channel

**Bottom line:** USB "just works" — BLE is a debugging rabbit hole. If you must go wireless, consider:

- ESP32 with WiFi (web interface)
- MQTT relay from another node
- Remote serial (ser2net / socat)

## Useful Commands Reference

```bash
# Device info
meshtastic --info
meshtastic --nodes

# Configuration
meshtastic --set-owner "Name"
meshtastic --set device.role CLIENT
meshtastic --set lora.region EU_868

# Channels
meshtastic --ch-index 0 --info
meshtastic --ch-set name "MyChannel" --ch-index 1

# Send message (CLI, requires stopping bridge)
meshtastic --sendtext "Hello!"
meshtastic --sendtext "DM" --dest '!abcd1234'

# Export/import config
meshtastic --export-config > backup.yaml
meshtastic --configure backup.yaml
```

## Resources

- [Meshtastic Documentation](https://meshtastic.org/docs/)
- [Hardware Guide](https://meshtastic.org/docs/hardware/)
- [MQTT Configuration](https://meshtastic.org/docs/configuration/module/mqtt/)
- [Python CLI](https://meshtastic.org/docs/software/python/cli/)
- [Community Maps](https://meshtastic.org/docs/software/community-software/)
