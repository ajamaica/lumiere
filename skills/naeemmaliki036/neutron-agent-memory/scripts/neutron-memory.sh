#!/usr/bin/env bash
# Neutron Agent Memory CLI

API_BASE="https://api-neutron.vanarchain.com"
CONFIG_FILE="${HOME}/.config/neutron/credentials.json"

# Load credentials - env vars first, then credentials file
API_KEY="${NEUTRON_API_KEY:-}"
APP_ID="${NEUTRON_APP_ID:-}"
EXTERNAL_USER_ID="${NEUTRON_EXTERNAL_USER_ID:-}"

if [[ -z "$API_KEY" || -z "$APP_ID" ]] && [[ -f "$CONFIG_FILE" ]]; then
    if command -v jq &> /dev/null; then
        [[ -z "$API_KEY" ]] && API_KEY=$(jq -r '.api_key // empty' "$CONFIG_FILE" 2>/dev/null)
        [[ -z "$APP_ID" ]] && APP_ID=$(jq -r '.app_id // empty' "$CONFIG_FILE" 2>/dev/null)
        [[ -z "$EXTERNAL_USER_ID" ]] && EXTERNAL_USER_ID=$(jq -r '.external_user_id // empty' "$CONFIG_FILE" 2>/dev/null)
    else
        [[ -z "$API_KEY" ]] && API_KEY=$(grep '"api_key"' "$CONFIG_FILE" | sed 's/.*"api_key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        [[ -z "$APP_ID" ]] && APP_ID=$(grep '"app_id"' "$CONFIG_FILE" | sed 's/.*"app_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        [[ -z "$EXTERNAL_USER_ID" ]] && EXTERNAL_USER_ID=$(grep '"external_user_id"' "$CONFIG_FILE" | sed 's/.*"external_user_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    fi
fi

# Default external user ID
EXTERNAL_USER_ID="${EXTERNAL_USER_ID:-1}"

if [[ -z "$API_KEY" || "$API_KEY" == "null" ]]; then
    echo "Error: NEUTRON_API_KEY not found"
    echo ""
    echo "Option 1 - Environment variables:"
    echo "  export NEUTRON_API_KEY=your_key"
    echo "  export NEUTRON_APP_ID=your_app_id"
    echo "  export NEUTRON_EXTERNAL_USER_ID=1  # optional, defaults to 1"
    echo ""
    echo "Option 2 - Credentials file:"
    echo "  mkdir -p ~/.config/neutron"
    echo '  echo '"'"'{"api_key":"your_key","app_id":"your_app_id","external_user_id":"1"}'"'"' > ~/.config/neutron/credentials.json'
    exit 1
fi

if [[ -z "$APP_ID" || "$APP_ID" == "null" ]]; then
    echo "Error: NEUTRON_APP_ID not found"
    echo "Set NEUTRON_APP_ID env var or add app_id to ~/.config/neutron/credentials.json"
    exit 1
fi

QUERY_PARAMS="appId=${APP_ID}&externalUserId=${EXTERNAL_USER_ID}"

# Pretty-print JSON if jq is available
format_json() {
    if command -v jq &> /dev/null; then
        jq .
    else
        cat
    fi
}

# Commands
case "${1:-}" in
    save)
        text="$2"
        title="${3:-Untitled}"
        if [[ -z "$text" ]]; then
            echo "Usage: neutron-memory save TEXT [TITLE]"
            exit 1
        fi
        curl -s -X POST "${API_BASE}/seeds?${QUERY_PARAMS}" \
            -H "Authorization: Bearer ${API_KEY}" \
            -F "text=[\"${text}\"]" \
            -F 'textTypes=["text"]' \
            -F 'textSources=["bot_save"]' \
            -F "textTitles=[\"${title}\"]" | format_json
        ;;
    search)
        query="$2"
        limit="${3:-10}"
        threshold="${4:-0.5}"
        if [[ -z "$query" ]]; then
            echo "Usage: neutron-memory search QUERY [LIMIT] [THRESHOLD]"
            exit 1
        fi
        curl -s -X POST "${API_BASE}/seeds/query?${QUERY_PARAMS}" \
            -H "Authorization: Bearer ${API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"query\":\"${query}\",\"limit\":${limit},\"threshold\":${threshold}}" | format_json
        ;;
    context-create)
        agent_id="$2"
        memory_type="$3"
        data="$4"
        metadata="${5:-{}}"
        if [[ -z "$agent_id" || -z "$memory_type" || -z "$data" ]]; then
            echo "Usage: neutron-memory context-create AGENT_ID MEMORY_TYPE JSON_DATA [JSON_METADATA]"
            echo ""
            echo "Memory types: episodic, semantic, procedural, working"
            exit 1
        fi
        curl -s -X POST "${API_BASE}/agent-contexts?${QUERY_PARAMS}" \
            -H "Authorization: Bearer ${API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"agentId\":\"${agent_id}\",\"memoryType\":\"${memory_type}\",\"data\":${data},\"metadata\":${metadata}}" | format_json
        ;;
    context-list)
        agent_id="$2"
        extra=""
        if [[ -n "$agent_id" ]]; then
            extra="&agentId=${agent_id}"
        fi
        curl -s -X GET "${API_BASE}/agent-contexts?${QUERY_PARAMS}${extra}" \
            -H "Authorization: Bearer ${API_KEY}" | format_json
        ;;
    context-get)
        context_id="$2"
        if [[ -z "$context_id" ]]; then
            echo "Usage: neutron-memory context-get CONTEXT_ID"
            exit 1
        fi
        curl -s -X GET "${API_BASE}/agent-contexts/${context_id}?${QUERY_PARAMS}" \
            -H "Authorization: Bearer ${API_KEY}" | format_json
        ;;
    test)
        echo "Testing Neutron API connection..."
        result=$(curl -s -X POST "${API_BASE}/seeds/query?${QUERY_PARAMS}" \
            -H "Authorization: Bearer ${API_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"query":"test","limit":1}')
        if [[ $? -eq 0 && "$result" != *"error"* && "$result" != *"Unauthorized"* ]]; then
            echo "API connection successful"
            echo "$result" | format_json
        else
            echo "API connection failed"
            echo "$result" | format_json
            exit 1
        fi
        ;;
    *)
        echo "Neutron Agent Memory CLI"
        echo ""
        echo "Usage: neutron-memory [command] [args]"
        echo ""
        echo "Seed Commands:"
        echo "  save TEXT [TITLE]                         Save text as a seed"
        echo "  search QUERY [LIMIT] [THRESHOLD]          Semantic search on seeds"
        echo ""
        echo "Agent Context Commands:"
        echo "  context-create AGENT_ID TYPE JSON_DATA [JSON_METADATA]"
        echo "                                            Create agent context"
        echo "  context-list [AGENT_ID]                   List agent contexts"
        echo "  context-get CONTEXT_ID                    Get specific context"
        echo ""
        echo "Utility:"
        echo "  test                                      Test API connection"
        echo ""
        echo "Examples:"
        echo "  neutron-memory save \"Hello world\" \"My first seed\""
        echo "  neutron-memory search \"hello\" 10 0.5"
        echo "  neutron-memory context-create \"my-agent\" \"episodic\" '{\"key\":\"value\"}'"
        echo "  neutron-memory context-list \"my-agent\""
        echo "  neutron-memory context-get abc-123"
        ;;
esac
