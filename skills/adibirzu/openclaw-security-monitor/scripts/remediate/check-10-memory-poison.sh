#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 10: Remove injected lines from SOUL/MEMORY/IDENTITY.md"

WORKSPACE_DIR="$OPENCLAW_DIR/workspace"
FOUND_ISSUES=0
POISON_PATTERNS=(
    "ignore previous"
    "disregard"
    "override.*instruction"
    "you are now"
    "act as if"
    "pretend to be"
    "from now on.*ignore"
)

log "Checking workspace directory: $WORKSPACE_DIR"

# Check if workspace exists
if [ ! -d "$WORKSPACE_DIR" ]; then
    log "[OK] No workspace directory found"
    exit 2
fi

# Check SOUL.md, MEMORY.md, IDENTITY.md
for file in SOUL.md MEMORY.md IDENTITY.md; do
    filepath="$WORKSPACE_DIR/$file"
    if [ ! -f "$filepath" ]; then
        continue
    fi

    log "Scanning $file..."
    for pattern in "${POISON_PATTERNS[@]}"; do
        if grep -qiE "$pattern" "$filepath" 2>/dev/null; then
            log "[!] Found poison pattern in: $filepath"
            log "    Pattern: $pattern"
            log "    Matched lines:"
            grep -niE "$pattern" "$filepath" | sed 's/^/      /' || true
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
        fi
    done
done

# Check if any skills try to write to these files
log ""
log "Checking for skills that modify SOUL/MEMORY/IDENTITY files..."
WRITER_SKILLS=0

while IFS= read -r -d '' skillfile; do
    if grep -qE "(SOUL|MEMORY|IDENTITY)\.md.*>" "$skillfile" 2>/dev/null || \
       grep -qE "echo.*>>.*(SOUL|MEMORY|IDENTITY)\.md" "$skillfile" 2>/dev/null || \
       grep -qE "write.*(SOUL|MEMORY|IDENTITY)\.md" "$skillfile" 2>/dev/null; then
        log "[!] Skill modifies identity files: $skillfile"
        WRITER_SKILLS=$((WRITER_SKILLS + 1))
    fi
done < <(find "$SKILLS_DIR" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" \) -print0 2>/dev/null)

if [ $WRITER_SKILLS -gt 0 ]; then
    log "[!] Found $WRITER_SKILLS skill(s) that modify identity files"
    FOUND_ISSUES=$((FOUND_ISSUES + WRITER_SKILLS))
fi

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No memory poisoning detected"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES potential memory poisoning issue(s)."
log ""
log "RECOMMENDED ACTIONS:"
log "1. Review the files and matched lines listed above"
log "2. Edit the affected files to remove poisoned content:"
log "   \$EDITOR $WORKSPACE_DIR/SOUL.md"
log "   \$EDITOR $WORKSPACE_DIR/MEMORY.md"
log "   \$EDITOR $WORKSPACE_DIR/IDENTITY.md"
log ""
log "3. If you have backups, consider restoring from a clean state"
log ""
log "4. Remove any skills that attempt to modify these files"
log ""
log "5. After cleanup, verify with:"
log "   ./check-10-memory-poison.sh"
log ""

guidance "Manual cleanup of poisoned identity files required"
exit 2
