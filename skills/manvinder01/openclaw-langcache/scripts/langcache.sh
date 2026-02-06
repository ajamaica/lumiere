#!/usr/bin/env bash
#
# langcache.sh - CLI wrapper for Redis LangCache REST API
# Enforces default caching policy with hard blocks
#
# Usage:
#   langcache.sh search <prompt> [--threshold <0.0-1.0>] [--attr <key=value>] [--strategy <exact,semantic>]
#   langcache.sh store <prompt> <response> [--attr <key=value>]...
#   langcache.sh delete --id <entry-id>
#   langcache.sh delete --attr <key=value>
#   langcache.sh flush
#   langcache.sh check <text>  # Check if text would be blocked
#
# Environment variables:
#   LANGCACHE_HOST      - LangCache API host (required)
#   LANGCACHE_CACHE_ID  - Cache ID (required)
#   LANGCACHE_API_KEY   - API key (required)

set -euo pipefail

# Load secrets if available
SECRETS_FILE="${HOME}/.openclaw/secrets.env"
if [[ -f "$SECRETS_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$SECRETS_FILE"
fi

# =============================================================================
# HARD BLOCK PATTERNS - These NEVER get cached
# =============================================================================

# Temporal patterns (time-sensitive)
TEMPORAL_PATTERNS=(
    '\b(today|tomorrow|tonight|yesterday)\b'
    '\b(this|next|last)[[:space:]]+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b'
    '\bin[[:space:]]+[0-9]+[[:space:]]+(minutes?|hours?|days?|weeks?)\b'
    '\b(deadline|eta|appointment|scheduled?)\b'
    '\b(right[[:space:]]+now|at[[:space:]]+[0-9]{1,2}(:[0-9]{2})?[[:space:]]*(am|pm)?)\b'
    '\bmeeting[[:space:]]+at\b'
)

# Credential patterns (security risk)
CREDENTIAL_PATTERNS=(
    '\b(api[_-]?key|api[_-]?secret|access[_-]?token)\b'
    '\b(password|passwd|pwd)[[:space:]]*[:=]'
    '\b(secret[_-]?key|private[_-]?key)\b'
    '\b(otp|2fa|totp|authenticator)[[:space:]]*(code|token)?\b'
    '\bbearer[[:space:]]+[a-zA-Z0-9_-]+'
    '\b(sk|pk)[_-][a-zA-Z0-9]{20,}\b'
)

# Identifier patterns (PII)
IDENTIFIER_PATTERNS=(
    '\b[0-9]{10,15}\b'
    '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
    '\b(order|account|message|chat|user|customer)[_-]?id[[:space:]]*[:=]?[[:space:]]*[a-zA-Z0-9]+'
    '\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b'
    '@[a-zA-Z0-9_]{1,15}\b'
)

# Personal context patterns (privacy)
PERSONAL_PATTERNS=(
    '\bmy[[:space:]]+(wife|husband|partner|girlfriend|boyfriend|spouse)\b'
    '\bmy[[:space:]]+(mom|dad|mother|father|brother|sister|son|daughter|child|kid)\b'
    '\bmy[[:space:]]+(friend|colleague|coworker|boss|manager)[[:space:]]+[A-Za-z]+'
    '\b(said[[:space:]]+to[[:space:]]+me|told[[:space:]]+me|asked[[:space:]]+me|between[[:space:]]+us)\b'
    '\b(private|confidential|secret)[[:space:]]+(conversation|chat|message)\b'
    '\bin[[:space:]]+(our|my)[[:space:]]+(chat|conversation|thread|group)\b'
    '\b(he|she|they)[[:space:]]+(said|told|asked|mentioned)\b'
)

# Check if text matches any block pattern
# Returns: 0 if blocked, 1 if allowed
# Output: block reason if blocked
check_blocks() {
    local text="$1"
    local text_lower
    text_lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    # Check temporal patterns
    for pattern in "${TEMPORAL_PATTERNS[@]}"; do
        if echo "$text_lower" | grep -qiE "$pattern"; then
            echo "temporal_info"
            return 0
        fi
    done

    # Check credential patterns
    for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
        if echo "$text_lower" | grep -qiE "$pattern"; then
            echo "credentials"
            return 0
        fi
    done

    # Check identifier patterns
    for pattern in "${IDENTIFIER_PATTERNS[@]}"; do
        if echo "$text_lower" | grep -qiE "$pattern"; then
            echo "identifiers"
            return 0
        fi
    done

    # Check personal patterns
    for pattern in "${PERSONAL_PATTERNS[@]}"; do
        if echo "$text_lower" | grep -qiE "$pattern"; then
            echo "personal_context"
            return 0
        fi
    done

    return 1
}

# Validate required environment variables
check_env() {
    local missing=()
    [[ -z "${LANGCACHE_HOST:-}" ]] && missing+=("LANGCACHE_HOST")
    [[ -z "${LANGCACHE_CACHE_ID:-}" ]] && missing+=("LANGCACHE_CACHE_ID")
    [[ -z "${LANGCACHE_API_KEY:-}" ]] && missing+=("LANGCACHE_API_KEY")

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Error: Missing required environment variables: ${missing[*]}" >&2
        echo "Set them in ~/.openclaw/secrets.env or export them directly." >&2
        exit 1
    fi
}

# Base URL for API calls
base_url() {
    echo "https://${LANGCACHE_HOST}/v1/caches/${LANGCACHE_CACHE_ID}"
}

# Make authenticated API request
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local url
    url="$(base_url)${endpoint}"

    local args=(
        -s
        -X "$method"
        -H "Accept: application/json"
        -H "Content-Type: application/json"
        -H "Authorization: Bearer ${LANGCACHE_API_KEY}"
    )

    if [[ -n "$data" ]]; then
        args+=(-d "$data")
    fi

    curl "${args[@]}" "$url"
}

# Parse attributes from --attr key=value arguments
parse_attributes() {
    local attrs=()
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --attr)
                shift
                attrs+=("$1")
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [[ ${#attrs[@]} -eq 0 ]]; then
        echo "{}"
        return
    fi

    local json="{"
    local first=true
    for attr in "${attrs[@]}"; do
        local key="${attr%%=*}"
        local value="${attr#*=}"
        if [[ "$first" == "true" ]]; then
            first=false
        else
            json+=","
        fi
        json+="\"${key}\":\"${value}\""
    done
    json+="}"
    echo "$json"
}

# Check command - test if text would be blocked
cmd_check() {
    local text="$1"

    if [[ -z "$text" ]]; then
        echo "Error: Check requires text to analyze" >&2
        exit 1
    fi

    local block_reason
    if block_reason=$(check_blocks "$text"); then
        echo "BLOCKED: $block_reason"
        echo "This content will NOT be cached."
        return 1
    else
        echo "ALLOWED: Content can be cached"
        return 0
    fi
}

# Search for cached response
cmd_search() {
    local prompt=""
    local threshold=""
    local strategy=""
    local attrs_args=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --threshold)
                shift
                threshold="$1"
                shift
                ;;
            --strategy)
                shift
                strategy="$1"
                shift
                ;;
            --attr)
                attrs_args+=(--attr)
                shift
                attrs_args+=("$1")
                shift
                ;;
            *)
                if [[ -z "$prompt" ]]; then
                    prompt="$1"
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$prompt" ]]; then
        echo "Error: Search requires a prompt" >&2
        echo "Usage: langcache.sh search <prompt> [--threshold <0.0-1.0>] [--attr <key=value>]" >&2
        exit 1
    fi

    # Check for hard blocks before searching
    local block_reason
    if block_reason=$(check_blocks "$prompt"); then
        echo "{\"hit\": false, \"blocked\": true, \"reason\": \"$block_reason\"}"
        echo "Warning: Prompt contains blocked content ($block_reason), skipping cache" >&2
        return 0
    fi

    # Build JSON payload
    local json
    json=$(jq -n \
        --arg prompt "$prompt" \
        '{prompt: $prompt}')

    # Add similarity threshold if specified
    if [[ -n "$threshold" ]]; then
        json=$(echo "$json" | jq --arg t "$threshold" '. + {similarityThreshold: ($t | tonumber)}')
    fi

    # Add search strategies if specified
    if [[ -n "$strategy" ]]; then
        IFS=',' read -ra strategies <<< "$strategy"
        json=$(echo "$json" | jq --argjson s "$(printf '%s\n' "${strategies[@]}" | jq -R . | jq -s .)" '. + {searchStrategies: $s}')
    fi

    # Add attributes if specified
    if [[ ${#attrs_args[@]} -gt 0 ]]; then
        local attrs
        attrs=$(parse_attributes "${attrs_args[@]}")
        json=$(echo "$json" | jq --argjson a "$attrs" '. + {attributes: $a}')
    fi

    api_request POST "/entries/search" "$json"
}

# Store new cache entry
cmd_store() {
    local prompt=""
    local response=""
    local attrs_args=()
    local force=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --attr)
                attrs_args+=(--attr)
                shift
                attrs_args+=("$1")
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            *)
                if [[ -z "$prompt" ]]; then
                    prompt="$1"
                elif [[ -z "$response" ]]; then
                    response="$1"
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$prompt" || -z "$response" ]]; then
        echo "Error: Store requires prompt and response" >&2
        echo "Usage: langcache.sh store <prompt> <response> [--attr <key=value>]..." >&2
        exit 1
    fi

    # Check for hard blocks in prompt
    local block_reason
    if block_reason=$(check_blocks "$prompt"); then
        echo "Error: Prompt contains blocked content ($block_reason)" >&2
        echo "This content cannot be cached. Blocked categories:" >&2
        echo "  - temporal_info: time-sensitive data (today, tomorrow, deadlines)" >&2
        echo "  - credentials: API keys, passwords, tokens" >&2
        echo "  - identifiers: emails, phone numbers, account IDs" >&2
        echo "  - personal_context: private conversations, relationships" >&2
        if [[ "$force" != "true" ]]; then
            exit 1
        fi
        echo "Warning: --force flag used, storing anyway (not recommended)" >&2
    fi

    # Check for hard blocks in response
    if block_reason=$(check_blocks "$response"); then
        echo "Error: Response contains blocked content ($block_reason)" >&2
        if [[ "$force" != "true" ]]; then
            exit 1
        fi
        echo "Warning: --force flag used, storing anyway (not recommended)" >&2
    fi

    # Build JSON payload
    local json
    json=$(jq -n \
        --arg prompt "$prompt" \
        --arg response "$response" \
        '{prompt: $prompt, response: $response}')

    # Add attributes if specified
    if [[ ${#attrs_args[@]} -gt 0 ]]; then
        local attrs
        attrs=$(parse_attributes "${attrs_args[@]}")
        json=$(echo "$json" | jq --argjson a "$attrs" '. + {attributes: $a}')
    fi

    api_request POST "/entries" "$json"
}

# Delete cache entries
cmd_delete() {
    local entry_id=""
    local attrs_args=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --id)
                shift
                entry_id="$1"
                shift
                ;;
            --attr)
                attrs_args+=(--attr)
                shift
                attrs_args+=("$1")
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [[ -n "$entry_id" ]]; then
        # Delete by ID
        api_request DELETE "/entries/${entry_id}"
    elif [[ ${#attrs_args[@]} -gt 0 ]]; then
        # Delete by attributes
        local attrs
        attrs=$(parse_attributes "${attrs_args[@]}")
        local json
        json=$(jq -n --argjson a "$attrs" '{attributes: $a}')
        api_request DELETE "/entries" "$json"
    else
        echo "Error: Delete requires --id or --attr" >&2
        echo "Usage: langcache.sh delete --id <entry-id>" >&2
        echo "       langcache.sh delete --attr <key=value>" >&2
        exit 1
    fi
}

# Flush entire cache
cmd_flush() {
    echo "Warning: This will delete ALL cache entries. Proceed? (y/N)" >&2
    read -r confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        api_request POST "/flush"
        echo "Cache flushed." >&2
    else
        echo "Aborted." >&2
        exit 1
    fi
}

# Force flush without confirmation (for scripts)
cmd_flush_force() {
    api_request POST "/flush"
}

# Show usage
usage() {
    cat <<EOF
langcache.sh - CLI wrapper for Redis LangCache REST API
Enforces default caching policy with hard blocks.

Commands:
  search <prompt>     Search for cached response
    --threshold       Similarity threshold (0.0-1.0, default: uses cache default)
    --strategy        Search strategy: exact, semantic, or both (comma-separated)
    --attr key=value  Filter by attribute (can be repeated)

  store <prompt> <response>   Store new cache entry
    --attr key=value  Add attribute (can be repeated)
    --force           Store even if blocked (not recommended)

  delete              Delete cache entries
    --id <entry-id>   Delete by entry ID
    --attr key=value  Delete by attribute match

  check <text>        Check if text would be blocked by policy

  flush               Clear entire cache (with confirmation)
  flush-force         Clear entire cache (no confirmation, for scripts)

Caching Policy (enforced automatically):
  CACHEABLE:
    - Factual Q&A, definitions, documentation
    - Command explanations
    - Reusable reply templates (polite no, follow-up, intro)
    - Style transforms (warmer, shorter, firmer)

  BLOCKED (hard blocks):
    - Temporal info: today, tomorrow, deadlines, ETAs, appointments
    - Credentials: API keys, tokens, passwords, OTP/2FA
    - Identifiers: emails, phone numbers, addresses, account IDs
    - Personal context: relationships, private conversations

Environment:
  LANGCACHE_HOST      LangCache API host
  LANGCACHE_CACHE_ID  Cache ID
  LANGCACHE_API_KEY   API key

  Set these in ~/.openclaw/secrets.env or export directly.

Examples:
  langcache.sh search "What is Redis?"
  langcache.sh search "What is Redis?" --threshold 0.9
  langcache.sh store "What is Redis?" "Redis is an in-memory data store..."
  langcache.sh store "prompt" "response" --attr model=gpt-5 --attr category=factual
  langcache.sh check "What's on my calendar today?"  # Will show: BLOCKED: temporal_info
  langcache.sh delete --id abc123
  langcache.sh delete --attr user=123
EOF
}

# Main
main() {
    if [[ $# -eq 0 ]]; then
        usage
        exit 0
    fi

    local cmd="$1"
    shift

    case "$cmd" in
        search)
            check_env
            cmd_search "$@"
            ;;
        store)
            check_env
            cmd_store "$@"
            ;;
        delete)
            check_env
            cmd_delete "$@"
            ;;
        check)
            cmd_check "$@"
            ;;
        flush)
            check_env
            cmd_flush "$@"
            ;;
        flush-force)
            check_env
            cmd_flush_force "$@"
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            echo "Unknown command: $cmd" >&2
            usage
            exit 1
            ;;
    esac
}

main "$@"
