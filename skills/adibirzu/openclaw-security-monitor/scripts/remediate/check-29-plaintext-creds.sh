#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 29: Detect plaintext credentials in config files"

if [[ ! -d "$OPENCLAW_DIR" ]]; then
    log "OpenClaw directory not found, skipping check"
    finish
fi

log "Scanning $OPENCLAW_DIR for credential patterns..."

# Define credential patterns to search for
declare -A PATTERNS=(
    ["OpenAI API Key"]="sk-[A-Za-z0-9]{32,}"
    ["AWS Access Key"]="AKIA[0-9A-Z]{16}"
    ["GitHub Token"]="ghp_[A-Za-z0-9]{36,}"
    ["Slack Token"]="xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}"
    ["GitLab Token"]="glpat-[A-Za-z0-9_\-]{20,}"
    ["Anthropic API Key"]="sk-ant-[A-Za-z0-9\-]{32,}"
    ["Generic API Key"]="api[_-]?key['\"]?\s*[:=]\s*['\"][A-Za-z0-9]{20,}['\"]"
)

CREDS_FOUND=0
declare -a AFFECTED_FILES=()

# Search for patterns in config files
for PATTERN_NAME in "${!PATTERNS[@]}"; do
    PATTERN="${PATTERNS[$PATTERN_NAME]}"

    # Search in common config files
    while IFS= read -r FILE; do
        if [[ -f "$FILE" && -r "$FILE" ]]; then
            if grep -qE "$PATTERN" "$FILE" 2>/dev/null; then
                log "WARNING: Potential $PATTERN_NAME found in: $(basename "$FILE")"
                ((CREDS_FOUND++))
                AFFECTED_FILES+=("$FILE")
            fi
        fi
    done < <(find "$OPENCLAW_DIR" -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.env" -o -name "*.conf" -o -name "config" \) 2>/dev/null)
done

# Remove duplicates from affected files
UNIQUE_FILES=($(printf '%s\n' "${AFFECTED_FILES[@]}" | sort -u))

if [[ $CREDS_FOUND -gt 0 ]]; then
    log "Found $CREDS_FOUND potential credential(s) in ${#UNIQUE_FILES[@]} file(s)"

    guidance "Plaintext Credentials Detected" \
        "Found $CREDS_FOUND potential plaintext credential(s) in configuration files." \
        "" \
        "AFFECTED FILES:" \
        "$(printf '  - %s\n' "${UNIQUE_FILES[@]}")" \
        "" \
        "IMMEDIATE ACTIONS REQUIRED:" \
        "1. ROTATE all exposed credentials immediately" \
        "2. Move secrets to environment variables or secrets manager" \
        "3. Add config files to .gitignore to prevent git commits" \
        "4. Audit git history for accidentally committed secrets" \
        "" \
        "RECOMMENDED SECRETS MANAGEMENT:" \
        "" \
        "Option 1: Environment Variables" \
        "  - Store in ~/.bashrc or ~/.zshrc:" \
        "    export OPENAI_API_KEY=\"sk-...\"" \
        "  - Reference in config: \${OPENAI_API_KEY}" \
        "" \
        "Option 2: Secret Management Tools" \
        "  - macOS Keychain: security add-generic-password -s openclaw -a api_key -w" \
        "  - pass (Linux): pass insert openclaw/api_key" \
        "  - 1Password CLI: op read \"op://vault/item/field\"" \
        "" \
        "Option 3: Dedicated Secrets File (600 perms)" \
        "  - Create: $OPENCLAW_DIR/secrets.env (add to .gitignore)" \
        "  - Set permissions: chmod 600 secrets.env" \
        "  - Source in startup: source secrets.env" \
        "" \
        "CREDENTIAL ROTATION LINKS:" \
        "  - OpenAI: https://platform.openai.com/api-keys" \
        "  - GitHub: https://github.com/settings/tokens" \
        "  - AWS: https://console.aws.amazon.com/iam/home#/security_credentials" \
        "  - Anthropic: https://console.anthropic.com/settings/keys" \
        "" \
        "GIT HISTORY CLEANUP (if committed):" \
        "  git filter-branch --force --index-filter \\" \
        "    'git rm --cached --ignore-unmatch config/secrets.json' \\" \
        "    --prune-empty --tag-name-filter cat -- --all" \
        "" \
        "Reference: https://docs.openclaw.ai/security/secrets-management"
    ((FAILED++))
else
    log "No plaintext credentials detected in config files"
fi

finish
