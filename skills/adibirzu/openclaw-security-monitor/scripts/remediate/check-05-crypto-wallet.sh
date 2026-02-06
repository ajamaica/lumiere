#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 5: Scanning for cryptocurrency wallet targeting skills..."

# Crypto wallet theft patterns
CRYPTO_PATTERNS=(
  "wallet.*private.*key"
  "seed.*phrase"
  "mnemonic"
  "\.wallet"
  "bitcoin.*wallet"
  "ethereum.*wallet"
  "metamask"
  "coinbase.*wallet"
  "exodus.*wallet"
  "electrum"
  "mycelium"
  "trust.*wallet"
  "ledger.*wallet"
  "trezor"
  "BIP39"
  "HD.*wallet"
)

FOUND_SKILLS=()
FOUND_DETAILS=()

# Scan all skills for crypto patterns
if [ -d "$SKILLS_DIR" ]; then
  for pattern in "${CRYPTO_PATTERNS[@]}"; do
    while IFS= read -r file; do
      skill_name=$(basename "$(dirname "$file")")
      if [[ ! " ${FOUND_SKILLS[@]} " =~ " ${skill_name} " ]]; then
        FOUND_SKILLS+=("$skill_name")
        matched_line=$(grep -i "$pattern" "$file" | head -1 | sed 's/^[[:space:]]*//' | cut -c1-80)
        FOUND_DETAILS+=("$skill_name: $matched_line")
      fi
    done < <(grep -rli "$pattern" "$SKILLS_DIR" 2>/dev/null || true)
  done
fi

if [ ${#FOUND_SKILLS[@]} -eq 0 ]; then
  log "No cryptocurrency wallet targeting skills found"
  exit 2
fi

log "CRITICAL: Found ${#FOUND_SKILLS[@]} skill(s) with crypto wallet targeting patterns:"
for detail in "${FOUND_DETAILS[@]}"; do
  log "  - $detail"
done

guidance << 'EOF'
Cryptocurrency wallet targeting skills detected!

These skills may be attempting to steal your cryptocurrency private keys,
seed phrases, or wallet files.

IMMEDIATE ACTIONS REQUIRED:
1. Remove the malicious skills NOW:

EOF

for skill in "${FOUND_SKILLS[@]}"; do
  echo "   openclaw skill rm $skill"
done >> "$LOG_FILE"

guidance << 'EOF'

2. Secure your cryptocurrency wallets IMMEDIATELY:

   a) Transfer funds to a NEW wallet with a NEW seed phrase:
      - Create new wallet with fresh seed phrase
      - Transfer all assets to the new wallet
      - Never reuse the old seed phrase

   b) Move to hardware wallet if possible:
      - Ledger, Trezor, or similar hardware wallets
      - Much more secure than software wallets

   c) Lock down existing wallet directories:

      chmod 700 ~/Library/Application\ Support/Electrum
      chmod 700 ~/Library/Application\ Support/Exodus
      chmod 700 ~/.bitcoin
      chmod 700 ~/.ethereum
      chmod 600 ~/Library/Application\ Support/*/wallet.dat

3. Check wallet transaction history:
   - Look for unauthorized transfers
   - Check all addresses and balances
   - Review recent activity logs

4. Enable additional security:
   - Multi-signature wallets where possible
   - Strong passphrases on wallet files
   - Two-factor authentication on exchanges

5. Never store seed phrases digitally:
   - Write them on paper or metal
   - Store in a safe or safety deposit box
   - Never save in files, photos, or cloud storage

6. Monitor for suspicious activity:
   - Set up alerts for wallet transactions
   - Regularly check balances
   - Be alert for phishing attempts

CRITICAL: If any funds have been stolen, contact law enforcement
and your cryptocurrency exchange immediately.
EOF

exit 1
