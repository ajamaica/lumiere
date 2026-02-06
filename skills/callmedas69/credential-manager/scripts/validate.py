#!/usr/bin/env python3
"""
Validate .env file security and format.
"""

import argparse
import os
import re
from pathlib import Path
from typing import Dict, List

def check_permissions(env_file: Path) -> Dict:
    """Check file permissions."""
    if not env_file.exists():
        return {'status': 'missing', 'message': 'File does not exist'}
    
    mode = oct(env_file.stat().st_mode)[-3:]
    
    if mode == '600':
        return {'status': 'ok', 'mode': mode}
    else:
        return {
            'status': 'insecure',
            'mode': mode,
            'message': f'Permissions {mode} are too permissive (should be 600)'
        }

def check_gitignore(openclaw_dir: Path) -> Dict:
    """Check if .env is in .gitignore."""
    gitignore = openclaw_dir / '.gitignore'
    
    if not gitignore.exists():
        return {'status': 'missing', 'message': '.gitignore does not exist'}
    
    content = gitignore.read_text()
    if '.env' in content or '*.env' in content:
        return {'status': 'ok'}
    else:
        return {'status': 'unprotected', 'message': '.env not in .gitignore'}

def check_format(env_file: Path) -> Dict:
    """Check .env file format."""
    issues = []
    keys = set()
    duplicates = []
    
    with open(env_file) as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            # Check format
            if '=' not in line:
                issues.append(f"Line {line_num}: Missing '=' separator")
                continue
            
            key, value = line.split('=', 1)
            key = key.strip()
            
            # Check key format
            if not re.match(r'^[A-Z0-9_]+$', key):
                issues.append(f"Line {line_num}: Invalid key format '{key}'")
            
            # Check for duplicates
            if key in keys:
                duplicates.append(key)
            keys.add(key)
            
            # Check for common mistakes
            if value.startswith('"') and value.endswith('"'):
                issues.append(f"Line {line_num}: Quotes not needed in .env")
            if ' ' in value and not (value.startswith("'") or value.startswith('"')):
                issues.append(f"Line {line_num}: Value with spaces should be quoted")
    
    if issues or duplicates:
        return {
            'status': 'issues',
            'issues': issues,
            'duplicates': duplicates,
            'keys_count': len(keys)
        }
    else:
        return {
            'status': 'ok',
            'keys_count': len(keys)
        }

def check_security(env_file: Path) -> Dict:
    """Check for security issues."""
    warnings = []
    
    with open(env_file) as f:
        content = f.read()
    
    # Check for common security issues
    if 'password123' in content.lower() or 'test' in content.lower():
        warnings.append("Found test/placeholder values")
    
    if len(content) > 100000:
        warnings.append("File is very large (>100KB)")
    
    return {
        'status': 'ok' if not warnings else 'warnings',
        'warnings': warnings
    }

def fix_permissions(env_file: Path):
    """Fix file permissions."""
    os.chmod(env_file, 0o600)
    print(f"   🔧 Fixed permissions: 600")

def fix_gitignore(openclaw_dir: Path):
    """Add .env to .gitignore."""
    gitignore = openclaw_dir / '.gitignore'
    
    if not gitignore.exists():
        with open(gitignore, 'w') as f:
            f.write("# Credentials\n.env\n")
    else:
        with open(gitignore, 'a') as f:
            f.write("\n# Credentials\n.env\n")
    
    print(f"   🔧 Added .env to .gitignore")

def validate(check_type: str = 'all', auto_fix: bool = False) -> bool:
    """Validate .env file."""
    home = Path.home()
    openclaw_dir = home / '.openclaw'
    env_file = openclaw_dir / '.env'
    
    print("\n🔍 Validating credentials...\n")
    
    all_ok = True
    
    # Check permissions
    if check_type in ['all', 'permissions']:
        print("📋 Checking permissions...")
        result = check_permissions(env_file)
        if result['status'] == 'ok':
            print(f"   ✅ Permissions: {result['mode']}")
        elif result['status'] == 'missing':
            print(f"   ❌ {result['message']}")
            return False
        else:
            print(f"   ⚠️  {result['message']}")
            all_ok = False
            if auto_fix:
                fix_permissions(env_file)
                all_ok = True
    
    # Check gitignore
    if check_type in ['all', 'gitignore']:
        print("\n📋 Checking .gitignore...")
        result = check_gitignore(openclaw_dir)
        if result['status'] == 'ok':
            print(f"   ✅ .env is git-ignored")
        else:
            print(f"   ⚠️  {result.get('message', 'Not protected')}")
            all_ok = False
            if auto_fix:
                fix_gitignore(openclaw_dir)
                all_ok = True
    
    # Check format
    if check_type in ['all', 'format']:
        print("\n📋 Checking format...")
        result = check_format(env_file)
        if result['status'] == 'ok':
            print(f"   ✅ Format valid ({result['keys_count']} keys)")
        else:
            print(f"   ⚠️  Found {len(result['issues'])} issue(s):")
            for issue in result['issues'][:5]:
                print(f"      • {issue}")
            if len(result['issues']) > 5:
                print(f"      ... +{len(result['issues']) - 5} more")
            
            if result['duplicates']:
                print(f"   ⚠️  Duplicate keys: {', '.join(result['duplicates'])}")
            all_ok = False
    
    # Check security
    if check_type in ['all', 'security']:
        print("\n📋 Checking security...")
        result = check_security(env_file)
        if result['status'] == 'ok':
            print(f"   ✅ No security warnings")
        else:
            print(f"   ⚠️  Warnings:")
            for warning in result['warnings']:
                print(f"      • {warning}")
    
    # Summary
    print(f"\n{'✅' if all_ok else '⚠️'} Validation {'passed' if all_ok else 'found issues'}")
    
    if not all_ok and not auto_fix:
        print(f"\n💡 Run with --fix to automatically fix issues")
    
    return all_ok

def main():
    parser = argparse.ArgumentParser(description='Validate credentials')
    parser.add_argument('--check', choices=['all', 'permissions', 'gitignore', 'format', 'security'],
                      default='all', help='What to check')
    parser.add_argument('--fix', action='store_true',
                      help='Automatically fix issues')
    args = parser.parse_args()
    
    result = validate(args.check, args.fix)
    return 0 if result else 1

if __name__ == '__main__':
    exit(main())
