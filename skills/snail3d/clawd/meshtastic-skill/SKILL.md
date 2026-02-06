---
name: meshtastic
description: Comprehensive Meshtastic LoRa mesh network control via Mesh Master API. Send messages to nodes/groups, manage channels, configure radio settings, view network topology, request telemetry, and control every aspect of the mesh network. Integrates with Mesh Master running on local network or Tailscale VPN. Use when user says "send message", "check nodes", "configure channel", "what's the mesh status", or any mesh network operation.
---

# Meshtastic Skill

Complete Meshtastic LoRa mesh network control through Mesh Master API integration.

## Overview

This skill provides comprehensive mesh network control by communicating with Mesh Master (running on Raspberry Pi or other device). Mesh Master handles the actual Meshtastic device connection; this skill provides the natural language interface.

## Architecture

```
Clawdbot (this skill)
    ↓ HTTP API calls
Mesh Master (RPi, Flask app)
    ↓ Python meshtastic library
Meshtastic Device (LoRa radio)
```

## Connection Methods

### 1. Local Network (Recommended)

```bash
MESH_MASTER_URL=http://192.168.1.100:5000
```

- Fast, direct communication
- No VPN overhead
- Requires both on same WiFi

### 2. Tailscale VPN (Remote)

```bash
MESH_MASTER_URL=http://100.64.x.x:5000
```

- Secure, works remotely
- Uses Tailscale private network
- Slightly higher latency

### 3. USB Serial (Direct)

```bash
MESHTASTIC_PORT=/dev/ttyUSB0
```

- Direct connection to Meshtastic device
- Runs Meshtastic CLI locally
- No Mesh Master required

## Commands & Capabilities

### Messaging

**Send Message to Node**

```
"send a message to bob: hello there"
"msg @snmo thanks for the update"
"/snmo how's the weather?"
```

Sends via Mesh Master relay system with ACK tracking.

**Send to Channel/Group**

```
"broadcast: emergency shelter needed"
"send to camping group: dinner at 7pm"
"ch 1 everyone gather at base"
```

Sends to entire channel, respects quiet hours.

### Network Status

**View All Nodes**

```
"show me all nodes"
"who's on the mesh?"
"list network nodes"
```

Returns formatted table with signal strength, battery, location.

**Node Details**

```
"show info for node WH3R"
"what's the signal to brian?"
"node details for !ba4bf9d0"
```

Returns signal, battery, telemetry, position, last seen.

**Network Metrics**

```
"mesh health"
"network status"
"how many nodes online?"
```

Returns hop count, air utilization, message throughput.

### Channel Management

**List Channels**

```
"show channels"
"what channels are active?"
"list all channels"
```

**Switch Channel**

```
"use channel camping"
"switch to ch 2"
"primary channel"
```

**Create Channel**

```
"add channel hiking"
"new channel for rescue-ops"
"create channel with name scout-ops"
```

**Configure Channel**

```
"set channel 1 name to hiking"
"configure camping channel encryption random"
"change modem preset to long-slow"
```

**Delete Channel**

```
"remove channel 2"
"delete camping channel"
```

### Radio Settings

**View Settings**

```
"show radio config"
"what's the lora settings?"
"get device settings"
```

**Change Settings**

```
"set lora region to US"
"change device role to repeater"
"set power mode to always on"
"configure wifi ssid mywifi password mypass"
```

**Export/Import Config**

```
"export configuration"
"save config to file"
"load configuration from backup.yaml"
```

### Telemetry & Requests

**Request Telemetry**

```
"get telemetry from bob"
"request position from WH3R"
"battery status for all nodes"
```

**Traceroute**

```
"traceroute to !ba4bf9d0"
"how do i reach node camping?"
```

### Position & Location

**Set Position**

```
"set my location to 40.7128 -74.0060"
"location 39.7392 -104.9903 1234m"
"my coordinates 25.2 -16.8"
```

**View Positions**

```
"show all locations"
"where's bob?"
"node positions map"
```

### Ham Radio

**Enable Ham Mode**

```
"enable ham mode with callsign KI1345"
"set ham radio KI1345"
```

Enables unencrypted operation for licensed operators.

**Disable Ham Mode**

```
"disable ham mode"
"back to normal encryption"
```

### Device Management

**Rename Device**

```
"rename myself to Snail"
"set owner John Smith"
"short name JS"
```

**Get Info**

```
"show device info"
"radio status"
"firmware version"
```

**Reboot Device**

```
"reboot radio"
"restart meshtastic"
```

### Advanced

**QR Code**

```
"show channel qr"
"generate qr for all channels"
"qr code"
```

**Canned Messages**

```
"set canned messages: hello | busy | brb"
"get canned messages"
```

**Ringtone**

```
"set ringtone <rtttl-string>"
"get ringtone"
```

**Configure MQTT**

```
"enable mqtt server.com:1883"
"set mqtt username user password pass"
```

## Configuration

### Environment Variables

```bash
# Mesh Master location
export MESH_MASTER_URL="http://192.168.1.100:5000"
# or
export MESH_MASTER_URL="http://100.64.x.x:5000"  # Tailscale

# Direct Meshtastic connection (optional)
export MESHTASTIC_PORT="/dev/ttyUSB0"

# Timeouts
export MESH_TIMEOUT=10  # seconds

# Debug logging
export MESH_DEBUG=true
```

### Local Development

For testing without Mesh Master:

```bash
# Mock mode (simulates responses)
export MESH_MOCK=true
```

## Performance

- **Message send:** 0.5-2s (depends on mesh)
- **Node list:** 1-3s
- **Configuration:** 1-5s (device reboot)
- **Telemetry request:** 2-10s (varies with distance)

## Error Handling

The skill handles:

- Mesh Master connection failures → Clear error message + retry option
- Invalid node IDs → Searches for partial match or suggests valid nodes
- Network timeout → Waits with "mesh is slow" message
- Malformed input → Clarifies what you meant with examples

## References

- **cli-commands.md** - Complete Meshtastic CLI command reference
- **mesh-master-api.md** - Mesh Master API endpoints and examples
- **networking.md** - Tailscale setup & network troubleshooting
- **examples.md** - Real-world usage scenarios

## Troubleshooting

**"Can't reach Mesh Master"**

- Check MESH_MASTER_URL is correct
- Verify Mesh Master is running on RPi
- Check network/WiFi/Tailscale connectivity
- Firewall port 5000 access

**"Node not found"**

- Verify node is on mesh (use `/nodes` command)
- Try using node's short name instead of ID
- May need to wait for node to join network

**"Message failed to send"**

- Check destination node is reachable
- Verify channel encryption matches
- Try broadcasting instead (reaches more nodes)
- Check quiet hours setting

**"Settings change didn't apply"**

- Device may need reboot
- Some settings require channel reconfiguration
- Check device firmware compatibility

## GitHub & Deployment

This skill is published to GitHub with full security review:

- ✅ `.gitignore` prevents credential leakage
- ✅ No hardcoded API keys
- ✅ All sensitive values from environment
- ✅ Configuration templates provided

To integrate with Mesh Master:

1. Clone skill into `~/Mesh-Master/mesh_master/skills/meshtastic/`
2. Add to Mesh Master's command registry
3. Restart Mesh Master
4. Commands available in dashboard & Telegram bot

## Security

- API calls use environment-based credentials only
- No logs contain actual message content
- Respects user privacy & mesh encryption
- Compatible with Mesh Master's security model
