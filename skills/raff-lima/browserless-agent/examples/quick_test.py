#!/usr/bin/env python3
"""
Quick test to verify browserless-agent actions
Usage: python examples/quick_test.py
"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import run_action

async def example_1_basic_navigation():
    """Example 1: Navigate to a website and get page title"""
    print("\n📍 Example 1: Basic Navigation")
    print("-" * 50)
    
    result = await run_action("navigate", {
        "url": "https://example.com"
    })
    
    print(f"Navigation: {result['status']}")
    
    if result['status'] == 'success':
        # Get page title
        title_result = await run_action("evaluate", {
            "expression": "document.title"
        })
        print(f"Page Title: {title_result.get('result')}")

async def example_2_data_extraction():
    """Example 2: Extract multiple pieces of data"""
    print("\n📊 Example 2: Data Extraction")
    print("-" * 50)
    
    result = await run_action("get_multiple", {
        "url": "https://news.ycombinator.com",
        "extractions": [
            {"name": "titles", "selector": ".titleline > a", "type": "text", "all": True},
            {"name": "points", "selector": ".score", "type": "text", "all": True}
        ]
    })
    
    if result['status'] == 'success':
        titles = result['data'].get('titles', [])[:3]  # First 3
        print(f"Top Stories:")
        for i, title in enumerate(titles, 1):
            print(f"  {i}. {title}")

async def example_3_screenshot():
    """Example 3: Take a screenshot"""
    print("\n📸 Example 3: Screenshot")
    print("-" * 50)
    
    result = await run_action("screenshot", {
        "url": "https://example.com",
        "path": "example_screenshot.png",
        "full_page": True
    })
    
    if result['status'] == 'success':
        print(f"✓ Screenshot saved to: {result['path']}")

async def example_4_form_filling():
    """Example 4: Fill a form (demonstration)"""
    print("\n📝 Example 4: Form Automation")
    print("-" * 50)
    
    # Note: This is a demonstration - use a real form URL
    print("Demonstration of form filling:")
    print("""
    result = await run_action("fill_form", {
        "url": "https://example.com/contact",
        "fields": {
            "input[name='name']": "John Doe",
            "input[name='email']": "john@example.com",
            "textarea[name='message']": "Hello from browserless-agent!"
        }
    })
    """)

async def example_5_element_checks():
    """Example 5: Check element states"""
    print("\n🔍 Example 5: Element State Checks")
    print("-" * 50)
    
    # Check if element exists
    result = await run_action("element_exists", {
        "url": "https://example.com",
        "selector": "h1"
    })
    
    print(f"h1 exists: {result.get('exists')}")
    
    # Count elements
    count_result = await run_action("element_count", {
        "selector": "p"
    })
    
    print(f"Paragraph count: {count_result.get('count')}")

async def example_6_pdf_generation():
    """Example 6: Generate PDF"""
    print("\n📄 Example 6: PDF Generation")
    print("-" * 50)
    
    result = await run_action("pdf", {
        "url": "https://example.com",
        "path": "example_page.pdf",
        "format": "A4",
        "margin": {
            "top": "1cm",
            "right": "1cm",
            "bottom": "1cm",
            "left": "1cm"
        }
    })
    
    if result['status'] == 'success':
        print(f"✓ PDF saved to: {result['path']}")

async def example_7_table_extraction():
    """Example 7: Extract table data"""
    print("\n📋 Example 7: Table Extraction")
    print("-" * 50)
    
    # Note: Use a URL with an actual table
    print("Demonstration of table extraction:")
    print("""
    result = await run_action("extract_table", {
        "url": "https://example.com/data",
        "selector": "table.data",
        "headers": True
    })
    
    # Access extracted data
    headers = result['headers']
    rows = result['rows']
    """)

async def main():
    print("\n" + "="*50)
    print("🌐 Browserless Agent - Quick Examples")
    print("="*50)
    
    try:
        await example_1_basic_navigation()
        await asyncio.sleep(1)
        
        await example_2_data_extraction()
        await asyncio.sleep(1)
        
        await example_3_screenshot()
        await asyncio.sleep(1)
        
        await example_4_form_filling()
        
        await example_5_element_checks()
        await asyncio.sleep(1)
        
        await example_6_pdf_generation()
        
        await example_7_table_extraction()
        
        print("\n" + "="*50)
        print("✅ All examples completed!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("Make sure BROWSERLESS_URL is configured in OpenClaw settings.")
        print("Optional: Set BROWSERLESS_TOKEN if your service requires authentication.\n")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
