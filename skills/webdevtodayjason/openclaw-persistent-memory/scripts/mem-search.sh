#!/bin/bash
# OpenClaw-Mem Search CLI
# Usage: mem-search.sh <query> [--type TYPE] [--limit N]

WORKER_URL="${OPENCLAW_MEM_URL:-http://127.0.0.1:37778}"

show_help() {
    echo "OpenClaw-Mem Search"
    echo ""
    echo "Usage: mem-search.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  search <query>     Search observations"
    echo "  get <id>           Get observation by ID"
    echo "  timeline <id>      Get timeline around observation"
    echo "  stats              Show database statistics"
    echo "  health             Check worker health"
    echo ""
    echo "Options:"
    echo "  --type TYPE        Filter by type (bugfix, decision, etc.)"
    echo "  --limit N          Max results (default: 10)"
    echo "  --json             Output raw JSON"
}

check_worker() {
    if ! curl -s "$WORKER_URL/api/health" > /dev/null 2>&1; then
        echo "Error: OpenClaw-Mem worker not running"
        echo "Start it with: openclaw-mem start-daemon"
        exit 1
    fi
}

search() {
    local query="$1"
    local type=""
    local limit=10
    local json=false
    
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type) type="$2"; shift 2 ;;
            --limit) limit="$2"; shift 2 ;;
            --json) json=true; shift ;;
            *) shift ;;
        esac
    done
    
    local body="{\"query\": \"$query\", \"limit\": $limit"
    if [[ -n "$type" ]]; then
        body="$body, \"type\": \"$type\""
    fi
    body="$body}"
    
    local result=$(curl -s -X POST "$WORKER_URL/api/search" \
        -H "Content-Type: application/json" \
        -d "$body")
    
    if $json; then
        echo "$result" | jq
    else
        echo "$result" | jq -r '.results[] | "#\(.id) [\(.type)] \(.created_at | split(" ")[0])\n  \(.summary // .tool_name // "No summary")\n"'
    fi
}

get_observation() {
    local id="$1"
    local json=false
    
    if [[ "$2" == "--json" ]]; then
        json=true
    fi
    
    local result=$(curl -s "$WORKER_URL/api/observations/$id")
    
    if $json; then
        echo "$result" | jq
    else
        echo "$result" | jq -r '"#\(.id) [\(.type)] \(.created_at)\nTool: \(.tool_name // "N/A")\nImportance: \(.importance)\n\nInput:\n\(.input // "N/A")\n\nOutput:\n\(.output // "N/A")\n\nSummary:\n\(.summary // "N/A")"'
    fi
}

timeline() {
    local id="$1"
    local json=false
    
    if [[ "$2" == "--json" ]]; then
        json=true
    fi
    
    local result=$(curl -s -X POST "$WORKER_URL/api/timeline" \
        -H "Content-Type: application/json" \
        -d "{\"observation_id\": $id}")
    
    if $json; then
        echo "$result" | jq
    else
        echo "Timeline around #$id:"
        echo ""
        echo "$result" | jq -r '.observations[] | "#\(.id) \(.created_at) [\(.type)] \(.summary // .tool_name // "...")"'
    fi
}

stats() {
    local result=$(curl -s "$WORKER_URL/api/stats")
    echo "$result" | jq -r '"OpenClaw-Mem Statistics\n\nSessions: \(.totalSessions)\nObservations: \(.totalObservations)\n\nBy Type:"'
    echo "$result" | jq -r '.observationsByType | to_entries[] | "  \(.key): \(.value)"'
}

health() {
    curl -s "$WORKER_URL/api/health" | jq
}

# Main
case "${1:-help}" in
    search)
        check_worker
        shift
        search "$@"
        ;;
    get)
        check_worker
        get_observation "$2" "$3"
        ;;
    timeline)
        check_worker
        timeline "$2" "$3"
        ;;
    stats)
        check_worker
        stats
        ;;
    health)
        health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
