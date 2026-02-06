#!/usr/bin/env python3
"""
Scan for credential files in common locations.
"""

import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List

# Common credential file patterns
CREDENTIAL_PATTERNS = [
    "~/.config/*/credentials.json",
    "~/.config/*/*.credentials.json",
    "~/.openclaw/workspace/memory/*-creds.json",
    "~/.openclaw/workspace/memory/*credentials*.json",
    "~/.local/share/*/credentials.json",
    "~/.*rc",  # .bashrc, .zshrc, etc may contain exports
]

# Sensitive key patterns
SENSITIVE_KEYS = [
    r"api[_-]?key",
    r"access[_-]?token",
    r"secret",
    r"password",
    r"credentials",
    r"auth",
    r"bearer",
    r"oauth",
    r"consumer[_-]?key",
]

def scan_json_file(path: Path) -> Dict:
    """Scan a JSON file for credentials."""
    try:
        with open(path) as f:
            data = json.load(f)
        
        # Check if it looks like credentials
        keys = []
        if isinstance(data, dict):
            keys = [k.lower() for k in data.keys()]
        
        has_sensitive = any(
            any(re.search(pattern, key, re.IGNORECASE) for pattern in SENSITIVE_KEYS)
            for key in keys
        )
        
        return {
            "path": str(path),
            "type": "json",
            "keys": list(data.keys()) if isinstance(data, dict) else [],
            "likely_credentials": has_sensitive,
            "size": path.stat().st_size,
            "mode": oct(path.stat().st_mode)[-3:],
        }
    except Exception as e:
        return {
            "path": str(path),
            "type": "json",
            "error": str(e),
            "likely_credentials": True,  # Assume yes if can't read
        }

def scan_env_file(path: Path) -> Dict:
    """Scan a .env file for credentials."""
    try:
        keys = []
        with open(path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key = line.split('=', 1)[0].strip()
                    keys.append(key)
        
        return {
            "path": str(path),
            "type": "env",
            "keys": keys,
            "likely_credentials": len(keys) > 0,
            "size": path.stat().st_size,
            "mode": oct(path.stat().st_mode)[-3:],
        }
    except Exception as e:
        return {
            "path": str(path),
            "type": "env",
            "error": str(e),
            "likely_credentials": True,
        }

def scan_locations(custom_paths: List[str] = None) -> List[Dict]:
    """Scan all common credential locations."""
    results = []
    home = Path.home()
    
    patterns = CREDENTIAL_PATTERNS.copy()
    if custom_paths:
        patterns.extend(custom_paths)
    
    # Expand patterns and check files
    checked = set()
    for pattern in patterns:
        expanded = home.glob(pattern.replace('~/', ''))
        for path in expanded:
            if not path.is_file() or str(path) in checked:
                continue
            checked.add(str(path))
            
            if path.suffix == '.json':
                result = scan_json_file(path)
            elif path.name.endswith('.env') or path.name == '.env':
                result = scan_env_file(path)
            else:
                continue
            
            if result.get('likely_credentials'):
                results.append(result)
    
    # Check for existing .env
    env_path = home / '.openclaw' / '.env'
    if env_path.exists():
        results.append(scan_env_file(env_path))
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Scan for credential files')
    parser.add_argument('--paths', nargs='+', help='Additional paths to scan')
    parser.add_argument('--format', choices=['text', 'json'], default='text',
                      help='Output format')
    args = parser.parse_args()
    
    results = scan_locations(args.paths)
    
    if args.format == 'json':
        print(json.dumps(results, indent=2))
    else:
        print(f"\n🔍 Found {len(results)} credential file(s):\n")
        for r in results:
            status = "✅" if r.get('mode') == '600' else "⚠️"
            print(f"{status} {r['path']}")
            print(f"   Type: {r['type']}")
            if 'keys' in r:
                print(f"   Keys: {', '.join(r['keys'][:5])}")
                if len(r['keys']) > 5:
                    print(f"        (+{len(r['keys']) - 5} more)")
            print(f"   Mode: {r.get('mode', 'unknown')}")
            if r.get('mode') != '600':
                print(f"   ⚠️  Should be 600 for security")
            print()
        
        print(f"\n📊 Summary:")
        print(f"   Total files: {len(results)}")
        print(f"   Insecure permissions: {sum(1 for r in results if r.get('mode') != '600')}")
        print(f"\n💡 Next: Run ./scripts/consolidate.py to merge into .env\n")

if __name__ == '__main__':
    main()
