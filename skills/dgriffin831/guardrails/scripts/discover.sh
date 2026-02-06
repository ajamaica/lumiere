#!/usr/bin/env bash
set -euo pipefail

# discover.sh - Scan workspace environment for guardrails setup
# Outputs JSON to stdout, progress to stderr

WORKSPACE="${WORKSPACE:-/home/ubuntu/.openclaw/workspace}"
OPENCLAW_CONFIG="${HOME}/.openclaw/openclaw.json"

>&2 echo "🔍 Discovering workspace environment..."

# Helper: safely read first N lines of a file
read_first_lines() {
    local file="$1"
    local lines="${2:-20}"
    if [[ -f "$file" ]]; then
        head -n "$lines" "$file" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Helper: check if command exists
has_command() {
    command -v "$1" &>/dev/null
}

# Discover skills
discover_skills() {
    local skills_json="[]"
    
    if [[ -d "$WORKSPACE/skills" ]]; then
        >&2 echo "  📦 Scanning skills..."
        
        for skill_dir in "$WORKSPACE/skills"/*; do
            if [[ -d "$skill_dir" ]]; then
                local skill_name=$(basename "$skill_dir")
                local skill_md="$skill_dir/SKILL.md"
                local description=""
                
                if [[ -f "$skill_md" ]]; then
                    # Extract first non-empty, non-comment line as description
                    description=$(head -n 20 "$skill_md" | grep -v '^#' | grep -v '^$' | head -n 1 | sed 's/^[[:space:]]*//' || echo "")
                fi
                
                skills_json=$(echo "$skills_json" | jq --arg name "$skill_name" --arg desc "$description" --arg path "$skill_dir" \
                    '. += [{"name": $name, "description": $desc, "path": $path}]')
            fi
        done
    fi
    
    echo "$skills_json"
}

# Discover workspace files
discover_workspace_files() {
    local files_json="{}"
    local important_files=("USER.md" "MEMORY.md" "AGENTS.md" "GUARDRAILS.md" "TOOLS.md" "SOUL.md" "BOOTSTRAP.md" "HEARTBEAT.md")
    
    >&2 echo "  📄 Checking workspace files..."
    
    for file in "${important_files[@]}"; do
        local filepath="$WORKSPACE/$file"
        local exists="false"
        local preview=""
        
        if [[ -f "$filepath" ]]; then
            exists="true"
            preview=$(read_first_lines "$filepath" 20)
        fi
        
        files_json=$(echo "$files_json" | jq --arg name "$file" --arg exists "$exists" --arg preview "$preview" \
            '.[$name] = {"exists": ($exists == "true"), "preview": $preview}')
    done
    
    echo "$files_json"
}

# Discover channels from openclaw.json
discover_channels() {
    local channels_json="[]"
    
    if [[ -f "$OPENCLAW_CONFIG" ]]; then
        >&2 echo "  💬 Detecting channels..."
        
        # Extract channel configurations
        channels_json=$(jq -r '[
            .channels // {} | to_entries[] | 
            {
                type: .key,
                name: .value.name // .key,
                enabled: (.value.enabled // true)
            }
        ]' "$OPENCLAW_CONFIG" 2>/dev/null || echo "[]")
    fi
    
    echo "$channels_json"
}

# Discover integrations (by checking for CLI tools)
discover_integrations() {
    local integrations_json="[]"
    local tools=("gog" "bird" "clawdhub" "gh" "git" "docker" "kubectl")
    
    >&2 echo "  🔌 Detecting integrations..."
    
    for tool in "${tools[@]}"; do
        if has_command "$tool"; then
            local version=""
            case "$tool" in
                gog|bird|clawdhub)
                    version=$("$tool" --version 2>/dev/null | head -n 1 || echo "unknown")
                    ;;
                gh|git|docker|kubectl)
                    version=$("$tool" --version 2>/dev/null | head -n 1 || echo "unknown")
                    ;;
            esac
            
            integrations_json=$(echo "$integrations_json" | jq --arg tool "$tool" --arg ver "$version" \
                '. += [{"name": $tool, "version": $ver, "available": true}]')
        fi
    done
    
    echo "$integrations_json"
}

# Check for existing GUARDRAILS.md
discover_existing_guardrails() {
    local guardrails_file="$WORKSPACE/GUARDRAILS.md"
    local config_file="$WORKSPACE/guardrails-config.json"
    local result="{}"
    
    if [[ -f "$guardrails_file" ]]; then
        >&2 echo "  🛡️  Found existing GUARDRAILS.md"
        local content=$(cat "$guardrails_file")
        result=$(echo "$result" | jq --arg content "$content" '.guardrails = {exists: true, content: $content}')
    else
        result=$(echo "$result" | jq '.guardrails = {exists: false, content: ""}')
    fi
    
    if [[ -f "$config_file" ]]; then
        >&2 echo "  ⚙️  Found existing guardrails-config.json"
        local config=$(cat "$config_file")
        result=$(echo "$result" | jq --argjson config "$config" '.config = {exists: true, data: $config}')
    else
        result=$(echo "$result" | jq '.config = {exists: false, data: null}')
    fi
    
    echo "$result"
}

# Main discovery
main() {
    >&2 echo ""
    
    local skills=$(discover_skills)
    local workspace_files=$(discover_workspace_files)
    local channels=$(discover_channels)
    local integrations=$(discover_integrations)
    local existing=$(discover_existing_guardrails)
    
    >&2 echo ""
    >&2 echo "✅ Discovery complete"
    >&2 echo ""
    
    # Build final JSON output
    jq -n \
        --argjson skills "$skills" \
        --argjson files "$workspace_files" \
        --argjson channels "$channels" \
        --argjson integrations "$integrations" \
        --argjson existing "$existing" \
        '{
            timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            workspace: env.WORKSPACE,
            skills: $skills,
            workspaceFiles: $files,
            channels: $channels,
            integrations: $integrations,
            existing: $existing
        }'
}

main "$@"
