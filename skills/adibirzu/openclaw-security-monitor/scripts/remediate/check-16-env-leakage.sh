#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 16: Remove skills reading sensitive files"

# Patterns for reading sensitive files
SENSITIVE_FILE_PATTERNS=(
    "cat.*\.env"
    "cat.*\.ssh"
    "cat.*\.aws/credentials"
    "cat.*keychain"
    "open.*\.env"
    "read.*\.env"
    "readFile.*\.env"
    "\.bashrc"
    "\.zshrc"
    "\.bash_profile"
    "\.ssh/id_rsa"
    "\.ssh/id_ed25519"
    "\.gnupg"
    "\.kube/config"
)

# Patterns for hardcoded API keys
API_KEY_PATTERNS=(
    "sk-[a-zA-Z0-9]{32,}"
    "AKIA[0-9A-Z]{16}"
    "ghp_[a-zA-Z0-9]{36,}"
    "gho_[a-zA-Z0-9]{36,}"
    "github_pat_[a-zA-Z0-9]{82}"
    "glpat-[a-zA-Z0-9\-]{20,}"
    "xox[baprs]-[a-zA-Z0-9\-]+"
    "AIza[0-9A-Za-z\-_]{35}"
)

FOUND_ISSUES=0
SENSITIVE_READERS=()
HARDCODED_KEYS=()

log "Scanning skills for sensitive file access..."

# Scan for sensitive file reading
while IFS= read -r -d '' skillfile; do
    # Skip security-monitor
    if [[ "$skillfile" == *"security-monitor"* ]]; then
        continue
    fi

    skill_dir=$(dirname "$skillfile")
    skill_name=$(basename "$skill_dir")

    for pattern in "${SENSITIVE_FILE_PATTERNS[@]}"; do
        if grep -qE "$pattern" "$skillfile" 2>/dev/null; then
            if [[ ! " ${SENSITIVE_READERS[@]} " =~ " ${skill_name} " ]]; then
                log "[!] Skill reads sensitive files: $skill_name"
                log "    File: $skillfile"
                log "    Pattern: $pattern"
                log "    Line:"
                grep -nE "$pattern" "$skillfile" | head -1 | sed 's/^/      /' || true

                SENSITIVE_READERS+=("$skill_name")
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            break
        fi
    done
done < <(find "$SKILLS_DIR" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" \) -print0 2>/dev/null)

log ""
log "Scanning skills for hardcoded API keys..."

# Scan for hardcoded API keys
while IFS= read -r -d '' skillfile; do
    # Skip security-monitor
    if [[ "$skillfile" == *"security-monitor"* ]]; then
        continue
    fi

    skill_dir=$(dirname "$skillfile")
    skill_name=$(basename "$skill_dir")

    for pattern in "${API_KEY_PATTERNS[@]}"; do
        if grep -qE "$pattern" "$skillfile" 2>/dev/null; then
            if [[ ! " ${HARDCODED_KEYS[@]} " =~ " ${skill_name} " ]]; then
                log "[!] Skill contains hardcoded API key pattern: $skill_name"
                log "    File: $skillfile"

                # Show redacted match
                match=$(grep -oE "$pattern" "$skillfile" | head -1)
                redacted="${match:0:8}...${match: -4}"
                log "    Key (redacted): $redacted"

                HARDCODED_KEYS+=("$skill_name")
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            break
        fi
    done
done < <(find "$SKILLS_DIR" -type f -print0 2>/dev/null)

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No sensitive file access or hardcoded keys found"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES skill(s) with potential credential exposure."
log ""

if [ ${#SENSITIVE_READERS[@]} -gt 0 ]; then
    log "Skills reading sensitive files:"
    for skill in "${SENSITIVE_READERS[@]}"; do
        log "  - $skill"
    done
    log ""
fi

if [ ${#HARDCODED_KEYS[@]} -gt 0 ]; then
    log "Skills with hardcoded API keys:"
    for skill in "${HARDCODED_KEYS[@]}"; do
        log "  - $skill"
    done
    log ""
fi

log "RECOMMENDED ACTIONS:"
log "1. Review each skill listed above"
log "2. Determine if they legitimately need access to sensitive files"
log "3. For skills with hardcoded keys, ROTATE those credentials immediately"
log ""
log "4. If confirmed malicious or unnecessary, remove the skill:"
log "   rm -rf \"\$SKILLS_DIR/<skill-name>\""
log ""
log "5. Check for exposed credentials:"
log "   grep -r 'sk-' \$SKILLS_DIR/"
log "   grep -r 'AKIA' \$SKILLS_DIR/"
log ""
log "6. Rotate any potentially compromised credentials:"
log "   - OpenAI API keys: https://platform.openai.com/api-keys"
log "   - AWS keys: https://console.aws.amazon.com/iam/"
log "   - GitHub tokens: https://github.com/settings/tokens"
log ""
log "7. After cleanup, verify with:"
log "   ./check-16-env-leakage.sh"
log ""

guidance "Manual review and credential rotation required"
exit 2
