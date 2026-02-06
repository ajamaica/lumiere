#!/bin/bash
# Test script for Twilio two-way SMS setup

set -e

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Twilio Two-Way SMS Setup Test"
echo "════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_check() {
    local name=$1
    local command=$2
    
    echo -n "Testing: $name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# Step 1: Check Python version
echo -e "${BLUE}1. Checking Python Installation${NC}"
test_check "Python 3.8+" "python3 --version | grep -E 'Python 3\.[8-9]|Python 3\.1[0-9]'"

# Step 2: Check dependencies
echo ""
echo -e "${BLUE}2. Checking Dependencies${NC}"
test_check "twilio package" "python3 -c 'import twilio; print(twilio.__version__)' > /dev/null"
test_check "flask package" "python3 -c 'import flask; print(flask.__version__)' > /dev/null"
test_check "requests package" "python3 -c 'import requests; print(requests.__version__)' > /dev/null"

# Step 3: Check environment variables
echo ""
echo -e "${BLUE}3. Checking Environment Variables${NC}"
test_check "TWILIO_ACCOUNT_SID set" "test ! -z \"\$TWILIO_ACCOUNT_SID\""
test_check "TWILIO_AUTH_TOKEN set" "test ! -z \"\$TWILIO_AUTH_TOKEN\""
test_check "TWILIO_PHONE_NUMBER set" "test ! -z \"\$TWILIO_PHONE_NUMBER\""

# Step 4: Check file existence
echo ""
echo -e "${BLUE}4. Checking Files${NC}"
test_check "webhook_server.py exists" "test -f ./webhook_server.py"
test_check "respond_sms.py exists" "test -f ./respond_sms.py"
test_check "sms.py exists" "test -f ./sms.py"
test_check "call.py exists" "test -f ./call.py"
test_check "requirements.txt exists" "test -f ./requirements.txt"
test_check "SKILL.md exists" "test -f ./SKILL.md"
test_check "TWO_WAY_SMS_SETUP.md exists" "test -f ./TWO_WAY_SMS_SETUP.md"

# Step 5: Check directories
echo ""
echo -e "${BLUE}5. Checking Directories${NC}"
test_check ".clawd directory" "test -d ~/.clawd"

# Step 6: Test script syntax
echo ""
echo -e "${BLUE}6. Checking Script Syntax${NC}"
test_check "webhook_server.py syntax" "python3 -m py_compile ./webhook_server.py"
test_check "respond_sms.py syntax" "python3 -m py_compile ./respond_sms.py"
test_check "sms.py syntax" "python3 -m py_compile ./sms.py"
test_check "call.py syntax" "python3 -m py_compile ./call.py"

# Step 7: Check port availability
echo ""
echo -e "${BLUE}7. Checking Port Availability${NC}"
if ! lsof -i :5000 > /dev/null 2>&1; then
    echo -n "Testing: Port 5000 available ... "
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -n "Testing: Port 5000 available ... "
    echo -e "${YELLOW}⚠ WARNING${NC} (something already using port 5000)"
fi

# Step 8: Check gateway connectivity (if running)
echo ""
echo -e "${BLUE}8. Checking Gateway Connectivity${NC}"
if lsof -i :18789 > /dev/null 2>&1; then
    test_check "Gateway running on :18789" "curl -s http://localhost:18789/health > /dev/null"
else
    echo -n "Testing: Gateway running on :18789 ... "
    echo -e "${YELLOW}⚠ WARNING${NC} (Gateway not running - will be needed for webhook forwarding)"
fi

# Step 9: Phone number format validation
echo ""
echo -e "${BLUE}9. Checking Phone Number Format${NC}"
test_check "TWILIO_PHONE_NUMBER starts with +" "echo \"\$TWILIO_PHONE_NUMBER\" | grep -E '^\+[0-9]{11,}'"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "Test Summary"
echo "════════════════════════════════════════════════════════════"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}Failed: $TESTS_FAILED${NC}"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! You're ready to start.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start webhook server:"
    echo "   python webhook_server.py --port 5000"
    echo ""
    echo "2. In another terminal, start ngrok/Tailscale:"
    echo "   ngrok http 5000        # OR"
    echo "   tailscale funnel 5000"
    echo ""
    echo "3. Configure Twilio webhook URL in console"
    echo ""
    echo "4. Send a test SMS to your Twilio number"
    echo ""
else
    echo -e "${RED}✗ Some checks failed. See above for details.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Install dependencies: pip install -r requirements.txt"
    echo "- Set environment variables: export TWILIO_ACCOUNT_SID=... etc"
    echo "- Check phone number format: +1 followed by 10 digits for US"
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo ""
