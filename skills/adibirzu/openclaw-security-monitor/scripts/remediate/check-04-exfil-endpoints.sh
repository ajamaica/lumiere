#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 4: Scanning for data exfiltration skills and checking /etc/hosts..."

# Data exfiltration domain patterns
EXFIL_DOMAINS=(
  "webhook\.site"
  "pipedream\.net"
  "hookbin\.com"
  "requestbin\.com"
  "burpcollaborator\.net"
  "requestcatcher\.com"
  "beeceptor\.com"
  "mockbin\.org"
  "postb\.in"
)

# Actual domains to block (without regex escaping)
BLOCK_DOMAINS=(
  "webhook.site"
  "pipedream.net"
  "hookbin.com"
  "requestbin.com"
  "burpcollaborator.net"
  "requestcatcher.com"
  "beeceptor.com"
  "mockbin.org"
  "postb.in"
)

FOUND_SKILLS=()

# Scan all skills for exfiltration patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${EXFIL_DOMAINS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
      fi
    done < <(grep -rl "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

# Check which domains are not blocked in /etc/hosts
UNBLOCKED_DOMAINS=()
for domain in "${BLOCK_DOMAINS[@]}"; do
  if ! grep -q "127.0.0.1[[:space:]].*$domain" /etc/hosts 2>/dev/null; then
    UNBLOCKED_DOMAINS+=("$domain")
  fi
done

# Determine if we have issues
HAS_ISSUES=false

if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  HAS_ISSUES=true
  log "WARNING: Found ${#FOUND_SKILLS[@]} skill(s) with data exfiltration endpoints:"
  for skill in "${FOUND_SKILLS[@]}"; do
    log "  - $skill"
  done
fi

if [ ${#UNBLOCKED_DOMAINS[@]} -gt 0 ]; then
  HAS_ISSUES=true
  log "Found ${#UNBLOCKED_DOMAINS[@]} unblocked exfiltration domain(s)"
fi

if [ "$HAS_ISSUES" = false ]; then
  log "No exfiltration skills found and all domains are blocked"
  exit 2
fi

# Show guidance for skills
if [ ${#FOUND_SKILLS[@]} -gt 0 ]; then
  guidance << 'EOF'
Data exfiltration skills detected!

These skills may be sending your data to external services.

RECOMMENDED ACTIONS:
1. Remove the suspicious skills immediately:

EOF

  for skill in "${FOUND_SKILLS[@]}"; do
    echo "   openclaw skill rm $skill"
  done >> "$LOG_FILE"

  guidance << 'EOF'

2. Review network activity:

   lsof -i -n -P

3. Check for unauthorized data transfers in logs
EOF
fi

# Auto-fix: Block domains in /etc/hosts
if [ ${#UNBLOCKED_DOMAINS[@]} -gt 0 ]; then
  log ""
  log "Unblocked exfiltration domains: ${UNBLOCKED_DOMAINS[*]}"

  if confirm "Block these domains in /etc/hosts? (requires sudo)"; then
    HOSTS_BACKUP="/tmp/hosts.backup.$TIMESTAMP"

    if [ "$DRY_RUN" = true ]; then
      log "[DRY-RUN] Would add to /etc/hosts:"
      for domain in "${UNBLOCKED_DOMAINS[@]}"; do
        log "  127.0.0.1 $domain"
      done
      FIXED=$((FIXED + ${#UNBLOCKED_DOMAINS[@]}))
    else
      log "Backing up /etc/hosts to $HOSTS_BACKUP"
      sudo cp /etc/hosts "$HOSTS_BACKUP"

      log "Adding domains to /etc/hosts..."
      for domain in "${UNBLOCKED_DOMAINS[@]}"; do
        echo "127.0.0.1 $domain # Blocked by openclaw-security-monitor" | sudo tee -a /etc/hosts > /dev/null
        log "  ✓ Blocked $domain"
        FIXED=$((FIXED + 1))
      done

      # Flush DNS cache on macOS
      if [[ "$OSTYPE" == "darwin"* ]]; then
        log "Flushing DNS cache..."
        sudo dscacheutil -flushcache
        sudo killall -HUP mDNSResponder
        log "✓ DNS cache flushed"
      fi
    fi
  else
    log "Skipping domain blocking"
    FAILED=$((FAILED + ${#UNBLOCKED_DOMAINS[@]}))
  fi
fi

finish
