# Meshtastic Skill for Clawdbot

Complete natural language control of your Meshtastic LoRa mesh network through Clawdbot, integrated with Mesh Master running on your Raspberry Pi.

## Quick Start

### 1. Find Your Serial Port

Connect Meshtastic device via USB and find the port:

```bash
ls /dev/tty.usbmodem* /dev/tty.usbserial* /dev/cu.* 2>/dev/null
```

Should show something like `/dev/tty.usbmodem21201`

### 2. Set Environment Variable

```bash
export MESHTASTIC_PORT=/dev/tty.usbmodem21201
```

Or add to `~/.bashrc` or `~/.zshrc`:

```bash
echo 'export MESHTASTIC_PORT=/dev/tty.usbmodem21201' >> ~/.zshrc
```

### 3. Try a Command

```bash
node scripts/meshtastic-direct.js "show nodes"
```

Or start interactive mode:

```bash
node scripts/meshtastic-direct.js
```

Then type commands like: `show nodes`, `send: hello`, `info`

## Architecture

```
Clawdbot (your computer)
    ↓
Meshtastic Skill (natural language processor)
    ↓ HTTP API
Mesh Master (RPi:5000)
    ↓ Python meshtastic library
Meshtastic Device (LoRa radio)
    ↓ Mesh Network
```

**Why this design?**

- Single Meshtastic device connection (on RPi)
- Mesh Master handles all radio communication
- Clawdbot just sends API requests
- No need to run Meshtastic locally
- Works over WiFi or Tailscale

## Usage Examples

### Send Messages

```
"send a message to bob: hello there"
"msg @snmo thanks for the update"
"/brian how's the weather?"
"broadcast: emergency shelter at base camp"
```

### Check Network

```
"show me all nodes"
"node info for WH3R"
"who's on the mesh?"
"mesh status"
```

### Configure Channels

```
"show channels"
"set channel 1 name to hiking"
"create channel camping"
```

### Radio Settings

```
"show radio config"
"set lora region to US"
"set device role to repeater"
```

### Telemetry

```
"get telemetry from bob"
"request position from WH3R"
"battery status"
```

### Device Management

```
"rename myself to Snail"
"set owner John Smith"
"device info"
```

## Configuration

### Environment Variables

```bash
# REQUIRED
MESH_MASTER_URL=http://192.168.1.100:5000

# OPTIONAL
MESH_TIMEOUT=10              # Request timeout (seconds)
MESH_DEBUG=false             # Enable debug logging
MESHTASTIC_PORT=/dev/ttyUSB0 # Direct connection (use OR Mesh Master, not both)
```

### Copy Template

```bash
cp .env.example .env
# Edit .env with your values
```

## Troubleshooting

### "Can't reach Mesh Master"

**Checklist:**

1. ✅ Mesh Master is running on RPi

   ```bash
   # On RPi:
   ps aux | grep mesh-master
   ```

2. ✅ Get correct RPi IP address

   ```bash
   # On RPi:
   hostname -I
   ```

3. ✅ MESH_MASTER_URL is correct

   ```bash
   # On your computer:
   echo $MESH_MASTER_URL
   ```

4. ✅ Can ping from your computer

   ```bash
   ping 192.168.1.100
   ```

5. ✅ Port 5000 is accessible
   ```bash
   curl http://192.168.1.100:5000/api/version
   ```

### "Node not found"

- Use `/nodes` command to see exact short names
- Nodes must be online and in range
- May need to wait for discovery

### "Message failed to send"

- Check destination node is reachable
- Verify both nodes use same channel encryption
- Try broadcasting instead (reaches more nodes)

## Files

```
meshtastic-skill/
├── SKILL.md                    # Full skill documentation
├── README.md                   # This file
├── package.json                # Node.js metadata
├── .env.example               # Configuration template
├── .gitignore                 # Git security (no secrets)
│
├── scripts/
│   ├── meshtastic-agent.js    # Core API client
│   └── meshtastic-cli.js      # Natural language processor
│
├── tests/
│   └── test-connection.js     # Connectivity tests
│
└── references/
    ├── cli-commands.md        # Meshtastic CLI reference
    ├── mesh-master-api.md     # Mesh Master API docs
    └── examples.md            # Usage examples
```

## Security

### What's Protected

- ✅ `.gitignore` prevents secrets leakage
- ✅ No hardcoded API keys or credentials
- ✅ All sensitive values from environment only
- ✅ Configuration templates use `.example` suffix
- ✅ Compatible with Mesh Master's security model

### What You Should Do

1. Never commit `.env` to git
2. Use `.env.example` as template
3. Keep MESH_MASTER_URL in environment
4. Use strong Mesh Master authentication
5. Enable firewall (port 5000 only to trusted IPs)

## Deployment to Mesh Master

To integrate this skill permanently with Mesh Master:

1. **Copy to Mesh Master repo**

   ```bash
   cp -r ~/clawd/meshtastic-skill ~/Mesh-Master/mesh_master/skills/
   ```

2. **Register commands in Mesh Master**
   Add to `mesh-master.py`:

   ```python
   from mesh_master.skills.meshtastic import MeshtasticSkill
   ```

3. **Restart Mesh Master**

   ```bash
   # On RPi:
   systemctl restart mesh-master
   ```

4. **Commands now available via:**
   - Web dashboard
   - Telegram bot
   - Mesh network DM
   - HTTP API

## Advanced

### Using Tailscale (Remote Access)

If you want to control your mesh remotely:

```bash
# Install Tailscale on RPi and your computer
# Then use Tailscale IP instead:
export MESH_MASTER_URL=http://100.64.x.x:5000
```

### Direct Meshtastic Connection

If not using Mesh Master:

```bash
export MESHTASTIC_PORT=/dev/ttyUSB0
# This mode uses Meshtastic CLI directly (no Mesh Master)
```

### Custom API Server

If you build your own Meshtastic server:

```bash
export MESH_MASTER_URL=http://your-server:port
```

## Development

### Run Tests

```bash
npm test
```

### Interactive Mode

```bash
npm start
# or
node scripts/meshtastic-cli.js
```

### Add New Commands

Edit `scripts/meshtastic-cli.js` - add handler for new command type:

```javascript
async handleMyCommand(input) {
  // Parse input
  // Call agent method
  // Return formatted result
}
```

## License

MIT

## Support

- **Issue:** GitHub issues on Snail3D/meshtastic-skill
- **Docs:** See SKILL.md for comprehensive reference
- **Mesh Master:** https://github.com/Snail3D/Mesh-Master
