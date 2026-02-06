#!/bin/bash

# Danube MCP Setup for OpenClaw
# Adds Danube MCP configuration to OpenClaw config

set -e

echo "🚀 Danube MCP Setup"
echo "==================="
echo ""

# Check if DANUBE_API_KEY is set (in env or .env file)
OPENCLAW_ENV_FILE="$HOME/.openclaw/.env"

if [ -z "$DANUBE_API_KEY" ]; then
    # Not in current environment, check if it exists in OpenClaw's .env
    if [ -f "$OPENCLAW_ENV_FILE" ] && grep -q "DANUBE_API_KEY" "$OPENCLAW_ENV_FILE"; then
        echo "✅ DANUBE_API_KEY found in $OPENCLAW_ENV_FILE"
    else
        echo "⚠️  DANUBE_API_KEY not found"
        echo ""
        read -p "Enter your Danube API key: " api_key

        if [ -z "$api_key" ]; then
            echo "❌ API key is required"
            exit 1
        fi

        # Create .openclaw directory if it doesn't exist
        mkdir -p "$HOME/.openclaw"

        # Add to OpenClaw's .env file
        echo "DANUBE_API_KEY=\"$api_key\"" >> "$OPENCLAW_ENV_FILE"
        echo "✅ Added DANUBE_API_KEY to $OPENCLAW_ENV_FILE"
        echo ""
        echo "Get your API key from: https://danubeai.com/dashboard → Settings → API Keys"
    fi
else
    echo "✅ DANUBE_API_KEY is set in environment"
fi

# Check if OpenClaw config exists
CONFIG_FILE="$HOME/.openclaw/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ OpenClaw config not found at: $CONFIG_FILE"
    echo "   Please make sure OpenClaw is installed"
    exit 1
fi

echo "✅ OpenClaw config found"
echo ""

# Backup existing config
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "📦 Backed up config to: $CONFIG_FILE.backup"

# Get the API key value (either from env or from .env file)
if [ -z "$DANUBE_API_KEY" ] && [ -f "$OPENCLAW_ENV_FILE" ]; then
    # Source the .env file to get the key
    DANUBE_API_KEY=$(grep "DANUBE_API_KEY" "$OPENCLAW_ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi

# Add Danube MCP config using Python (to handle JSON properly)
python3 << PYTHON_SCRIPT
import json
import os
import sys

config_file = os.path.expanduser("~/.openclaw/openclaw.json")

# Read existing config
with open(config_file, 'r') as f:
    config = json.load(f)

# Get API key from environment (passed from shell)
api_key = os.environ.get('DANUBE_API_KEY', '')
if not api_key:
    print("❌ DANUBE_API_KEY not found")
    sys.exit(1)

# Danube MCP configuration with hardcoded API key (not environment variable)
# This matches the working Claude Desktop format
danube_config = {
    "name": "danube",
    "command": "npx",
    "args": [
        "-y",
        "mcp-remote",
        "https://mcp.danubeai.com/mcp",
        "--header",
        f"danube-api-key:{api_key}"
    ]
}

# Navigate to external skills array
if "agents" not in config:
    config["agents"] = {"list": []}

if len(config["agents"]["list"]) == 0:
    config["agents"]["list"].append({"id": "main", "skills": {"external": []}})

agent = config["agents"]["list"][0]

if "skills" not in agent:
    agent["skills"] = {"external": []}

if "external" not in agent["skills"]:
    agent["skills"]["external"] = []

# Check if Danube is already configured
existing_danube = any(skill.get("name") == "danube" for skill in agent["skills"]["external"])

if existing_danube:
    print("⚠️  Danube MCP is already configured in OpenClaw")
    sys.exit(0)

# Add Danube config
agent["skills"]["external"].append(danube_config)

# Write updated config
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Danube MCP added to OpenClaw config")
print(f"   Using API key: {api_key[:10]}...")
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo "🔄 Restarting OpenClaw Gateway..."
    openclaw gateway restart
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "You can now use Danube tools through OpenClaw. Try:"
    echo "  • 'List available services on Danube'"
    echo "  • 'Search for tools that can send emails'"
else
    echo ""
    echo "❌ Setup failed. Restoring backup..."
    mv "$CONFIG_FILE.backup" "$CONFIG_FILE"
    exit 1
fi
