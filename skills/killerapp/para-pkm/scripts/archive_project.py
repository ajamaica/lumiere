#!/usr/bin/env python3
"""
Move a completed project from projects/active/ to archives/.

Usage:
    python archive_project.py <project-file> [--kb-path <path>]

Examples:
    python archive_project.py my-project.md
    python archive_project.py projects/active/old-project.md --kb-path ~/my-kb/
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime


def archive_project(project_file: Path, kb_path: Path) -> None:
    """Move project file to archives with metadata."""

    # Resolve paths
    if not project_file.is_absolute():
        project_file = kb_path / project_file

    if not project_file.exists():
        print(f"❌ Project file not found: {project_file}")
        sys.exit(1)

    # Determine source and destination
    archives_path = kb_path / "archives"
    if not archives_path.exists():
        archives_path.mkdir(parents=True)
        print(f"✅ Created archives/ directory")

    # Create archived filename with date
    date_str = datetime.now().strftime("%Y-%m-%d")
    archived_name = f"{project_file.stem}-archived-{date_str}{project_file.suffix}"
    dest_file = archives_path / archived_name

    # Read original content
    content = project_file.read_text()

    # Add archive metadata at top
    archive_note = f"""---
ARCHIVED: {datetime.now().strftime("%Y-%m-%d")}
Original location: {project_file.relative_to(kb_path)}
---

"""

    archived_content = archive_note + content

    # Write to archives
    dest_file.write_text(archived_content)
    print(f"✅ Archived to: {dest_file.relative_to(kb_path)}")

    # Remove original
    project_file.unlink()
    print(f"✅ Removed: {project_file.relative_to(kb_path)}")

    print(f"\n✅ Project successfully archived!")


def main():
    parser = argparse.ArgumentParser(
        description="Archive a completed project"
    )
    parser.add_argument(
        "project_file",
        type=Path,
        help="Path to project file (relative to KB root or absolute)"
    )
    parser.add_argument(
        "--kb-path",
        type=Path,
        default=Path.cwd(),
        help="Path to knowledge base root (default: current directory)"
    )

    args = parser.parse_args()
    archive_project(args.project_file, args.kb_path)


if __name__ == "__main__":
    main()
