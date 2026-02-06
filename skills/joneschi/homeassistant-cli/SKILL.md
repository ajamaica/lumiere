---
name: homeassistant-cli
description: Advanced Home Assistant control using the official hass-cli tool. Features auto-completion, event monitoring, history queries, and rich output formatting. Alternative to the curl-based homeassistant skill - choose this if you want a more interactive CLI experience with better discovery and formatting.
homepage: https://github.com/home-assistant-ecosystem/home-assistant-cli
metadata:
  {
    'openclaw':
      {
        'emoji': '🏡',
        'requires': { 'bins': ['hass-cli'] },
        'install':
          [
            {
              'id': 'pip',
              'kind': 'pip',
              'package': 'homeassistant-cli',
              'bins': ['hass-cli'],
              'label': 'Install Home Assistant CLI (pip)',
            },
            {
              'id': 'brew',
              'kind': 'brew',
              'formula': 'homeassistant-cli',
              'bins': ['hass-cli'],
              'label': 'Install Home Assistant CLI (brew)',
            },
          ],
      },
  }
---

# Home Assistant CLI

Control your Home Assistant smart home devices using the **official hass-cli tool** — a feature-rich command-line interface with auto-completion, event monitoring, and flexible output formatting.

## Why This Skill vs. `homeassistant` (curl-based)?

**Choose `homeassistant-cli` if you want:**

- ✅ **Auto-completion** for entity IDs and services (bash/zsh/fish)
- ✅ **Event monitoring** in real-time (`hass-cli event watch`)
- ✅ **History queries** (`hass-cli state history`)
- ✅ **Better output formatting** (table/YAML/JSON with one flag)
- ✅ **Interactive exploration** (easier to discover entities and services)
- ✅ **Comprehensive documentation** with examples and troubleshooting

**Choose `homeassistant` (curl) if you want:**

- ✅ Zero dependencies (curl + jq are pre-installed)
- ✅ Lightweight and fast
- ✅ Better for scripting and automation
- ✅ No Python requirements

Both work great — this skill is for users who interact frequently with Home Assistant and want a richer CLI experience.

## Setup

Before using hass-cli, configure authentication:

1. Generate a long-lived access token in Home Assistant:
   - Navigate to your profile: `https://your-homeassistant:8123/profile`
   - Scroll to "Long-Lived Access Tokens"
   - Create a new token

2. Set environment variables (add to shell config for persistence):

   ```bash
   export HASS_SERVER=https://homeassistant.local:8123
   export HASS_TOKEN=<your-token>
   ```

3. Test connection:
   ```bash
   hass-cli info
   ```

## Common Commands

### List Entities

```bash
# List all entities
hass-cli state list

# Filter by domain
hass-cli state list light
hass-cli state list switch
hass-cli state list sensor

# Get specific entity state
hass-cli state get light.living_room
```

### Control Devices

```bash
# Turn on/off lights
hass-cli service call light.turn_on --arguments entity_id=light.living_room
hass-cli service call light.turn_off --arguments entity_id=light.living_room

# Set brightness (0-255)
hass-cli service call light.turn_on --arguments entity_id=light.bedroom,brightness=128

# Turn on/off switches
hass-cli service call switch.turn_on --arguments entity_id=switch.fan
hass-cli service call switch.turn_off --arguments entity_id=switch.fan

# Toggle any device
hass-cli service call homeassistant.toggle --arguments entity_id=light.kitchen
```

### List and Call Services

```bash
# List all services
hass-cli service list

# Filter services
hass-cli service list light
hass-cli service list 'home.*toggle'

# Get service details (YAML output)
hass-cli -o yaml service list homeassistant.toggle
```

### Work with Scenes

```bash
# List scenes
hass-cli state list scene

# Activate a scene
hass-cli service call scene.turn_on --arguments entity_id=scene.movie_time
```

### Monitor Events

```bash
# Watch all events
hass-cli event watch

# Watch specific event type
hass-cli event watch state_changed
hass-cli event watch automation_triggered
```

### History

```bash
# Get state history (last 50 minutes)
hass-cli state history --since 50m light.living_room

# Multiple entities
hass-cli state history --since 1h light.living_room switch.fan
```

## Output Formats

Control output with `-o` or `--output`:

```bash
# Table (default)
hass-cli state list

# YAML
hass-cli -o yaml state get light.living_room

# JSON
hass-cli -o json state list light

# No headers (for scripting)
hass-cli --no-headers state list
```

## Tips

- **Entity discovery**: Use `hass-cli state list` to find entity IDs
- **Service discovery**: Use `hass-cli service list` to find available services
- **Auto-completion**: See [references/autocomplete.md](references/autocomplete.md) for shell setup
- **Troubleshooting**: See [references/troubleshooting.md](references/troubleshooting.md)

## Examples

See [references/examples.md](references/examples.md) for common automation patterns and use cases.
