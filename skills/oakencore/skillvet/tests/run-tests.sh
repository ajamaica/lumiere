#!/usr/bin/env bash
# run-tests.sh — Test runner for skillvet
# Usage: bash tests/run-tests.sh
# Returns: 0 = all pass, 1 = failures

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AUDIT="$PROJECT_DIR/scripts/skill-audit.sh"
FIXTURES="$SCRIPT_DIR/fixtures"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

run_test() {
  local name="$1"
  local fixture="$2"
  local expected_exit="$3"
  local expect_pattern="${4:-}"
  local reject_pattern="${5:-}"

  TOTAL=$((TOTAL + 1))

  output=$(bash "$AUDIT" --json "$fixture" 2>&1)
  actual_exit=$?

  local fail_reason=""

  if [ "$actual_exit" -ne "$expected_exit" ]; then
    fail_reason="exit code: expected $expected_exit, got $actual_exit"
  fi

  if [ -n "$expect_pattern" ] && ! echo "$output" | grep -qiE "$expect_pattern"; then
    fail_reason="${fail_reason:+$fail_reason; }expected pattern not found: $expect_pattern"
  fi

  if [ -n "$reject_pattern" ] && echo "$output" | grep -qiE "$reject_pattern"; then
    fail_reason="${fail_reason:+$fail_reason; }rejected pattern was found: $reject_pattern"
  fi

  if [ -z "$fail_reason" ]; then
    printf "${GREEN}PASS${NC} %s\n" "$name"
    PASSED=$((PASSED + 1))
  else
    printf "${RED}FAIL${NC} %s — %s\n" "$name" "$fail_reason"
    FAILED=$((FAILED + 1))
  fi
}

echo "Running skillvet tests..."
echo "---"

# Clean skill — should pass with no findings
run_test "clean-skill (exit 0)" \
  "$FIXTURES/clean-skill" 0 \
  '"critical":0' \
  ""

# Check #22 — string construction evasion
run_test "trigger-string-evasion (exit 2, check #22)" \
  "$FIXTURES/trigger-string-evasion" 2 \
  "string construction evasion" \
  ""

# Check #23 — data flow chain analysis
run_test "trigger-chain-analysis (exit 2, check #23)" \
  "$FIXTURES/trigger-chain-analysis" 2 \
  "data flow chain" \
  ""

# Check #24 — time bomb detection
run_test "trigger-time-bomb (exit 2, check #24)" \
  "$FIXTURES/trigger-time-bomb" 2 \
  "time bomb" \
  ""

# Check #7 — reverse shell
run_test "trigger-reverse-shell (exit 2, check #7)" \
  "$FIXTURES/trigger-reverse-shell" 2 \
  "reverse.*shell" \
  ""

# Check #9 — prompt injection
run_test "trigger-prompt-injection (exit 2, check #9)" \
  "$FIXTURES/trigger-prompt-injection" 2 \
  "prompt injection" \
  ""

# Check #2 — env theft
run_test "trigger-env-theft (exit 2, check #2)" \
  "$FIXTURES/trigger-env-theft" 2 \
  "env harvesting" \
  ""

# Check #4 — obfuscation
run_test "trigger-obfuscation (exit 2, check #4)" \
  "$FIXTURES/trigger-obfuscation" 2 \
  "obfuscation" \
  ""

# Check #1 — exfil endpoint
run_test "trigger-exfil-endpoint (exit 2, check #1)" \
  "$FIXTURES/trigger-exfil-endpoint" 2 \
  "exfiltration endpoint" \
  ""

# Check #3 — credential access
run_test "trigger-credential-access (exit 2, check #3)" \
  "$FIXTURES/trigger-credential-access" 2 \
  "foreign credentials" \
  ""

# --- Campaign-inspired checks ---

# Check #25 — IOC blocklist
run_test "trigger-ioc-blocklist (exit 2, check #25)" \
  "$FIXTURES/trigger-ioc-blocklist" 2 \
  "malicious C2 IP" \
  ""

# Check #26 — password-protected archive
run_test "trigger-password-archive (exit 2, check #26)" \
  "$FIXTURES/trigger-password-archive" 2 \
  "password.*archive" \
  ""

# Check #27 — paste service
run_test "trigger-paste-service (exit 2, check #27)" \
  "$FIXTURES/trigger-paste-service" 2 \
  "paste service" \
  ""

# Check #28 — GitHub releases binary
run_test "trigger-github-releases (exit 2, check #28)" \
  "$FIXTURES/trigger-github-releases" 2 \
  "GitHub releases binary" \
  ""

# Check #29 — base64 pipe-to-interpreter
run_test "trigger-base64-pipe (exit 2, check #29)" \
  "$FIXTURES/trigger-base64-pipe" 2 \
  "base64 pipe" \
  ""

# Check #30 — subprocess + network command
run_test "trigger-subprocess-network (exit 2, check #30)" \
  "$FIXTURES/trigger-subprocess-network" 2 \
  "subprocess.*network" \
  ""

# Check #31 — fake URL misdirection
run_test "trigger-fake-url-misdirect (exit 2, check #31)" \
  "$FIXTURES/trigger-fake-url-misdirect" 2 \
  "fake URL misdirection|decoy URL" \
  ""

# Check #32 — process persistence + network
run_test "trigger-persistence-network (exit 2, check #32)" \
  "$FIXTURES/trigger-persistence-network" 2 \
  "persistence.*network|backdoor" \
  ""

# Check #33 — fake prerequisite
run_test "trigger-fake-prerequisite (exit 2, check #33)" \
  "$FIXTURES/trigger-fake-prerequisite" 2 \
  "fake prerequisite|external download" \
  ""

# Check #34 — xattr/chmod dropper
run_test "trigger-xattr-dropper (exit 2, check #34)" \
  "$FIXTURES/trigger-xattr-dropper" 2 \
  "gatekeeper|xattr|chmod" \
  ""

# --- 1Password blog-inspired checks ---

# Check #35 — ClickFix download+execute chain
run_test "trigger-clickfix-chain (exit 2, check #35)" \
  "$FIXTURES/trigger-clickfix-chain" 2 \
  "clickfix|download.*execute" \
  ""

# Check #36 — suspicious package sources
run_test "trigger-suspicious-package (exit 2, check #36)" \
  "$FIXTURES/trigger-suspicious-package" 2 \
  "suspicious.*package|official registry" \
  ""

# Check #37 — staged installer pattern
run_test "trigger-staged-installer (exit 2, check #37)" \
  "$FIXTURES/trigger-staged-installer" 2 \
  "suspicious.*dependency|core.*base.*lib" \
  ""

# False positive — educational prompt injection context
run_test "false-positive-prompt-injection (exit 0)" \
  "$FIXTURES/false-positive-prompt-injection" 0 \
  '"critical":0' \
  ""

# False positive — own declared keys
run_test "false-positive-own-keys (exit 0)" \
  "$FIXTURES/false-positive-own-keys" 0 \
  '"critical":0' \
  ""

echo "---"
printf "Results: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}, %d total\n" "$PASSED" "$FAILED" "$TOTAL"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
exit 0
