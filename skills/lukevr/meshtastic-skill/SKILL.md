---
name: meshtastic
description: Send and receive messages via Meshtastic LoRa mesh network. Use for off-grid messaging, mesh network status, reading recent mesh messages, or sending texts via LoRa radio.
---

# Meshtastic Skill

Control a Meshtastic node via USB for off-grid LoRa mesh communication.

## Prerequisites

- Meshtastic-compatible hardware (RAK4631, T-Beam, Heltec, LilyGo, etc.)
- USB connection to host machine
- Python 3.9+ with `meshtastic` and `paho-mqtt` packages
- See `references/SETUP.md` for full installation guide

## Configuration

Edit `CONFIG.md` with your node details, MQTT settings, and alert destinations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MQTT Bridge                               │
├─────────────────────────────────────────────────────────────┤
│  RECEIVE: mqtt.meshtastic.org (global JSON traffic)         │
│  PUBLISH: optional map broker (protobuf)                    │
│  SOCKET:  localhost:7331 (commands: send, status, toggle)   │
├─────────────────────────────────────────────────────────────┤
│  Files:                                                      │
│  • /tmp/mesh_messages.txt - received messages log           │
│  • /tmp/mesh_nodes.json   - cached node positions           │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐     USB      ┌─────────────┐
│  LoRa Node  │◄────────────►│ Bridge.py   │
│  (Radio)    │              │  - Serial   │
└─────────────┘              │  - Socket   │
                             │  - MQTT     │
                             └──────┬──────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
    localhost:7331           /tmp/mesh_*            MQTT Broker
    (send commands)          (message logs)         (mesh traffic)
```

## Quick Reference

### Send Messages

```bash
# Via socket (preferred - works while bridge running)
echo '{"cmd":"send","text":"Hello mesh!"}' | nc -w 2 127.0.0.1 7331

# Direct message to specific node
echo '{"cmd":"send","text":"Hey!","to":"!abcd1234"}' | nc -w 2 127.0.0.1 7331

# Check status
echo '{"cmd":"status"}' | nc -w 2 127.0.0.1 7331

# List RF nodes (seen via radio)
echo '{"cmd":"nodes"}' | nc -w 2 127.0.0.1 7331
```

### Map Visibility (if configured)

```bash
# Toggle map publishing on/off
echo '{"cmd":"map"}' | nc -w 2 127.0.0.1 7331

# Explicitly enable/disable
echo '{"cmd":"map","enable":true}' | nc -w 2 127.0.0.1 7331
echo '{"cmd":"map","enable":false}' | nc -w 2 127.0.0.1 7331

# Force immediate position report
echo '{"cmd":"map_now"}' | nc -w 2 127.0.0.1 7331
```

### Read Messages

```bash
# Recent messages (last 20)
tail -20 /tmp/mesh_messages.txt

# Filter common noise
tail -50 /tmp/mesh_messages.txt | grep -v -E "(Hello!|hey|mqtt-test)"
```

### Message Log Format

```
TIMESTAMP|CHANNEL|SENDER|DISTANCE|TEXT
2026-02-02T12:43:59|LongFast|!433bf114|1572km|Moin moin!
```

## Bridge Service

```bash
# Status
sudo systemctl status meshtastic-bridge

# Restart
sudo systemctl restart meshtastic-bridge

# View logs
sudo journalctl -u meshtastic-bridge -f

# Stop (needed for direct CLI access)
sudo systemctl stop meshtastic-bridge
```

## Monitoring & Alerts

### Option 1: Cron Job (Recommended)

```javascript
cron.add({
  name: 'mesh-monitor',
  schedule: { kind: 'every', everyMs: 300000 }, // 5 min
  sessionTarget: 'isolated',
  payload: {
    kind: 'agentTurn',
    message:
      "Check /tmp/mesh_messages.txt for new messages. Filter out noise (test messages, 'Hello!', 'hey'). Alert me of interesting ones with translations if non-English.",
    timeoutSeconds: 60,
    deliver: true,
    channel: 'telegram', // or your channel
  },
})
```

### Option 2: Digest Summary

```javascript
cron.add({
  name: 'mesh-digest',
  schedule: { kind: 'cron', expr: '0 8,14,20 * * *', tz: 'Europe/Madrid' },
  sessionTarget: 'isolated',
  payload: {
    kind: 'agentTurn',
    message:
      'Read /tmp/mesh_messages.txt. Create a digest of interesting messages from the last 6 hours. Translate non-English, guess country from distance. Post summary.',
    timeoutSeconds: 120,
    deliver: true,
    channel: 'telegram',
  },
})
```

### Option 3: Spawned Monitor Agent

```javascript
sessions_spawn({
  task: 'Monitor /tmp/mesh_messages.txt every 30 seconds. Alert me for interesting messages (not noise). Run for 1 hour.',
  label: 'mesh-monitor',
  runTimeoutSeconds: 3600,
})
```

## Distance Reference

Approximate distances for country guessing (adjust for your location):

| Distance    | Typical Regions                     |
| ----------- | ----------------------------------- |
| <500km      | Neighboring countries/regions       |
| 500-1000km  | Medium range                        |
| 1000-1500km | Long range                          |
| 1500-2000km | Very long range (likely MQTT relay) |
| >2000km     | MQTT-bridged traffic                |

## Privacy Notes

- Map reports can use fuzzy positioning (~2km precision)
- Position publishing can be toggled off entirely
- Local RF messages are logged but not shared externally by default
- Never broadcast precise location in messages

## Supported Hardware

| Device        | Notes                     |
| ------------- | ------------------------- |
| RAK4631       | Recommended, reliable USB |
| T-Beam        | Popular, has GPS          |
| Heltec V3     | Budget option             |
| LilyGo T-Echo | E-paper display           |

See `references/SETUP.md` for hardware-specific setup.

## Regional Frequencies

| Region       | Frequency | Topic Root          |
| ------------ | --------- | ------------------- |
| Europe       | 868 MHz   | `msh/EU_868/2/json` |
| Americas     | 915 MHz   | `msh/US/2/json`     |
| Australia/NZ | 915 MHz   | `msh/ANZ/2/json`    |

## Files

```
~/.openclaw/skills/meshtastic/
├── SKILL.md           # This file
├── CONFIG.md          # Your configuration
├── scripts/
│   └── mesh.py        # CLI wrapper
└── references/
    └── SETUP.md       # Installation guide
```

## Troubleshooting

**"Resource temporarily unavailable"**

- Only one process can use serial port at a time
- Stop bridge before direct CLI: `sudo systemctl stop meshtastic-bridge`

**No messages appearing**

- Check MQTT subscription topic matches your region
- Verify firewall allows outbound port 1883
- Check `journalctl -u meshtastic-bridge` for errors

**Can't send messages**

- Ensure bridge is running (socket server)
- Check serial port path in config
- Try: `echo '{"cmd":"status"}' | nc -w 2 127.0.0.1 7331`

**Considering BLE instead of USB?**

- Don't. USB is far more reliable on Linux.
- BLE on Linux (BlueZ/bleak) has notification bugs, pairing inconsistencies, and random disconnects.
- See `references/SETUP.md` for detailed findings.

## Further Reading

- [Meshtastic Docs](https://meshtastic.org/docs/)
- [MQTT Integration](https://meshtastic.org/docs/configuration/module/mqtt/)
- [Hardware Options](https://meshtastic.org/docs/hardware/)
