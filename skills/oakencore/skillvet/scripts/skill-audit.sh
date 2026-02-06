#!/usr/bin/env bash
# skill-audit.sh — Security scanner for ClawHub skills
# Usage: skill-audit.sh [--json] [--summary] <skill-directory>
# Returns: 0 = clean, 1 = warnings only, 2 = critical findings
#
# Detection patterns are base64-encoded in patterns.b64 to prevent
# antivirus false positives (security tools that detect malware often
# get flagged AS malware because they contain the signatures).

set -uo pipefail

# --- Pattern Loading (AV-safe) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS_FILE="$SCRIPT_DIR/patterns.b64"

load_pattern() {
  local name="$1"
  if [ -f "$PATTERNS_FILE" ]; then
    grep "^${name}:" "$PATTERNS_FILE" 2>/dev/null | cut -d: -f2 | base64 -d 2>/dev/null
  fi
}

# Pre-load encoded patterns
P_REVSHELL=$(load_pattern "REVSHELL")
P_EXFIL_CURL=$(load_pattern "EXFIL_CURL")
P_PIPE_SHELL=$(load_pattern "PIPE_SHELL")
P_B64_EXEC=$(load_pattern "B64_EXEC")
P_SUBPROCESS_NET=$(load_pattern "SUBPROCESS_NET")
P_GATEKEEPER=$(load_pattern "GATEKEEPER")
P_CLICKFIX=$(load_pattern "CLICKFIX")
P_SUS_PKG=$(load_pattern "SUS_PKG")

# Fallbacks if patterns file missing
[ -z "$P_REVSHELL" ] && P_REVSHELL='(mkfifo|ncat\s)'
[ -z "$P_EXFIL_CURL" ] && P_EXFIL_CURL='(curl.*--data)'
[ -z "$P_PIPE_SHELL" ] && P_PIPE_SHELL='(curl.*\|.*sh)'
[ -z "$P_B64_EXEC" ] && P_B64_EXEC='(base64.*-d.*\|.*sh)'
[ -z "$P_SUBPROCESS_NET" ] && P_SUBPROCESS_NET='(os\.system.*curl)'
[ -z "$P_GATEKEEPER" ] && P_GATEKEEPER='(xattr.*curl)'
[ -z "$P_CLICKFIX" ] && P_CLICKFIX='(chmod.*&&.*\.\/)'
[ -z "$P_SUS_PKG" ] && P_SUS_PKG='(npm.*--registry)'

# --- CLI Args ---
JSON_MODE=0
SUMMARY_MODE=0
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --json) JSON_MODE=1; shift ;;
    --summary) SUMMARY_MODE=1; shift ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

SKILL_DIR="${1:?Usage: skill-audit.sh [--json] [--summary] <skill-directory>}"
SKILL_NAME="$(basename "$SKILL_DIR")"

if [ ! -d "$SKILL_DIR" ]; then
  echo "❌ Directory not found: $SKILL_DIR" >&2
  exit 2
fi

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

CRITICAL=0
WARNINGS=0
FINDINGS=""
JSON_FINDINGS=""

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  printf '"%s"' "$s"
}

add_finding() {
  local severity="$1" file="$2" line="$3" desc="$4"
  if [ "$severity" = "CRITICAL" ]; then
    FINDINGS+="${RED}🔴 CRITICAL${NC} [$file:$line] $desc\n"
    CRITICAL=$((CRITICAL + 1))
  else
    FINDINGS+="${YELLOW}🟡 WARNING${NC}  [$file:$line] $desc\n"
    WARNINGS=$((WARNINGS + 1))
  fi
  [ -n "$JSON_FINDINGS" ] && JSON_FINDINGS+=","
  JSON_FINDINGS+="{\"severity\":\"$severity\",\"file\":$(json_escape "$file"),\"line\":$(json_escape "$line"),\"description\":$(json_escape "$desc")}"
}

if [ $JSON_MODE -eq 0 ] && [ $SUMMARY_MODE -eq 0 ]; then
  echo "🔍 Auditing skill: $SKILL_NAME"
  echo "   Path: $SKILL_DIR"
  echo "---"
fi

FILES=$(find "$SKILL_DIR" -type f \( -name "*.md" -o -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.sh" -o -name "*.bash" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.txt" -o -name "*.env*" -o -name "Dockerfile*" -o -name "Makefile" \) 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "⚠️  No scannable files found"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
if [ $JSON_MODE -eq 0 ] && [ $SUMMARY_MODE -eq 0 ]; then
  echo "   Scanning $FILE_COUNT files..."
  echo ""
fi

# --- CRITICAL CHECKS ---

# 1. Known exfiltration endpoints
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  if echo "$content" | grep -qiE '(webhook\.site|ngrok\.io|pipedream|requestbin|burpcollaborator|interact\.sh|oastify)'; then
    add_finding "CRITICAL" "$rel_file" "$line" "Known exfiltration endpoint: $(echo "$content" | grep -oiE '(webhook\.site|ngrok\.io|pipedream|requestbin|burpcollaborator|interact\.sh|oastify)[^ "]*')"
  fi
done < <(grep -rnE 'https?://' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 2. Environment variable harvesting
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Bulk env harvesting: ${content:0:120}"
done < <(grep -rnE '(\$\{!.*@\}|printenv\s*$|printenv\s*\||env\s*\|)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 3. Foreign credential access
OWN_KEYS=""
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  OWN_KEYS=$(grep -oE '[A-Z][A-Z_]*_API_KEY|[A-Z][A-Z_]*_TOKEN|[A-Z][A-Z_]*_SECRET|[A-Z][A-Z_]*_KEY' "$SKILL_DIR/SKILL.md" 2>/dev/null | sort -u | tr '\n' '|' | sed 's/|$//')
fi
if [ -z "$OWN_KEYS" ]; then
  OWN_KEYS=$(grep -roE '[A-Z][A-Z_]*_KEY' "$SKILL_DIR"/*.md 2>/dev/null | grep -oE '[A-Z][A-Z_]*_KEY' | sort -u | tr '\n' '|' | sed 's/|$//')
fi

# Foreign keys = OpenClaw/agent-specific credentials that skills shouldn't access
# Excludes third-party APIs (SERPAPI, etc.) that skills legitimately use
FOREIGN_KEYS="ANTHROPIC_API_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY|TELEGRAM.*BOT_TOKEN|CLAUDE.*TOKEN|ELEVENLABS.*KEY|AGENTMAIL_API_KEY|FIRECRAWL_API_KEY|BROWSER_USE_API_KEY|MEM0_API_KEY|GOOGLE_API_KEY|CLAWDHUB_TOKEN|OPENCLAW.*KEY|CLAWD.*KEY"
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  [[ "$rel_file" == *.md ]] && continue
  matched_key=$(echo "$content" | grep -oE '[A-Z][A-Z_]*_API_KEY|[A-Z][A-Z_]*_KEY|[A-Z][A-Z_]*_TOKEN|[A-Z][A-Z_]*_SECRET' | head -1)
  if [ -n "$OWN_KEYS" ] && [ -n "$matched_key" ] && echo "$matched_key" | grep -qE "^($OWN_KEYS)$"; then
    continue
  fi
  add_finding "CRITICAL" "$rel_file" "$line" "Accesses foreign credentials: ${content:0:120}"
done < <(grep -rnE "($FOREIGN_KEYS)" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 4. Obfuscation patterns (keep these - they're about detecting obfuscation, not containing malware sigs)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Code obfuscation detected: ${content:0:120}"
done < <(grep -rnE '(eval\s*\(|new\s+Function\s*\(|atob\s*\(|btoa\s*\(|Buffer\.from\s*\(.*(base64|hex)|\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 5. Path traversal / sensitive file access
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Path traversal / sensitive file access: ${content:0:120}"
done < <(grep -rnE '(\.\./\.\./|/etc/passwd|/etc/shadow|~\/\.bashrc|~\/\.ssh|~\/\.aws|~\/\.clawdbot|~\/\.config|\/home\/[a-z])' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 6. Data exfiltration via curl/wget (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Data exfiltration pattern: ${content:0:120}"
done < <(grep -rnE "$P_EXFIL_CURL" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 7. Reverse/bind shells (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Possible reverse/bind shell: ${content:0:120}"
done < <(grep -rnE "$P_REVSHELL" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 8. .env file theft
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  [[ "$rel_file" == *.md ]] && continue
  add_finding "CRITICAL" "$rel_file" "$line" ".env file access: ${content:0:120}"
done < <(grep -rnE '(dotenv|load_dotenv|\.env\.local|open\(.*\.env|read.*\.env|config\s*\(\s*\))' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null | grep -vE '(\.env\.example|\.env\.sample|#.*\.env)' || true)

# 9. Prompt injection in markdown
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  if echo "$content" | grep -qiE '(example|never|attack|malicious|don.t|warning|avoid|block|detect|prevent|security)'; then
    continue
  fi
  add_finding "CRITICAL" "$rel_file" "$line" "Prompt injection attempt: ${content:0:120}"
done < <(grep -rniE '(ignore (previous|prior|above|all) (instructions|rules|prompts)|disregard (your|all|previous)|forget (your|all|previous)|you are now|new persona|override (system|safety)|jailbreak|do not follow|pretend you|act as if you have no restrictions|reveal your (system|instructions|prompt))' "$SKILL_DIR" --include='*.md' --include='*.txt' --include='*.yaml' --include='*.yml' --include='*.json' 2>/dev/null || true)

# 10. LLM tool exploitation
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "LLM tool exploitation: ${content:0:120}"
done < <(grep -rniE '(send (this|the|all|my) (data|info|key|token|secret|config|env|password|credential)|exec.*curl.*api[_-]?key|write.*(api[_-]?key|token|secret|password).*to|post.*(credential|secret|token|key).*to|email.*(key|token|secret|credential)|forward.*(key|token|secret))' "$SKILL_DIR" --include='*.md' --include='*.txt' 2>/dev/null || true)

# 11. Agent config tampering
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Agent config tampering: ${content:0:120}"
done < <(grep -rniE '(write|edit|modify|overwrite|replace|append).*(AGENTS\.md|SOUL\.md|IDENTITY\.md|USER\.md|HEARTBEAT\.md|MEMORY\.md|BOOTSTRAP\.md|clawdbot\.json|\.bashrc|\.profile)' "$SKILL_DIR" 2>/dev/null || true)

# 12-20: Unicode, setup commands, social engineering, .env files, homographs, ANSI, punycode, double-encoded, shortened URLs
# (keeping these as-is - they don't contain malware signatures)

# 12. Unicode obfuscation
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  if grep -Pq '[\x{200B}\x{200C}\x{200D}\x{200E}\x{200F}\x{202A}\x{202B}\x{202C}\x{202D}\x{202E}\x{2060}\x{FEFF}]' "$file" 2>/dev/null; then
    add_finding "CRITICAL" "$rel_file" "?" "Unicode obfuscation — hidden zero-width or directional chars detected"
  fi
done < <(find "$SKILL_DIR" -type f \( -name "*.md" -o -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.sh" \) 2>/dev/null || true)

# 13. Suspicious setup commands
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  while IFS=: read -r file line content; do
    rel_file="${file#$SKILL_DIR/}"
    add_finding "CRITICAL" "$rel_file" "$line" "Suspicious setup command (exfil disguised as setup): ${content:0:120}"
  done < <(grep -nE "$P_EXFIL_CURL" "$SKILL_DIR/SKILL.md" 2>/dev/null || true)
fi

# 14. Social engineering
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Social engineering — instructs user to download/run external binary: ${content:0:120}"
done < <(grep -rniE '(download.*\.(exe|zip|dmg|pkg|msi|deb|rpm|appimage|sh|bat|cmd|ps1)|extract.*passw|run.*executable|execute.*command.*terminal|install.*from.*(glot\.io|pastebin|hastebin|ghostbin|paste\.|privatebin|dpaste|controlc|rentry)|run.*(before|first).*using|\.zip.*password)' "$SKILL_DIR" --include='*.md' --include='*.txt' 2>/dev/null || true)

# 15. Shipped .env files
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  if [[ "$rel_file" != *.example ]] && [[ "$rel_file" != *.sample ]]; then
    add_finding "CRITICAL" "$rel_file" "-" "Actual .env file shipped with skill — may contain or harvest credentials"
  fi
done < <(find "$SKILL_DIR" -name ".env" -o -name ".env.local" -o -name ".env.production" 2>/dev/null || true)

# 16. Homograph characters
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  if grep -Pq '[\x{0430}\x{0435}\x{043E}\x{0440}\x{0441}\x{0445}\x{0456}\x{0458}\x{0455}\x{0410}\x{0412}\x{0421}\x{0415}\x{041D}\x{041A}\x{041C}\x{041E}\x{0420}\x{0422}\x{0425}]' "$file" 2>/dev/null; then
    add_finding "CRITICAL" "$rel_file" "?" "Homograph characters — Cyrillic lookalikes mimicking Latin letters (IDN attack)"
  fi
done < <(find "$SKILL_DIR" -type f \( -name "*.md" -o -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \) 2>/dev/null || true)

# 17. ANSI escape injection
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  if grep -Pq '\x1b' "$file" 2>/dev/null; then
    add_finding "CRITICAL" "$rel_file" "?" "Raw ANSI escape sequences — possible terminal display manipulation"
  fi
done < <(find "$SKILL_DIR" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \) 2>/dev/null || true)

# 18. Punycode domains
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Punycode domain — possible IDN homograph attack: ${content:0:120}"
done < <(grep -rnE 'xn--[a-z0-9]+' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# 19. Double-encoded paths
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Double-encoded path — percent-encoding bypass attempt: ${content:0:120}"
done < <(grep -rnE '%25[0-9a-fA-F]{2}' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 20. Shortened URLs
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Shortened URL — hides true destination: ${content:0:120}"
done < <(grep -rnE 'https?://(bit\.ly|t\.co|tinyurl\.com|goo\.gl|is\.gd|ow\.ly|rb\.gy|short\.io|cutt\.ly|tiny\.cc|buff\.ly)/' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# 21. Pipe-to-shell (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Pipe-to-shell — remote code piped to interpreter: ${content:0:120}"
done < <(grep -rnE "$P_PIPE_SHELL" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# 22. String construction evasion
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "String construction evasion — assembling dangerous calls from fragments: ${content:0:120}"
done < <(grep -rnE "('[a-z]{1,4}'\s*\+\s*'[a-z]{1,4}'|\"[a-z]{1,4}\"\s*\+\s*\"[a-z]{1,4}\"|(window|global|globalThis|self)\[.{1,30}\]|String\.fromCharCode|\.split\(['\"].*['\"\)]\)\.reverse\(\)\.join|global\[.require.\]|getattr\s*\(\s*(os|sys|builtins)|const\s*\{[^}]*:\s*\w+\s*\}\s*=\s*require\s*\(\s*['\"]child_process)" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' 2>/dev/null || true)

# 23. Data flow chain analysis
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  has_read=0
  has_encode=0
  has_send=0
  grep -qE '(process\.env|os\.environ|dotenv|load_dotenv|readFileSync|os\.getenv)' "$file" 2>/dev/null && has_read=1
  grep -qE '(btoa|atob|base64|Buffer\.from|encodeURIComponent|b64encode|b64decode)' "$file" 2>/dev/null && has_encode=1
  grep -qE '(fetch\(|axios\.|http\.request|requests\.(post|put|get)|urllib\.request|socket\.connect)' "$file" 2>/dev/null && has_send=1
  if [ $has_read -eq 1 ] && [ $has_encode -eq 1 ] && [ $has_send -eq 1 ]; then
    add_finding "CRITICAL" "$rel_file" "-" "Data flow chain — file reads secrets/env, encodes data, AND sends network requests"
  fi
done < <(find "$SKILL_DIR" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) 2>/dev/null || true)

# 24. Time bomb detection
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Time bomb pattern — delayed or date-gated execution: ${content:0:120}"
done < <(grep -rnE '(Date\.now\(\)\s*>\s*[0-9]{12,}|new\s+Date\s*\(\s*['"'"'"][0-9]{4}-[0-9]{2}-[0-9]{2}|setTimeout\s*\([^,]+,\s*[0-9]{8,}|setInterval\s*\([^,]+,\s*[0-9]{8,}|time\.sleep\s*\(\s*[0-9]{5,}|datetime\.now\(\)\s*>|schedule\.every\s*\(\s*[0-9]+\s*\)\s*\.days)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# --- CAMPAIGN-INSPIRED CHECKS ---

# 25. Known C2/IOC IP blocklist
KNOWN_BAD_IPS="91\.92\.242\.30|95\.92\.242\.30|96\.92\.242\.30|202\.161\.50\.59|54\.91\.154\.110"
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  matched_ip=$(echo "$content" | grep -oE "$KNOWN_BAD_IPS")
  add_finding "CRITICAL" "$rel_file" "$line" "Known malicious C2 IP ($matched_ip) — matches IOC blocklist: ${content:0:120}"
done < <(grep -rnE "$KNOWN_BAD_IPS" "$SKILL_DIR" 2>/dev/null || true)

# 26. Password-protected archive references
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Password-protected archive — AV evasion technique: ${content:0:120}"
done < <(grep -rniE '(extract.*(using|with)\s*(pass(word)?|pwd)|password[:\s]+.*(openclaw|extract|unzip|archive)|\.zip.*pass(word)?|pass(word)?.*\.zip|\.7z.*pass|\.rar.*pass)' "$SKILL_DIR" --include='*.md' --include='*.txt' --include='*.yaml' --include='*.yml' 2>/dev/null || true)

# 27. Paste service payloads
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Paste service reference — commonly used to host malicious payloads: ${content:0:120}"
done < <(grep -rnE 'https?://(glot\.io|pastebin\.com|paste\.ee|hastebin\.com|ghostbin\.|privatebin\.|dpaste\.|controlc\.com|rentry\.(co|org)|paste\.mozilla\.org|ix\.io|sprunge\.us|cl1p\.net)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# 28. GitHub releases binary downloads
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "GitHub releases binary download — fake prerequisite pattern: ${content:0:120}"
done < <(grep -rnE 'github\.com/[^/]+/[^/]+/releases/download/[^"'"'"')]*\.(zip|exe|dmg|pkg|msi|deb|rpm|appimage|tar\.gz|bin)' "$SKILL_DIR" --include='*.md' --include='*.txt' 2>/dev/null || true)

# 29. Base64 pipe-to-interpreter (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Base64 pipe-to-interpreter — encoded payload execution: ${content:0:120}"
done < <(grep -rnE "$P_B64_EXEC" "$SKILL_DIR" 2>/dev/null || true)

# 30. Subprocess executing network commands (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Subprocess with network command — hidden pipe-to-shell: ${content:0:120}"
done < <(grep -rnE "$P_SUBPROCESS_NET" "$SKILL_DIR" --include='*.py' --include='*.js' --include='*.ts' 2>/dev/null || true)

# 31. Fake URL misdirection
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "Fake URL misdirection — decoy URL before real payload: ${content:0:120}"
done < <(grep -rnE 'echo\s+[\"'"'"'"].*https?://.*(apple\.com|microsoft\.com|google\.com|setup|install|download|update|cdn\.)' "$SKILL_DIR" --include='*.sh' --include='*.md' --include='*.py' 2>/dev/null || true)

# 32. Process persistence mechanisms
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  has_persist=0
  has_network=0
  grep -qE '(nohup|disown|setsid|&\s*>/dev/null|start-stop-daemon|launchctl|systemctl.*(enable|start))' "$file" 2>/dev/null && has_persist=1
  grep -qE '(curl|wget|nc |ncat|fetch\(|requests\.|http\.|socket\.)' "$file" 2>/dev/null && has_network=1
  if [ $has_persist -eq 1 ] && [ $has_network -eq 1 ]; then
    add_finding "CRITICAL" "$rel_file" "-" "Process persistence + network — background process with network access (backdoor pattern)"
  fi
done < <(find "$SKILL_DIR" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" \) 2>/dev/null || true)

# 33. Fake prerequisite with external download
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  while IFS=: read -r file line content; do
    rel_file="${file#$SKILL_DIR/}"
    add_finding "CRITICAL" "$rel_file" "$line" "Fake prerequisite — external download requirement in docs: ${content:0:120}"
  done < <(grep -niE '(prerequisite|require[sd]?|must install|needed|before (you|using|proceed)).*https?://' "$SKILL_DIR/SKILL.md" 2>/dev/null | grep -viE '(npm|pip|brew|apt|cargo|node|python|docker|git|ffmpeg|clawhub\.ai|github\.com/(openclaw|anthropic|google))' || true)
fi

# 34. xattr/chmod on downloaded files (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Download + xattr/chmod — macOS Gatekeeper bypass (AMOS pattern): ${content:0:120}"
done < <(grep -rnE "$P_GATEKEEPER" "$SKILL_DIR" --include='*.sh' --include='*.py' --include='*.md' 2>/dev/null || true)

# 35. Binary download+execute ClickFix (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Binary download+execute chain — ClickFix-style attack: ${content:0:120}"
done < <(grep -rnE "$P_CLICKFIX" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# 36. Suspicious package install sources (ENCODED)
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "CRITICAL" "$rel_file" "$line" "Suspicious package source — not from official registry: ${content:0:120}"
done < <(grep -rnE "$P_SUS_PKG" "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# 37. Staged installer pattern
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  while IFS=: read -r file line content; do
    rel_file="${file#$SKILL_DIR/}"
    add_finding "CRITICAL" "$rel_file" "$line" "Suspicious dependency — unknown package with 'core'/'base'/'lib' suffix: ${content:0:120}"
  done < <(grep -nE '(npm\s+install|pip\s+install|gem\s+install)\s+[a-z]+-?(core|base|lib|helper|util|sdk)\b' "$SKILL_DIR/SKILL.md" 2>/dev/null | grep -vE '(react-core|vue-core|angular-core|webpack-core|babel-core|eslint-core|typescript-core)' || true)
fi

# --- WARNING CHECKS ---

# Subprocess execution
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "Subprocess execution: ${content:0:120}"
done < <(grep -rnE '(child_process|execSync|spawn\(|subprocess\.|os\.system|os\.popen|Popen)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' 2>/dev/null || true)

# Network requests
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "Network request: ${content:0:120}"
done < <(grep -rnE '(require\(.*(axios|node-fetch|got|request)\)|import.*(axios|fetch|requests|httpx|urllib)|XMLHttpRequest|\.fetch\s*\()' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' 2>/dev/null || true)

# Minified/bundled files
while IFS= read -r file; do
  rel_file="${file#$SKILL_DIR/}"
  line_len=$(head -1 "$file" 2>/dev/null | wc -c)
  if [ "$line_len" -gt 500 ]; then
    add_finding "WARNING" "$rel_file" "1" "Minified/bundled file (first line: ${line_len} chars) — cannot audit"
  fi
done < <(find "$SKILL_DIR" -name "*.js" -o -name "*.ts" 2>/dev/null || true)

# Filesystem write operations
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "File write operation: ${content:0:120}"
done < <(grep -rnE '(writeFileSync|writeFile\(|open\(.*[\"'"'"']w|\.write\(|fs\.append|>> )' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# Unknown external tool requirements
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  if echo "$content" | grep -qiE '(npm|pip|brew|apt|cargo|go install|gem install|docker|node|python|jq|curl|git|ffmpeg|ollama|playwright|gog|gemini)'; then
    continue
  fi
  add_finding "WARNING" "$rel_file" "$line" "Requires unknown external tool: ${content:0:120}"
done < <(grep -rniE '(requires?|must install|prerequisite|install.*first|download.*before).*\b[a-z][a-z0-9_-]+cli\b' "$SKILL_DIR" --include='*.md' 2>/dev/null || true)

# Insecure transport
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "Insecure transport — TLS verification disabled: ${content:0:120}"
done < <(grep -rnE '(curl\s+.*(-k|--insecure)\b|wget\s+.*--no-check-certificate|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*.0.|verify\s*=\s*False)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' 2>/dev/null || true)

# Raw IP URLs
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  if echo "$content" | grep -qE 'https?://(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.0\.0\.0|localhost)'; then
    continue
  fi
  add_finding "CRITICAL" "$rel_file" "$line" "Raw IP URL — bypasses domain-based trust: ${content:0:120}"
done < <(grep -rnE 'https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='*.md' 2>/dev/null || true)

# Untrusted Docker registries
while IFS=: read -r file line content; do
  rel_file="${file#$SKILL_DIR/}"
  add_finding "WARNING" "$rel_file" "$line" "Third-party Docker registry: ${content:0:120}"
done < <(grep -rnE '(docker\s+(pull|run)\s+[a-z0-9.-]+\.[a-z]{2,}/|FROM\s+[a-z0-9.-]+\.[a-z]{2,}/)' "$SKILL_DIR" --include='*.js' --include='*.ts' --include='*.py' --include='*.sh' --include='Dockerfile*' --include='*.yaml' --include='*.yml' 2>/dev/null || true)

# --- RESULTS ---

STATUS="clean"
EXIT_CODE=0
if [ $WARNINGS -gt 0 ]; then STATUS="caution"; EXIT_CODE=1; fi
if [ $CRITICAL -gt 0 ]; then STATUS="blocked"; EXIT_CODE=2; fi

if [ $JSON_MODE -eq 1 ]; then
  printf '{"skill":%s,"path":%s,"files_scanned":%s,"summary":{"critical":%d,"warnings":%d,"status":"%s"},"findings":[%s]}\n' \
    "$(json_escape "$SKILL_NAME")" "$(json_escape "$SKILL_DIR")" "$FILE_COUNT" "$CRITICAL" "$WARNINGS" "$STATUS" "$JSON_FINDINGS"
  exit $EXIT_CODE
fi

if [ $SUMMARY_MODE -eq 1 ]; then
  if [ $EXIT_CODE -eq 0 ]; then
    echo "skillvet: $SKILL_NAME — clean"
  else
    echo "skillvet: $SKILL_NAME — $STATUS ($CRITICAL critical, $WARNINGS warnings)"
  fi
  exit $EXIT_CODE
fi

echo ""
if [ $CRITICAL -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  printf "${GREEN}✅ CLEAN${NC} — No issues found in %s\n" "$SKILL_NAME"
  exit 0
fi

printf "%b" "$FINDINGS"
echo "---"
printf "Summary: ${RED}%d critical${NC}, ${YELLOW}%d warnings${NC}\n" "$CRITICAL" "$WARNINGS"

if [ $CRITICAL -gt 0 ]; then
  printf "\n${RED}⛔ BLOCKED — Critical issues found. Do NOT use this skill without manual review.${NC}\n"
  exit 2
else
  printf "\n${YELLOW}⚠️  CAUTION — Warnings found. Review before using.${NC}\n"
  exit 1
fi
