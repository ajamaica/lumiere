#!/bin/bash
# detect_bot_info.sh — Detect Telegram bot name and username from gateway config
# Output: JSON with "name" and "username" fields
# Requires: curl, python3 (for JSON parsing)

set -euo pipefail

CONFIG_PATH="${CLAWDBOT_CONFIG_PATH:-$HOME/.clawdbot/moltbot.json}"

if [ ! -f "$CONFIG_PATH" ]; then
  echo '{"error": "Config file not found at '"$CONFIG_PATH"'"}' >&2
  exit 1
fi

# Extract bot token from config
BOT_TOKEN=$(python3 -c "
import json, sys
with open('$CONFIG_PATH') as f:
    cfg = json.load(f)
# Support single account or multi-account
tg = cfg.get('channels', {}).get('telegram', {})
token = tg.get('botToken', '')
if not token:
    # Try first account
    accounts = tg.get('accounts', {})
    for acc in accounts.values():
        token = acc.get('botToken', '')
        if token:
            break
if not token:
    print(json.dumps({'error': 'No Telegram bot token found in config'}), file=sys.stderr)
    sys.exit(1)
print(token)
")

# Call Telegram getMe API
RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

# Parse and output
python3 -c "
import json, sys
data = json.loads('''$RESPONSE''')
if not data.get('ok'):
    print(json.dumps({'error': 'Telegram API error', 'details': data}), file=sys.stderr)
    sys.exit(1)
result = data['result']
print(json.dumps({
    'id': result['id'],
    'name': result.get('first_name', ''),
    'username': result.get('username', ''),
    'can_join_groups': result.get('can_join_groups', False),
    'can_read_all_group_messages': result.get('can_read_all_group_messages', False)
}))
"
