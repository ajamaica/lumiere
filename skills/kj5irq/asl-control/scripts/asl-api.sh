#!/bin/bash
# ASL Agent API - Linux wrapper (replaces PowerShell scripts)
# Usage: source asl-api.sh, then call functions directly
# Or: ./asl-api.sh <command> [args]

ASL_PI_IP="${ASL_PI_IP:-100.116.156.98}"
ASL_API_KEY="${ASL_API_KEY:-}"
ASL_BASE="http://${ASL_PI_IP}:8073"

_asl_call() {
    local method="$1"
    local endpoint="$2"
    local body="$3"

    if [ -z "$ASL_API_KEY" ]; then
        echo "ERROR: ASL_API_KEY not set. Source ~/.config/secrets/api-keys.env first."
        return 1
    fi

    if [ -n "$body" ]; then
        curl -s -X "$method" -H "X-API-Key: $ASL_API_KEY" -H "Content-Type: application/json" -d "$body" "${ASL_BASE}${endpoint}"
    else
        curl -s -X "$method" -H "X-API-Key: $ASL_API_KEY" "${ASL_BASE}${endpoint}"
    fi
}

asl_status() {
    echo "=== Node 637050 (KJ5IRQ) Status ==="
    _asl_call GET /status | python3 -m json.tool 2>/dev/null || _asl_call GET /status
}

asl_nodes() {
    echo "=== Connected Nodes ==="
    _asl_call GET /nodes | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Connected: {data[\"count\"]} nodes')
for n in data['connected_nodes']:
    mode = 'TX/RX' if n['mode'] == 'T' else 'RX' if n['mode'] == 'M' else n['mode']
    print(f'  {n[\"node\"]:>10}  [{mode}]')
" 2>/dev/null || _asl_call GET /nodes
}

asl_connect() {
    local node="$1"
    local monitor="${2:-false}"
    if [ -z "$node" ]; then
        echo "Usage: asl_connect <node_number> [monitor]"
        return 1
    fi
    echo "Connecting to node $node..."
    _asl_call POST /connect "{\"node\": \"$node\", \"monitor_only\": $monitor}" | python3 -m json.tool 2>/dev/null || _asl_call POST /connect "{\"node\": \"$node\", \"monitor_only\": $monitor}"
}

asl_disconnect() {
    local node="$1"
    if [ -z "$node" ]; then
        echo "Usage: asl_disconnect <node_number>"
        return 1
    fi
    echo "Disconnecting from node $node..."
    _asl_call POST /disconnect "{\"node\": \"$node\"}" | python3 -m json.tool 2>/dev/null || _asl_call POST /disconnect "{\"node\": \"$node\"}"
}

asl_disconnect_all() {
    echo "Disconnecting all nodes..."
    _asl_call POST /disconnect-all | python3 -m json.tool 2>/dev/null || _asl_call POST /disconnect-all
}

asl_audit() {
    local lines="${1:-20}"
    echo "=== Audit Log (last $lines) ==="
    _asl_call GET "/audit?lines=$lines" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for entry in data['entries']:
    print(entry)
" 2>/dev/null || _asl_call GET "/audit?lines=$lines"
}

asl_help() {
    echo "ASL Node Control - KJ5IRQ (637050)"
    echo ""
    echo "  asl_status            - Node status and stats"
    echo "  asl_nodes             - List connected nodes"
    echo "  asl_connect <node>    - Connect to a node (TX/RX)"
    echo "  asl_connect <node> true - Connect monitor only (RX)"
    echo "  asl_disconnect <node> - Disconnect from a node"
    echo "  asl_disconnect_all    - Drop all connections"
    echo "  asl_audit [lines]     - View command audit log"
}

# If run directly (not sourced), act as CLI
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    source ~/.config/secrets/api-keys.env 2>/dev/null
    case "${1:-help}" in
        status)         asl_status ;;
        nodes)          asl_nodes ;;
        connect)        asl_connect "$2" "$3" ;;
        disconnect)     asl_disconnect "$2" ;;
        disconnect-all) asl_disconnect_all ;;
        audit)          asl_audit "$2" ;;
        *)              asl_help ;;
    esac
fi
