#!/bin/bash
# Human-readable Archon network statistics

STATUS=$(curl -s "https://archon.technology/api/v1/status")

TOTAL=$(echo "$STATUS" | jq -r '.dids.total')
AGENTS=$(echo "$STATUS" | jq -r '.dids.byType.agents')
ASSETS=$(echo "$STATUS" | jq -r '.dids.byType.assets')
CONFIRMED=$(echo "$STATUS" | jq -r '.dids.byType.confirmed')
UNCONFIRMED=$(echo "$STATUS" | jq -r '.dids.byType.unconfirmed')
EPHEMERAL=$(echo "$STATUS" | jq -r '.dids.byType.ephemeral')
UPTIME=$(echo "$STATUS" | jq -r '.uptimeSeconds')

# Convert uptime to human readable
DAYS=$((UPTIME / 86400))
HOURS=$(((UPTIME % 86400) / 3600))
MINS=$(((UPTIME % 3600) / 60))

# Get registries
HYPERSWARM=$(echo "$STATUS" | jq -r '.dids.byRegistry.hyperswarm // 0')
BTC_MAINNET=$(echo "$STATUS" | jq -r '.dids.byRegistry["BTC:mainnet"] // 0')
BTC_SIGNET=$(echo "$STATUS" | jq -r '.dids.byRegistry["BTC:signet"] // 0')

echo "Archon Network Status"
echo "----------------------"
echo "Total DIDs: $TOTAL"
echo "  Agents: $AGENTS | Assets: $ASSETS"
echo "  Confirmed: $CONFIRMED | Unconfirmed: $UNCONFIRMED | Ephemeral: $EPHEMERAL"
echo ""
echo "Uptime: ${DAYS}d ${HOURS}h ${MINS}m"
echo ""
echo "Registries:"
echo "  Hyperswarm: $HYPERSWARM"
echo "  BTC Mainnet: $BTC_MAINNET"
echo "  BTC Signet: $BTC_SIGNET"
