#!/usr/bin/env bash
set -euo pipefail

# monitor.sh - Monitor workspace for guardrail changes and violations
# Outputs JSON report to stdout, progress to stderr

WORKSPACE="${WORKSPACE:-/home/ubuntu/.openclaw/workspace}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$WORKSPACE/guardrails-config.json"
MEMORY_DIR="$WORKSPACE/memory"

>&2 echo "🔍 Monitoring guardrails..."

# Helper: check if config exists
check_config_exists() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        >&2 echo "⚠️  No guardrails config found - run 'guardrails setup' first"
        jq -n '{
            status: "needs-attention",
            reason: "no-config",
            message: "Guardrails not configured. Run guardrails setup to create your security policies.",
            timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
        }'
        exit 0
    fi
}

# Run discovery and classification
run_discovery() {
    >&2 echo "  📦 Running discovery..."
    bash "$SCRIPT_DIR/discover.sh" 2>/dev/null
}

run_classification() {
    >&2 echo "  🔍 Classifying risks..."
    python3 "$SCRIPT_DIR/classify-risks.py" 2>/dev/null
}

# Portable mtime/epoch helpers (GNU/BSD/macOS)
get_file_mtime() {
    local file="$1"
    if stat -c %Y "$file" >/dev/null 2>&1; then
        stat -c %Y "$file"
    elif stat -f %m "$file" >/dev/null 2>&1; then
        stat -f %m "$file"
    else
        python3 - "$file" <<'PY'
import os, sys
try:
    print(int(os.path.getmtime(sys.argv[1])))
except Exception:
    print(0)
PY
    fi
}

get_iso_epoch() {
    local ts="$1"
    if date -d "$ts" +%s >/dev/null 2>&1; then
        date -d "$ts" +%s
    elif date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s >/dev/null 2>&1; then
        date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s
    else
        python3 - "$ts" <<'PY'
import sys, datetime
ts = sys.argv[1]
try:
    dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
    print(int(dt.timestamp()))
except Exception:
    print(0)
PY
    fi
}

# Compare current state against config
compare_state() {
    local current_discovery="$1"
    local current_classification="$2"
    local config="$3"
    
    local changes_json="[]"
    local needs_review=false
    
    # Extract skill lists
    local current_skills=$(echo "$current_discovery" | jq -r '.skills[].name' | sort)
    local config_skills=$(echo "$config" | jq -r '.discovery.skills[].name // empty' | sort)
    
    # Find new skills
    while IFS= read -r skill; do
        if [[ -n "$skill" ]] && ! echo "$config_skills" | grep -qx "$skill"; then
            changes_json=$(echo "$changes_json" | jq --arg skill "$skill" \
                '. += [{type: "new-skill", skill: $skill, message: "New skill installed"}]')
            needs_review=true
        fi
    done <<< "$current_skills"
    
    # Find removed skills
    while IFS= read -r skill; do
        if [[ -n "$skill" ]] && ! echo "$current_skills" | grep -qx "$skill"; then
            changes_json=$(echo "$changes_json" | jq --arg skill "$skill" \
                '. += [{type: "removed-skill", skill: $skill, message: "Skill removed"}]')
        fi
    done <<< "$config_skills"
    
    # Check for risk level changes
    local current_risk=$(echo "$current_classification" | jq -r '.overallRiskLevel')
    local config_risk=$(echo "$config" | jq -r '.classification.overallRiskLevel // "UNKNOWN"')
    
    if [[ "$current_risk" != "$config_risk" ]]; then
        changes_json=$(echo "$changes_json" | jq --arg old "$config_risk" --arg new "$current_risk" \
            '. += [{type: "risk-level-change", old: $old, new: $new, message: "Risk level changed"}]')
        needs_review=true
    fi
    
    # Check if GUARDRAILS.md was manually modified
    if [[ -f "$WORKSPACE/GUARDRAILS.md" ]]; then
        local config_timestamp=$(echo "$config" | jq -r '.generated // "1970-01-01T00:00:00Z"')
        local file_timestamp=$(get_file_mtime "$WORKSPACE/GUARDRAILS.md")
        local config_epoch=$(get_iso_epoch "$config_timestamp")
        
        if [[ "$file_timestamp" -gt "$config_epoch" ]]; then
            changes_json=$(echo "$changes_json" | jq \
                '. += [{type: "manual-edit", message: "GUARDRAILS.md was manually edited"}]')
        fi
    fi
    
    echo "$changes_json"
    
    if [[ "$needs_review" == "true" ]]; then
        return 1
    else
        return 0
    fi
}

# Check memory files for guardrail keywords
check_memory_violations() {
    local violations_json="[]"
    
    if [[ ! -d "$MEMORY_DIR" ]]; then
        echo "$violations_json"
        return 0
    fi
    
    >&2 echo "  📝 Checking memory for incidents..."
    
    # Keywords that indicate potential violations
    local keywords=("blocked" "violation" "guardrail" "unauthorized" "denied" "restricted access")
    
    # Check recent memory files (last 7 days)
    for file in "$MEMORY_DIR"/*.md; do
        if [[ ! -f "$file" ]]; then continue; fi
        
        local filename=$(basename "$file")
        local file_age_days=$(( ($(date +%s) - $(stat -c %Y "$file")) / 86400 ))
        
        if [[ $file_age_days -gt 7 ]]; then continue; fi
        
        for keyword in "${keywords[@]}"; do
            if grep -qi "$keyword" "$file" 2>/dev/null; then
                local context=$(grep -i "$keyword" "$file" | head -n 3)
                violations_json=$(echo "$violations_json" | jq --arg file "$filename" --arg keyword "$keyword" --arg context "$context" \
                    '. += [{file: $file, keyword: $keyword, context: $context}]')
            fi
        done
    done
    
    echo "$violations_json"
}

# Main monitoring logic
main() {
    check_config_exists
    
    local config=$(cat "$CONFIG_FILE")
    local current_discovery=$(run_discovery)
    local current_classification=$(echo "$current_discovery" | run_classification)
    
    local changes
    local review_needed=false
    
    if changes=$(compare_state "$current_discovery" "$current_classification" "$config"); then
        review_needed=false
    else
        review_needed=true
    fi
    
    local violations=$(check_memory_violations)
    local violation_count=$(echo "$violations" | jq 'length')
    
    # Determine overall status
    local status="ok"
    local message="Guardrails monitoring complete. No issues detected."
    
    if [[ "$review_needed" == "true" ]]; then
        status="review-recommended"
        message="Changes detected. Run 'guardrails review' to update your configuration."
    fi
    
    if [[ "$violation_count" -gt 0 ]]; then
        status="needs-attention"
        message="Potential guardrail violations detected in memory logs."
    fi
    
    >&2 echo ""
    >&2 echo "✅ Monitoring complete: $status"
    >&2 echo ""
    
    # Build report
    jq -n \
        --arg status "$status" \
        --arg message "$message" \
        --argjson changes "$changes" \
        --argjson violations "$violations" \
        --argjson current_discovery "$current_discovery" \
        --argjson current_classification "$current_classification" \
        '{
            timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            status: $status,
            message: $message,
            changes: $changes,
            violations: $violations,
            currentState: {
                discovery: $current_discovery,
                classification: $current_classification
            }
        }'
}

main "$@"
