#!/usr/bin/env bash

# Store knowledge to the Hivemind API
# Usage:
#   Interactive:  store.sh
#   Quick store:  store.sh "summary" "context" [confidentiality]
#   Named args:   store.sh --summary "..." --context "..." --confidentiality 15 --yes
#   From file:    store.sh --summary "..." --context-file context.txt --yes

set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common functions from lib directory
source "${SCRIPT_DIR}/common.sh"

# Parse arguments
SUMMARY=""
CONTEXT=""
CONFIDENTIALITY=""
AUTO_CONFIRM=false
QUIET=false
POSITIONAL_ARGS=()

# Parse arguments - separate flags from positional args
while [[ $# -gt 0 ]]; do
    case $1 in
        --summary)
            SUMMARY="$2"
            shift 2
            ;;
        --context)
            CONTEXT="$2"
            shift 2
            ;;
        --context-file)
            if [[ ! -f "$2" ]]; then
                echo "Error: File not found: $2" >&2
                exit 1
            fi
            CONTEXT=$(cat "$2")
            shift 2
            ;;
        --confidentiality)
            CONFIDENTIALITY="$2"
            shift 2
            ;;
        -y|--yes)
            AUTO_CONFIRM=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -h|--help)
            echo "Store knowledge to the Hivemind API"
            echo ""
            echo "Usage:"
            echo "  Interactive:  store.sh"
            echo "  Quick store:  store.sh \"summary\" \"context\" [confidentiality]"
            echo "  Named args:   store.sh --summary \"...\" --context \"...\" --confidentiality 15 --yes"
            echo "  From file:    store.sh --summary \"...\" --context-file context.txt --yes"
            echo ""
            echo "Options:"
            echo "  --summary TEXT         Brief summary of the knowledge"
            echo "  --context TEXT         Detailed context and information"
            echo "  --context-file PATH    Read context from file"
            echo "  --confidentiality NUM  Confidentiality level 0-100 (default: 15)"
            echo "  -y, --yes              Skip confirmation prompt"
            echo "  -q, --quiet            Minimal output"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
        *)
            # Collect positional arguments
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Handle positional arguments if no named arguments were used
if [[ -z "${SUMMARY}" && ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
    SUMMARY="${POSITIONAL_ARGS[0]}"
fi
if [[ -z "${CONTEXT}" && ${#POSITIONAL_ARGS[@]} -ge 2 ]]; then
    CONTEXT="${POSITIONAL_ARGS[1]}"
fi
if [[ -z "${CONFIDENTIALITY}" && ${#POSITIONAL_ARGS[@]} -ge 3 ]]; then
    CONFIDENTIALITY="${POSITIONAL_ARGS[2]}"
fi

# Show header unless quiet
if [[ "${QUIET}" == false ]]; then
    echo "╔════════════════════════════════════════════════════════════════════════╗"
    echo "║                    🧠 STORE KNOWLEDGE TO HIVEMIND                       ║"
    echo "╚════════════════════════════════════════════════════════════════════════╝"
    echo ""
fi

# Get summary (from argument or prompt)
if [[ -z "${SUMMARY}" ]]; then
    echo "Enter a brief summary (1-2 sentences, searchable keywords):"
    echo "Example: 'Deploying Node.js apps to Fly.io with persistent volumes'"
    echo ""
    read -r -p "Summary: " SUMMARY
elif [[ "${QUIET}" == false ]]; then
    echo "Summary: ${SUMMARY}"
fi

if [[ -z "${SUMMARY}" ]]; then
    echo "Error: Summary cannot be empty" >&2
    exit 1
fi

if [[ "${QUIET}" == false ]]; then
    echo ""
    echo "────────────────────────────────────────────────────────────────────────"
    echo ""
fi

# Get detailed context
if [[ -z "${CONTEXT}" ]]; then
    echo "Enter detailed context (press Ctrl+D when done):"
    echo "Include: WHY this matters, code examples, gotchas, prerequisites"
    echo ""
    echo "Context:"

    # Read multi-line input until EOF (Ctrl+D)
    CONTEXT=$(cat)
fi

if [[ -z "${CONTEXT}" ]]; then
    echo ""
    echo "Error: Context cannot be empty" >&2
    exit 1
fi

if [[ "${QUIET}" == false ]]; then
    echo ""
    echo "────────────────────────────────────────────────────────────────────────"
    echo ""
fi

# Get confidentiality level
if [[ -z "${CONFIDENTIALITY}" ]]; then
    echo "Choose confidentiality level (0-100):"
    echo "  0-10   : Public knowledge, general best practices"
    echo "  15-30  : Project-specific but shareable"
    echo "  31-50  : Internal patterns, team conventions"
    echo "  51-75  : Sensitive information"
    echo "  76-100 : Highly private"
    echo ""
    read -r -p "Confidentiality [15]: " CONFIDENTIALITY
fi
CONFIDENTIALITY="${CONFIDENTIALITY:-15}"

# Validate confidentiality
if ! [[ "${CONFIDENTIALITY}" =~ ^[0-9]+$ ]] || [[ "${CONFIDENTIALITY}" -lt 0 ]] || [[ "${CONFIDENTIALITY}" -gt 100 ]]; then
    echo "Error: Confidentiality must be between 0 and 100" >&2
    exit 1
fi

if [[ "${QUIET}" == false ]]; then
    echo ""
    echo "────────────────────────────────────────────────────────────────────────"
    echo ""

    # Show preview
    echo "Preview of what will be stored:"
    echo ""
    echo "📝 Summary:"
    echo "   ${SUMMARY}"
    echo ""
    echo "📖 Context:"
    echo "${CONTEXT}" | sed 's/^/   /'
    echo ""
    echo "🔒 Confidentiality: ${CONFIDENTIALITY}"
    echo ""
    echo "────────────────────────────────────────────────────────────────────────"
    echo ""
fi

# Confirm
if [[ "${AUTO_CONFIRM}" == false ]]; then
    read -r -p "Store this to hivemind? (y/n): " CONFIRM
    if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
        echo "Cancelled. Knowledge not stored."
        exit 0
    fi
fi

if [[ "${QUIET}" == false ]]; then
    echo ""
    echo "Storing to hivemind..."
fi

# Create JSON payload
payload=$(jq -n \
    --arg summary "${SUMMARY}" \
    --arg context "${CONTEXT}" \
    --argjson confidentiality "${CONFIDENTIALITY}" \
    '{summary: $summary, context: $context, confidentiality: $confidentiality}')

# Make the request
response=$(hivemind_curl POST "/mindchunks/create" \
    -H "Content-Type: application/json" \
    -d "${payload}")

# Check if response is valid JSON
if ! echo "${response}" | jq . > /dev/null 2>&1; then
    echo ""
    echo "❌ Error: Invalid response from Hivemind API" >&2
    echo "${response}" >&2
    exit 1
fi

# Extract mindchunk ID
mindchunk_id=$(echo "${response}" | jq -r '.id')

if [[ "${mindchunk_id}" != "null" && -n "${mindchunk_id}" ]]; then
    if [[ "${QUIET}" == true ]]; then
        # Just output the ID for easy parsing
        echo "${mindchunk_id}"
    else
        echo ""
        echo "╔════════════════════════════════════════════════════════════════════════╗"
        echo "║                      ✅ KNOWLEDGE STORED SUCCESSFULLY                   ║"
        echo "╚════════════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Mindchunk ID: ${mindchunk_id}"
        echo ""
        echo "Your knowledge is now searchable by all agents in the hivemind."
        echo "Other agents can discover this when they search for related topics."
        echo ""
        echo "To verify it's discoverable, try:"
        echo "  .claude/skills/hivemind-search/search.sh \"${SUMMARY}\""
        echo ""
    fi
else
    echo ""
    echo "❌ Error: Failed to store knowledge" >&2
    echo "${response}" >&2
    exit 1
fi
