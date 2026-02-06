#!/bin/bash
# Pulse CLI - Helper script for common Pulse API operations
# Usage: ./pulse-cli.sh <command> [args]

set -euo pipefail

# Configuration
PULSE_URL="${PULSE_URL:-https://demo.pulserelay.pro}"
PULSE_TOKEN="${PULSE_TOKEN:-a4b819a65b8d41318d167356dbf5be2c70b0bbf7d5fd4687bbf325a6a61819e0}"

# Helper function for API calls
api_call() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    local args=(-s -X "$method")
    
    if [[ -n "$PULSE_TOKEN" ]]; then
        args+=(-H "X-API-Token: $PULSE_TOKEN")
    fi
    
    if [[ -n "$data" ]]; then
        args+=(-H "Content-Type: application/json" -d "$data")
    fi
    
    curl "${args[@]}" "${PULSE_URL}/api/${endpoint}"
}

# Commands
cmd_health() {
    api_call "health" | jq
}

cmd_state() {
    api_call "state" | jq
}

cmd_resources() {
    if [[ "${1:-}" == "--stats" ]]; then
        api_call "resources/stats" | jq
    else
        api_call "resources" | jq
    fi
}

cmd_resource() {
    local id="$1"
    api_call "resources/${id}" | jq
}

cmd_metrics() {
    local range="${1:-24h}"
    api_call "charts?range=${range}" | jq
}

cmd_storage_stats() {
    api_call "storage/" | jq
}

cmd_backups() {
    api_call "backups/unified" | jq
}

cmd_version() {
    api_call "version" | jq
}

cmd_test_notification() {
    api_call "notifications/test" POST | jq
}

cmd_notification_health() {
    api_call "notifications/health" | jq
}

cmd_updates_check() {
    api_call "updates/check" | jq
}

cmd_updates_status() {
    api_call "updates/status" | jq
}

cmd_tokens_list() {
    api_call "security/tokens" | jq
}

cmd_token_create() {
    local name="$1"
    local scopes="${2:-monitoring:read}"
    local data="{\"name\":\"${name}\",\"scopes\":[\"${scopes}\"]}"
    api_call "security/tokens" POST "$data" | jq
}

cmd_ai_status() {
    api_call "ai/patrol/status" | jq
}

cmd_ai_findings() {
    api_call "ai/patrol/findings" | jq
}

cmd_agents_list() {
    api_call "state" | jq '[.hosts[]? | {
        name: (.displayName // .name),
        status: .status,
        uptime: .uptime,
        lastSeen: .lastSeen
    }]'
}

cmd_ram_usage() {
    api_call "state" | jq '[(.nodes[]?, .hosts[]?) | select(.memory) | {
        name: (.displayName // .name),
        totalGB: (.memory.total / 1024 / 1024 / 1024 | round),
        usedGB: (.memory.used / 1024 / 1024 / 1024 | round * 10 / 10),
        freeGB: (.memory.free / 1024 / 1024 / 1024 | round * 10 / 10),
        usage: (.memory.usage | round * 10 / 10)
    }]'
}

cmd_high_cpu() {
    local threshold="${1:-80}"
    api_call "state" | jq --arg threshold "$threshold" '
        [
            (.containers[]? | select(.cpu? > ($threshold | tonumber)) | {name, type: "container", cpu}),
            (.vms[]? | select(.cpu?.usage? > ($threshold | tonumber)) | {name, type: "vm", cpu: .cpu.usage})
        ]
    '
}

cmd_alerts() {
    api_call "state" | jq '.alerts'
}

cmd_help() {
    cat << EOF
Pulse CLI - Helper script for Pulse API

Usage: $0 <command> [args]

Commands:
  health                      - Check system health
  state                       - Get complete infrastructure state
  resources [--stats]         - List resources or get stats
  resource <id>               - Get single resource details
  metrics [range]             - Get metrics (default: 24h)
                                Ranges: 5m, 15m, 30m, 1h, 4h, 12h, 24h, 7d
  storage-stats               - Get storage statistics
  backups                     - Get unified backup history
  version                     - Get Pulse version
  
  test-notification           - Send test notification
  notification-health         - Check notification system health
  
  updates-check               - Check for Pulse updates
  updates-status              - Get current update status
  
  tokens-list                 - List API tokens
  token-create <name> [scopes] - Create new API token
  
  ai-status                   - Get AI patrol status
  ai-findings                 - Get AI findings
  
  agents-list                 - List all agents
  
  ram-usage                   - Show RAM usage for all nodes
  high-cpu [threshold]        - Show resources with CPU > threshold (default: 80)
  alerts                      - Show current alerts
  
  help                        - Show this help

Environment Variables:
  PULSE_URL                   - Base URL (default: http://192.168.1.5:7655)
  PULSE_TOKEN                 - API token for authentication

Examples:
  $0 health
  $0 metrics 7d
  $0 ram-usage
  $0 high-cpu 90
  $0 token-create "automation" "monitoring:read"
EOF
}

# Main
main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        health) cmd_health "$@" ;;
        state) cmd_state "$@" ;;
        resources) cmd_resources "$@" ;;
        resource) cmd_resource "$@" ;;
        metrics) cmd_metrics "$@" ;;
        storage-stats) cmd_storage_stats "$@" ;;
        backups) cmd_backups "$@" ;;
        version) cmd_version "$@" ;;
        test-notification) cmd_test_notification "$@" ;;
        notification-health) cmd_notification_health "$@" ;;
        updates-check) cmd_updates_check "$@" ;;
        updates-status) cmd_updates_status "$@" ;;
        tokens-list) cmd_tokens_list "$@" ;;
        token-create) cmd_token_create "$@" ;;
        ai-status) cmd_ai_status "$@" ;;
        ai-findings) cmd_ai_findings "$@" ;;
        agents-list) cmd_agents_list "$@" ;;
        ram-usage) cmd_ram_usage "$@" ;;
        high-cpu) cmd_high_cpu "$@" ;;
        alerts) cmd_alerts "$@" ;;
        help|--help|-h) cmd_help ;;
        *) echo "Unknown command: $command" >&2; cmd_help; exit 1 ;;
    esac
}

main "$@"
