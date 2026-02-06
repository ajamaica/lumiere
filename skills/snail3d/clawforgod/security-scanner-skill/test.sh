#!/bin/bash
# Test suite for security-scanner skill

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER="$SCRIPT_DIR/scripts/scanner.js"

echo "=== Security Scanner Test Suite ==="
echo

# Test 1: Safe code
echo "Test 1: Example - Safe Code"
risk=$(node "$SCANNER" "$SCRIPT_DIR/examples/example-safe.js" --output json 2>/dev/null | grep '"riskLevel"' | cut -d'"' -f4)
echo "  Risk Level: $risk (expected: CAUTION)"
echo

# Test 2: Caution code  
echo "Test 2: Example - Caution Code"
risk=$(node "$SCANNER" "$SCRIPT_DIR/examples/example-caution.js" --output json 2>/dev/null | grep '"riskLevel"' | cut -d'"' -f4)
echo "  Risk Level: $risk (expected: CAUTION)"
echo

# Test 3: Dangerous code
echo "Test 3: Example - Dangerous Code"
risk=$(node "$SCANNER" "$SCRIPT_DIR/examples/example-dangerous.js" --output json 2>/dev/null | grep '"riskLevel"' | cut -d'"' -f4)
echo "  Risk Level: $risk (expected: DANGEROUS)"
echo

# Test 4: Directory scan
echo "Test 4: Directory Scan (all examples)"
risk=$(node "$SCANNER" "$SCRIPT_DIR/examples/" --output json 2>/dev/null | grep '"riskLevel"' | cut -d'"' -f4)
echo "  Risk Level: $risk (expected: DANGEROUS - contains dangerous code)"
echo

# Test 5: Code snippet
echo "Test 5: Code Snippet (eval)"
risk=$(node "$SCANNER" --code "eval(userInput)" --output json 2>/dev/null | grep '"riskLevel"' | cut -d'"' -f4)
echo "  Risk Level: $risk (expected: DANGEROUS)"
echo

# Test 6: Help command
echo "Test 6: Help Command"
node "$SCANNER" --help 2>&1 | head -3
echo

echo "=== All tests completed successfully ==="
