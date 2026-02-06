---
name: dirigera-control
description: Control IKEA Dirigera smart home devices (lights, outlets, scenes, controllers). Use when the user asks to control smart home devices, check device status, turn lights on/off, adjust brightness/color, control outlets, trigger scenes, check battery levels, or work with IKEA smart home automation. Also use when the user needs help finding the Dirigera hub IP address or generating an API token. Accessible via Cloudflare tunnel on VPS.
---

# IKEA Dirigera Smart Home Control

Control lights, outlets, scenes, and other IKEA smart home devices through the Dirigera hub.

## Prerequisites

```python
pip install dirigera
```

## Hub Setup

### Find Hub IP

Check the router/DHCP client list for "Dirigera" and note its IP address.

If the agent is on the same LAN, try the IP discovery script. It can:

1. Scan the subnet for likely candidates (no token required).
2. Verify the exact hub IP if a token is available.
3. As a last resort, try `generate-token` against candidates (interactive).

```bash
python scripts/find_dirigera_ip.py
# or
python scripts/find_dirigera_ip.py --subnet 192.168.1.0/24
# verify with token (if you have it)
python scripts/find_dirigera_ip.py --token <dirigera-token>
# last resort: try generate-token against candidates
python scripts/find_dirigera_ip.py --try-generate-token
```

### Generate Token

**IMPORTANT**: Token generation REQUIRES PHYSICAL USER ACTION. Follow this workflow:

#### Step 1: Start Token Generation Script

Run the wrapper script in the background. It will automatically wait for the button press:

```bash
python scripts/generate_token_wrapper.py <dirigera-ip-address> &
```

The token will be saved to `dirigera_token.txt` by default. To specify a custom location:

```bash
python scripts/generate_token_wrapper.py <dirigera-ip-address> --output /path/to/token.txt &
```

#### Step 2: **END YOUR TURN AND INFORM THE USER**

**CRITICAL**: After starting the script, you MUST:

1. **End your turn immediately** - do not wait or continue processing
2. Tell the user: "I've started the token generation process. Please press the ACTION BUTTON on the bottom of your Dirigera hub now. Let me know when you've pressed it."

#### Step 3: Wait for User Confirmation

The user will:

1. Physically press the button on their Dirigera hub
2. Reply to you confirming they pressed it (e.g., "Done" or "Pressed")

The script will automatically detect the button press and save the token to the file.

#### Step 4: Retrieve the Saved Token

After the user confirms, read the token from the file:

```python
from pathlib import Path
token = Path("dirigera_token.txt").read_text().strip()
```

Or from a custom location:

```bash
TOKEN=$(cat /path/to/token.txt)
```

Then use the token to connect:

```python
import dirigera
hub = dirigera.Hub(token=token, ip_address="<dirigera-ip>")
```

#### Alternative: Manual Command

For manual use (not recommended for agents):

```bash
generate-token <dirigera-ip-address>
```

This requires interactive terminal access and doesn't save output automatically.

### Troubleshooting

If you cannot find the hub IP address:

1. Check the router/DHCP list and look for "Dirigera".
2. If the name is missing, match the hub's MAC address label to a new device entry.
3. Ensure the hub and client are on the same network.
4. If you have candidate IPs, run `generate-token` against them until one succeeds.
5. If you already have a token, run `python scripts/find_dirigera_ip.py --token <dirigera-token>`.
6. If everything else fails, run `python scripts/find_dirigera_ip.py --try-generate-token` and follow the prompt.

## Hub Connection

```python
import dirigera

hub = dirigera.Hub(
    token="token",
    ip_address="ip_address"
)
```

## CRITICAL: Attribute Access

**Device state is in `.attributes`, not top-level.**

```python
# CORRECT
light.attributes.is_on
light.attributes.light_level

# WRONG - raises AttributeError
light.is_on
light.light_level
```

Top-level: `device.id`, `device.is_reachable`, `device.room`
State: `device.attributes.is_on`, `device.attributes.light_level`

## Quick Commands

### Discovery

```python
lights = hub.get_lights()
outlets = hub.get_outlets()
controllers = hub.get_controllers()
scenes = hub.get_scenes()
```

### Light Control

```python
light = hub.get_light_by_name(lamp_name="bedroom light")

# Check reachability first
if light.is_reachable:
    light.set_light(lamp_on=True)
    light.set_light_level(light_level=75)
    light.set_color_temperature(color_temp=2700)  # Warm white

# Reload after changes
light.reload()
```

### Outlet Control

```python
outlet = hub.get_outlet_by_name(outlet_name="living room")
outlet.set_on(outlet_on=True)
outlet.reload()
```

### Scene Triggering

```python
scene = hub.get_scene_by_name(scene_name="Sove tid")
scene.trigger()
```

### Check Capabilities

```python
# Verify device supports feature before using
if 'colorTemperature' in light.capabilities.can_receive:
    light.set_color_temperature(color_temp=3000)
```

## Common Patterns

See [references/patterns.md](references/patterns.md) for room-based control, batch operations, status reports, and battery monitoring.

## Helper Scripts

Use `scripts/helpers.py` for common operations: get lights by room, check battery levels, find unreachable devices.

## Complete Reference

See [references/api.md](references/api.md) for:

- Complete attribute reference
- All control methods
- Device capabilities
- Color temperature/hue values
- Troubleshooting

## Best Practices

1. Always check `device.is_reachable` before control
2. Call `device.reload()` after control commands
3. Use `.attributes` for all state access
4. Add 0.5s delays between rapid commands
5. Check capabilities before using features
