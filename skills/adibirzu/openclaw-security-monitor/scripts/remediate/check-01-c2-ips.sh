#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 1: Scanning for skills with C2 IP addresses..."

# C2 IP patterns to search for
C2_PATTERNS=(
  "91\.92\.242\."
  "95\.92\.242\."
  "54\.91\.154\.110"
  "185\.220\.101\."
  "45\.142\.212\."
  "193\.239\.85\."
)

FOUND_SKILLS=()

# Scan all skills for C2 IP patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${C2_PATTERNS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
      fi
    done < <(grep -rl "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

if [ ${#FOUND_SKILLS[@]} -eq 0 ]; then
  log "No skills with C2 IP addresses found"
  exit 2
fi

log "WARNING: Found ${#FOUND_SKILLS[@]} skill(s) with suspicious C2 IP addresses:"
for skill in "${FOUND_SKILLS[@]}"; do
  log "  - $skill"
done

guidance << 'EOF'
Skills with C2 (Command & Control) IP addresses detected!

These skills may be attempting to communicate with malicious infrastructure.

RECOMMENDED ACTIONS:
1. Remove the suspicious skills immediately:

EOF

for skill in "${FOUND_SKILLS[@]}"; do
  echo "   openclaw skill rm $skill"
done >> "$LOG_FILE"

guidance << 'EOF'

2. Review your openclaw logs for any executed commands:

   tail -100 ~/.openclaw/logs/openclaw.log

3. Check network connections for suspicious activity:

   netstat -an | grep ESTABLISHED

4. Consider running a full security scan on your system

5. Review where these skills came from and avoid installing from untrusted sources
EOF

exit 1
