#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 3: Scanning for reverse shell skills and checking Gatekeeper..."

# Reverse shell patterns
REVERSE_SHELL_PATTERNS=(
  "nc -e"
  "nc.*-c.*sh"
  "/dev/tcp/.*exec"
  "mkfifo.*nc"
  "bash -i >"
  "bash -i >&"
  "socat.*exec"
  "python.*socket.*pty"
  "perl.*socket.*exec"
  "ruby.*socket.*exec"
  "php.*fsockopen.*exec"
)

FOUND_SKILLS=()

# Scan all skills for reverse shell patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${REVERSE_SHELL_PATTERNS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
      fi
    done < <(grep -rl "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

# Check Gatekeeper status on macOS
GATEKEEPER_DISABLED=false
if [[ "$OSTYPE" == "darwin"* ]]; then
  if spctl --status 2>/dev/null | grep -q "disabled"; then
    GATEKEEPER_DISABLED=true
  fi
fi

# Determine exit status
HAS_ISSUES=false

if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  HAS_ISSUES=true
  log "WARNING: Found ${#FOUND_SKILLS[@]} skill(s) with reverse shell patterns:"
  for skill in "${FOUND_SKILLS[@]}"; do
    log "  - $skill"
  done
fi

if [ "$GATEKEEPER_DISABLED" = true ]; then
  HAS_ISSUES=true
  log "WARNING: macOS Gatekeeper is DISABLED"
fi

if [ "$HAS_ISSUES" = false ]; then
  log "No reverse shell skills found and Gatekeeper is enabled"
  exit 2
fi

# Show guidance for skills
if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  guidance << 'EOF'
Reverse shell skills detected!

Reverse shells allow attackers to gain remote command execution on your system.

RECOMMENDED ACTIONS:
1. Remove the suspicious skills immediately:

EOF

  for skill in "${FOUND_SKILLS[@]}"; do
    echo "   openclaw skill rm $skill"
  done >> "$LOG_FILE"

  guidance << 'EOF'

2. Check for active suspicious connections:

   netstat -an | grep ESTABLISHED
   lsof -i -n -P | grep ESTABLISHED

3. Review system for persistence mechanisms:

   launchctl list | grep -v com.apple
   crontab -l

EOF
fi

# Auto-fix Gatekeeper
if [ "$GATEKEEPER_DISABLED" = true ]; then
  log ""
  log "Gatekeeper is disabled, which reduces macOS security protections."

  if confirm "Re-enable Gatekeeper? (requires sudo)"; then
    log "Re-enabling Gatekeeper..."
    if sudo spctl --master-enable 2>/dev/null; then
      log "✓ Gatekeeper re-enabled successfully"
      FIXED=$((FIXED + 1))
    else
      log "✗ Failed to re-enable Gatekeeper"
      FAILED=$((FAILED + 1))
    fi
  else
    log "Skipping Gatekeeper re-enable"
    FAILED=$((FAILED + 1))
  fi
fi

finish
