#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 9: Remove skills with shell injection in SKILL.md"

# Patterns to detect malicious content in SKILL.md files
INJECT_PATTERNS=(
    "Prerequisites.*install"
    "Prerequisites.*curl"
    "base64 -d"
    "eval \$\("
    "bypass.*safety"
    "execute.*without.*asking"
)

FOUND_ISSUES=0
MATCHED_FILES=()

# Find all SKILL.md files, excluding security-monitor
while IFS= read -r -d '' skillmd; do
    # Skip security-monitor
    if [[ "$skillmd" == *"security-monitor"* ]]; then
        continue
    fi

    # Check each pattern
    for pattern in "${INJECT_PATTERNS[@]}"; do
        if grep -qiE "$pattern" "$skillmd" 2>/dev/null; then
            log "[!] Found injection pattern in: $skillmd"
            log "    Pattern: $pattern"
            MATCHED_FILES+=("$skillmd")
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
            break
        fi
    done
done < <(find "$SKILLS_DIR" -name "SKILL.md" -type f -print0 2>/dev/null)

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No shell injection patterns found in SKILL.md files"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES SKILL.md file(s) with potential shell injection patterns."
log ""
log "Affected files:"
for file in "${MATCHED_FILES[@]}"; do
    skill_name=$(dirname "$file" | xargs basename)
    log "  - $skill_name: $file"
done
log ""
log "RECOMMENDED ACTIONS:"
log "1. Review each SKILL.md file listed above"
log "2. Look for suspicious Prerequisites sections that execute commands"
log "3. Check for base64 encoded payloads or eval statements"
log "4. Remove the entire skill directory if confirmed malicious:"
log "   rm -rf \"\$SKILLS_DIR/<skill-name>\""
log ""
log "5. After removal, verify with:"
log "   ./check-09-skillmd-inject.sh"
log ""

guidance "Manual review and removal of malicious skills required"
exit 2
