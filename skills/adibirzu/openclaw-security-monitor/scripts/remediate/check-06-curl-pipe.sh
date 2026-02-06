#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 6: Scanning for curl-pipe skills and checking tools.deny..."

# Curl-pipe patterns (dangerous code execution)
CURL_PIPE_PATTERNS=(
  "curl.*|.*sh"
  "curl.*|.*bash"
  "wget.*|.*sh"
  "wget.*|.*bash"
  "curl.*>.*\.sh.*bash"
  "wget.*>.*\.sh.*bash"
)

FOUND_SKILLS=()

# Scan all skills for curl-pipe patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${CURL_PIPE_PATTERNS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
      fi
    done < <(grep -rl "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

# Check tools.deny in openclaw config
TOOLS_DENY_EMPTY=false
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"

if [ -f "$CONFIG_FILE" ]; then
  # Check if tools.deny is empty or not present
  if ! grep -q '"tools"' "$CONFIG_FILE" 2>/dev/null; then
    TOOLS_DENY_EMPTY=true
  elif ! grep -q '"deny"' "$CONFIG_FILE" 2>/dev/null; then
    TOOLS_DENY_EMPTY=true
  elif grep -q '"deny"[[:space:]]*:[[:space:]]*\[\]' "$CONFIG_FILE" 2>/dev/null; then
    TOOLS_DENY_EMPTY=true
  fi
fi

# Check if openclaw CLI is available
OPENCLAW_CLI_AVAILABLE=false
if command -v openclaw &> /dev/null; then
  OPENCLAW_CLI_AVAILABLE=true
fi

# Determine if we have issues
HAS_ISSUES=false

if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  HAS_ISSUES=true
  log "WARNING: Found ${#FOUND_SKILLS[@]} skill(s) with curl-pipe patterns:"
  for skill in "${FOUND_SKILLS[@]}"; do
    log "  - $skill"
  done
fi

if [ "$TOOLS_DENY_EMPTY" = true ] && [ "$OPENCLAW_CLI_AVAILABLE" = true ]; then
  HAS_ISSUES=true
  log "WARNING: tools.deny is empty or not configured"
fi

if [ "$HAS_ISSUES" = false ]; then
  log "No curl-pipe skills found and tools.deny is configured"
  exit 2
fi

# Show guidance for skills
if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  guidance << 'EOF'
Curl-pipe skills detected!

"curl | sh" and similar patterns are extremely dangerous as they:
- Execute arbitrary code from the internet
- Bypass normal security checks
- Can be used for malware installation
- Are a common attack vector

RECOMMENDED ACTIONS:
1. Remove the suspicious skills immediately:

EOF

  for skill in "${FOUND_SKILLS[@]}"; do
    echo "   openclaw skill rm $skill"
  done >> "$LOG_FILE"

  guidance << 'EOF'

2. Review what these skills may have executed:

   tail -100 ~/.openclaw/logs/openclaw.log

3. Check for suspicious processes or files:

   ps aux | grep -v grep
   find /tmp -type f -mtime -1
EOF
fi

# Auto-fix: Configure tools.deny
if [ "$TOOLS_DENY_EMPTY" = true ] && [ "$OPENCLAW_CLI_AVAILABLE" = true ]; then
  log ""
  log "tools.deny is empty - this allows unrestricted tool access"

  if confirm "Set tools.deny to restrict exec and process tools?"; then
    if [ "$DRY_RUN" = true ]; then
      log "[DRY-RUN] Would run: openclaw config set tools.deny '[\"exec\",\"process\"]'"
      FIXED=$((FIXED + 1))
    else
      log "Configuring tools.deny..."
      if openclaw config set tools.deny '["exec","process"]' 2>&1 | tee -a "$LOG_FILE"; then
        log "✓ tools.deny configured successfully"
        log "  Restricted tools: exec, process"
        FIXED=$((FIXED + 1))
      else
        log "✗ Failed to configure tools.deny"
        FAILED=$((FAILED + 1))
      fi
    fi
  else
    log "Skipping tools.deny configuration"
    FAILED=$((FAILED + 1))
  fi
elif [ "$TOOLS_DENY_EMPTY" = true ] && [ "$OPENCLAW_CLI_AVAILABLE" = false ]; then
  log ""
  guidance << 'EOF'
tools.deny is not configured, but openclaw CLI is not available.

Manually edit your openclaw.json to add:

{
  "tools": {
    "deny": ["exec", "process"]
  }
}

This will restrict dangerous tool access.
EOF
  FAILED=$((FAILED + 1))
fi

finish
