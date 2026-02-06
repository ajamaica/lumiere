#!/usr/bin/env python3
"""
Quick Query Helper for NotebookLM
Fast way to ask questions without managing library
"""

import argparse
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Quick query for NotebookLM')
    parser.add_argument('question', help='Question to ask')
    parser.add_argument('--url', help='NotebookLM URL (optional)')
    parser.add_argument('--show-browser', action='store_true', help='Show browser window')

    args = parser.parse_args()

    # Import and run the ask_question script
    skill_dir = Path(__file__).parent.parent
    ask_script = skill_dir / "scripts" / "ask_question.py"

    if not ask_script.exists():
        print("[!] ask_question.py not found")
        return 1

    # Build command
    cmd = [sys.executable, str(ask_script), '--question', args.question]

    if args.url:
        cmd.extend(['--notebook-url', args.url])

    if args.show_browser:
        cmd.append('--show-browser')

    # Execute
    import subprocess
    result = subprocess.run(cmd)
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())