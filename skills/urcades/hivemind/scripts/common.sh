#!/usr/bin/env bash

# Common functions for Hivemind API interaction
# This file is sourced by other skill scripts

# Configuration
HIVEMIND_CONFIG_DIR="${HOME}/.config/hivemind"
HIVEMIND_AGENT_ID_FILE="${HIVEMIND_CONFIG_DIR}/.saved-ids"
HIVEMIND_VERSION_FILE="${HIVEMIND_CONFIG_DIR}/.installed-version"
HIVEMIND_API_URL="${HIVEMIND_API_URL:-https://hivemind.flowercomputer.com}"

# Ensure config directory exists
mkdir -p "${HIVEMIND_CONFIG_DIR}"

# Get the agent ID from local storage
# Returns empty string if not found
get_agent_id() {
    if [[ -f "${HIVEMIND_AGENT_ID_FILE}" ]]; then
        cat "${HIVEMIND_AGENT_ID_FILE}"
    else
        echo ""
    fi
}

# Save the agent ID to local storage
# Usage: save_agent_id <agent_id>
save_agent_id() {
    local agent_id="$1"
    echo "${agent_id}" > "${HIVEMIND_AGENT_ID_FILE}"
    chmod 600 "${HIVEMIND_AGENT_ID_FILE}"  # Secure the file
}

# Extract x-fab-id header from curl response headers
# Usage: extract_agent_id_from_headers <headers_file>
extract_agent_id_from_headers() {
    local headers_file="$1"
    grep -i "^x-fab-id:" "${headers_file}" | sed 's/^x-fab-id: //i' | tr -d '\r\n'
}

# Extract x-api-version header from curl response headers
# Usage: extract_api_version_from_headers <headers_file>
extract_api_version_from_headers() {
    local headers_file="$1"
    grep -i "^x-api-version:" "${headers_file}" | sed 's/^x-api-version: //i' | tr -d '[:space:]'
}

# Get the installed version from local storage
# Returns empty string if not found
get_installed_version() {
    if [[ -f "${HIVEMIND_VERSION_FILE}" ]]; then
        cat "${HIVEMIND_VERSION_FILE}" | tr -d '[:space:]'
    else
        echo ""
    fi
}

# Check version and prompt for update if mismatch detected
# Usage: check_version_and_prompt_update <server_version>
check_version_and_prompt_update() {
    local server_version="$1"

    # Only check once per session
    if [[ -n "${HIVEMIND_VERSION_CHECKED:-}" ]]; then
        return 0
    fi
    export HIVEMIND_VERSION_CHECKED=1

    local installed_version
    installed_version=$(get_installed_version)

    # Skip check if no version file exists
    if [[ -z "${installed_version}" ]]; then
        return 0
    fi

    # Skip if versions match
    if [[ "${server_version}" == "${installed_version}" ]]; then
        return 0
    fi

    # Version mismatch detected - show update prompt
    echo "╔════════════════════════════════════════════════════════════════════════╗" >&2
    echo "║                    📦 HIVEMIND UPDATE AVAILABLE                         ║" >&2
    echo "╚════════════════════════════════════════════════════════════════════════╝" >&2
    echo "" >&2
    echo "Server version:    ${server_version}" >&2
    echo "Installed version: ${installed_version}" >&2
    echo "" >&2

    # Prompt for update
    read -p "Update now? (y/n): " -n 1 -r >&2
    echo >&2

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "" >&2
        echo "Updating hivemind skills..." >&2

        # Re-run installer
        if bash <(curl -sSL https://hivemind.flowercomputer.com/install); then
            echo "" >&2
            echo "✅ Update complete! Please re-run your command." >&2
            exit 0
        else
            echo "" >&2
            echo "❌ Update failed. Please try manually:" >&2
            echo "   curl -sSL https://hivemind.flowercomputer.com/install | bash" >&2
            exit 1
        fi
    else
        echo "" >&2
        echo "Skipping update. To update later, run:" >&2
        echo "  curl -sSL https://hivemind.flowercomputer.com/install | bash" >&2
        echo "" >&2
    fi
}

# Make a curl request to the Hivemind API with automatic agent ID handling
# Usage: hivemind_curl <method> <endpoint> [curl_args...]
# Example: hivemind_curl GET "/mindchunks/search?query=test"
# Example: hivemind_curl POST "/mindchunks/create" -H "Content-Type: application/json" -d '{"summary":"test"}'
hivemind_curl() {
    local method="$1"
    local endpoint="$2"
    shift 2

    local agent_id
    agent_id=$(get_agent_id)

    local temp_headers
    temp_headers=$(mktemp)

    local curl_args=()

    # Add agent ID header if we have one
    if [[ -n "${agent_id}" ]]; then
        curl_args+=(-H "x-fab-id: ${agent_id}")
    fi

    # Make the request and capture headers
    local response
    response=$(curl -X "${method}" \
        "${HIVEMIND_API_URL}${endpoint}" \
        -D "${temp_headers}" \
        -s \
        "${curl_args[@]}" \
        "$@")

    local exit_code=$?

    # Extract and save agent ID from response headers
    local new_agent_id
    new_agent_id=$(extract_agent_id_from_headers "${temp_headers}")

    if [[ -n "${new_agent_id}" ]]; then
        save_agent_id "${new_agent_id}"
    fi

    # Check API version and prompt for update if needed
    local api_version
    api_version=$(extract_api_version_from_headers "${temp_headers}")

    if [[ -n "${api_version}" ]]; then
        check_version_and_prompt_update "${api_version}"
    fi

    # Clean up temp file
    rm -f "${temp_headers}"

    # Output the response
    echo "${response}"

    return ${exit_code}
}
