#!/usr/bin/env python3
"""
Moltbook API Payload Validator
Validates POST/comment payloads before sending to prevent common mistakes.
"""

import json
import sys

def validate_post(data: dict) -> tuple[bool, list[str]]:
    """Validate a Moltbook post payload."""
    errors = []
    warnings = []
    
    # Critical: content field (not text!)
    if 'text' in data:
        errors.append("❌ 'text' field detected - use 'content' instead (text → null bug)")
    
    if 'content' not in data:
        errors.append("❌ 'content' field missing (required)")
    elif not data['content'] or not data['content'].strip():
        errors.append("❌ 'content' is empty")
    
    # Required fields
    if 'title' not in data or not data.get('title', '').strip():
        warnings.append("⚠️ 'title' missing or empty")
    
    if 'submolt' not in data:
        warnings.append("⚠️ 'submolt' missing (will default to 'general')")
    
    return len(errors) == 0, errors + warnings


def validate_comment(data: dict) -> tuple[bool, list[str]]:
    """Validate a Moltbook comment payload."""
    errors = []
    
    if 'text' in data:
        errors.append("❌ 'text' field detected - use 'content' instead")
    
    if 'content' not in data:
        errors.append("❌ 'content' field missing (required)")
    elif not data['content'] or not data['content'].strip():
        errors.append("❌ 'content' is empty")
    
    return len(errors) == 0, errors


def main():
    if len(sys.argv) < 2:
        print("Usage: validate.py '<json_payload>' [--comment]")
        print("Example: validate.py '{\"content\": \"hello\", \"title\": \"test\", \"submolt\": \"general\"}'")
        sys.exit(1)
    
    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        sys.exit(1)
    
    is_comment = '--comment' in sys.argv
    
    if is_comment:
        valid, messages = validate_comment(payload)
    else:
        valid, messages = validate_post(payload)
    
    if messages:
        for msg in messages:
            print(msg)
    
    if valid:
        print("✅ Payload valid - safe to send")
        sys.exit(0)
    else:
        print("\n🚫 Fix errors before sending")
        sys.exit(1)


if __name__ == "__main__":
    main()
