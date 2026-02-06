#!/usr/bin/env bash
# limits.sh - Simple hourly/daily operation limits system for Binance skill
# Place this file in shared/security and source it from other scripts:
#   source shared/security/limits.sh
# Functions:
#   init_limits_store   - create store and defaults
#   check_and_consume_limit <amount> <type> - checks limits and consumes amount. type optional ("trade")
#   get_limits          - prints current limits JSON

set -euo pipefail

LIMITS_DIR="$(dirname "${BASH_SOURCE[0]}")/data"
LIMITS_FILE="$LIMITS_DIR/limits.json"
LOCKFILE="$LIMITS_DIR/.lock"

# Default limits (can be overridden by editing limits.json)
DEFAULT_DAILY_LIMIT="1000"   # default daily limit in USD (or quote asset)
DEFAULT_HOURLY_LIMIT="500"   # default hourly limit

mkdir -p "$LIMITS_DIR"

# Ensure limits file exists
init_limits_store() {
  if [ ! -f "$LIMITS_FILE" ]; then
    cat > "$LIMITS_FILE" <<EOF
{
  "daily_limit": $DEFAULT_DAILY_LIMIT,
  "hourly_limit": $DEFAULT_HOURLY_LIMIT,
  "daily": {},
  "hourly": {}
}
EOF
  fi
}

# Simple file lock for atomic updates
_with_lock() {
  local cmd="$*"
  exec 9>"$LOCKFILE"
  if command -v flock >/dev/null 2>&1; then
    flock 9 -c "$cmd"
  else
    # fallback (not safe against races but better than nothing)
    $cmd
  fi
}

# Helper to get timestamp keys
_now_date() { date -u +%F; }
_now_hour() { date -u +%FT%H; }

# Check and consume an amount (e.g. executed trade value in USD). Returns 0 if allowed, non-zero if limit exceeded.
# Usage: check_and_consume_limit <amount>
check_and_consume_limit() {
  local amount="$1"
  init_limits_store

  _with_lock "$(declare -f _check_and_consume_inner); _check_and_consume_inner '$amount'"
}

_check_and_consume_inner() {
  local amount="$1"
  local date
  local hour
  date=$(_now_date)
  hour=$(_now_hour)

  local daily_limit
  local hourly_limit
  daily_limit=$(jq -r '.daily_limit' "$LIMITS_FILE")
  hourly_limit=$(jq -r '.hourly_limit' "$LIMITS_FILE")

  # current consumed
  local consumed_daily
  local consumed_hourly
  consumed_daily=$(jq -r --arg d "$date" '.daily[$d] // 0' "$LIMITS_FILE")
  consumed_hourly=$(jq -r --arg h "$hour" '.hourly[$h] // 0' "$LIMITS_FILE")

  # compute new totals
  local new_daily new_hourly
  new_daily=$(awk "BEGIN{print $consumed_daily + $amount}")
  new_hourly=$(awk "BEGIN{print $consumed_hourly + $amount}")

  # compare
  if awk "BEGIN{exit !($new_daily <= $daily_limit)}"; then
    if awk "BEGIN{exit !($new_hourly <= $hourly_limit)}"; then
      # persist
      jq --arg d "$date" --arg h "$hour" --argjson nd "$new_daily" --argjson nh "$new_hourly" \
        '.daily[$d]=$nd | .hourly[$h]=$nh' "$LIMITS_FILE" > "$LIMITS_FILE.tmp" && mv "$LIMITS_FILE.tmp" "$LIMITS_FILE"
      echo "OK: limits updated (daily=$new_daily / $daily_limit, hourly=$new_hourly / $hourly_limit)"
      return 0
    else
      echo "ERROR: hourly limit exceeded (would be $new_hourly > $hourly_limit)" >&2
      return 2
    fi
  else
    echo "ERROR: daily limit exceeded (would be $new_daily > $daily_limit)" >&2
    return 3
  fi
}

# Get current limits (human readable)
get_limits() {
  init_limits_store
  cat "$LIMITS_FILE" | jq '.'
}

# Reset historical counters (useful for tests)
reset_counters() {
  init_limits_store
  jq ' .daily = {} | .hourly = {}' "$LIMITS_FILE" > "$LIMITS_FILE.tmp" && mv "$LIMITS_FILE.tmp" "$LIMITS_FILE"
}

# Allow overriding limits
set_limits() {
  init_limits_store
  local daily="$1"; local hourly="$2"
  jq --argjson d "$daily" --argjson h "$hourly" '.daily_limit=$d | .hourly_limit=$h' "$LIMITS_FILE" > "$LIMITS_FILE.tmp" && mv "$LIMITS_FILE.tmp" "$LIMITS_FILE"
}

# If sourced, export functions
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file is intended to be sourced: source $(realpath "$0")"
fi
