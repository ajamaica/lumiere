#!/bin/bash
# ClawDefender
# Comprehensive AI agent security: scanning, validation, protection
#
# Usage:
#   clawdefender --audit                    Full security audit
#   clawdefender --scan-skill <name>        Scan specific skill
#   clawdefender --check-prompt             Check stdin for prompt injection
#   clawdefender --check-command <cmd>      Validate shell command
#   clawdefender --check-url <url>          Validate URL (SSRF check)
#   clawdefender --validate <input>         Full input validation
#   clawdefender --install <skill>          Safe skill installation
#   clawdefender --whitelist <action>       Manage whitelist

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="/home/clawdbot/clawd"
SKILLS_DIR="$WORKSPACE/skills"
SECURITY_DIR="$WORKSPACE/security"
LOG_FILE="$WORKSPACE/memory/security-scans.md"
WHITELIST_FILE="$SECURITY_DIR/whitelist.json"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

# Severity scores
SCORE_CRITICAL=90
SCORE_HIGH=70
SCORE_WARNING=40
SCORE_INFO=20

# ============================================
# DETECTION PATTERNS
# ============================================

# Prompt injection patterns (Critical)
PROMPT_INJECTION_CRITICAL=(
    'show.*your.*api.?key'
    'send.*api.?key'
    'read.*config.*key'
    'what.*your.*api.?key'
    'tell me.*password'
    'show.*password'
    'read.*[.]env'
    'contents of.*[.]env'
    'show.*secret'
    'send.*credentials'
    'what.*credentials'
    'dump.*credential'
    'paste.*[.]env'
    '[.]env.*content'
    'what.*openclaw'
    'what.*.openclaw'
    'what.*.clawdbot'
    'what.*clawdbot'
    'show.*clawdbot'
    'send.*clawdbot'
    'read.*clawdbot'
    'read.*.clawdbot'
    'show.*openclaw'
    'read.*openclaw'
    'read.*.openclaw'
    'list.*credentials'
    'dump.*credentials'
    'send.*[.]env'
    'paste.*[.]env'
    'contents.*[.]env'
    'show.*[.]env'
    'what.*in.*config'
    'ignore previous instructions'
    'ignore all previous'
    'ignore your instructions'
    'disregard above'
    'disregard.*instructions'
    'disregard.*prompt'
    'disregard previous'
    'forget.*instructions'
    'forget everything'
    'forget your instructions'
    'forget everything above'
    'override your instructions'
    'new system prompt'
    'reset to default'
    'new instructions'
    'you are no longer'
    'disable.*safety'
    'disable.*filter'
    'no restrictions'
    'without.*restrictions'
    'remove.*restrictions'
    'without.*guidelines'
    'no.*ethical'
    'reveal.*system prompt'
    'show.*system prompt'
    'print.*system prompt'
    'what.*instructions.*given'
    'what.*your instructions'
    'print.*conversation'
    'show.*conversation history'
    'export.*history'
    'export all.*data'
    'export.*user.*data'
)

# Prompt injection patterns (Warning)
PROMPT_INJECTION_WARNING=(
    'you are now'
    'your new role'
    'pretend to be'
    'act as if'
    'roleplay as'
    'hypothetically'
    'for educational purposes'
    'SYSTEM:'
    '\[INST\]'
    '<<SYS>>'
    'jailbreak'
    'DAN mode'
    'pretend.*DAN'
    "you're DAN"
    'for academic'
    'in a fictional'
    'in a hypothetical'
    'imagine a world'
    'translate.*then execute'
    'translate.*then run'
    'base64.*decode'
    'rot13'
    'developer mode'
    '---END'
    'END OF SYSTEM'
    'END OF PROMPT'
    '<|endoftext|>'
    '###.*SYSTEM'
    'BEGIN NEW INSTRUCTIONS'
    'STOP IGNORE'
)

# Command injection patterns
COMMAND_INJECTION=(
    'rm -rf /'
    'rm -rf \*'
    'chmod 777'
    'mkfs\.'
    'dd if=/dev'
    ':\(\)\{ :\|:& \};:'
    'nc -e'
    'ncat -e'
    'bash -i >& /dev/tcp'
    '/dev/tcp/'
    '/dev/udp/'
    '\| bash'
    '\| sh'
    'curl.*\| bash'
    'wget.*\| sh'
    'base64 -d \| bash'
    'base64 --decode \| sh'
    'eval.*\$\('
    'python -c.*exec'
)

# Credential exfiltration patterns
CREDENTIAL_EXFIL=(
    'webhook\.site'
    'requestbin\.com'
    'requestbin\.net'
    'pipedream\.net'
    'hookbin\.com'
    'beeceptor\.com'
    'ngrok\.io'
    'curl.*-d.*[.]env'
    'curl.*--data.*[.]env'
    'cat.*[.]env.*curl'
    'POST.*webhook.site.*API_KEY'
    'POST.*webhook.site.*SECRET'
    'POST.*webhook.site.*TOKEN'
)

# SSRF / URL patterns
SSRF_PATTERNS=(
    'localhost'
    '127\.0\.0\.1'
    '0\.0\.0\.0'
    '10\.\d+\.\d+\.\d+'
    '172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+'
    '192\.168\.\d+\.\d+'
    '169\.254\.169\.254'
    'metadata\.google'
    '\[::1\]'
)

# Path traversal patterns
PATH_TRAVERSAL=(
    '.config/openclaw'
    '.openclaw'
    'the .openclaw'
    '.openclaw directory'
    '.openclaw folder'
    'openclaw.json'
    '.config/gog'
    'cat.*[.]env'
    'read.*[.]env'
    'show.*[.]env'
    '/.env'
    'config.yaml'
    'config.json'
    '.ssh/id_'
    '.gnupg'
    '\.\./\.\./\.\.'
    '/etc/passwd'
    '/etc/shadow'
    '/root/'
    '~/.ssh/'
    '~/.aws/'
    '~/.gnupg/'
    '%2e%2e%2f'
    '\.\.%2f'
    '%2e%2e/'
)

# Sensitive file patterns
SENSITIVE_FILES=(
    '[.]env'
    'id_rsa'
    '\.pem'
    'secret'
    'password'
    'api.key'
    'token'
)

# Allowed domains (won't trigger SSRF)
ALLOWED_DOMAINS=(
    'github.com'
    'api.github.com'
    'api.openai.com'
    'api.anthropic.com'
    'googleapis.com'
    'google.com'
    'npmjs.org'
    'pypi.org'
    'wttr.in'
    'signalwire.com'
    'usetrmnl.com'
)

# ============================================
# HELPER FUNCTIONS
# ============================================

log_finding() {
    local severity="$1"
    local module="$2"
    local message="$3"
    local score="$4"
    
    case "$severity" in
        critical)
            echo -e "${RED}🔴 CRITICAL [$module]:${NC} $message (score: $score)"
            ;;
        high)
            echo -e "${ORANGE}🟠 HIGH [$module]:${NC} $message (score: $score)"
            ;;
        warning)
            echo -e "${YELLOW}🟡 WARNING [$module]:${NC} $message (score: $score)"
            ;;
        info)
            echo -e "${BLUE}ℹ️  INFO [$module]:${NC} $message"
            ;;
    esac
}

check_patterns() {
    local input="$1"
    local -n patterns=$2
    local module="$3"
    local base_score="$4"
    
    local found=0
    for pattern in "${patterns[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            local match=$(echo "$input" | grep -oiE "$pattern" | head -1)
            echo "$module|$pattern|$match|$base_score"
            found=1
        fi
    done
    return $found
}

is_allowed_domain() {
    local url="$1"
    for domain in "${ALLOWED_DOMAINS[@]}"; do
        if echo "$url" | grep -qi "$domain"; then
            return 0
        fi
    done
    return 1
}

# ============================================
# VALIDATION MODULES
# ============================================

validate_prompt_injection() {
    local input="$1"
    local findings=""
    local max_score=0
    
    # Check critical patterns
    for pattern in "${PROMPT_INJECTION_CRITICAL[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            findings+="prompt_injection|$pattern|critical|$SCORE_CRITICAL\n"
            max_score=$SCORE_CRITICAL
        fi
    done
    
    # Check warning patterns
    for pattern in "${PROMPT_INJECTION_WARNING[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            findings+="prompt_injection|$pattern|warning|$SCORE_WARNING\n"
            [ $SCORE_WARNING -gt $max_score ] && max_score=$SCORE_WARNING
        fi
    done
    
    echo -e "$findings"
    return $max_score
}

validate_command_injection() {
    local input="$1"
    local findings=""
    local max_score=0
    
    for pattern in "${COMMAND_INJECTION[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            findings+="command_injection|$pattern|critical|$SCORE_CRITICAL\n"
            max_score=$SCORE_CRITICAL
        fi
    done
    
    echo -e "$findings"
    return $max_score
}

validate_credential_exfil() {
    local input="$1"
    local findings=""
    local max_score=0
    
    for pattern in "${CREDENTIAL_EXFIL[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            findings+="credential_exfil|$pattern|critical|$SCORE_CRITICAL\n"
            max_score=$SCORE_CRITICAL
        fi
    done
    
    echo -e "$findings"
    return $max_score
}

validate_url() {
    local url="$1"
    local findings=""
    local max_score=0
    
    # Check if allowed domain
    if is_allowed_domain "$url"; then
        echo ""
        return 0
    fi
    
    # Check SSRF patterns
    for pattern in "${SSRF_PATTERNS[@]}"; do
        if echo "$url" | grep -qiE -- "$pattern"; then
            findings+="ssrf|$pattern|critical|$SCORE_CRITICAL\n"
            max_score=$SCORE_CRITICAL
        fi
    done
    
    echo -e "$findings"
    return $max_score
}

validate_path_traversal() {
    local input="$1"
    local findings=""
    local max_score=0
    
    for pattern in "${PATH_TRAVERSAL[@]}"; do
        if echo "$input" | grep -qiE -- "$pattern"; then
            findings+="path_traversal|$pattern|high|$SCORE_HIGH\n"
            max_score=$SCORE_HIGH
        fi
    done
    
    echo -e "$findings"
    return $max_score
}

# ============================================
# MAIN VALIDATION
# ============================================

validate_input() {
    local input="$1"
    local json_output="$2"
    local all_findings=""
    local max_score=0
    local action="allow"
    
    # Run all validation modules
    findings=$(validate_prompt_injection "$input")
    all_findings+="$findings"$'
'
    
    findings=$(validate_command_injection "$input")
    all_findings+="$findings"$'
'
    
    findings=$(validate_credential_exfil "$input")
    all_findings+="$findings"$'
'
    
    findings=$(validate_path_traversal "$input")
    all_findings+="$findings"$'
'
    
    # Calculate max score from findings
    while IFS='|' read -r module pattern severity score; do
        [ -z "$module" ] && continue
        [ "$score" -gt "$max_score" ] && max_score=$score
    done <<< "$all_findings"
    
    # Determine action based on score
    if [ $max_score -ge $SCORE_CRITICAL ]; then
        action="block"
        severity="critical"
    elif [ $max_score -ge $SCORE_HIGH ]; then
        action="block"
        severity="high"
    elif [ $max_score -ge $SCORE_WARNING ]; then
        action="warn"
        severity="warning"
    else
        action="allow"
        severity="clean"
    fi
    
    if [ "$json_output" = "true" ]; then
        # JSON output for automation
        echo "{"
        echo "  \"clean\": $([ "$action" = "allow" ] && echo "true" || echo "false"),"
        echo "  \"severity\": \"$severity\","
        echo "  \"score\": $max_score,"
        echo "  \"action\": \"$action\""
        echo "}"
    else
        # Human-readable output
        if [ "$action" = "allow" ]; then
            echo -e "${GREEN}✅ Clean - No threats detected${NC}"
        else
            echo -e "\n=== Security Scan Results ==="
            while IFS='|' read -r module pattern severity score; do
                [ -z "$module" ] && continue
                log_finding "$severity" "$module" "Pattern: $pattern" "$score"
            done <<< "$all_findings"
            echo ""
            echo -e "Max Score: $max_score"
            echo -e "Action: $action"
        fi
    fi
    
    [ "$action" = "allow" ] && return 0 || return 1
}

# ============================================
# SKILL SCANNING
# ============================================

scan_skill_files() {
    local skill_path="$1"
    local skill_name=$(basename "$skill_path")
    local findings_count=0
    
    echo -e "${BLUE}Scanning skill:${NC} $skill_name"
    
    # Find relevant files (skip node_modules, etc)
    while IFS= read -r -d '' file; do
        # Skip excluded paths
        [[ "$file" == *"node_modules"* ]] && continue
        [[ "$file" == *".git"* ]] && continue
        [[ "$file" == *".min.js"* ]] && continue
        
        local content=$(cat "$file" 2>/dev/null || echo "")
        local basename=$(basename "$file")
        
        # Run validation on file content
        local result=$(validate_input "$content" "false" 2>&1)
        if echo "$result" | grep -qE "CRITICAL|HIGH|WARNING"; then
            echo -e "  ${YELLOW}→${NC} $basename"
            echo "$result" | grep -E "CRITICAL|HIGH|WARNING" | sed 's/^/    /'
            ((findings_count++))
        fi
    done < <(find "$skill_path" -type f \( -name "*.md" -o -name "*.sh" -o -name "*.js" -o -name "*.py" -o -name "*.ts" \) -print0 2>/dev/null)
    
    if [ $findings_count -eq 0 ]; then
        echo -e "  ${GREEN}✓ Clean${NC}"
    fi
    
    return $findings_count
}

full_audit() {
    echo -e "${BLUE}=== ClawDefender - Full Audit ===${NC}"
    echo "Started: $(date)"
    echo ""
    
    local total_findings=0
    
    # Scan all skills
    echo -e "${BLUE}[1/3] Scanning installed skills...${NC}"
    for skill_dir in "$SKILLS_DIR"/*/; do
        [ -d "$skill_dir" ] || continue
        local skill_name=$(basename "$skill_dir")
        
        # Skip security scanner itself
        [[ "$skill_name" == "security-scanner" ]] && continue
        [[ "$skill_name" == "clawdefender" ]] && continue
        [[ "$skill_name" == "proactive-agent" ]] && continue
        
        scan_skill_files "$skill_dir"
        total_findings=$((total_findings + $?))
    done
    
    # Scan scripts
    echo ""
    echo -e "${BLUE}[2/3] Scanning scripts...${NC}"
    for script in "$WORKSPACE/scripts"/*.sh; do
        [ -f "$script" ] || continue
        local basename=$(basename "$script")
        [[ "$basename" == "clawdefender.sh" ]] && continue
        [[ "$basename" == "security-scan.sh" ]] && continue
        
        local content=$(cat "$script" 2>/dev/null || echo "")
        local result=$(validate_input "$content" "false" 2>&1)
        if echo "$result" | grep -qE "CRITICAL|HIGH|WARNING"; then
            echo -e "  ${YELLOW}→${NC} $basename"
            echo "$result" | grep -E "CRITICAL|HIGH|WARNING" | sed 's/^/    /'
            ((total_findings++))
        fi
    done
    [ $total_findings -eq 0 ] && echo -e "  ${GREEN}✓ All scripts clean${NC}"
    
    # System checks
    echo ""
    echo -e "${BLUE}[3/3] System checks...${NC}"
    
    # Check .env permissions
    if [ -f "$WORKSPACE/.env" ]; then
        local perms=$(stat -c %a "$WORKSPACE/.env" 2>/dev/null || echo "unknown")
        if [ "$perms" != "600" ] && [ "$perms" != "unknown" ]; then
            echo -e "  ${YELLOW}⚠${NC} .env has loose permissions ($perms, should be 600)"
        else
            echo -e "  ${GREEN}✓${NC} .env permissions OK"
        fi
    fi
    
    # Summary
    echo ""
    echo "=== Summary ==="
    if [ $total_findings -eq 0 ]; then
        echo -e "${GREEN}✅ All clear - No issues found${NC}"
    else
        echo -e "${YELLOW}⚠️ Found $total_findings file(s) with potential issues${NC}"
    fi
    
    # Log to file
    echo "" >> "$LOG_FILE"
    echo "### $(date '+%Y-%m-%d %H:%M') - Security Audit" >> "$LOG_FILE"
    echo "- Findings: $total_findings" >> "$LOG_FILE"
    [ $total_findings -eq 0 ] && echo "- Status: ✅ Clean" >> "$LOG_FILE" || echo "- Status: ⚠️ Review needed" >> "$LOG_FILE"
    
    return $total_findings
}

safe_install() {
    local skill_name="$1"
    
    echo -e "${BLUE}=== Safe Skill Installation ===${NC}"
    echo "Skill: $skill_name"
    echo ""
    
    # Install
    echo -e "${BLUE}[1/2] Installing from ClawHub...${NC}"
    cd "$WORKSPACE"
    if ! npx clawhub install "$skill_name" --no-input 2>&1; then
        echo -e "${RED}✗${NC} Installation failed"
        return 1
    fi
    echo -e "${GREEN}✓${NC} Installed"
    
    # Scan
    echo ""
    echo -e "${BLUE}[2/2] Security scan...${NC}"
    local installed_path="$SKILLS_DIR/$skill_name"
    
    if [ -d "$installed_path" ]; then
        scan_skill_files "$installed_path"
        local findings=$?
        
        if [ $findings -gt 0 ]; then
            echo ""
            echo -e "${YELLOW}⚠️ Security issues detected!${NC}"
            read -p "Keep this skill? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                rm -rf "$installed_path"
                echo -e "${GREEN}✓${NC} Skill removed"
                return 1
            fi
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Installation complete${NC}"
    echo "Documentation: skills/$skill_name/SKILL.md"
}

# ============================================
# MAIN
# ============================================

case "$1" in
    --audit)
        full_audit
        ;;
    --scan-skill)
        [ -z "$2" ] && { echo "Usage: $0 --scan-skill <skill-name>"; exit 1; }
        scan_skill_files "$SKILLS_DIR/$2"
        ;;
    --check-prompt)
        input=$(cat)
        validate_input "$input" "${2:-false}"
        ;;
    --check-command)
        [ -z "$2" ] && { echo "Usage: $0 --check-command <command>"; exit 1; }
        validate_input "$2" "${3:-false}"
        ;;
    --check-url)
        [ -z "$2" ] && { echo "Usage: $0 --check-url <url>"; exit 1; }
        findings=$(validate_url "$2")
        if [ -z "$findings" ]; then
            echo -e "${GREEN}✅ URL is safe${NC}"
        else
            echo -e "${RED}🔴 SSRF/dangerous URL detected${NC}"
            echo "$findings"
            exit 1
        fi
        ;;
    --validate)
        [ -z "$2" ] && { echo "Usage: $0 --validate <input>"; exit 1; }
        validate_input "$2" "${3:-false}"
        ;;
    --install)
        [ -z "$2" ] && { echo "Usage: $0 --install <skill-name>"; exit 1; }
        safe_install "$2"
        ;;
    --whitelist)
        case "$2" in
            list)
                cat "$WHITELIST_FILE" 2>/dev/null | jq '.' || echo "{}"
                ;;
            add)
                [ -z "$3" ] && { echo "Usage: $0 --whitelist add <pattern> [reason]"; exit 1; }
                echo "Adding $3 to whitelist..."
                # TODO: Implement JSON update
                echo "Not yet implemented"
                ;;
            *)
                echo "Usage: $0 --whitelist [list|add|remove]"
                ;;
        esac
        ;;
    --version)
        echo "ClawDefender v1.0.0"
        echo "Patterns: $(date -r "$0" '+%Y-%m-%d')"
        ;;
    --help|-h)
        echo "ClawDefender - Comprehensive AI Agent Protection"
        echo ""
        echo "Usage:"
        echo "  $0 --audit                    Full security audit"
        echo "  $0 --scan-skill <name>        Scan specific skill"
        echo "  $0 --check-prompt             Check stdin for injection"
        echo "  $0 --check-command <cmd>      Validate shell command"
        echo "  $0 --check-url <url>          Validate URL (SSRF)"
        echo "  $0 --validate <input>         Full input validation"
        echo "  $0 --install <skill>          Safe skill install"
        echo "  $0 --whitelist <action>       Manage whitelist"
        echo "  $0 --version                  Show version"
        echo ""
        ;;
    *)
        echo "Usage: $0 --help"
        exit 1
        ;;
esac

exit 0
