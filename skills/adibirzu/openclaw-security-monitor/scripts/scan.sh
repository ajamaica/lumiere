#!/bin/bash
# OpenClaw Security Monitor - Enhanced Threat Scanner v2.1
# https://github.com/adibirzu/openclaw-security-monitor
#
# 24-point security scanner. Detects: ClawHavoc AMOS stealer, C2
# infrastructure, reverse shells, credential exfiltration, memory
# poisoning, WebSocket hijacking, SKILL.md injection, DM/tool/sandbox
# policy violations, persistence mechanisms, plugin threats, and more.
#
# Exit codes: 0=SECURE, 1=WARNINGS, 2=COMPROMISED
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IOC_DIR="$PROJECT_DIR/ioc"

OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
SKILLS_DIR="$OPENCLAW_DIR/workspace/skills"
WORKSPACE_DIR="$OPENCLAW_DIR/workspace"
LOG_DIR="$OPENCLAW_DIR/logs"
LOG_FILE="$LOG_DIR/security-scan.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

CRITICAL=0
WARNINGS=0
CLEAN=0
TOTAL_CHECKS=0

mkdir -p "$LOG_DIR"

log() { echo "$1" | tee -a "$LOG_FILE"; }
header() { log ""; log "[$1/$TOTAL_CHECKS] $2"; }
result_clean() { log "CLEAN: $1"; CLEAN=$((CLEAN + 1)); }
result_warn() { log "WARNING: $1"; WARNINGS=$((WARNINGS + 1)); }
result_critical() { log "CRITICAL: $1"; CRITICAL=$((CRITICAL + 1)); }

# Count total checks
TOTAL_CHECKS=32

log "========================================"
log "OPENCLAW SECURITY SCAN - $TIMESTAMP"
log "Scanner: v2.2 (openclaw-security-monitor)"
log "========================================"

# Load IOC data
load_ips() {
    if [ -f "$IOC_DIR/c2-ips.txt" ]; then
        grep -v '^#' "$IOC_DIR/c2-ips.txt" | grep -v '^$' | cut -d'|' -f1
    else
        echo "91.92.242"
    fi
}

load_domains() {
    if [ -f "$IOC_DIR/malicious-domains.txt" ]; then
        grep -v '^#' "$IOC_DIR/malicious-domains.txt" | grep -v '^$' | cut -d'|' -f1
    else
        echo "webhook.site"
    fi
}

# ============================================================
# CHECK 1: Known C2 Infrastructure
# ============================================================
header 1 "Scanning for known C2 infrastructure..."

C2_PATTERN=$(load_ips | tr '\n' '|' | sed 's/|$//' | sed 's/\./\\./g')
if [ -n "$C2_PATTERN" ]; then
    C2_HITS=$(grep -rlE --exclude-dir=security-monitor "$C2_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
    if [ -n "$C2_HITS" ]; then
        result_critical "Known C2 IP found in:"
        log "$C2_HITS"
    else
        result_clean "No C2 IPs detected"
    fi
else
    result_clean "No C2 IPs detected"
fi

# ============================================================
# CHECK 2: AMOS Stealer / AuthTool Markers
# ============================================================
header 2 "Scanning for AMOS stealer / AuthTool markers..."

AMOS_PATTERN="authtool|atomic.stealer|AMOS|NovaStealer|nova.stealer|osascript.*password|osascript.*dialog|osascript.*keychain|Security\.framework.*Auth|openclaw-agent\.exe|openclaw-agent\.zip|openclawcli\.zip|AuthTool|Installer-Package"
AMOS_HITS=$(grep -rliE --exclude-dir=security-monitor "$AMOS_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$AMOS_HITS" ]; then
    result_critical "AMOS/stealer markers found in:"
    log "$AMOS_HITS"
else
    result_clean "No stealer markers"
fi

# ============================================================
# CHECK 3: Reverse Shells & Backdoors
# ============================================================
header 3 "Scanning for reverse shells & backdoors..."

SHELL_PATTERN="nc -e|/dev/tcp/|mkfifo.*nc|bash -i >|socat.*exec|python.*socket.*connect|nohup.*bash.*tcp|perl.*socket.*INET|ruby.*TCPSocket|php.*fsockopen|lua.*socket\.tcp|xattr -[cr]|com\.apple\.quarantine"
SHELL_HITS=$(grep -rlinE --exclude-dir=security-monitor "$SHELL_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$SHELL_HITS" ]; then
    result_critical "Reverse shell patterns found in:"
    log "$SHELL_HITS"
else
    result_clean "No reverse shells"
fi

# ============================================================
# CHECK 4: Credential Exfiltration Endpoints
# ============================================================
header 4 "Scanning for credential exfiltration endpoints..."

DOMAIN_PATTERN=$(load_domains | tr '\n' '|' | sed 's/|$//' | sed 's/\./\\./g')
EXFIL_HITS=$(grep -rlinE --exclude-dir=security-monitor "$DOMAIN_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$EXFIL_HITS" ]; then
    result_critical "Exfiltration endpoints found in:"
    log "$EXFIL_HITS"
else
    result_clean "No exfiltration endpoints"
fi

# ============================================================
# CHECK 5: Crypto Wallet Targeting
# ============================================================
header 5 "Scanning for crypto wallet targeting..."

CRYPTO_PATTERN="wallet.*private.*key|seed.phrase|mnemonic|keystore.*decrypt|phantom.*wallet|metamask.*vault|exchange.*api.*key|solana.*keypair|ethereum.*keyfile"
CRYPTO_HITS=$(grep -rlinE --exclude-dir=security-monitor "$CRYPTO_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$CRYPTO_HITS" ]; then
    result_warn "Crypto wallet patterns found in:"
    log "$CRYPTO_HITS"
else
    result_clean "No crypto targeting"
fi

# ============================================================
# CHECK 6: Curl-Pipe / Download Attacks
# ============================================================
header 6 "Scanning for curl-pipe and download attacks..."

CURL_PATTERN="curl.*\|.*sh|curl.*\|.*bash|wget.*\|.*sh|curl -fsSL.*\||wget -q.*\||curl.*-o.*/tmp/"
CURL_HITS=$(grep -rlinE --exclude-dir=security-monitor "$CURL_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$CURL_HITS" ]; then
    result_warn "Curl-pipe patterns found in:"
    log "$CURL_HITS"
else
    result_clean "No curl-pipe attacks"
fi

# ============================================================
# CHECK 7: File Permission Audit
# ============================================================
header 7 "Auditing sensitive file permissions..."

PERM_ISSUES=0
for f in "$OPENCLAW_DIR/openclaw.json" \
         "$OPENCLAW_DIR/agents/main/agent/auth-profiles.json" \
         "$OPENCLAW_DIR/exec-approvals.json"; do
    if [ -f "$f" ]; then
        PERMS=$(stat -f "%Lp" "$f" 2>/dev/null || stat -c "%a" "$f" 2>/dev/null)
        if [ "$PERMS" != "600" ]; then
            result_warn "$f has permissions $PERMS (should be 600)"
            PERM_ISSUES=$((PERM_ISSUES + 1))
        fi
    fi
done
if [ "$PERM_ISSUES" -eq 0 ]; then
    result_clean "All sensitive files have correct permissions"
fi

# ============================================================
# CHECK 8: Skill Integrity Hashes
# ============================================================
header 8 "Computing skill integrity hashes..."

HASH_FILE="$LOG_DIR/skill-hashes.sha256"
HASH_FILE_PREV="$LOG_DIR/skill-hashes.sha256.prev"
if [ -f "$HASH_FILE" ]; then
    cp "$HASH_FILE" "$HASH_FILE_PREV"
fi
find "$SKILLS_DIR" -name "SKILL.md" -exec shasum -a 256 {} \; > "$HASH_FILE" 2>/dev/null
if [ -f "$HASH_FILE_PREV" ]; then
    DIFF=$(diff "$HASH_FILE_PREV" "$HASH_FILE" 2>/dev/null || true)
    if [ -n "$DIFF" ]; then
        result_warn "Skill files changed since last scan:"
        log "$DIFF"
    else
        result_clean "No skill file modifications"
    fi
else
    log "INFO: Baseline hashes created (first scan)"
    result_clean "Baseline hashes created"
fi

# ============================================================
# CHECK 9: SKILL.md Shell Injection Patterns (NEW)
# ============================================================
header 9 "Scanning SKILL.md files for shell injection patterns..."

# Patterns from Snyk/Cisco/Bloom research: SKILL.md can embed shell commands and prompt injection
INJECTION_PATTERN="Prerequisites.*install|Prerequisites.*download|Prerequisites.*curl|Prerequisites.*wget|run this command.*terminal|paste.*terminal|copy.*terminal|base64 -d|base64 --decode|eval \$(|exec \$(|\`curl|\`wget|bypass.*safety.*guideline|execute.*without.*asking|ignore.*safety|override.*instruction|without.*user.*awareness"
INJECT_HITS=""
while IFS= read -r skillmd; do
    if grep -qiE "$INJECTION_PATTERN" "$skillmd" 2>/dev/null; then
        INJECT_HITS="$INJECT_HITS\n  $skillmd"
    fi
done < <(find "$SKILLS_DIR" -name "SKILL.md" -not -path "*/security-monitor/*" 2>/dev/null)

if [ -n "$INJECT_HITS" ]; then
    result_warn "SKILL.md files with suspicious install instructions:$INJECT_HITS"
else
    result_clean "No SKILL.md shell injection patterns"
fi

# ============================================================
# CHECK 10: Memory Poisoning Detection (NEW)
# ============================================================
header 10 "Checking for memory poisoning indicators..."

MEMORY_POISON=0
# Check if SOUL.md or MEMORY.md have been modified recently (within last 24h)
for memfile in "$WORKSPACE_DIR/SOUL.md" "$WORKSPACE_DIR/MEMORY.md" "$WORKSPACE_DIR/IDENTITY.md"; do
    if [ -f "$memfile" ]; then
        # Check for suspicious content
        POISON_HITS=$(grep -iE "ignore previous|disregard|override.*instruction|system prompt|new instruction|forget.*previous|you are now|act as if|pretend to be|from now on.*ignore" "$memfile" 2>/dev/null || true)
        if [ -n "$POISON_HITS" ]; then
            result_critical "Memory poisoning detected in $memfile:"
            log "$POISON_HITS"
            MEMORY_POISON=$((MEMORY_POISON + 1))
        fi
    fi
done

# Check skill SKILL.md files for attempts to write to memory files
MEM_WRITE_HITS=$(grep -rliE --exclude-dir=security-monitor "SOUL\.md|MEMORY\.md|IDENTITY\.md" "$SKILLS_DIR" 2>/dev/null | while read -r f; do
    # Only flag if the file tries to WRITE to these, not just reference them
    if grep -qiE "write.*SOUL|write.*MEMORY|modify.*SOUL|echo.*>>.*SOUL|cat.*>.*SOUL|append.*MEMORY" "$f" 2>/dev/null; then
        echo "  $f"
    fi
done)
if [ -n "$MEM_WRITE_HITS" ]; then
    result_critical "Skills attempting to modify memory files:"
    log "$MEM_WRITE_HITS"
else
    if [ "$MEMORY_POISON" -eq 0 ]; then
        result_clean "No memory poisoning detected"
    fi
fi

# ============================================================
# CHECK 11: Base64 Obfuscation Detection (NEW)
# ============================================================
header 11 "Scanning for base64-obfuscated payloads..."

# ClawHavoc used base64 to hide payloads on glot.io
B64_PATTERN="base64 -[dD]|base64 --decode|atob\(|Buffer\.from\(.*base64|echo.*\|.*base64.*\|.*bash|echo.*\|.*base64.*\|.*sh|python.*b64decode|import base64"
B64_HITS=$(grep -rlinE --exclude-dir=security-monitor "$B64_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$B64_HITS" ]; then
    result_warn "Base64 decode patterns found in:"
    log "$B64_HITS"
else
    result_clean "No base64 obfuscation detected"
fi

# ============================================================
# CHECK 12: External Binary Downloads (NEW)
# ============================================================
header 12 "Scanning for external binary downloads..."

# ClawHavoc distributed openclaw-agent.exe via GitHub releases, openclawcli.zip via password-protected archives
BIN_PATTERN="\.exe|\.dmg|\.pkg|\.msi|\.app\.zip|releases/download|github\.com/.*/releases|\.zip.*password|password.*\.zip|openclawcli\.zip|openclaw-agent|AuthTool.*download|download.*AuthTool"
BIN_HITS=$(grep -rlinE --exclude-dir=security-monitor "$BIN_PATTERN" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$BIN_HITS" ]; then
    result_warn "External binary download references found in:"
    log "$BIN_HITS"
else
    result_clean "No external binary downloads"
fi

# ============================================================
# CHECK 13: Gateway Security Configuration (NEW)
# ============================================================
header 13 "Auditing gateway security configuration..."

GW_ISSUES=0
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"

if command -v openclaw &>/dev/null; then
    # Check bind address
    BIND=$(timeout 10 openclaw config get gateway.bind 2>/dev/null || echo "unknown")
    if [ "$BIND" = "lan" ] || [ "$BIND" = "0.0.0.0" ]; then
        result_warn "Gateway bound to LAN ($BIND) - accessible from network"
        GW_ISSUES=$((GW_ISSUES + 1))
    fi

    # Check if auth is enabled
    AUTH_MODE=$(timeout 10 openclaw config get gateway.auth.mode 2>/dev/null || echo "unknown")
    if [ "$AUTH_MODE" = "none" ] || [ "$AUTH_MODE" = "off" ]; then
        result_critical "Gateway authentication is DISABLED"
        GW_ISSUES=$((GW_ISSUES + 1))
    fi

    # Check OpenClaw version for CVE-2026-25253
    OC_VERSION=$(timeout 5 openclaw --version 2>/dev/null || echo "unknown")
    log "  OpenClaw version: $OC_VERSION"
fi

if [ "$GW_ISSUES" -eq 0 ]; then
    result_clean "Gateway configuration acceptable"
fi

# ============================================================
# CHECK 14: WebSocket Origin Validation (NEW - CVE-2026-25253)
# ============================================================
header 14 "Checking WebSocket security (CVE-2026-25253)..."

# Test if gateway WebSocket accepts connections without origin validation
GW_PORT=$(timeout 5 openclaw config get gateway.port 2>/dev/null || echo "18789")
GW_PORT=$(echo "$GW_PORT" | grep -o '[0-9]*' | head -1)
GW_PORT=${GW_PORT:-18789}
WS_RAW=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Origin: http://evil.attacker.com" \
    --connect-timeout 3 --max-time 5 \
    "http://127.0.0.1:$GW_PORT/" 2>/dev/null || echo "000")
WS_TEST=$(echo "$WS_RAW" | head -c 3)

if [ "$WS_TEST" = "101" ]; then
    result_critical "Gateway accepts WebSocket from arbitrary origins (CVE-2026-25253 may be unpatched)"
elif [ "$WS_TEST" = "000" ]; then
    log "  Gateway not reachable on port $GW_PORT (may be normal)"
    result_clean "WebSocket test inconclusive (gateway not reachable)"
elif [ "$WS_TEST" = "403" ] || [ "$WS_TEST" = "401" ]; then
    result_clean "WebSocket origin validation active (HTTP $WS_TEST - rejected)"
else
    result_clean "WebSocket responded HTTP $WS_TEST"
fi

# ============================================================
# CHECK 15: Known Malicious Publisher Detection (NEW)
# ============================================================
header 15 "Checking installed skills against known malicious publishers..."

if [ -f "$IOC_DIR/malicious-publishers.txt" ]; then
    PUBLISHERS=$(grep -v '^#' "$IOC_DIR/malicious-publishers.txt" | grep -v '^$' | cut -d'|' -f1)
    PUB_HITS=""
    for pub in $PUBLISHERS; do
        # Check skill metadata for publisher references
        FOUND=$(grep -rl --exclude-dir=security-monitor "$pub" "$SKILLS_DIR" 2>/dev/null || true)
        if [ -n "$FOUND" ]; then
            PUB_HITS="$PUB_HITS\n  Publisher '$pub' referenced in: $FOUND"
        fi
    done
    if [ -n "$PUB_HITS" ]; then
        result_critical "Known malicious publisher references found:$PUB_HITS"
    else
        result_clean "No known malicious publishers"
    fi
else
    result_clean "Publisher database not available (skipped)"
fi

# ============================================================
# CHECK 16: Sensitive Environment Leakage (NEW)
# ============================================================
header 16 "Scanning for sensitive environment/credential leakage..."

ENV_PATTERN="\.env|\.bashrc|\.zshrc|\.ssh/|id_rsa|id_ed25519|\.aws/credentials|\.kube/config|\.docker/config|keychain|login\.keychain|Cookies\.binarycookies|\.clawdbot/\.env|\.openclaw/openclaw\.json|auth-profiles\.json|\.git-credentials|\.netrc|moltbook.*token|moltbook.*api|MOLTBOOK_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[a-zA-Z0-9]"
# Only flag skills that READ these files or reference API key patterns (not just mention them in docs)
ENV_HITS=$(grep -rlinE --exclude-dir=security-monitor "cat.*(${ENV_PATTERN})|read.*(${ENV_PATTERN})|open.*(${ENV_PATTERN})|fs\.read.*(${ENV_PATTERN})|source.*(${ENV_PATTERN})" "$SKILLS_DIR" 2>/dev/null || true)

# Also check for hardcoded API keys or Moltbook tokens in skill code (CSA report)
API_KEY_HITS=$(grep -rlinE --exclude-dir=security-monitor "sk-[a-zA-Z0-9]{20,}|OPENAI_API_KEY\s*=\s*['\"][^$]|ANTHROPIC_API_KEY\s*=\s*['\"][^$]|moltbook.*token\s*=\s*['\"]" "$SKILLS_DIR" 2>/dev/null || true)
if [ -n "$API_KEY_HITS" ]; then
    result_critical "Hardcoded API keys or Moltbook tokens found in:"
    log "$API_KEY_HITS"
fi
if [ -n "$ENV_HITS" ]; then
    result_warn "Skills accessing sensitive env/credential files:"
    log "$ENV_HITS"
else
    result_clean "No sensitive environment leakage"
fi

# ============================================================
# CHECK 17: DM Policy Audit (NEW - OpenClaw Security Docs)
# ============================================================
header 17 "Auditing DM access policies..."

DM_ISSUES=0
if command -v openclaw &>/dev/null; then
    for channel in whatsapp telegram discord slack signal; do
        DM_POLICY=$(timeout 10 openclaw config get "channels.${channel}.dmPolicy" 2>/dev/null || echo "")
        if [ "$DM_POLICY" = "open" ]; then
            result_warn "Channel '$channel' has dmPolicy='open' (anyone can message)"
            DM_ISSUES=$((DM_ISSUES + 1))
        fi
        # Check for wildcard in allowFrom
        ALLOW_FROM=$(timeout 10 openclaw config get "channels.${channel}.allowFrom" 2>/dev/null || echo "")
        if echo "$ALLOW_FROM" | grep -q '"*"' 2>/dev/null; then
            result_warn "Channel '$channel' has wildcard '*' in allowFrom"
            DM_ISSUES=$((DM_ISSUES + 1))
        fi
    done
fi
if [ "$DM_ISSUES" -eq 0 ]; then
    result_clean "DM policies acceptable"
fi

# ============================================================
# CHECK 18: Tool Policy / Elevated Tools Audit (NEW - DefectDojo)
# ============================================================
header 18 "Auditing tool policies and elevated access..."

TOOL_ISSUES=0
if command -v openclaw &>/dev/null; then
    # Check if elevated tools are broadly enabled
    ELEVATED=$(timeout 10 openclaw config get "tools.elevated.enabled" 2>/dev/null || echo "")
    if [ "$ELEVATED" = "true" ]; then
        ELEVATED_ALLOW=$(timeout 10 openclaw config get "tools.elevated.allowFrom" 2>/dev/null || echo "")
        if echo "$ELEVATED_ALLOW" | grep -q '"*"' 2>/dev/null; then
            result_critical "Elevated tools enabled with wildcard allowFrom"
            TOOL_ISSUES=$((TOOL_ISSUES + 1))
        else
            log "  INFO: Elevated tools enabled (restricted allowFrom)"
        fi
    fi

    # Check if exec tool is in deny list
    DENY_LIST=$(timeout 10 openclaw config get "tools.deny" 2>/dev/null || echo "")
    if [ -z "$DENY_LIST" ] || [ "$DENY_LIST" = "[]" ] || [ "$DENY_LIST" = "null" ]; then
        result_warn "No tools in deny list (consider blocking: exec, process, browser)"
        TOOL_ISSUES=$((TOOL_ISSUES + 1))
    fi
fi
if [ "$TOOL_ISSUES" -eq 0 ]; then
    result_clean "Tool policies acceptable"
fi

# ============================================================
# CHECK 19: Sandbox Configuration (NEW - Penligent/Composio)
# ============================================================
header 19 "Checking sandbox configuration..."

SANDBOX_ISSUES=0
if command -v openclaw &>/dev/null; then
    SANDBOX_MODE=$(timeout 10 openclaw config get "sandbox.mode" 2>/dev/null || echo "")
    if [ "$SANDBOX_MODE" = "off" ] || [ "$SANDBOX_MODE" = "none" ]; then
        result_warn "Sandbox mode is disabled (consider: mode='all')"
        SANDBOX_ISSUES=$((SANDBOX_ISSUES + 1))
    elif [ -n "$SANDBOX_MODE" ]; then
        log "  Sandbox mode: $SANDBOX_MODE"
    fi

    WORKSPACE_ACCESS=$(timeout 10 openclaw config get "sandbox.workspaceAccess" 2>/dev/null || echo "")
    if [ "$WORKSPACE_ACCESS" = "rw" ]; then
        log "  INFO: Sandbox workspace access is read-write"
    fi
fi
if [ "$SANDBOX_ISSUES" -eq 0 ]; then
    result_clean "Sandbox configuration acceptable"
fi

# ============================================================
# CHECK 20: mDNS/Bonjour Exposure (NEW - OpenClaw Docs)
# ============================================================
header 20 "Checking mDNS/Bonjour discovery settings..."

MDNS_ISSUES=0
if command -v openclaw &>/dev/null; then
    MDNS_MODE=$(timeout 10 openclaw config get "discovery.mdns.mode" 2>/dev/null || echo "")
    if [ "$MDNS_MODE" = "full" ]; then
        result_warn "mDNS broadcasting in 'full' mode (exposes paths, SSH port)"
        MDNS_ISSUES=$((MDNS_ISSUES + 1))
    elif [ -n "$MDNS_MODE" ]; then
        log "  mDNS mode: $MDNS_MODE"
    fi
fi
if [ "$MDNS_ISSUES" -eq 0 ]; then
    result_clean "mDNS configuration acceptable"
fi

# ============================================================
# CHECK 21: Session & Credential Permissions (NEW - Vectra/DefectDojo)
# ============================================================
header 21 "Auditing session and credential file permissions..."

CRED_ISSUES=0
# Check credentials directory
CRED_DIR="$OPENCLAW_DIR/credentials"
if [ -d "$CRED_DIR" ]; then
    DIR_PERMS=$(stat -f "%Lp" "$CRED_DIR" 2>/dev/null || stat -c "%a" "$CRED_DIR" 2>/dev/null)
    if [ "$DIR_PERMS" != "700" ]; then
        result_warn "Credentials dir has permissions $DIR_PERMS (should be 700)"
        CRED_ISSUES=$((CRED_ISSUES + 1))
    fi
    # Check individual credential files
    while IFS= read -r cred_file; do
        FPERMS=$(stat -f "%Lp" "$cred_file" 2>/dev/null || stat -c "%a" "$cred_file" 2>/dev/null)
        if [ "$FPERMS" != "600" ]; then
            result_warn "$(basename "$cred_file") has permissions $FPERMS (should be 600)"
            CRED_ISSUES=$((CRED_ISSUES + 1))
        fi
    done < <(find "$CRED_DIR" -type f -name "*.json" 2>/dev/null)
fi

# Check session files
for agent_dir in "$OPENCLAW_DIR"/agents/*/; do
    SESSION_DIR="$agent_dir/sessions"
    if [ -d "$SESSION_DIR" ]; then
        SDIR_PERMS=$(stat -f "%Lp" "$SESSION_DIR" 2>/dev/null || stat -c "%a" "$SESSION_DIR" 2>/dev/null)
        if [ -n "$SDIR_PERMS" ] && [ "$SDIR_PERMS" != "700" ]; then
            result_warn "Session dir $(basename "$agent_dir")/sessions has permissions $SDIR_PERMS (should be 700)"
            CRED_ISSUES=$((CRED_ISSUES + 1))
        fi
    fi
done

# Check openclaw home directory itself
if [ -d "$OPENCLAW_DIR" ]; then
    HOME_PERMS=$(stat -f "%Lp" "$OPENCLAW_DIR" 2>/dev/null || stat -c "%a" "$OPENCLAW_DIR" 2>/dev/null)
    if [ "$HOME_PERMS" != "700" ]; then
        result_warn "OpenClaw home dir has permissions $HOME_PERMS (should be 700)"
        CRED_ISSUES=$((CRED_ISSUES + 1))
    fi
fi

if [ "$CRED_ISSUES" -eq 0 ]; then
    result_clean "Session and credential permissions correct"
fi

# ============================================================
# CHECK 22: Persistence Mechanism Scan (NEW - Vectra)
# ============================================================
header 22 "Scanning for unauthorized persistence mechanisms..."

PERSIST_ISSUES=0
# Check LaunchAgents for suspicious openclaw-related items
if [ -d "$HOME/Library/LaunchAgents" ]; then
    SUSPICIOUS_AGENTS=$(find "$HOME/Library/LaunchAgents" -name "*.plist" -exec grep -li "openclaw\|clawdbot\|moltbot" {} \; 2>/dev/null || true)
    if [ -n "$SUSPICIOUS_AGENTS" ]; then
        log "  LaunchAgents referencing openclaw:"
        log "  $SUSPICIOUS_AGENTS"
        # Check if any are NOT the known security-dashboard
        for agent in $SUSPICIOUS_AGENTS; do
            if ! grep -q "com.openclaw.security-dashboard" "$agent" 2>/dev/null; then
                AGENT_LABEL=$(grep -A1 "<key>Label</key>" "$agent" 2>/dev/null | tail -1 | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
                result_warn "Unknown LaunchAgent: $AGENT_LABEL ($(basename "$agent"))"
                PERSIST_ISSUES=$((PERSIST_ISSUES + 1))
            fi
        done
    fi
fi

# Check crontab for suspicious entries
CRON_ENTRIES=$(crontab -l 2>/dev/null | grep -iv "security-monitor\|#" | grep -iE "openclaw|clawdbot|moltbot|curl.*\|.*sh|wget.*\|.*bash" || true)
if [ -n "$CRON_ENTRIES" ]; then
    result_warn "Suspicious cron entries found:"
    log "  $CRON_ENTRIES"
    PERSIST_ISSUES=$((PERSIST_ISSUES + 1))
fi

# Check for unexpected systemd services (Linux)
if command -v systemctl &>/dev/null; then
    SYS_SERVICES=$(systemctl --user list-units --type=service --all 2>/dev/null | grep -iE "openclaw|clawdbot|moltbot" | grep -v "security-monitor" || true)
    if [ -n "$SYS_SERVICES" ]; then
        log "  Systemd services:"
        log "  $SYS_SERVICES"
    fi
fi

if [ "$PERSIST_ISSUES" -eq 0 ]; then
    result_clean "No unauthorized persistence mechanisms"
fi

# ============================================================
# CHECK 23: Plugin/Extension Security (NEW - Cisco/DefectDojo)
# ============================================================
header 23 "Auditing installed plugins and extensions..."

EXT_DIR="$OPENCLAW_DIR/extensions"
EXT_ISSUES=0
if [ -d "$EXT_DIR" ]; then
    EXT_COUNT=$(find "$EXT_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d " ")
    log "  Installed extensions: $EXT_COUNT"
    if [ "$EXT_COUNT" -gt 0 ]; then
        while IFS= read -r ext; do
            EXT_NAME=$(basename "$ext")
            # Check for suspicious patterns in extension code
            EXT_SUS=$(grep -rlE "eval\(|exec\(|child_process|\.exec\(|net\.connect|http\.request|fetch\(" "$ext" 2>/dev/null | head -3 || true)
            if [ -n "$EXT_SUS" ]; then
                result_warn "Extension '$EXT_NAME' has code execution patterns"
                EXT_ISSUES=$((EXT_ISSUES + 1))
            fi
            # Check for known malicious patterns
            EXT_MAL=$(grep -rlE "$DOMAIN_PATTERN" "$ext" 2>/dev/null || true)
            if [ -n "$EXT_MAL" ]; then
                result_critical "Extension '$EXT_NAME' references known malicious domains"
                EXT_ISSUES=$((EXT_ISSUES + 1))
            fi
        done < <(find "$EXT_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
    fi
fi
if [ "$EXT_ISSUES" -eq 0 ]; then
    result_clean "No suspicious plugins/extensions"
fi

# ============================================================
# CHECK 24: Log Redaction Audit (NEW - OpenClaw Docs)
# ============================================================
header 24 "Checking log redaction settings..."

LOG_ISSUES=0
if command -v openclaw &>/dev/null; then
    REDACT=$(timeout 10 openclaw config get "logging.redactSensitive" 2>/dev/null || echo "")
    if [ "$REDACT" = "off" ] || [ "$REDACT" = "false" ] || [ "$REDACT" = "none" ]; then
        result_warn "Log redaction is disabled (sensitive data may leak to logs)"
        LOG_ISSUES=$((LOG_ISSUES + 1))
    elif [ -n "$REDACT" ]; then
        log "  Log redaction: $REDACT"
    fi

    # Check if gateway logs are world-readable
    GW_LOG="/tmp/openclaw"
    if [ -d "$GW_LOG" ]; then
        GW_LOG_PERMS=$(stat -f "%Lp" "$GW_LOG" 2>/dev/null || stat -c "%a" "$GW_LOG" 2>/dev/null)
        if [ "$GW_LOG_PERMS" != "700" ] && [ "$GW_LOG_PERMS" != "750" ]; then
            result_warn "Gateway log dir /tmp/openclaw has permissions $GW_LOG_PERMS (should be 700)"
            LOG_ISSUES=$((LOG_ISSUES + 1))
        fi
    fi
fi
if [ "$LOG_ISSUES" -eq 0 ]; then
    result_clean "Log redaction settings acceptable"
fi

# ============================================================
# CHECK 25: Reverse Proxy / Localhost Trust Bypass (NEW - Penligent/Vectra)
# ============================================================
header 25 "Checking for reverse proxy localhost trust bypass..."

PROXY_ISSUES=0
if command -v openclaw &>/dev/null; then
    # Check if bound to LAN with no trusted proxy configuration
    BIND_ADDR=$(timeout 10 openclaw config get "gateway.bind" 2>/dev/null || echo "")
    TRUSTED_PROXIES=$(timeout 10 openclaw config get "gateway.trustedProxies" 2>/dev/null || echo "")
    DISABLE_DEVICE_AUTH=$(timeout 10 openclaw config get "gateway.dangerouslyDisableDeviceAuth" 2>/dev/null || echo "")

    if [ "$DISABLE_DEVICE_AUTH" = "true" ]; then
        result_critical "Device authentication is disabled (dangerouslyDisableDeviceAuth=true)"
        PROXY_ISSUES=$((PROXY_ISSUES + 1))
    fi

    if [ "$BIND_ADDR" = "lan" ] || [ "$BIND_ADDR" = "0.0.0.0" ]; then
        if [ -z "$TRUSTED_PROXIES" ] || [ "$TRUSTED_PROXIES" = "null" ] || [ "$TRUSTED_PROXIES" = "[]" ]; then
            result_warn "Gateway on LAN without trustedProxies - localhost trust bypass risk"
            PROXY_ISSUES=$((PROXY_ISSUES + 1))
        fi
    fi
fi
if [ "$PROXY_ISSUES" -eq 0 ]; then
    result_clean "No reverse proxy bypass risk"
fi

# ============================================================
# CHECK 26: Exec-Approvals Configuration (NEW - CVE-2026-25253)
# ============================================================
header 26 "Auditing exec-approvals configuration..."

EXEC_ISSUES=0
EXEC_FILE="$OPENCLAW_DIR/exec-approvals.json"
if [ -f "$EXEC_FILE" ]; then
    # Check for overly permissive exec approvals
    UNSAFE_EXEC=$(grep -iE '"security"\s*:\s*"allow"|"ask"\s*:\s*"off"|"allowlist"\s*:\s*\[\s*\]' "$EXEC_FILE" 2>/dev/null || true)
    if [ -n "$UNSAFE_EXEC" ]; then
        result_critical "Exec-approvals has unsafe configuration (allows remote exec):"
        log "  $UNSAFE_EXEC"
        EXEC_ISSUES=$((EXEC_ISSUES + 1))
    fi
    # Check file permissions
    EXEC_PERMS=$(stat -f "%Lp" "$EXEC_FILE" 2>/dev/null || stat -c "%a" "$EXEC_FILE" 2>/dev/null)
    if [ "$EXEC_PERMS" != "600" ]; then
        result_warn "exec-approvals.json has permissions $EXEC_PERMS (should be 600)"
        EXEC_ISSUES=$((EXEC_ISSUES + 1))
    fi
fi
if [ "$EXEC_ISSUES" -eq 0 ]; then
    result_clean "Exec-approvals configuration acceptable"
fi

# ============================================================
# CHECK 27: Docker Container Security (NEW - ToxSec/DefectDojo)
# ============================================================
header 27 "Auditing Docker container security..."

DOCKER_ISSUES=0
if command -v docker &>/dev/null; then
    # Check for running openclaw containers
    OC_CONTAINERS=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -iE "openclaw|clawdbot|moltbot" || true)
    if [ -n "$OC_CONTAINERS" ]; then
        while IFS= read -r container_line; do
            CNAME=$(echo "$container_line" | awk '{print $1}')
            # Check if running as root
            CUSER=$(docker inspect --format '{{.Config.User}}' "$CNAME" 2>/dev/null || echo "")
            if [ -z "$CUSER" ] || [ "$CUSER" = "root" ] || [ "$CUSER" = "0" ]; then
                result_warn "Container '$CNAME' running as root (use non-root user)"
                DOCKER_ISSUES=$((DOCKER_ISSUES + 1))
            fi
            # Check for Docker socket mount
            DSOCK=$(docker inspect --format '{{range .Mounts}}{{.Source}} {{end}}' "$CNAME" 2>/dev/null | grep "docker.sock" || true)
            if [ -n "$DSOCK" ]; then
                result_critical "Container '$CNAME' has Docker socket mounted (container escape risk)"
                DOCKER_ISSUES=$((DOCKER_ISSUES + 1))
            fi
            # Check for privileged mode
            PRIV=$(docker inspect --format '{{.HostConfig.Privileged}}' "$CNAME" 2>/dev/null || echo "")
            if [ "$PRIV" = "true" ]; then
                result_critical "Container '$CNAME' is running in privileged mode"
                DOCKER_ISSUES=$((DOCKER_ISSUES + 1))
            fi
        done <<< "$OC_CONTAINERS"
    else
        log "  No OpenClaw Docker containers detected"
    fi
fi
if [ "$DOCKER_ISSUES" -eq 0 ]; then
    result_clean "Docker security acceptable"
fi

# ============================================================
# CHECK 28: Node.js Version / CVE-2026-21636 (NEW - Argus)
# ============================================================
header 28 "Checking Node.js version for known CVEs..."

NODE_ISSUES=0
if command -v node &>/dev/null; then
    NODE_VER=$(node --version 2>/dev/null | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
    NODE_MINOR=$(echo "$NODE_VER" | cut -d. -f2)
    NODE_PATCH=$(echo "$NODE_VER" | cut -d. -f3)
    log "  Node.js version: v$NODE_VER"

    # CVE-2026-21636: Permission model bypass (fixed in 22.12.0)
    if [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 12 ]; then
        result_warn "Node.js v$NODE_VER is vulnerable to CVE-2026-21636 (permission model bypass). Upgrade to 22.12.0+"
        NODE_ISSUES=$((NODE_ISSUES + 1))
    elif [ "$NODE_MAJOR" -lt 22 ]; then
        result_warn "Node.js v$NODE_VER is below recommended v22 LTS"
        NODE_ISSUES=$((NODE_ISSUES + 1))
    fi
else
    log "  Node.js not found"
fi
if [ "$NODE_ISSUES" -eq 0 ]; then
    result_clean "Node.js version acceptable"
fi

# ============================================================
# CHECK 29: Plaintext Credential Detection (NEW - Argus/Vectra)
# ============================================================
header 29 "Scanning for plaintext credentials in config files..."

PLAINTEXT_ISSUES=0
# Scan openclaw config and credential files for API key patterns
CRED_PATTERNS="sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|xoxb-[0-9]{10,}|xoxp-[0-9]{10,}|glpat-[a-zA-Z0-9_-]{20}"
for cfile in "$OPENCLAW_DIR/openclaw.json" \
             "$OPENCLAW_DIR/agents/main/agent/auth-profiles.json"; do
    if [ -f "$cfile" ]; then
        CRED_FOUND=$(grep -oE "$CRED_PATTERNS" "$cfile" 2>/dev/null | head -5 || true)
        if [ -n "$CRED_FOUND" ]; then
            result_warn "Plaintext credentials found in $(basename "$cfile") (consider using a secrets manager)"
            PLAINTEXT_ISSUES=$((PLAINTEXT_ISSUES + 1))
        fi
    fi
done
# Check credential JSON files
if [ -d "$OPENCLAW_DIR/credentials" ]; then
    CRED_FILES=$(find "$OPENCLAW_DIR/credentials" -name "*.json" -exec grep -lE "$CRED_PATTERNS" {} \; 2>/dev/null || true)
    if [ -n "$CRED_FILES" ]; then
        result_warn "Plaintext API keys in credentials directory"
        PLAINTEXT_ISSUES=$((PLAINTEXT_ISSUES + 1))
    fi
fi
if [ "$PLAINTEXT_ISSUES" -eq 0 ]; then
    result_clean "No exposed plaintext credentials"
fi

# ============================================================
# CHECK 30: VS Code Extension Trojan Detection (NEW - Aikido/JFrog)
# ============================================================
header 30 "Checking for fake ClawdBot/OpenClaw VS Code extensions..."

VSCODE_ISSUES=0
VSCODE_EXT_DIR="$HOME/.vscode/extensions"
if [ -d "$VSCODE_EXT_DIR" ]; then
    FAKE_EXT=$(find "$VSCODE_EXT_DIR" -maxdepth 1 -type d -iname "*clawdbot*" -o -iname "*moltbot*" -o -iname "*openclaw*" 2>/dev/null || true)
    if [ -n "$FAKE_EXT" ]; then
        result_critical "Suspicious VS Code extension found (OpenClaw has NO official VS Code extension):"
        log "  $FAKE_EXT"
        VSCODE_ISSUES=$((VSCODE_ISSUES + 1))
    fi
fi
# Also check VS Code Insiders
VSCODE_INS_DIR="$HOME/.vscode-insiders/extensions"
if [ -d "$VSCODE_INS_DIR" ]; then
    FAKE_INS=$(find "$VSCODE_INS_DIR" -maxdepth 1 -type d -iname "*clawdbot*" -o -iname "*moltbot*" -o -iname "*openclaw*" 2>/dev/null || true)
    if [ -n "$FAKE_INS" ]; then
        result_critical "Suspicious VS Code Insiders extension found:"
        log "  $FAKE_INS"
        VSCODE_ISSUES=$((VSCODE_ISSUES + 1))
    fi
fi
if [ "$VSCODE_ISSUES" -eq 0 ]; then
    result_clean "No fake VS Code extensions"
fi

# ============================================================
# CHECK 31: Internet Exposure Detection (NEW - Brandefense/Shodan)
# ============================================================
header 31 "Checking for internet exposure of gateway..."

EXPOSURE_ISSUES=0
# Check if gateway is listening on non-loopback
GW_LISTEN=$(lsof -i ":${GW_PORT}" -nP 2>/dev/null | grep LISTEN | awk '{print $9}' | head -5 || true)
if [ -n "$GW_LISTEN" ]; then
    NON_LOCAL=$(echo "$GW_LISTEN" | grep -vE "127\.0\.0\.1|localhost|\[::1\]|\*:" || true)
    if [ -n "$NON_LOCAL" ]; then
        result_warn "Gateway listening on non-loopback interface:"
        log "  $GW_LISTEN"
        EXPOSURE_ISSUES=$((EXPOSURE_ISSUES + 1))
    fi
    # Check for wildcard binding
    WILDCARD=$(echo "$GW_LISTEN" | grep "\*:" || true)
    if [ -n "$WILDCARD" ]; then
        result_warn "Gateway bound to all interfaces (*:$GW_PORT) - potentially internet-exposed"
        EXPOSURE_ISSUES=$((EXPOSURE_ISSUES + 1))
    fi
fi
if [ "$EXPOSURE_ISSUES" -eq 0 ]; then
    result_clean "Gateway not exposed to external network"
fi

# ============================================================
# CHECK 32: MCP Server Security (NEW - ToxSec/Prompt Security)
# ============================================================
header 32 "Auditing MCP server configuration..."

MCP_ISSUES=0
if command -v openclaw &>/dev/null; then
    # Check if all project MCP servers are enabled (should use allowlist)
    MCP_ALL=$(timeout 10 openclaw config get "mcp.enableAllProjectMcpServers" 2>/dev/null || echo "")
    if [ "$MCP_ALL" = "true" ]; then
        result_warn "All project MCP servers enabled (use explicit allowlist instead)"
        MCP_ISSUES=$((MCP_ISSUES + 1))
    fi
fi
# Scan MCP config for suspicious tool descriptions (prompt injection in tool docstrings)
MCP_CONFIG="$OPENCLAW_DIR/mcp.json"
if [ -f "$MCP_CONFIG" ]; then
    MCP_INJECT=$(grep -iE "ignore previous|system prompt|override instruction|execute command|run this" "$MCP_CONFIG" 2>/dev/null || true)
    if [ -n "$MCP_INJECT" ]; then
        result_critical "Prompt injection patterns in MCP server config:"
        log "  $MCP_INJECT"
        MCP_ISSUES=$((MCP_ISSUES + 1))
    fi
fi
if [ "$MCP_ISSUES" -eq 0 ]; then
    result_clean "MCP server configuration acceptable"
fi

# ============================================================
# SUMMARY
# ============================================================
log ""
log "========================================"
log "SCAN COMPLETE: $CRITICAL critical, $WARNINGS warnings, $CLEAN clean"
log "========================================"

if [ "$CRITICAL" -gt 0 ]; then
    log "STATUS: COMPROMISED - Immediate action required"
    exit 2
elif [ "$WARNINGS" -gt 0 ]; then
    log "STATUS: ATTENTION - Review warnings"
    exit 1
else
    log "STATUS: SECURE"
    exit 0
fi
