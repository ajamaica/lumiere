#!/usr/bin/env bash
#
# ClawPrint Challenge Helper
# Issue, verify, and validate ClawPrint reverse-CAPTCHA challenges.
#
# Required environment variables:
#   CLAWPRINT_SERVER_URL  - Base URL of your ClawPrint server
#   CLAWPRINT_SITE_KEY    - Your public site key (sk_...)
#   CLAWPRINT_SECRET_KEY  - Your private secret key (sec_...)
#
# Usage:
#   ./clawprint-challenge.sh issue
#   ./clawprint-challenge.sh verify <challenge_id> <answer>
#   ./clawprint-challenge.sh validate <challenge_id>
#

set -euo pipefail

# Validate required environment
check_env() {
  local missing=()
  [ -z "${CLAWPRINT_SERVER_URL:-}" ] && missing+=("CLAWPRINT_SERVER_URL")
  [ -z "${CLAWPRINT_SITE_KEY:-}" ] && missing+=("CLAWPRINT_SITE_KEY")

  if [ "${1:-}" = "validate" ]; then
    [ -z "${CLAWPRINT_SECRET_KEY:-}" ] && missing+=("CLAWPRINT_SECRET_KEY")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    echo "ERROR: Missing required environment variables: ${missing[*]}" >&2
    exit 1
  fi
}

# Issue a new challenge
cmd_issue() {
  check_env "issue"

  local response
  response=$(curl -sf -X POST "${CLAWPRINT_SERVER_URL}/api/v1/challenge" \
    -H "Content-Type: application/json" \
    -d "{\"site_key\": \"${CLAWPRINT_SITE_KEY}\"}")

  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to request challenge from ${CLAWPRINT_SERVER_URL}" >&2
    exit 1
  fi

  local challenge_id type question time_limit
  challenge_id=$(echo "$response" | jq -r '.challenge_id')
  type=$(echo "$response" | jq -r '.type')
  question=$(echo "$response" | jq -r '.question')
  time_limit=$(echo "$response" | jq -r '.time_limit_ms')

  echo "=== ClawPrint Challenge Issued ==="
  echo "Challenge ID: ${challenge_id}"
  echo "Type:         ${type}"
  echo "Time Limit:   ${time_limit}ms"
  echo "Question:     ${question}"

  if [ "$type" = "speed" ]; then
    local a b operation
    a=$(echo "$response" | jq -r '.operands.a')
    b=$(echo "$response" | jq -r '.operands.b')
    operation=$(echo "$response" | jq -r '.operands.operation')
    echo "Operands:     a=${a}, b=${b}, operation=${operation}"
  elif [ "$type" = "pattern" ]; then
    local grid_size
    grid_size=$(echo "$response" | jq -r '.grid_size')
    echo "Grid Size:    ${grid_size}x${grid_size}"
  fi

  echo ""
  echo "Full JSON:"
  echo "$response" | jq .
}

# Verify an answer
cmd_verify() {
  local challenge_id="${1:-}"
  local answer="${2:-}"

  if [ -z "$challenge_id" ] || [ -z "$answer" ]; then
    echo "Usage: $0 verify <challenge_id> <answer>" >&2
    exit 1
  fi

  check_env "verify"

  local response
  response=$(curl -sf -X POST "${CLAWPRINT_SERVER_URL}/api/v1/verify" \
    -H "Content-Type: application/json" \
    -d "{\"challenge_id\": \"${challenge_id}\", \"answer\": \"${answer}\"}")

  local passed elapsed reason
  passed=$(echo "$response" | jq -r '.passed')
  elapsed=$(echo "$response" | jq -r '.elapsed_ms')
  reason=$(echo "$response" | jq -r '.reason // empty')

  echo "=== Verification Result ==="
  echo "Passed:     ${passed}"
  echo "Elapsed:    ${elapsed}ms"

  if [ -n "$reason" ]; then
    echo "Reason:     ${reason}"
  fi

  if [ "$passed" = "true" ]; then
    echo ""
    echo "VERIFIED: The respondent solved the challenge. They are likely an AI."
  else
    echo ""
    echo "FAILED: The respondent did not pass. They may be human or the answer was incorrect."
  fi

  echo ""
  echo "Full JSON:"
  echo "$response" | jq .

  [ "$passed" = "true" ] && exit 0 || exit 1
}

# Validate a solved challenge server-side
cmd_validate() {
  local challenge_id="${1:-}"

  if [ -z "$challenge_id" ]; then
    echo "Usage: $0 validate <challenge_id>" >&2
    exit 1
  fi

  check_env "validate"

  local response
  response=$(curl -sf -X POST "${CLAWPRINT_SERVER_URL}/api/v1/validate" \
    -H "Content-Type: application/json" \
    -d "{\"challenge_id\": \"${challenge_id}\", \"secret_key\": \"${CLAWPRINT_SECRET_KEY}\"}")

  local valid
  valid=$(echo "$response" | jq -r '.valid')

  echo "=== Server-Side Validation ==="
  echo "Valid: ${valid}"

  if [ "$valid" = "true" ]; then
    echo ""
    echo "CONFIRMED: Challenge was legitimately solved through your configuration."
  else
    local reason
    reason=$(echo "$response" | jq -r '.reason // empty')
    echo "Reason: ${reason}"
    echo ""
    echo "REJECTED: Challenge validation failed. Do not trust this result."
  fi

  echo ""
  echo "Full JSON:"
  echo "$response" | jq .

  [ "$valid" = "true" ] && exit 0 || exit 1
}

# Main
case "${1:-}" in
  issue)
    cmd_issue
    ;;
  verify)
    cmd_verify "${2:-}" "${3:-}"
    ;;
  validate)
    cmd_validate "${2:-}"
    ;;
  *)
    echo "ClawPrint Challenge Helper"
    echo ""
    echo "Usage:"
    echo "  $0 issue                              Request a new challenge"
    echo "  $0 verify <challenge_id> <answer>      Submit an answer for verification"
    echo "  $0 validate <challenge_id>             Server-side validation with secret key"
    echo ""
    echo "Required environment variables:"
    echo "  CLAWPRINT_SERVER_URL   Base URL of your ClawPrint server"
    echo "  CLAWPRINT_SITE_KEY     Your public site key (sk_...)"
    echo "  CLAWPRINT_SECRET_KEY   Your private secret key (sec_...) [validate only]"
    exit 1
    ;;
esac
