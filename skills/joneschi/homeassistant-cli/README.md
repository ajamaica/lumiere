# Home Assistant CLI Skill for OpenClaw

Advanced Home Assistant control using the official `hass-cli` tool.

## 🌟 Features

- **Auto-completion** for entity IDs and services (bash/zsh/fish)
- **Event monitoring** in real-time
- **History queries** for state changes
- **Rich output formatting** (table/YAML/JSON)
- **Interactive exploration** of entities and services
- **Comprehensive documentation** with examples and troubleshooting

## 🆚 Comparison with `homeassistant` (curl-based)

| Feature          | homeassistant-cli (this) | homeassistant (curl) |
| ---------------- | ------------------------ | -------------------- |
| Dependencies     | hass-cli (Python)        | curl + jq (built-in) |
| Auto-completion  | ✅ Yes                   | ❌ No                |
| Event monitoring | ✅ Yes                   | ❌ No                |
| History queries  | ✅ Yes                   | ❌ No                |
| Output formats   | Table/YAML/JSON          | JSON only            |
| Setup complexity | Medium                   | Simple               |
| Best for         | Interactive use          | Scripting/automation |

**Both are great!** Choose based on your workflow:

- **Interactive control** → `homeassistant-cli`
- **Lightweight scripting** → `homeassistant` (curl)

## 📦 Installation

### 1. Install hass-cli

**Via pip:**

```bash
pip install homeassistant-cli
```

**Via Homebrew:**

```bash
brew install homeassistant-cli
```

### 2. Configure Connection

Set environment variables in your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export HASS_SERVER=http://your-homeassistant:8123
export HASS_TOKEN=<your-long-lived-token>
```

**Get your token:**

1. Open Home Assistant web interface
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "CREATE TOKEN"
5. Copy the token (only shown once!)

### 3. Test Connection

```bash
hass-cli state list
```

## 🚀 Quick Start

### List Devices

```bash
# All entities
hass-cli state list

# Only lights
hass-cli state list light

# Only switches
hass-cli state list switch
```

### Control Devices

```bash
# Turn on light
hass-cli service call light.turn_on --arguments entity_id=light.living_room

# Turn off light
hass-cli service call light.turn_off --arguments entity_id=light.living_room

# Set brightness
hass-cli service call light.turn_on --arguments entity_id=light.bedroom,brightness=128
```

### Monitor Events

```bash
# Watch all events
hass-cli event watch

# Watch state changes only
hass-cli event watch state_changed
```

### Query History

```bash
# Last hour
hass-cli state history --since 1h light.living_room

# Last 30 minutes
hass-cli state history --since 30m switch.fan
```

## 📚 Documentation

Inside the skill package:

- **SKILL.md** — Main guide with common commands
- **references/examples.md** — Automation patterns and use cases
- **references/autocomplete.md** — Shell auto-completion setup
- **references/troubleshooting.md** — Common issues and solutions

## 🛠️ Requirements

- **Home Assistant** (any version with REST API)
- **Python 3.8+**
- **Long-lived access token**

## 📄 License

MIT

## 🙏 Credits

- Built on [home-assistant-cli](https://github.com/home-assistant-ecosystem/home-assistant-cli)
- Created for the [OpenClaw](https://openclaw.ai) agent framework
