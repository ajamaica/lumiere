#!/usr/bin/env python3
"""
Generate or update AI agent navigation index (AGENTS.md).

Scans PARA structure and creates efficient navigation file for AI agents.

Usage:
    python generate_nav.py [--kb-path <path>] [--output <file>]

Examples:
    python generate_nav.py
    python generate_nav.py --kb-path ~/my-kb/
    python generate_nav.py --output CLAUDE.md
"""

import argparse
from pathlib import Path
from typing import List, Dict


def scan_directory(path: Path, max_depth: int = 2) -> List[str]:
    """Scan directory and return list of subdirectories up to max_depth."""
    if not path.exists():
        return []

    dirs = []
    for item in sorted(path.iterdir()):
        if item.is_dir() and not item.name.startswith('.'):
            dirs.append(item.name)
    return dirs


def generate_navigation(kb_path: Path) -> str:
    """Generate AGENTS.md content based on KB structure."""

    kb_name = kb_path.name

    # Scan structure
    projects_subdirs = scan_directory(kb_path / "projects")
    areas_subdirs = scan_directory(kb_path / "areas")
    resources_subdirs = scan_directory(kb_path / "resources")

    # Build navigation content
    nav_content = f"""# AI Agent Navigation Index

**Purpose**: PARA-based PKM system for {kb_name}.

## Quick Lookup Paths

"""

    # Add paths based on what exists
    if projects_subdirs:
        nav_content += "**Active projects**: `projects/active/`\n"
        if "stories" in projects_subdirs:
            nav_content += "**Project stories**: `projects/stories/` (narratives + fragments)\n"

    if areas_subdirs:
        nav_content += "**Ongoing areas**: `areas/`\n"
        for area in areas_subdirs:
            nav_content += f"  - {area}: `areas/{area}/`\n"

    if resources_subdirs:
        nav_content += "**Reference material**: `resources/`\n"
        for resource in resources_subdirs:
            nav_content += f"  - {resource}: `resources/{resource}/`\n"

    nav_content += "**Archived work**: `archives/`\n"

    nav_content += """
## PARA Structure

```
projects/     = Time-bound goals with deadlines
areas/        = Ongoing responsibilities
resources/    = Reference material
archives/     = Completed/inactive work
```

## Navigation Tips

Use grep to find specific topics. Use glob for file patterns.
"""

    return nav_content


def main():
    parser = argparse.ArgumentParser(
        description="Generate AI agent navigation index"
    )
    parser.add_argument(
        "--kb-path",
        type=Path,
        default=Path.cwd(),
        help="Path to knowledge base (default: current directory)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="AGENTS.md",
        help="Output filename (default: AGENTS.md)"
    )

    args = parser.parse_args()
    kb_path = args.kb_path

    if not kb_path.exists():
        print(f"❌ Path does not exist: {kb_path}")
        return 1

    print(f"🔍 Scanning PARA structure: {kb_path}")

    # Generate navigation
    nav_content = generate_navigation(kb_path)

    # Write to file
    output_path = kb_path / args.output
    output_path.write_text(nav_content)

    print(f"✅ Generated {args.output}")
    print(f"   Location: {output_path}")


if __name__ == "__main__":
    main()
