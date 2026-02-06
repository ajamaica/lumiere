#!/bin/bash
# OpenClaw Security Monitor - Remediation Orchestrator
# Runs scan.sh, parses results, and executes per-check remediation scripts
# https://github.com/adibirzu/openclaw-security-monitor
#
# Usage:
#   ./remediate.sh                    # Interactive: scan, skip CLEAN, remediate rest
#   ./remediate.sh --yes|-y           # Auto-approve all fixes
#   ./remediate.sh --dry-run          # Show what would be fixed without changing anything
#   ./remediate.sh --check N          # Run remediation for check N only (skip scan)
#   ./remediate.sh --check N --dry-run # Dry-run a single check
#   ./remediate.sh --all              # Run all 32 remediation scripts (skip scan)
#
# Exit codes: 0=fixes applied, 1=some fixes failed, 2=nothing to fix
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMEDIATE_DIR="$SCRIPT_DIR/remediate"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
LOG_DIR="$OPENCLAW_DIR/logs"
LOG_FILE="$LOG_DIR/remediation.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Counters
TOTAL_RUN=0
TOTAL_FIXED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0
TOTAL_NOTHING=0

# Flags
AUTO=false
DRY_RUN=false
SINGLE_CHECK=""
RUN_ALL=false
PASSTHROUGH_ARGS=()

for arg in "$@"; do
    case "$arg" in
        --yes|-y)
            AUTO=true
            PASSTHROUGH_ARGS+=("--yes")
            ;;
        --dry-run)
            DRY_RUN=true
            PASSTHROUGH_ARGS+=("--dry-run")
            ;;
        --all)
            RUN_ALL=true
            ;;
        --check)
            # Next arg is the check number; handled below
            ;;
        *)
            # Capture --check N
            if [ "${prev_arg:-}" = "--check" ]; then
                SINGLE_CHECK="$arg"
            fi
            ;;
    esac
    prev_arg="$arg"
done

mkdir -p "$LOG_DIR" 2>/dev/null

log() {
    local msg="[$TIMESTAMP] $1"
    echo "$msg"
    if ! $DRY_RUN; then
        echo "$msg" >> "$LOG_FILE" 2>/dev/null
    fi
}

# Find the per-check script for a given check number (zero-padded)
find_check_script() {
    local num=$1
    local padded
    padded=$(printf "%02d" "$num")
    local script
    script=$(ls "$REMEDIATE_DIR"/check-"${padded}"-*.sh 2>/dev/null | head -1)
    echo "$script"
}

# Run a single per-check remediation script
run_check_script() {
    local num=$1
    local status=$2
    local name=$3
    local script
    script=$(find_check_script "$num")

    if [ -z "$script" ] || [ ! -f "$script" ]; then
        echo "  [!] No remediation script for check $num"
        return
    fi

    TOTAL_RUN=$((TOTAL_RUN + 1))
    local padded
    padded=$(printf "%02d" "$num")
    echo ""
    echo "--- Check $padded: $name ($status) ---"

    local exit_code=0
    bash "$script" "${PASSTHROUGH_ARGS[@]}" || exit_code=$?

    case $exit_code in
        0)
            TOTAL_FIXED=$((TOTAL_FIXED + 1))
            echo "  Result: FIXED"
            ;;
        1)
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
            echo "  Result: FAILED"
            ;;
        2)
            TOTAL_NOTHING=$((TOTAL_NOTHING + 1))
            echo "  Result: Nothing to fix"
            ;;
        *)
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
            echo "  Result: Unknown exit code $exit_code"
            ;;
    esac
}

# --- Banner ---
echo ""
echo "========================================="
echo " OpenClaw Security Monitor - Remediation"
echo "========================================="
echo ""
if $DRY_RUN; then
    echo "  Mode: DRY-RUN (no changes will be made)"
elif $AUTO; then
    echo "  Mode: AUTO (all fixes will be applied)"
else
    echo "  Mode: INTERACTIVE (will ask before each fix)"
fi
echo "  OpenClaw dir: $OPENCLAW_DIR"
echo ""

if ! $DRY_RUN; then
    log "========================================"
    log "OPENCLAW REMEDIATION ORCHESTRATOR - $TIMESTAMP"
    log "========================================"
fi

# --- Single check mode ---
if [ -n "$SINGLE_CHECK" ]; then
    echo "Running remediation for check $SINGLE_CHECK only..."
    run_check_script "$SINGLE_CHECK" "MANUAL" "single-check"
    echo ""
    echo "========================================="
    echo " Remediation Summary (single check)"
    echo "========================================="
    echo "  Fixed:   $TOTAL_FIXED"
    echo "  Failed:  $TOTAL_FAILED"
    echo "  Nothing: $TOTAL_NOTHING"
    echo ""
    if ! $DRY_RUN; then
        log "SUMMARY: check=$SINGLE_CHECK fixed=$TOTAL_FIXED failed=$TOTAL_FAILED nothing=$TOTAL_NOTHING"
        echo "  Log: $LOG_FILE"
    fi
    if [ "$TOTAL_FAILED" -gt 0 ]; then exit 1; fi
    if [ "$TOTAL_FIXED" -gt 0 ]; then exit 0; fi
    exit 2
fi

# --- Run all mode (no scan) ---
if $RUN_ALL; then
    echo "Running all 32 remediation scripts..."
    for i in $(seq 1 32); do
        run_check_script "$i" "ALL" "check-$i"
    done
else
    # --- Normal mode: run scan first, then remediate non-CLEAN checks ---
    echo "Running security scan..."
    echo ""

    SCAN_OUTPUT=""
    SCAN_EXIT=0
    SCAN_OUTPUT=$(bash "$SCRIPT_DIR/scan.sh" 2>&1) || SCAN_EXIT=$?

    echo ""
    echo "========================================="
    echo " Scan complete. Parsing results..."
    echo "========================================="
    echo ""

    # Parse scan output: extract check number, status, and name
    # Format: [N/32] Check name...
    #         STATUS: description
    declare -A CHECK_STATUS
    declare -A CHECK_NAME
    current_num=""

    while IFS= read -r line; do
        # Match check header: [1/32] Scanning for...
        if [[ "$line" =~ ^\[([0-9]+)/[0-9]+\]\ (.+) ]]; then
            current_num="${BASH_REMATCH[1]}"
            CHECK_NAME[$current_num]="${BASH_REMATCH[2]}"
            CHECK_STATUS[$current_num]="UNKNOWN"
        fi
        # Match status lines
        if [ -n "$current_num" ]; then
            if [[ "$line" == CLEAN:* ]]; then
                CHECK_STATUS[$current_num]="CLEAN"
            elif [[ "$line" == CRITICAL:* ]]; then
                CHECK_STATUS[$current_num]="CRITICAL"
            elif [[ "$line" == WARNING:* ]]; then
                CHECK_STATUS[$current_num]="WARNING"
            elif [[ "$line" == INFO:* ]]; then
                # Keep as UNKNOWN or set to INFO
                if [ "${CHECK_STATUS[$current_num]}" = "UNKNOWN" ]; then
                    CHECK_STATUS[$current_num]="INFO"
                fi
            fi
        fi
    done <<< "$SCAN_OUTPUT"

    # Summary of scan results
    clean_count=0
    warn_count=0
    crit_count=0
    for num in $(echo "${!CHECK_STATUS[@]}" | tr ' ' '\n' | sort -n); do
        case "${CHECK_STATUS[$num]}" in
            CLEAN) clean_count=$((clean_count + 1)) ;;
            WARNING) warn_count=$((warn_count + 1)) ;;
            CRITICAL) crit_count=$((crit_count + 1)) ;;
        esac
    done

    echo "  Scan results: $crit_count critical, $warn_count warnings, $clean_count clean"
    echo ""

    if [ $((crit_count + warn_count)) -eq 0 ]; then
        echo "  All checks CLEAN — nothing to remediate."
        echo ""
        if ! $DRY_RUN; then
            log "All checks CLEAN — no remediation needed"
        fi
        exit 2
    fi

    # Run per-check scripts for non-CLEAN checks
    for num in $(echo "${!CHECK_STATUS[@]}" | tr ' ' '\n' | sort -n); do
        status="${CHECK_STATUS[$num]}"
        name="${CHECK_NAME[$num]:-check-$num}"

        if [ "$status" = "CLEAN" ]; then
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
            continue
        fi

        run_check_script "$num" "$status" "$name"
    done
fi

# --- Summary ---
echo ""
echo "========================================="
echo " Remediation Summary"
echo "========================================="
echo "  Checks run: $TOTAL_RUN"
echo "  Fixed:      $TOTAL_FIXED"
echo "  Failed:     $TOTAL_FAILED"
echo "  Nothing:    $TOTAL_NOTHING"
echo "  Skipped:    $TOTAL_SKIPPED (CLEAN)"
echo ""

if ! $DRY_RUN; then
    log "SUMMARY: run=$TOTAL_RUN fixed=$TOTAL_FIXED failed=$TOTAL_FAILED nothing=$TOTAL_NOTHING skipped=$TOTAL_SKIPPED"
    echo "  Log: $LOG_FILE"
fi

if [ "$TOTAL_FIXED" -eq 0 ] && [ "$TOTAL_FAILED" -eq 0 ] && [ "$TOTAL_NOTHING" -eq "$TOTAL_RUN" ]; then
    echo "  Nothing to fix — environment looks good."
    exit 2
fi

if [ "$TOTAL_FAILED" -gt 0 ]; then
    exit 1
fi

exit 0
