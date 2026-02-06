#!/usr/bin/env python3
"""
Screenshot - Capture screen and return base64 PNG
"""
import pyautogui
import base64
import io
import sys

try:
    # Take screenshot
    screenshot = pyautogui.screenshot()
    
    # Convert to base64
    buffered = io.BytesIO()
    screenshot.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    # Output just the base64 (no prefix)
    print(img_base64)
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
