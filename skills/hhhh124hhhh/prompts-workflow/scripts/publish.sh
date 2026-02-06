#!/bin/bash
# Auto-publish all skills from dist/ directory to ClawdHub

set -e

CLAWD_ROOT="${CLAWD_ROOT:-/root/clawd}"
DIST_DIR="${CLAWD_ROOT}/dist"
LOG_FILE="${CLAWD_ROOT}/auto-publish-$(date +%Y%m%d-%H%M%S).log"
PUBLISHED_SKILLS=()
FAILED_SKILLS=()
ALREADY_PUBLISHED=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

check_auth() {
    log "Checking authentication status..."
    # Use list command instead of whoami (whoami has issues)
    if ! clawdhub list > /dev/null 2>&1; then
        print_status "$RED" "❌ Not authenticated to ClawdHub"
        log "Please login first: clawdhub login --token <YOUR_TOKEN> --no-browser"
        return 1
    fi
    # Token is valid (list works)
    print_status "$GREEN" "✅ Authenticated to ClawdHub"
    log "Authenticated successfully"
    return 0
}

is_skill_published() {
    local skill_name=$1
    log "Checking if '$skill_name' is already published..."
    if clawdhub search "$skill_name" 2>/dev/null | grep -q "^${skill_name} v"; then
        log "Skill '$skill_name' is already published"
        return 0
    fi
    log "Skill '$skill_name' is not published yet"
    return 1
}

publish_skill() {
    local skill_file=$1
    local skill_name=$(basename "$skill_file" .skill)
    local skill_dir="/tmp/skill-extract-$$-$skill_name"

    log "Processing skill: $skill_name"

    # Extract skill to temp directory
    mkdir -p "$skill_dir"
    cd "$skill_dir"
    unzip -q "$skill_file"

    # Read SKILL.md to get name and description
    if [ ! -f "SKILL.md" ]; then
        print_status "$RED" "❌ SKILL.md not found in $skill_name"
        FAILED_SKILLS+=("$skill_name: Missing SKILL.md")
        cd - > /dev/null
        rm -rf "$skill_dir"
        return 1
    fi

    # Extract name from frontmatter
    local skill_display_name=$(sed -n '/^---$/,/^---$/p' SKILL.md | grep '^name:' | sed 's/name: *//')
    local skill_desc=$(sed -n '/^---$/,/^---$/p' SKILL.md | grep '^description:' | sed 's/description: *//')

    if [ -z "$skill_display_name" ]; then
        skill_display_name="$skill_name"
    fi

    if [ -z "$skill_desc" ]; then
        skill_desc="No description provided"
    fi

    log "Skill display name: $skill_display_name"
    log "Skill description: $skill_desc"

    # Check if already published
    if is_skill_published "$skill_name"; then
        print_status "$YELLOW" "⏭️  Skipping $skill_name (already published)"
        ALREADY_PUBLISHED+=("$skill_name")
        cd - > /dev/null
        rm -rf "$skill_dir"
        return 0
    fi

    # Publish the skill
    log "Publishing $skill_name to ClawdHub..."
    if clawdhub publish . \
        --slug "$skill_name" \
        --name "$skill_display_name" \
        --version "1.0.0" \
        --changelog "Initial release: $skill_desc"; then
        print_status "$GREEN" "✅ Successfully published: $skill_name"
        PUBLISHED_SKILLS+=("$skill_name")
        log "Published $skill_name successfully"
    else
        print_status "$RED" "❌ Failed to publish: $skill_name"
        FAILED_SKILLS+=("$skill_name")
        log "Failed to publish $skill_name"
    fi

    cd - > /dev/null
    rm -rf "$skill_dir"
}

main() {
    log "========================================"
    log "Starting auto-publish skills script"
    log "========================================"

    # Check authentication
    if ! check_auth; then
        exit 1
    fi

    # Find all .skill files
    if [ ! -d "$DIST_DIR" ]; then
        print_status "$RED" "❌ dist directory not found: $DIST_DIR"
        exit 1
    fi

    local skill_count=$(find "$DIST_DIR" -name "*.skill" -type f | wc -l)
    print_status "$BLUE" "📦 Found $skill_count skill(s) to process"
    log "Found $skill_count skill(s) in $DIST_DIR"

    # Process each skill
    for skill_file in "$DIST_DIR"/*.skill; do
        if [ -f "$skill_file" ]; then
            publish_skill "$skill_file"
            echo
        fi
    done

    # Print summary
    log "========================================"
    log "Publishing Summary"
    log "========================================"
    print_status "$GREEN" "✅ Published: ${#PUBLISHED_SKILLS[@]}"
    print_status "$YELLOW" "⏭️  Already Published: ${#ALREADY_PUBLISHED[@]}"
    print_status "$RED" "❌ Failed: ${#FAILED_SKILLS[@]}"

    if [ ${#PUBLISHED_SKILLS[@]} -gt 0 ]; then
        echo
        print_status "$GREEN" "Published Skills:"
        printf "  - %s\n" "${PUBLISHED_SKILLS[@]}"
    fi

    if [ ${#ALREADY_PUBLISHED[@]} -gt 0 ]; then
        echo
        print_status "$YELLOW" "Already Published:"
        printf "  - %s\n" "${ALREADY_PUBLISHED[@]}"
    fi

    if [ ${#FAILED_SKILLS[@]} -gt 0 ]; then
        echo
        print_status "$RED" "Failed Skills:"
        printf "  - %s\n" "${FAILED_SKILLS[@]}"
    fi

    log "========================================"
    log "Script completed"
    log "========================================"
    log "Log file: $LOG_FILE"
}

main "$@"
