#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 32: MCP security configuration"

NEEDS_FIX=0

# Check if openclaw CLI is available
if command -v openclaw &>/dev/null; then
    ENABLE_ALL=$(openclaw config get mcp.enableAllProjectMcpServers 2>/dev/null)

    if [[ "$ENABLE_ALL" == "true" ]]; then
        log "WARNING: mcp.enableAllProjectMcpServers is enabled (security risk)"

        if confirm "Disable enableAllProjectMcpServers for better security?"; then
            if $DRY_RUN; then
                log "[DRY-RUN] Would set mcp.enableAllProjectMcpServers=false"
                ((FIXED++))
            else
                if openclaw config set mcp.enableAllProjectMcpServers false; then
                    log "Successfully disabled enableAllProjectMcpServers"
                    ((FIXED++))
                else
                    log "ERROR: Failed to update mcp.enableAllProjectMcpServers"
                    ((FAILED++))
                fi
            fi
            NEEDS_FIX=1
        else
            log "enableAllProjectMcpServers will remain enabled (security risk)"
            ((FAILED++))
            NEEDS_FIX=1
        fi
    else
        log "mcp.enableAllProjectMcpServers is disabled (secure)"
    fi
else
    log "openclaw CLI not found, skipping config check"
fi

# Check mcp.json for security issues
MCP_CONFIG="$OPENCLAW_DIR/mcp.json"

if [[ ! -f "$MCP_CONFIG" ]]; then
    log "mcp.json not found, skipping config audit"
    if [[ $NEEDS_FIX -eq 0 ]]; then
        finish
    else
        finish
    fi
fi

log "Auditing $MCP_CONFIG for security issues..."

ISSUES_FOUND=0

# Check for overly permissive server configurations
if grep -qi '"allowAllCommands".*true' "$MCP_CONFIG" 2>/dev/null; then
    log "WARNING: Found allowAllCommands=true (allows unrestricted command execution)"
    ((ISSUES_FOUND++))
fi

if grep -qi '"allowShellExec".*true' "$MCP_CONFIG" 2>/dev/null; then
    log "WARNING: Found allowShellExec=true (allows shell execution)"
    ((ISSUES_FOUND++))
fi

# Check for prompt injection patterns
PROMPT_INJECTION_PATTERNS=(
    "ignore previous instructions"
    "disregard.*rules"
    "system.*prompt.*override"
    "execute.*command"
    "run.*shell"
    "__proto__"
    "constructor.*prototype"
)

for PATTERN in "${PROMPT_INJECTION_PATTERNS[@]}"; do
    if grep -qi "$PATTERN" "$MCP_CONFIG" 2>/dev/null; then
        log "WARNING: Potential prompt injection pattern found: $PATTERN"
        ((ISSUES_FOUND++))
    fi
done

# Check for unsafe server sources
if grep -qE '"(source|url)".*"http://' "$MCP_CONFIG" 2>/dev/null; then
    log "WARNING: Found HTTP (non-HTTPS) server source (insecure transport)"
    ((ISSUES_FOUND++))
fi

# Check for wildcard permissions
if grep -qE '"permissions".*"\*"' "$MCP_CONFIG" 2>/dev/null; then
    log "WARNING: Found wildcard permissions (overly permissive)"
    ((ISSUES_FOUND++))
fi

# Check for untrusted server sources
if grep -qE '"source".*"(http://|ftp://|file:///)' "$MCP_CONFIG" 2>/dev/null; then
    log "WARNING: Found potentially untrusted server source protocol"
    ((ISSUES_FOUND++))
fi

# Check file permissions
CURRENT_PERMS=$(stat -f "%OLp" "$MCP_CONFIG" 2>/dev/null || stat -c "%a" "$MCP_CONFIG" 2>/dev/null)
if [[ "$CURRENT_PERMS" != "600" && "$CURRENT_PERMS" != "400" ]]; then
    log "WARNING: mcp.json has overly permissive permissions ($CURRENT_PERMS)"
    if fix_perms "$MCP_CONFIG" 600 "Restrict mcp.json to owner-only"; then
        ((FIXED++))
        NEEDS_FIX=1
    fi
fi

if [[ $ISSUES_FOUND -gt 0 ]]; then
    guidance "MCP Security Configuration Issues" \
        "Found $ISSUES_FOUND security issue(s) in mcp.json configuration." \
        "" \
        "IDENTIFIED ISSUES:" \
        "- Review mcp.json for the warnings logged above" \
        "" \
        "RECOMMENDED SECURE MCP CONFIGURATION:" \
        "" \
        "{" \
        "  \"mcpServers\": {" \
        "    \"trusted-server\": {" \
        "      \"source\": \"https://trusted-registry.openclaw.ai/server.json\"," \
        "      \"enabled\": true," \
        "      \"permissions\": {" \
        "        \"allowedCommands\": [\"specific-command-1\", \"specific-command-2\"]," \
        "        \"allowShellExec\": false," \
        "        \"allowFileSystem\": \"read-only\"," \
        "        \"allowNetwork\": [\"api.example.com\"]" \
        "      }," \
        "      \"sandbox\": true," \
        "      \"timeout\": 30000" \
        "    }" \
        "  }," \
        "  \"enableAllProjectMcpServers\": false," \
        "  \"defaultPermissions\": {" \
        "    \"allowShellExec\": false," \
        "    \"allowFileSystem\": false," \
        "    \"requireApproval\": true" \
        "  }" \
        "}" \
        "" \
        "SECURITY BEST PRACTICES:" \
        "1. Only enable MCP servers from trusted sources" \
        "2. Use HTTPS for server sources (never HTTP)" \
        "3. Grant minimal required permissions (principle of least privilege)" \
        "4. Set allowShellExec to false unless absolutely necessary" \
        "5. Use allowedCommands whitelist instead of wildcard permissions" \
        "6. Enable sandbox mode for untrusted servers" \
        "7. Set reasonable timeout values" \
        "8. Regularly audit enabled servers" \
        "9. Keep mcp.json file permissions at 600" \
        "10. Never include credentials in mcp.json (use env vars)" \
        "" \
        "PROMPT INJECTION PROTECTION:" \
        "- Avoid dynamic prompt construction from untrusted input" \
        "- Validate and sanitize all server responses" \
        "- Use structured outputs instead of free-form text" \
        "- Implement rate limiting on MCP server calls" \
        "" \
        "MANUAL REVIEW REQUIRED:" \
        "Edit $MCP_CONFIG and apply secure configuration" \
        "" \
        "Backup before editing: cp $MCP_CONFIG ${MCP_CONFIG}.bak" \
        "" \
        "Reference: https://docs.openclaw.ai/security/mcp-security"
    ((FAILED++))
    NEEDS_FIX=1
else
    if [[ $NEEDS_FIX -eq 0 ]]; then
        log "MCP configuration is secure"
    fi
fi

finish
