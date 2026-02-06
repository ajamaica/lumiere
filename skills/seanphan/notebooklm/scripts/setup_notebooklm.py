#!/usr/bin/env python3
"""
One-Click Setup for NotebookLM Skill
Handles authentication and environment setup
"""

import sys
from pathlib import Path

def main():
    print("[*] NotebookLM Skill Setup")
    print("=" * 50)

    skill_dir = Path(__file__).parent.parent

    # Step 1: Check authentication
    print("\n[1] Checking authentication...")
    auth_script = skill_dir / "scripts" / "auth_manager.py"

    import subprocess
    result = subprocess.run([sys.executable, str(auth_script), 'status'],
                          capture_output=True, text=True)

    if "Authenticated: Yes" in result.stdout:
        print("[+] Authentication already configured")
    else:
        print("[!] Setting up authentication...")
        result = subprocess.run([sys.executable, str(auth_script), 'setup'])
        if result.returncode == 0:
            print("[+] Authentication setup complete")
        else:
            print("[!] Authentication setup failed")
            return 1

    # Step 2: Check environment
    print("\n[2] Checking environment...")
    venv_dir = skill_dir / ".venv"
    if venv_dir.exists():
        print("[+] Virtual environment exists")
    else:
        print("[!] Setting up virtual environment...")
        setup_script = skill_dir / "scripts" / "setup_environment.py"
        result = subprocess.run([sys.executable, str(setup_script)])
        if result.returncode == 0:
            print("[+] Environment setup complete")
        else:
            print("[!] Environment setup failed")
            return 1

    print("\n[+] NotebookLM skill is ready!")
    print("[*] Usage examples:")
    print("    python scripts/run.py ask_question.py --question \"Your question\"")
    print("    python scripts/run.py notebook_manager.py list")
    print("    python scripts/quick_query.py \"Your question\" --url \"https://notebooklm.google.com/notebook/...\"")

    return 0

if __name__ == "__main__":
    sys.exit(main())