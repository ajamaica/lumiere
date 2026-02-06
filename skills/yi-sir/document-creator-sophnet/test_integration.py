#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
sys.path.append(os.path.dirname(__file__))

from document_creator_skill import handle_document_creation

def test_api_key_reading():
    """Test API key reading functionality"""
    print("Testing API key reading...")
    
    from document_creator_skill import get_api_key
    
    try:
        key = get_api_key()
        if key:
            print("✓ API key reading successful")
            return True
        else:
            print("✗ No API key found")
            return False
    except Exception as e:
        print(f"✗ API key reading failed: {e}")
        return False

def test_docx_creation():
    """Test DOCX document creation"""
    print("\nTesting DOCX document creation...")
    
    params = {
        'type': 'docx',
        'title': 'Test Document',
        'content': '# Test Title\nThis is test content.\n- Point 1\n- Point 2',
        'author': 'Test Author',
        'upload': False  # No upload during test
    }
    
    result = handle_document_creation(params)
    
    if result['success']:
        print("✓ DOCX document creation successful")
        if os.path.exists(result['filename']):
            print(f"✓ File exists: {result['filename']}")
            # Clean up test file
            os.remove(result['filename'])
            return True
        else:
            print("✗ File not created")
            return False
    else:
        print(f"✗ DOCX document creation failed: {result.get('error', 'Unknown error')}")
        return False

def test_pptx_creation():
    """Test PPTX document creation"""
    print("\nTesting PPTX document creation...")
    
    params = {
        'type': 'pptx',
        'title': 'Test Presentation',
        'slides': 3,
        'upload': False  # No upload during test
    }
    
    result = handle_document_creation(params)
    
    if result['success']:
        print("✓ PPTX document creation successful")
        if os.path.exists(result['filename']):
            print(f"✓ File exists: {result['filename']}")
            # Clean up test file
            os.remove(result['filename'])
            return True
        else:
            print("✗ File not created")
            return False
    else:
        error_msg = result.get('error', 'Unknown error')
        # If missing dependency, prompt installation
        if 'python-pptx' in error_msg:
            print("⚠ PPTX test skipped (requires python-pptx installation)")
            return True  # Not considered failure
        else:
            print(f"✗ PPTX document creation failed: {error_msg}")
            return False

def test_invalid_type():
    """Test invalid type handling"""
    print("\nTesting invalid type handling...")
    
    params = {
        'type': 'invalid',
        'title': 'Test'
    }
    
    result = handle_document_creation(params)
    
    if not result['success'] and 'Unsupported document type' in result.get('error', ''):
        print("✓ Invalid type handling correct")
        return True
    else:
        print("✗ Invalid type handling abnormal")
        return False

def main():
    """Main test function"""
    print("Starting Document Creator Skill tests...\n")
    
    tests = [
        test_api_key_reading,
        test_docx_creation,
        test_pptx_creation,
        test_invalid_type
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\nTests completed: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠ Some tests failed, please check dependencies and configuration")
    
    print("\nNote: Actual file upload tests require valid API key and network connection")

if __name__ == "__main__":
    main()