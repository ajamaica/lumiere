#!/usr/bin/env python3
"""
Initialize a new PARA-based knowledge base structure.

Usage:
    python init_para_kb.py <kb-name> [--path <directory>]

Examples:
    python init_para_kb.py my-kb
    python init_para_kb.py my-kb --path ~/knowledge-bases/
"""

import argparse
import sys
from pathlib import Path


def create_para_structure(kb_name: str, base_path: Path) -> None:
    """Create PARA directory structure."""
    kb_path = base_path / kb_name

    if kb_path.exists():
        print(f"❌ Directory already exists: {kb_path}")
        sys.exit(1)

    # Create main PARA folders
    folders = [
        "projects/active",
        "projects/stories",
        "projects/stories/fragments",
        "areas",
        "resources",
        "archives",
    ]

    print(f"🚀 Creating PARA knowledge base: {kb_name}")
    print(f"   Location: {kb_path}\n")

    for folder in folders:
        (kb_path / folder).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created {folder}/")

    # Create README
    readme_content = f"""# {kb_name}

Personal knowledge base using the PARA method.

## Structure

### projects/
**Time-bound goals with deadlines**
- `active/` - Current projects
- `stories/` - Project narratives (full + fragments)

### areas/
**Ongoing responsibilities** - Long-term commitments

### resources/
**Reference material** - Standards, configs, templates

### archives/
**Completed work** - Inactive projects and areas

## PARA Method

- **Projects**: Time-bound goals (e.g., "Launch product X by Q2")
- **Areas**: Ongoing responsibilities (e.g., "Health", "Career", "Business operations")
- **Resources**: Topics of interest, reference material (e.g., "Coding standards", "Design patterns")
- **Archives**: Completed projects and inactive areas

For more about PARA: https://fortelabs.com/blog/para/
"""

    (kb_path / "README.md").write_text(readme_content)
    print(f"✅ Created README.md")

    # Create basic AGENTS.md
    agents_content = """# AI Agent Navigation Index

**Purpose**: PARA-based knowledge base navigation for AI agents.

## Quick Lookup Paths

**Active projects**: `projects/active/`
**Project stories**: `projects/stories/` (narratives + fragments)
**Ongoing areas**: `areas/`
**Reference material**: `resources/`
**Archived work**: `archives/`

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

    (kb_path / "AGENTS.md").write_text(agents_content)
    print(f"✅ Created AGENTS.md")

    print(f"\n✅ PARA knowledge base '{kb_name}' initialized successfully!")
    print(f"\nNext steps:")
    print(f"1. cd {kb_path}")
    print(f"2. Start adding projects to projects/active/")
    print(f"3. Add areas to areas/")
    print(f"4. Add reference material to resources/")


def main():
    parser = argparse.ArgumentParser(
        description="Initialize a new PARA-based knowledge base"
    )
    parser.add_argument("kb_name", help="Name of the knowledge base")
    parser.add_argument(
        "--path",
        type=Path,
        default=Path.cwd(),
        help="Base path where KB will be created (default: current directory)",
    )

    args = parser.parse_args()
    create_para_structure(args.kb_name, args.path)


if __name__ == "__main__":
    main()
