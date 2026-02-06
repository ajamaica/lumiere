#!/usr/bin/env python3
"""
Sync [public] tagged content from daily notes to shared memory.
Part of jasper-recall's shared agent memory system.

Usage:
    sync-shared.py                  # Sync today's notes
    sync-shared.py --since 7d       # Last 7 days
    sync-shared.py --all            # All daily notes
    sync-shared.py --dry-run        # Preview only
"""

import re
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta

# Paths
WORKSPACE = Path(os.environ.get("RECALL_WORKSPACE", "~/.openclaw/workspace")).expanduser()
MEMORY_DIR = WORKSPACE / "memory"
SHARED_DIR = MEMORY_DIR / "shared"
PRODUCT_UPDATES = SHARED_DIR / "product-updates.md"
LEARNINGS = SHARED_DIR / "learnings.md"

# Pattern to match [public] tagged sections
# Matches: ## DATE [public] - Title or ## [public] Title
PUBLIC_SECTION_PATTERN = re.compile(
    r'^(#{1,3})\s+(?:\d{4}-\d{2}-\d{2}\s+)?\[public\]\s*[-–]?\s*(.+?)$\n((?:(?!^#{1,3}\s).+\n?)*)',
    re.MULTILINE | re.IGNORECASE
)


def find_daily_notes(since_days: int = None, all_notes: bool = False) -> list:
    """Find daily note files to process."""
    notes = []
    
    for f in MEMORY_DIR.glob("????-??-??.md"):
        # Parse date from filename
        try:
            note_date = datetime.strptime(f.stem, "%Y-%m-%d")
        except ValueError:
            continue
        
        # Filter by date if needed
        if not all_notes and since_days:
            cutoff = datetime.now() - timedelta(days=since_days)
            if note_date < cutoff:
                continue
        elif not all_notes:
            # Default: only today
            if note_date.date() != datetime.now().date():
                continue
        
        notes.append(f)
    
    return sorted(notes, key=lambda f: f.stem)


def extract_public_sections(filepath: Path) -> list:
    """Extract [public] tagged sections from a file."""
    content = filepath.read_text()
    sections = []
    
    for match in PUBLIC_SECTION_PATTERN.finditer(content):
        level = match.group(1)
        title = match.group(2).strip()
        body = match.group(3).strip()
        
        # Get date from filename or title
        date = filepath.stem if re.match(r'\d{4}-\d{2}-\d{2}', filepath.stem) else "unknown"
        
        sections.append({
            "date": date,
            "level": level,
            "title": title,
            "body": body,
            "source": filepath.name
        })
    
    return sections


def categorize_section(section: dict) -> str:
    """Determine if section is a product update or learning."""
    title_lower = section["title"].lower()
    body_lower = section["body"].lower()
    
    # Product update indicators
    product_keywords = ["release", "ship", "launch", "version", "v0.", "v1.", "npm", "published", "deployed"]
    if any(kw in title_lower or kw in body_lower for kw in product_keywords):
        return "product"
    
    # Learning indicators  
    learning_keywords = ["learn", "pattern", "insight", "discovery", "found that", "realized", "gotcha", "tip"]
    if any(kw in title_lower or kw in body_lower for kw in learning_keywords):
        return "learning"
    
    # Default to product update
    return "product"


def format_section(section: dict) -> str:
    """Format a section for the shared file."""
    return f"## {section['date']} [public] - {section['title']}\n\n{section['body']}\n"


def update_shared_file(filepath: Path, new_sections: list, dry_run: bool = False):
    """Append new sections to a shared file, avoiding duplicates."""
    if not filepath.exists():
        filepath.parent.mkdir(parents=True, exist_ok=True)
        existing_content = f"# {filepath.stem.replace('-', ' ').title()}\n\n---\n\n"
    else:
        existing_content = filepath.read_text()
    
    # Track what's already in the file (by title)
    existing_titles = set(re.findall(r'^## .+ - (.+)$', existing_content, re.MULTILINE))
    
    added = []
    for section in new_sections:
        if section["title"] not in existing_titles:
            added.append(section)
    
    if not added:
        return []
    
    # Find insertion point (before "---" footer or at end)
    insert_point = existing_content.rfind("\n---\n*Last")
    if insert_point == -1:
        insert_point = len(existing_content)
    
    # Build new content
    new_content = "\n".join(format_section(s) for s in added)
    updated = existing_content[:insert_point] + new_content + "\n" + existing_content[insert_point:]
    
    # Update timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    updated = re.sub(r'\*Last (?:synced|updated): .+\*', f'*Last synced: {timestamp}*', updated)
    
    if not dry_run:
        filepath.write_text(updated)
    
    return added


def main():
    parser = argparse.ArgumentParser(description="Sync [public] content to shared memory")
    parser.add_argument("--since", help="Process notes from last N days (e.g., 7d)")
    parser.add_argument("--all", action="store_true", help="Process all daily notes")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    
    args = parser.parse_args()
    
    # Parse --since
    since_days = None
    if args.since:
        match = re.match(r'(\d+)d', args.since)
        if match:
            since_days = int(match.group(1))
    
    # Find notes to process
    notes = find_daily_notes(since_days=since_days, all_notes=args.all)
    
    if not notes:
        print("No daily notes found to process")
        return
    
    print(f"Processing {len(notes)} daily note(s)...")
    if args.dry_run:
        print("(DRY RUN - no files will be modified)\n")
    
    # Extract all public sections
    all_sections = []
    for note in notes:
        sections = extract_public_sections(note)
        if sections:
            print(f"  {note.name}: {len(sections)} [public] section(s)")
            all_sections.extend(sections)
    
    if not all_sections:
        print("\nNo [public] sections found")
        return
    
    # Categorize and update
    product_sections = [s for s in all_sections if categorize_section(s) == "product"]
    learning_sections = [s for s in all_sections if categorize_section(s) == "learning"]
    
    print(f"\nFound: {len(product_sections)} product updates, {len(learning_sections)} learnings")
    
    # Update files
    if product_sections:
        added = update_shared_file(PRODUCT_UPDATES, product_sections, args.dry_run)
        if added:
            print(f"\n{'Would add' if args.dry_run else 'Added'} to product-updates.md:")
            for s in added:
                print(f"  - {s['title']}")
    
    if learning_sections:
        added = update_shared_file(LEARNINGS, learning_sections, args.dry_run)
        if added:
            print(f"\n{'Would add' if args.dry_run else 'Added'} to learnings.md:")
            for s in added:
                print(f"  - {s['title']}")
    
    if not args.dry_run:
        print("\n✅ Sync complete")


if __name__ == "__main__":
    main()
