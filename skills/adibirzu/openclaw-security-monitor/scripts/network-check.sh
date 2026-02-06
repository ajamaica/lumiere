#!/bin/bash
# OpenClaw Security Monitor - Network Activity Check
# Monitors connections, DNS, known-bad IPs, and listening ports.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IOC_DIR="$PROJECT_DIR/ioc"

echo "============================================"
echo "  NETWORK ACTIVITY CHECK"
echo "  $(date -u +"%Y-%m-%d %H:%M UTC")"
echo "============================================"
echo ""

# Active connections from node/openclaw processes
echo "--- Active Outbound Connections ---"
lsof -i -nP 2>/dev/null | grep -E "node|openclaw|npm|npx" | grep -E "ESTABLISHED|SYN_SENT" | awk '{print $1, $9}' | sort -u || echo "  No active connections"
echo ""

# DNS lookups (recent)
echo "--- Recent DNS Cache ---"
dscacheutil -cachedump 2>/dev/null | head -20 || echo "  DNS cache not accessible"
echo ""

# Known bad IPs check (expanded with IOC database)
echo "--- Bad IP Check ---"
if [ -f "$IOC_DIR/c2-ips.txt" ]; then
    BAD_IPS=$(grep -v '^#' "$IOC_DIR/c2-ips.txt" | grep -v '^$' | cut -d'|' -f1 | tr '\n' '|' | sed 's/|$//')
else
    BAD_IPS="91.92.242|95.92.242|96.92.242|54.91.154.110|202.161.50.59"
fi
CONNECTIONS=$(lsof -i -nP 2>/dev/null | grep -E "$BAD_IPS" || true)
if [ -n "$CONNECTIONS" ]; then
    echo "CRITICAL: Connection to known C2 infrastructure detected!"
    echo "$CONNECTIONS"
else
    echo "CLEAN: No connections to known-bad IPs"
fi
echo ""

# Known bad domains in active connections
echo "--- Bad Domain Check ---"
if [ -f "$IOC_DIR/malicious-domains.txt" ]; then
    BAD_DOMAINS=$(grep -v '^#' "$IOC_DIR/malicious-domains.txt" | grep -v '^$' | cut -d'|' -f1 | tr '\n' '|' | sed 's/|$//')
    DOMAIN_CONNS=$(lsof -i -nP 2>/dev/null | grep -iE "$BAD_DOMAINS" || true)
    if [ -n "$DOMAIN_CONNS" ]; then
        echo "WARNING: Connection to suspicious domain detected:"
        echo "$DOMAIN_CONNS"
    else
        echo "CLEAN: No connections to known-bad domains"
    fi
else
    echo "  Domain database not available"
fi
echo ""

# Moltbook platform connections (CSA report: poisoned content, credential exposure)
echo "--- Moltbook Platform Connections ---"
MOLTBOOK_CONNS=$(lsof -i -nP 2>/dev/null | grep -i "moltbook" || true)
if [ -n "$MOLTBOOK_CONNS" ]; then
    echo "INFO: Active connections to Moltbook platform detected:"
    echo "$MOLTBOOK_CONNS"
    echo "  Note: Monitor for credential exposure and content poisoning (CSA advisory)"
else
    echo "  No Moltbook connections"
fi
echo ""

# Non-standard port connections from agent processes
echo "--- Agent Non-Standard Port Connections ---"
AGENT_CONNS=$(lsof -i -nP 2>/dev/null | grep -E "node|openclaw|moltbot|clawdbot" | grep -vE ":443 |:80 |:18789 |:18800 |LISTEN" | grep "ESTABLISHED" || true)
if [ -n "$AGENT_CONNS" ]; then
    echo "INFO: Agent connections on non-standard ports:"
    echo "$AGENT_CONNS"
else
    echo "  No non-standard port connections from agent processes"
fi
echo ""

# Listening ports
echo "--- Listening Ports (node) ---"
lsof -i -nP 2>/dev/null | grep -E "node|openclaw" | grep LISTEN | awk '{print $1, $9}' | sort -u || echo "  No node listeners"
echo ""
echo "============================================"
