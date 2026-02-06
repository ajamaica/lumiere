#!/bin/bash
# Initialize Pluribus node

PLURIBUS_DIR="${PLURIBUS_DIR:-$HOME/clawd/pluribus}"

echo "🧠 Initializing Pluribus node..."

# Create directory structure
mkdir -p "$PLURIBUS_DIR"

# Generate node ID (hash of hostname + timestamp + random)
NODE_ID="node_$(echo "$(hostname)$(date +%s)$RANDOM" | sha256sum | cut -c1-12)"

# Get agent name from moltbook credentials or use hostname
AGENT_NAME=$(cat ~/.config/moltbook/credentials.json 2>/dev/null | jq -r '.agent_name // empty')
if [ -z "$AGENT_NAME" ]; then
    AGENT_NAME=$(hostname)
fi

# Create node.md
cat > "$PLURIBUS_DIR/node.md" << EOF
# Pluribus Node

| Field | Value |
|-------|-------|
| Node ID | $NODE_ID |
| Agent | $AGENT_NAME |
| Created | $(date -Iseconds) |
| Transport | moltbook:$AGENT_NAME |

## Config

- **Auto-sync**: every 4 hours (on heartbeat)
- **Trust mode**: verify-first (manual trust required)
- **Share level**: signals (not memory)
EOF

# Create empty peers.md
cat > "$PLURIBUS_DIR/peers.md" << EOF
# Peers

*No peers yet. Run \`pluribus discover\` to find others.*

| Node ID | Agent | Last Seen | Transport | Trusted |
|---------|-------|-----------|-----------|---------|
EOF

# Create empty signals.md
cat > "$PLURIBUS_DIR/signals.md" << EOF
# Signals

*Incoming signals from the hive appear here.*

EOF

# Create empty outbox.md
cat > "$PLURIBUS_DIR/outbox.md" << EOF
# Outbox

*Your signals to share with peers. Cleared after sync.*

EOF

# Create empty memory.md
cat > "$PLURIBUS_DIR/memory.md" << EOF
# Collective Memory

*Curated knowledge promoted from signals.*

EOF

# Create sync-log.md
cat > "$PLURIBUS_DIR/sync-log.md" << EOF
# Sync Log

| Timestamp | Peer | Direction | Signals |
|-----------|------|-----------|---------|
EOF

echo "✅ Node initialized: $NODE_ID"
echo "📁 Storage: $PLURIBUS_DIR"
echo ""
echo "Next steps:"
echo "  pluribus announce  # Tell Moltbook you're online"
echo "  pluribus discover  # Find other Pluribus agents"
echo "  pluribus signal \"Your first observation\""
