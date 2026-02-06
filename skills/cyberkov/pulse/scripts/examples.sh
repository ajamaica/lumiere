#!/bin/bash
# Pulse API Examples - Common usage patterns

PULSE_URL="${PULSE_URL:-https://demo.pulserelay.pro}"
PULSE_TOKEN="${PULSE_TOKEN:-a4b819a65b8d41318d167356dbf5be2c70b0bbf7d5fd4687bbf325a6a61819e0}"

# Helper function
pulse_api() {
    curl -s -H "X-API-Token: $PULSE_TOKEN" "${PULSE_URL}/api/$1"
}

echo "=== Pulse API Examples ==="
echo

# Example 1: Check health
echo "1. System Health:"
pulse_api "health" | jq '{status, uptime}'
echo

# Example 2: Get RAM usage for all nodes
echo "2. RAM Usage (All Nodes):"
pulse_api "state" | jq '[(.nodes[]?, .hosts[]?) | select(.memory) | {
    name: (.displayName // .name),
    memoryGB: (.memory.total / 1024 / 1024 / 1024 | round),
    usedGB: (.memory.used / 1024 / 1024 / 1024 | round),
    percent: (.memory.usage | round)
}]'
echo

# Example 3: Find containers with high CPU
echo "3. Containers with CPU > 80%:"
pulse_api "state" | jq '[.containers[]? | select(.cpu? > 80) | {
    name,
    cpu,
    node: .nodeName
}]'
echo

# Example 4: Get current alerts
echo "4. Active Alerts:"
pulse_api "state" | jq '.alerts | length as $count | {
    total: $count,
    alerts: (if $count > 0 then .[0:3] else [] end)
}'
echo

# Example 5: Storage usage summary
echo "5. Storage Usage Summary:"
pulse_api "storage/" | jq '[.[] | {
    node: .node,
    pool: .pool,
    totalGB: (.total / 1024 / 1024 / 1024 | round),
    usedGB: (.used / 1024 / 1024 / 1024 | round),
    percent: .percent
}] | sort_by(.percent) | reverse | .[0:5]'
echo

# Example 6: Get metrics for last 24 hours
echo "6. Metrics (Last 24h) - Sample:"
pulse_api "charts?range=24h" | jq '{
    cpu: (.cpu | length),
    memory: (.memory | length),
    latest_cpu: .cpu[-1]
}'
echo

# Example 7: List VMs with status
echo "7. Virtual Machines Status:"
pulse_api "state" | jq '[.vms[]? | {
    name,
    status,
    cpu: .cpu.usage,
    memoryGB: (.memory.maxmem / 1024 / 1024 / 1024 | round),
    node: .node
}] | .[0:5]'
echo

# Example 8: Get version and update status
echo "8. Version & Updates:"
pulse_api "version" | jq '{
    current: .version,
    channel: .channel,
    updateAvailable,
    latest: .latestVersion
}'
echo

echo "=== Examples Complete ==="
