#!/usr/bin/env python3
"""
Enforce .env requirement for OpenClaw skills.

Usage: Import this in your skill's scripts to validate credentials are properly secured.

Example:
    from enforce import require_secure_env
    
    # At start of your script
    require_secure_env()
    
    # Now safe to load credentials
"""

import sys
from pathlib import Path

def check_env_exists() -> bool:
    """Check if .env file exists."""
    env_file = Path.home() / '.openclaw' / '.env'
    return env_file.exists()

def check_env_permissions() -> bool:
    """Check if .env has correct permissions (600)."""
    env_file = Path.home() / '.openclaw' / '.env'
    if not env_file.exists():
        return False
    mode = oct(env_file.stat().st_mode)[-3:]
    return mode == '600'

def check_gitignore() -> bool:
    """Check if .env is git-ignored."""
    gitignore = Path.home() / '.openclaw' / '.gitignore'
    if not gitignore.exists():
        return False
    return '.env' in gitignore.read_text()

def require_secure_env(exit_on_fail: bool = True) -> bool:
    """
    Enforce secure .env setup.
    
    Args:
        exit_on_fail: If True, exit with error. If False, return bool.
        
    Returns:
        True if all checks pass, False otherwise.
    """
    checks = [
        (check_env_exists, "❌ ~/.openclaw/.env does not exist"),
        (check_env_permissions, "❌ ~/.openclaw/.env has insecure permissions (should be 600)"),
        (check_gitignore, "❌ .env is not git-ignored"),
    ]
    
    failed = []
    for check_fn, error_msg in checks:
        if not check_fn():
            failed.append(error_msg)
    
    if failed:
        print("\n🔒 SECURITY REQUIREMENT NOT MET\n", file=sys.stderr)
        print("OpenClaw requires centralized credential management.", file=sys.stderr)
        print("\nIssues found:", file=sys.stderr)
        for msg in failed:
            print(f"  {msg}", file=sys.stderr)
        
        print("\n💡 Fix this by running:", file=sys.stderr)
        print("   cd ~/.openclaw/skills/credential-manager", file=sys.stderr)
        print("   ./scripts/consolidate.py", file=sys.stderr)
        print("   ./scripts/validate.py --fix", file=sys.stderr)
        print("\nSee CORE-PRINCIPLE.md for why this is mandatory.\n", file=sys.stderr)
        
        if exit_on_fail:
            sys.exit(1)
        return False
    
    return True

def get_credential(key: str) -> str:
    """
    Safely get a credential from .env.
    
    Args:
        key: Credential key (e.g., 'X_ACCESS_TOKEN')
        
    Returns:
        Credential value
        
    Raises:
        SystemExit: If .env not secure or key not found
    """
    require_secure_env()
    
    env_file = Path.home() / '.openclaw' / '.env'
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                if k.strip() == key:
                    return v.strip()
    
    print(f"\n❌ Credential '{key}' not found in .env\n", file=sys.stderr)
    print("Add it to ~/.openclaw/.env:", file=sys.stderr)
    print(f"   {key}=your_value_here\n", file=sys.stderr)
    sys.exit(1)

if __name__ == '__main__':
    # When run directly, validate and report
    print("🔍 Checking OpenClaw credential security...\n")
    
    if require_secure_env(exit_on_fail=False):
        print("✅ All security checks passed")
        print("\nYour credentials are properly secured:")
        print("  • ~/.openclaw/.env exists")
        print("  • Permissions are 600 (owner only)")
        print("  • Git-ignored")
        print("\n🔒 Good job! Your OpenClaw deployment follows security best practices.")
        sys.exit(0)
    else:
        sys.exit(1)
