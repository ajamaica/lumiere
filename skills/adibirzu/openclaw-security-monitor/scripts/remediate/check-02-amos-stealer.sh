#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 2: Scanning for AMOS stealer and credential theft skills..."

# AMOS and credential stealer patterns
AMOS_PATTERNS=(
  "authtool"
  "atomic\.stealer"
  "AMOS"
  "NovaStealer"
  "osascript.*password"
  "security.*find-generic-password"
  "KeychainCracker"
  "browser.*password.*extract"
  "chrome.*Login.*Data"
  "firefox.*logins\.json"
  "wallet.*extract"
)

FOUND_SKILLS=()
FOUND_DETAILS=()

# Scan all skills for AMOS patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${AMOS_PATTERNS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
        matched_pattern=$(grep -i "$pattern" "$file" | head -1 | sed 's/^[[:space:]]*//')
        FOUND_DETAILS+=("$skill_name: $matched_pattern")
      fi
    done < <(grep -rli "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

if [ ${#FOUND_SKILLS[@]} -eq 0 ]; then
  log "No AMOS stealer or credential theft skills found"
  exit 2
fi

log "CRITICAL: Found ${#FOUND_SKILLS[@]} skill(s) with credential theft patterns:"
for detail in "${FOUND_DETAILS[@]}"; do
  log "  - $detail"
done

guidance << 'EOF'
AMOS Stealer or credential theft skills detected!

AMOS (Atomic macOS Stealer) is malware that targets:
- Browser passwords and cookies
- Keychain credentials
- Cryptocurrency wallets
- SSH keys and authentication tokens

IMMEDIATE ACTIONS REQUIRED:
1. Remove the malicious skills NOW:

EOF

for skill in "${FOUND_SKILLS[@]}"; do
  echo "   openclaw skill rm $skill"
done >> "$LOG_FILE"

guidance << 'EOF'

2. Change ALL your passwords immediately:
   - Email accounts
   - Banking and financial services
   - Social media accounts
   - Work/corporate credentials

3. Review Keychain Access for suspicious entries:

   open -a "Keychain Access"

4. Check for unauthorized access:
   - Review recent login activity on all accounts
   - Check for new devices/sessions you don't recognize

5. Enable 2FA/MFA on all critical accounts if not already enabled

6. Consider these additional steps:
   - Rotate SSH keys: ssh-keygen -t ed25519 -C "your_email@example.com"
   - Move cryptocurrency wallets to hardware wallets
   - Run full antivirus scan: sudo freshclam && sudo clamscan -r -i /

7. Monitor for identity theft:
   - Check credit reports
   - Watch for phishing attempts using stolen credentials
EOF

exit 1
