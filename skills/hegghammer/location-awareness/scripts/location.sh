#!/bin/bash
# Location awareness wrapper - loads HA credentials and runs location.py
# Edit the exports below or set via environment

export HA_URL="${HA_URL:-https://your-home-assistant.example.com}"
export HA_TOKEN="${HA_TOKEN:-your-long-lived-access-token}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/location.py" "$@"
