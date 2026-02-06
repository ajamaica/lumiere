#!/usr/bin/env python3
"""
Batch Local File Analyzer
Analyze multiple local files and create summary report
"""

import argparse
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Batch analyze local files')
    parser.add_argument('directory', help='Directory to analyze')
    parser.add_argument('--pattern', default='*.md', help='File pattern (default: *.md)')
    parser.add_argument('--output', help='Output report file')

    args = parser.parse_args()

    dir_path = Path(args.directory)
    if not dir_path.exists():
        print(f"[!] Directory not found: {dir_path}")
        return 1

    print(f"[*] Analyzing files in: {dir_path}")
    print(f"[*] Pattern: {args.pattern}")

    # Find files
    files = list(dir_path.rglob(args.pattern))
    if not files:
        print(f"[!] No files found matching pattern: {args.pattern}")
        return 1

    print(f"[*] Found {len(files)} files")

    # Analysis categories
    analysis_plan = {
        "Business Strategy": ["strategy", "plan", "proposal", "roadmap"],
        "Financial": ["budget", "pricing", "cost", "revenue", "financial"],
        "Technical": ["architecture", "design", "implementation", "code"],
        "Legal": ["agreement", "contract", "legal", "compliance"],
        "Marketing": ["marketing", "sales", "customer", "brand"]
    }

    print("\n[*] Analysis Plan:")
    for category, files_found in analysis_plan.items():
        matching_files = [f for f in files if any(keyword in f.name.lower() for keyword in files_found)]
        if matching_files:
            print(f"\n  {category}:")
            for f in matching_files[:3]:  # Show first 3
                print(f"    - {f.relative_to(dir_path)}")
            if len(matching_files) > 3:
                print(f"    ... and {len(matching_files) - 3} more")

    print("\n[*] Recommended Workflow:")
    print("1. Upload high-value files to NotebookLM:")
    important_files = []
    for f in files[:5]:  # Show first 5 files
        if any(keyword in f.name.lower() for keywords in analysis_plan.values() for keyword in keywords):
            important_files.append(f)

    if important_files:
        print("\n   Priority files for upload:")
        for f in important_files[:5]:
            print(f"   - {f.relative_to(dir_path)}")

    print("\n2. Use targeted questions:")
    example_questions = [
        "What are the key risks and mitigation strategies in this document?",
        "Identify 3-5 actionable insights from this business plan",
        "What competitive advantages does this strategy establish?",
        "Summarize the financial implications and ROI projections",
        "What compliance or regulatory issues should be addressed?"
    ]

    print("\n   Example questions to ask:")
    for i, q in enumerate(example_questions, 1):
        print(f"   {i}. {q}")

    print("\n3. Upload instructions:")
    print("   - Go to https://notebooklm.google.com")
    print("   - Create new notebook for your business documents")
    print("   - Upload priority files")
    print("   - Use targeted questions for analysis")

    if args.output:
        output_path = Path(args.output)
        with open(output_path, 'w') as f:
            f.write("# Local File Analysis Report\n\n")
            f.write(f"Directory: {dir_path}\n")
            f.write(f"Files found: {len(files)}\n\n")
            f.write("## Priority Files for Upload\n\n")
            for f in important_files:
                f.write(f"- {f.relative_to(dir_path)}\n")
        print(f"\n[*] Report saved to: {output_path}")

    return 0

if __name__ == "__main__":
    sys.exit(main())