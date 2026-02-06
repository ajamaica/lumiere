#!/usr/bin/env python3
"""
Validate PARA knowledge base structure and detect common issues.

Usage:
    python validate_para.py [path]

Examples:
    python validate_para.py
    python validate_para.py ~/my-kb/
"""

import argparse
import sys
from pathlib import Path
from typing import List, Tuple


def validate_structure(kb_path: Path) -> List[Tuple[str, str]]:
    """
    Validate PARA structure and return list of (level, message) tuples.
    Levels: 'OK', 'WARN', 'ERROR'
    """
    issues = []

    # Check main PARA folders
    required_folders = ["projects", "areas", "resources", "archives"]
    for folder in required_folders:
        folder_path = kb_path / folder
        if not folder_path.exists():
            issues.append(("ERROR", f"Missing required folder: {folder}/"))
        elif not folder_path.is_dir():
            issues.append(("ERROR", f"{folder} exists but is not a directory"))
        else:
            issues.append(("OK", f"Found {folder}/"))

    # Check for common patterns
    projects_path = kb_path / "projects"
    if projects_path.exists():
        if not (projects_path / "active").exists():
            issues.append(("WARN", "Consider creating projects/active/ for active projects"))

    # Check for navigation file
    if (kb_path / "AGENTS.md").exists():
        issues.append(("OK", "Found AGENTS.md (AI navigation)"))
    elif (kb_path / "CLAUDE.md").exists():
        issues.append(("OK", "Found CLAUDE.md (AI navigation)"))
    else:
        issues.append(("WARN", "No AGENTS.md or CLAUDE.md found - consider creating for AI agents"))

    # Check for README
    if (kb_path / "README.md").exists():
        issues.append(("OK", "Found README.md"))
    else:
        issues.append(("WARN", "No README.md found - consider creating for documentation"))

    # Check for common anti-patterns
    if (kb_path / "inbox").exists():
        issues.append(("WARN", "Found 'inbox/' - PARA doesn't use inbox folders, capture directly into Projects/Areas/Resources"))

    if (kb_path / "todo").exists() or (kb_path / "todos").exists():
        issues.append(("WARN", "Found 'todo/' - tasks should live with their projects/areas, not separately"))

    return issues


def main():
    parser = argparse.ArgumentParser(
        description="Validate PARA knowledge base structure"
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=Path.cwd(),
        help="Path to knowledge base (default: current directory)",
    )

    args = parser.parse_args()
    kb_path = args.path

    if not kb_path.exists():
        print(f"❌ Path does not exist: {kb_path}")
        sys.exit(1)

    if not kb_path.is_dir():
        print(f"❌ Path is not a directory: {kb_path}")
        sys.exit(1)

    print(f"🔍 Validating PARA structure: {kb_path}\n")

    issues = validate_structure(kb_path)

    # Print results
    errors = [msg for level, msg in issues if level == "ERROR"]
    warnings = [msg for level, msg in issues if level == "WARN"]
    oks = [msg for level, msg in issues if level == "OK"]

    if oks:
        print("✅ Valid:")
        for msg in oks:
            print(f"   {msg}")
        print()

    if warnings:
        print("⚠️  Warnings:")
        for msg in warnings:
            print(f"   {msg}")
        print()

    if errors:
        print("❌ Errors:")
        for msg in errors:
            print(f"   {msg}")
        print()
        sys.exit(1)

    if not errors:
        print("✅ PARA structure is valid!")
        if warnings:
            print("   (with warnings noted above)")


if __name__ == "__main__":
    main()
