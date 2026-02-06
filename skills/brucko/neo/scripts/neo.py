#!/usr/bin/env python3
"""
Neo Protocol — Dynamic Expertise Loading System
"I know kung fu" — Load expert mental models on-demand.
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Paths relative to skill directory
SKILL_DIR = Path(__file__).parent.parent
ASSETS_DIR = SKILL_DIR / "assets"
LIBRARY_DIR = ASSETS_DIR / "library"
REGISTRY_FILE = ASSETS_DIR / "registry.json"
CREW_FILE = ASSETS_DIR / "crew.json"


def load_registry():
    """Load the module registry."""
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE) as f:
            return json.load(f)
    return {"modules": {}, "categories": {}}


def save_registry(registry):
    """Save the module registry."""
    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2)


def load_crew():
    """Load user's Crew."""
    if CREW_FILE.exists():
        with open(CREW_FILE) as f:
            return json.load(f)
    return {"members": []}


def save_crew(crew):
    """Save user's Crew."""
    with open(CREW_FILE, "w") as f:
        json.dump(crew, f, indent=2)


def cmd_status(args):
    """Show Crew status."""
    crew = load_crew()
    registry = load_registry()
    
    print("🧠 Neo Protocol\n")
    
    if not crew["members"]:
        print("CREW: (empty)")
        print("\nUse 'neo add <module>' to build your Crew")
        print("Use 'neo browse' to see the full Library")
    else:
        print("CREW:")
        for member in crew["members"]:
            mod = registry["modules"].get(member, {})
            desc = mod.get("description", "")[:50]
            print(f"  ○ {member} — {desc}")
    
    print(f"\nLibrary: {len(registry['modules'])} modules available")
    print("Type 'neo browse' for full Library")


def cmd_browse(args):
    """Browse Library by category."""
    registry = load_registry()
    
    print("🧠 Neo Library\n")
    
    # Group by category
    by_category = {}
    for name, mod in registry["modules"].items():
        cat = mod.get("category", "uncategorized")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append((name, mod.get("description", "")))
    
    for cat in sorted(by_category.keys()):
        cat_desc = registry.get("categories", {}).get(cat, "")
        print(f"\n📁 {cat.upper()}" + (f" — {cat_desc}" if cat_desc else ""))
        for name, desc in sorted(by_category[cat]):
            print(f"   • {name}: {desc[:60]}")


def cmd_search(args):
    """Search Library for modules."""
    registry = load_registry()
    query = args.query.lower()
    
    print(f"🔍 Searching for '{args.query}'...\n")
    
    matches = []
    for name, mod in registry["modules"].items():
        if query in name.lower() or query in mod.get("description", "").lower():
            matches.append((name, mod))
    
    if matches:
        for name, mod in matches:
            print(f"  • {name}: {mod.get('description', '')[:60]}")
        print(f"\n{len(matches)} modules found")
    else:
        print("No modules found matching query")


def cmd_add(args):
    """Add module to Crew."""
    crew = load_crew()
    registry = load_registry()
    
    module = args.module
    if module not in registry["modules"]:
        print(f"❌ Module '{module}' not found in Library")
        return 1
    
    if module in crew["members"]:
        print(f"ℹ️  '{module}' already in Crew")
        return 0
    
    crew["members"].append(module)
    save_crew(crew)
    print(f"✅ Added '{module}' to Crew")


def cmd_remove(args):
    """Remove module from Crew."""
    crew = load_crew()
    module = args.module
    
    if module not in crew["members"]:
        print(f"ℹ️  '{module}' not in Crew")
        return 0
    
    crew["members"].remove(module)
    save_crew(crew)
    print(f"✅ Removed '{module}' from Crew (still in Library)")


def cmd_delete(args):
    """Delete module permanently from Library and Crew."""
    crew = load_crew()
    registry = load_registry()
    module = args.module
    
    deleted = False
    
    # Remove from crew
    if module in crew["members"]:
        crew["members"].remove(module)
        save_crew(crew)
        deleted = True
    
    # Remove from registry and delete file
    if module in registry["modules"]:
        mod_path = LIBRARY_DIR / registry["modules"][module].get("path", f"{module}.md")
        if mod_path.exists():
            mod_path.unlink()
        del registry["modules"][module]
        save_registry(registry)
        deleted = True
    
    if deleted:
        print(f"🗑️  Deleted '{module}' permanently")
    else:
        print(f"❌ Module '{module}' not found")


def cmd_inject(args):
    """Output module content for loading into context."""
    registry = load_registry()
    crew = load_crew()
    module = args.module
    
    if module not in registry["modules"]:
        print(f"❌ Module '{module}' not found", file=sys.stderr)
        return 1
    
    mod = registry["modules"][module]
    mod_path = LIBRARY_DIR / mod.get("path", f"{module}.md")
    
    if not mod_path.exists():
        # Try finding in category subdirs
        for cat_dir in LIBRARY_DIR.iterdir():
            if cat_dir.is_dir():
                potential = cat_dir / f"{module}.md"
                if potential.exists():
                    mod_path = potential
                    break
    
    if not mod_path.exists():
        print(f"❌ Module file not found: {mod_path}", file=sys.stderr)
        return 1
    
    # Auto-add to crew if not already
    if module not in crew["members"]:
        crew["members"].append(module)
        save_crew(crew)
        print(f"[Added '{module}' to Crew]", file=sys.stderr)
    
    # Output content
    with open(mod_path) as f:
        print(f.read())


def cmd_list_crew(args):
    """List Crew members (for tab completion etc)."""
    crew = load_crew()
    for member in crew["members"]:
        print(member)


def cmd_list_all(args):
    """List all modules (for tab completion etc)."""
    registry = load_registry()
    for name in sorted(registry["modules"].keys()):
        print(name)


def main():
    parser = argparse.ArgumentParser(description="Neo Protocol — Dynamic Expertise Loading")
    subparsers = parser.add_subparsers(dest="command")
    
    # Status (default)
    subparsers.add_parser("status", help="Show Crew status")
    
    # Browse
    subparsers.add_parser("browse", help="Browse full Library")
    
    # Search
    search_p = subparsers.add_parser("search", help="Search Library")
    search_p.add_argument("query", help="Search query")
    
    # Add to crew
    add_p = subparsers.add_parser("add", help="Add module to Crew")
    add_p.add_argument("module", help="Module name")
    
    # Remove from crew
    remove_p = subparsers.add_parser("remove", help="Remove module from Crew")
    remove_p.add_argument("module", help="Module name")
    
    # Delete permanently
    delete_p = subparsers.add_parser("delete", help="Delete module permanently")
    delete_p.add_argument("module", help="Module name")
    
    # Inject (output content)
    inject_p = subparsers.add_parser("inject", help="Output module content")
    inject_p.add_argument("module", help="Module name")
    
    # List commands for scripting
    subparsers.add_parser("list-crew", help="List Crew members")
    subparsers.add_parser("list-all", help="List all modules")
    
    args = parser.parse_args()
    
    if args.command is None or args.command == "status":
        return cmd_status(args)
    elif args.command == "browse":
        return cmd_browse(args)
    elif args.command == "search":
        return cmd_search(args)
    elif args.command == "add":
        return cmd_add(args)
    elif args.command == "remove":
        return cmd_remove(args)
    elif args.command == "delete":
        return cmd_delete(args)
    elif args.command == "inject":
        return cmd_inject(args)
    elif args.command == "list-crew":
        return cmd_list_crew(args)
    elif args.command == "list-all":
        return cmd_list_all(args)


if __name__ == "__main__":
    sys.exit(main() or 0)
