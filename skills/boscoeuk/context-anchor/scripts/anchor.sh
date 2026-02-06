#!/bin/bash
#
# context-anchor: Recover context after compaction
# Scans memory files and generates a "here's where you are" briefing
#

set -e

# Configuration
WORKSPACE="${WORKSPACE:-$(cd "$(dirname "$0")/../../.." && pwd)}"
MEMORY_DIR="$WORKSPACE/memory"
CONTEXT_DIR="$WORKSPACE/context/active"
DAYS_BACK="${DAYS_BACK:-2}"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
    BLUE='\033[34m'
    GREEN='\033[32m'
    YELLOW='\033[33m'
    CYAN='\033[36m'
else
    BOLD=''
    DIM=''
    RESET=''
    BLUE=''
    GREEN=''
    YELLOW=''
    CYAN=''
fi

# Parse arguments
SHOW_ALL=true
SHOW_TASK=false
SHOW_ACTIVE=false
SHOW_DECISIONS=false
SHOW_LOOPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --task)
            SHOW_ALL=false
            SHOW_TASK=true
            shift
            ;;
        --active)
            SHOW_ALL=false
            SHOW_ACTIVE=true
            shift
            ;;
        --decisions)
            SHOW_ALL=false
            SHOW_DECISIONS=true
            shift
            ;;
        --loops)
            SHOW_ALL=false
            SHOW_LOOPS=true
            shift
            ;;
        --days)
            DAYS_BACK="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: anchor.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --task       Show only current task"
            echo "  --active     Show only active context files"
            echo "  --decisions  Show only recent decisions"
            echo "  --loops      Show only open loops"
            echo "  --days N     Scan N days back (default: 2)"
            echo "  --help       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Helper: print header
header() {
    echo -e "${BOLD}${BLUE}$1${RESET}"
    echo -e "${DIM}───────────────────────────────────────────────────────────${RESET}"
}

# Helper: relative time
relative_time() {
    local file="$1"
    local now=$(date +%s)
    local mod
    
    # macOS vs Linux stat
    if [[ "$OSTYPE" == "darwin"* ]]; then
        mod=$(stat -f %m "$file" 2>/dev/null || echo 0)
    else
        mod=$(stat -c %Y "$file" 2>/dev/null || echo 0)
    fi
    
    local diff=$((now - mod))
    
    if [ $diff -lt 60 ]; then
        echo "just now"
    elif [ $diff -lt 3600 ]; then
        echo "$((diff / 60))m ago"
    elif [ $diff -lt 86400 ]; then
        echo "$((diff / 3600))h ago"
    else
        echo "$((diff / 86400))d ago"
    fi
}

# Helper: get daily files for last N days
get_daily_files() {
    local files=()
    for i in $(seq 0 $((DAYS_BACK - 1))); do
        if [[ "$OSTYPE" == "darwin"* ]]; then
            local date_str=$(date -v-${i}d +%Y-%m-%d)
        else
            local date_str=$(date -d "-$i days" +%Y-%m-%d)
        fi
        local file="$MEMORY_DIR/${date_str}.md"
        if [ -f "$file" ]; then
            files+=("$file")
        fi
    done
    echo "${files[@]}"
}

# Section: Current Task
show_current_task() {
    header "📋 CURRENT TASK"
    
    local task_file="$MEMORY_DIR/current-task.md"
    if [ -f "$task_file" ]; then
        echo -e "${DIM}($(relative_time "$task_file"))${RESET}"
        echo ""
        cat "$task_file"
    else
        echo -e "${DIM}No current task set (memory/current-task.md not found)${RESET}"
    fi
    echo ""
}

# Section: Active Context Files
show_active_context() {
    header "📂 ACTIVE CONTEXT FILES"
    
    if [ ! -d "$CONTEXT_DIR" ]; then
        echo -e "${DIM}No context/active/ directory${RESET}"
        echo ""
        return
    fi
    
    local found=false
    for file in "$CONTEXT_DIR"/*.md; do
        [ -e "$file" ] || continue
        found=true
        local name=$(basename "$file")
        local age=$(relative_time "$file")
        local preview=$(head -n 5 "$file" | grep -v '^#' | grep -v '^$' | head -n 1)
        
        echo -e "${GREEN}• ${name}${RESET} ${DIM}(${age})${RESET}"
        if [ -n "$preview" ]; then
            echo -e "  ${DIM}└─ ${preview:0:70}...${RESET}"
        fi
    done
    
    if [ "$found" = false ]; then
        echo -e "${DIM}No active context files${RESET}"
    fi
    echo ""
}

# Section: Recent Decisions
show_decisions() {
    header "🎯 RECENT DECISIONS (last $DAYS_BACK days)"
    
    local files=($(get_daily_files))
    local found=false
    
    for file in "${files[@]}"; do
        local date=$(basename "$file" .md)
        
        # Look for decision patterns
        grep -n -i -E "(^|\s)(decision:|decided:|chose:|picked:|went with|✅.*completed|✅.*done|✅.*finished)" "$file" 2>/dev/null | while read -r line; do
            found=true
            # Extract just the content, clean it up
            local content=$(echo "$line" | sed 's/^[0-9]*://' | sed 's/^[ -]*//')
            echo -e "${CYAN}[$date]${RESET} $content"
        done
    done
    
    if [ "$found" = false ]; then
        # Check if we actually found nothing
        local any_decisions=false
        for file in "${files[@]}"; do
            if grep -q -i -E "(decision:|decided:|✅)" "$file" 2>/dev/null; then
                any_decisions=true
                break
            fi
        done
        if [ "$any_decisions" = false ]; then
            echo -e "${DIM}No explicit decisions found in recent logs${RESET}"
        fi
    fi
    echo ""
}

# Section: Open Loops
show_loops() {
    header "❓ OPEN LOOPS & TODO"
    
    local files=($(get_daily_files))
    local task_file="$MEMORY_DIR/current-task.md"
    local found=false
    
    # Check daily files for open items
    for file in "${files[@]}"; do
        local date=$(basename "$file" .md)
        
        # Look for open loop patterns (questions, TODOs, blockers, unchecked items)
        grep -n -E "(^|\s)(\?$|TODO:|FIXME:|Blocker:|Need to|needs to|should|waiting for|- \[ \])" "$file" 2>/dev/null | \
        grep -v -E "(✅|\[x\]|\[X\])" | while read -r line; do
            found=true
            local content=$(echo "$line" | sed 's/^[0-9]*://' | sed 's/^[ -]*//')
            echo -e "${YELLOW}[$date]${RESET} $content"
        done
    done
    
    # Check current-task.md for unchecked items
    if [ -f "$task_file" ]; then
        grep -n -E "^- \[ \]" "$task_file" 2>/dev/null | while read -r line; do
            found=true
            local content=$(echo "$line" | sed 's/^[0-9]*://' | sed 's/^- \[ \] //')
            echo -e "${YELLOW}[current-task]${RESET} $content"
        done
    fi
    
    if [ "$found" = false ]; then
        echo -e "${DIM}No obvious open loops found${RESET}"
    fi
    echo ""
}

# Main output
main() {
    if [ "$SHOW_ALL" = true ]; then
        echo ""
        echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
        echo -e "${BOLD}                    CONTEXT ANCHOR${RESET}"
        echo -e "${BOLD}              Where You Left Off${RESET}"
        echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
        echo ""
        
        show_current_task
        show_active_context
        show_decisions
        show_loops
        
        echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
        echo ""
    else
        [ "$SHOW_TASK" = true ] && show_current_task
        [ "$SHOW_ACTIVE" = true ] && show_active_context
        [ "$SHOW_DECISIONS" = true ] && show_decisions
        [ "$SHOW_LOOPS" = true ] && show_loops
    fi
}

main
