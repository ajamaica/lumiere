#!/usr/bin/env python3
"""
Browserless Agent - Test Suite
Run this to verify your setup is working correctly.
"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import run_action, BROWSERLESS_URL, BROWSERLESS_TOKEN, get_browserless_ws_url

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name, status, message=""):
    symbol = "✓" if status else "✗"
    color = Colors.GREEN if status else Colors.RED
    print(f"{color}{symbol} {name}{Colors.RESET}")
    if message:
        print(f"  {Colors.YELLOW}{message}{Colors.RESET}")

async def test_env_config():
    """Test 1: Check if BROWSERLESS_URL is configured"""
    if not BROWSERLESS_URL:
        print_test("Environment Configuration", False, 
                  "BROWSERLESS_URL not set. Please configure in OpenClaw settings.")
        return False
    
    ws_url = get_browserless_ws_url()
    safe_url = ws_url.split('?')[0] if ws_url and '?' in ws_url else ws_url
    
    token_status = "with token" if BROWSERLESS_TOKEN else "without token"
    print_test("Environment Configuration", True, 
              f"URL: {safe_url} ({token_status})")
    return True

async def test_navigation():
    """Test 2: Basic navigation"""
    try:
        result = await run_action("navigate", {"url": "https://example.com"})
        success = result.get("status") == "success"
        print_test("Navigation", success, 
                  result.get("message", "Navigated to example.com"))
        return success
    except Exception as e:
        print_test("Navigation", False, str(e))
        return False

async def test_data_extraction():
    """Test 3: Extract page title"""
    try:
        result = await run_action("get_text", {
            "url": "https://example.com",
            "selector": "h1"
        })
        success = result.get("status") == "success"
        text = result.get("text", "")
        print_test("Data Extraction", success, f"Extracted: {text}")
        return success
    except Exception as e:
        print_test("Data Extraction", False, str(e))
        return False

async def test_screenshot():
    """Test 4: Take screenshot"""
    try:
        result = await run_action("screenshot", {
            "url": "https://example.com",
            "path": "test_screenshot.png",
            "full_page": False
        })
        success = result.get("status") == "success"
        print_test("Screenshot Capture", success, 
                  "Screenshot saved to test_screenshot.png")
        return success
    except Exception as e:
        print_test("Screenshot Capture", False, str(e))
        return False

async def test_javascript_evaluation():
    """Test 5: Execute JavaScript"""
    try:
        result = await run_action("evaluate", {
            "url": "https://example.com",
            "expression": "document.title"
        })
        success = result.get("status") == "success"
        title = result.get("result", "")
        print_test("JavaScript Evaluation", success, f"Page title: {title}")
        return success
    except Exception as e:
        print_test("JavaScript Evaluation", False, str(e))
        return False

async def test_element_state():
    """Test 6: Check element state"""
    try:
        result = await run_action("element_exists", {
            "url": "https://example.com",
            "selector": "h1"
        })
        success = result.get("status") == "success" and result.get("exists")
        print_test("Element State Check", success, 
                  f"h1 element exists: {result.get('exists')}")
        return success
    except Exception as e:
        print_test("Element State Check", False, str(e))
        return False

async def test_multi_extraction():
    """Test 7: Multiple data extraction"""
    try:
        result = await run_action("get_multiple", {
            "url": "https://example.com",
            "extractions": [
                {"name": "title", "selector": "h1", "type": "text"},
                {"name": "paragraphs", "selector": "p", "type": "text", "all": True}
            ]
        })
        success = result.get("status") == "success"
        data = result.get("data", {})
        print_test("Multi-Data Extraction", success, 
                  f"Extracted {len(data)} data points")
        return success
    except Exception as e:
        print_test("Multi-Data Extraction", False, str(e))
        return False

async def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Browserless Agent - Test Suite{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

    tests = [
        ("Environment Setup", test_env_config),
        ("Basic Navigation", test_navigation),
        ("Data Extraction", test_data_extraction),
        ("Screenshot Capture", test_screenshot),
        ("JavaScript Execution", test_javascript_evaluation),
        ("Element State Checks", test_element_state),
        ("Multi-Data Extraction", test_multi_extraction),
    ]

    results = []
    
    for name, test_func in tests:
        print(f"\n{Colors.BOLD}Running: {name}{Colors.RESET}")
        result = await test_func()
        results.append(result)
        await asyncio.sleep(1)  # Brief pause between tests

    # Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")
    
    passed = sum(results)
    total = len(results)
    pass_rate = (passed / total * 100) if total > 0 else 0
    
    color = Colors.GREEN if pass_rate == 100 else Colors.YELLOW if pass_rate >= 70 else Colors.RED
    
    print(f"Tests Passed: {color}{passed}/{total} ({pass_rate:.1f}%){Colors.RESET}")
    
    if pass_rate == 100:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 All tests passed! Your browserless-agent is ready to use.{Colors.RESET}")
    elif pass_rate >= 70:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Most tests passed. Check failed tests above.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ Multiple tests failed. Please check your configuration.{Colors.RESET}")
        print(f"{Colors.YELLOW}Make sure BROWSERLESS_WS is configured correctly in OpenClaw settings.{Colors.RESET}")
    
    print()
    return 0 if pass_rate == 100 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
