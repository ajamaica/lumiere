#!/usr/bin/env bash
# security_checks.sh - add safety checks to existing scripts
# Source this file at the top of scripts that perform trades or sensitive ops
# Example: source shared/security/security_checks.sh

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/limits.sh" || true
source "$(dirname "${BASH_SOURCE[0]}")/logger.sh" || true

# Basic environment validations
require_env() {
  local var="$1"
  if [ -z "${!var:-}" ]; then
    echo "ERROR: required environment variable $var is not set" >&2
    return 2
  fi
}

# Verify API key format (basic length check)
validate_api_key() {
  local key_var="$1"
  local key="${!key_var:-}"
  if [ -z "$key" ]; then
    echo "WARN: API key variable $key_var is empty" >&2
    return 1
  fi
  if [[ ${#key} -lt 16 ]]; then
    echo "ERROR: API key in $key_var seems too short" >&2
    return 2
  fi
}

# Confirm high-risk operations with user interaction unless automation mode
confirm_action() {
  local prompt="$1"
  if [ "${AUTO_CONFIRM:-false}" = "true" ]; then
    echo "AUTO_CONFIRM enabled — skipping interactive confirmation"
    return 0
  fi
  read -rp "$prompt [y/N]: " ans
  case "$ans" in
    y|Y|yes|Yes) return 0;;
    *) echo "Action cancelled"; return 3;;
  esac
}

# Safe execute wrapper: checks limits, logs, then executes command provided as arguments
# Usage: safe_execute <amount> <log-args...> -- <command to run...>
safe_execute() {
  local amount="$1"
  shift
  local log_args=()
  while [ "$#" -gt 0 ]; do
    if [ "$1" = "--" ]; then shift; break; fi
    log_args+=("$1"); shift
  done

  # 1) Check limits
  check_and_consume_limit "$amount" || return 4

  # 2) Log submission
  log_txn "${log_args[@]}" --status submitted || true

  # 3) Execute the command
  if [ "$#" -eq 0 ]; then
    echo "No command provided to safe_execute" >&2
    return 5
  fi

  "$@"
  local rc=$?
  if [ $rc -eq 0 ]; then
    log_txn "${log_args[@]}" --status success || true
  else
    log_txn "${log_args[@]}" --status failed --note "rc=$rc" || true
  fi
  return $rc
}

# Example to enforce minimum recvWindow/time sync
check_time_sync() {
  local drift_limit_ms=${1:-500}
  # Use ntpstat if available, else just warn
  if command -v ntpstat >/dev/null 2>&1; then
    if ! ntpstat >/dev/null 2>&1; then
      echo "WARN: System time not synchronized (ntpstat failed)" >&2
    fi
  else
    echo "INFO: ntpstat not available — ensure system clock is accurate" >&2
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file is intended to be sourced by scripts to add security checks"
fi
