#!/bin/bash
# Test script for skill-compatibility-checker

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKER="$SCRIPT_DIR/scripts/checker.js"

echo "=========================================="
echo "Skill Compatibility Checker - Test Suite"
echo "=========================================="
echo

# Test 1: Help
echo "Test 1: Display help"
node "$CHECKER" --help
result=$?
if [ $result -eq 0 ]; then
  echo "✅ Help command works"
else
  echo "❌ Help command failed"
fi
echo

# Test 2: Check an existing skill (security-scanner-skill)
echo "Test 2: Check security-scanner-skill"
if [ -d ~/clawd/security-scanner-skill ]; then
  node "$CHECKER" ~/clawd/security-scanner-skill
  result=$?
  echo "Exit code: $result"
  if [ $result -eq 0 ] || [ $result -eq 1 ]; then
    echo "✅ Check completed successfully"
  else
    echo "❌ Check failed"
  fi
else
  echo "⚠️  security-scanner-skill not found, skipping"
fi
echo

# Test 3: JSON output
echo "Test 3: JSON output format"
if [ -d ~/clawd/security-scanner-skill ]; then
  output=$(node "$CHECKER" ~/clawd/security-scanner-skill --output json 2>&1)
  if echo "$output" | grep -q '"readiness"'; then
    echo "✅ JSON output is valid"
  else
    echo "❌ JSON output is invalid or incomplete"
  fi
else
  echo "⚠️  security-scanner-skill not found, skipping"
fi
echo

# Test 4: Invalid skill path
echo "Test 4: Invalid skill path handling"
node "$CHECKER" /nonexistent/path 2>&1 | grep -q "not found"
if [ $? -eq 0 ]; then
  echo "✅ Error handling works"
else
  echo "❌ Error handling failed"
fi
echo

# Test 5: Check skill-compatibility-checker itself
echo "Test 5: Self-check (compatibility-checker checking itself)"
node "$CHECKER" ~/clawd/skill-compatibility-checker-skill
result=$?
echo "Exit code: $result (0=GO, 1=CAUTION, 2=BLOCKED)"
if [ $result -eq 0 ] || [ $result -eq 1 ]; then
  echo "✅ Self-check completed"
else
  echo "❌ Self-check failed"
fi
echo

echo "=========================================="
echo "Test suite complete"
echo "=========================================="
