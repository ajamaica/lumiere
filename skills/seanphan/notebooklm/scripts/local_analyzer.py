#!/usr/bin/env python3
"""
Local File + NotebookLM Analyzer
Upload local files to NotebookLM for AI analysis
"""

import argparse
import sys
import os
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Analyze local files with NotebookLM')
    parser.add_argument('file_path', help='Local file to analyze')
    parser.add_argument('--question', default='Analyze this document and provide key insights, risks, and opportunities', help='Question to ask about the document')
    parser.add_argument('--upload', action='store_true', help='Upload file to NotebookLM first')
    parser.add_argument('--notebook-url', help='Existing NotebookLM notebook URL')

    args = parser.parse_args()

    file_path = Path(args.file_path)
    if not file_path.exists():
        print(f"[!] File not found: {file_path}")
        return 1

    print(f"[*] Analyzing local file: {file_path}")
    print(f"[*] File size: {file_path.stat().st_size:,} bytes")

    # Check file type and provide guidance
    if args.upload:
        print("[*] To upload this file to NotebookLM:")
        print("    1. Go to https://notebooklm.google.com")
        print("    2. Click 'Add source' > 'Google Drive' or 'Upload'")
        print(f"    3. Upload: {file_path.name}")
        print("    4. Copy the notebook URL and run:")
        print(f"       python scripts/quick_query.py \"{args.question}\" --notebook-url \"<PASTE_URL_HERE>\"")
    elif args.notebook_url:
        skill_dir = Path(__file__).parent.parent
        quick_script = skill_dir / "scripts" / "quick_query.py"

        import subprocess
        cmd = [
            sys.executable, str(quick_script),
            args.question,
            "--notebook-url", args.notebook_url
        ]

        print(f"[*] Querying NotebookLM about: {args.question}")
        result = subprocess.run(cmd)
        return result.returncode
    else:
        print("\n[*] Usage Options:")
        print("    1. Upload file to NotebookLM:")
        print(f"       python {__file__} {args.file_path} --upload")
        print("\n    2. Analyze with existing notebook:")
        print(f"       python {__file__} {args.file_path} --notebook-url \"https://notebooklm.google.com/notebook/...\"")

    return 0

if __name__ == "__main__":
    sys.exit(main())