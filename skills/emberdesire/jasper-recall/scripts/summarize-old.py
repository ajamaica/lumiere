#!/usr/bin/env python3
"""
summarize-old — Compress old memory entries to save tokens.

Usage:
  summarize-old                    # Summarize entries older than 30 days
  summarize-old --days 14          # Summarize entries older than 14 days
  summarize-old --dry-run          # Preview what would be summarized
  summarize-old --min-size 1000    # Only summarize files larger than 1000 chars

How it works:
1. Finds markdown files older than N days
2. Creates condensed summaries (preserving key facts)
3. Archives originals to memory/archive/
4. Updates the summarized files in place

The summarization is rule-based (no LLM required):
- Extracts headings, bullet points, and key dates
- Preserves [public]/[private] tags
- Removes verbose explanations
- Keeps first/last sentences of long paragraphs
"""

import os
import sys
import re
import shutil
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Support custom paths via environment
WORKSPACE = os.environ.get("RECALL_WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))
MEMORY_DIR = os.path.join(WORKSPACE, "memory")
ARCHIVE_DIR = os.path.join(MEMORY_DIR, "archive")

# File types to summarize
SUMMARIZE_DIRS = [
    "session-digests",
    "daily",  # if daily notes exist
]

# Never summarize these
SKIP_PATTERNS = [
    "MEMORY.md",
    "README.md", 
    "shared/",  # Don't modify shared content
    "sops/",    # SOPs should stay detailed
    "archive/", # Already archived
]


def should_skip(filepath: str) -> bool:
    """Check if file should be skipped."""
    for pattern in SKIP_PATTERNS:
        if pattern in filepath:
            return True
    return False


def get_file_age_days(filepath: str) -> int:
    """Get file age in days based on modification time."""
    mtime = os.path.getmtime(filepath)
    age = datetime.now() - datetime.fromtimestamp(mtime)
    return age.days


def extract_key_content(content: str) -> str:
    """
    Extract key information from content using rule-based summarization.
    Preserves structure while reducing verbosity.
    """
    lines = content.split('\n')
    summary_lines = []
    
    in_code_block = False
    paragraph_buffer = []
    
    for line in lines:
        stripped = line.strip()
        
        # Track code blocks (preserve them shorter)
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            if in_code_block:
                summary_lines.append(line)
            else:
                # End code block - keep max 5 lines
                summary_lines.append(line)
            continue
        
        if in_code_block:
            # Keep first 5 lines of code blocks
            code_lines = [l for l in summary_lines if not l.strip().startswith('#')]
            if len(code_lines) < 5:
                summary_lines.append(line)
            continue
        
        # Always keep headings
        if stripped.startswith('#'):
            if paragraph_buffer:
                summary_lines.append(summarize_paragraph(paragraph_buffer))
                paragraph_buffer = []
            summary_lines.append(line)
            continue
        
        # Always keep bullet points and lists
        if re.match(r'^[-*•]\s+', stripped) or re.match(r'^\d+\.\s+', stripped):
            if paragraph_buffer:
                summary_lines.append(summarize_paragraph(paragraph_buffer))
                paragraph_buffer = []
            # Truncate long bullets
            if len(stripped) > 150:
                summary_lines.append(line[:150] + '...')
            else:
                summary_lines.append(line)
            continue
        
        # Keep lines with dates, times, or key markers
        if re.search(r'\d{4}-\d{2}-\d{2}|\[public\]|\[private\]|\[learning\]|TODO|DONE|BLOCKED', stripped, re.I):
            if paragraph_buffer:
                summary_lines.append(summarize_paragraph(paragraph_buffer))
                paragraph_buffer = []
            summary_lines.append(line)
            continue
        
        # Keep lines with important keywords
        if re.search(r'important|critical|decision|agreed|conclusion|result|outcome', stripped, re.I):
            if paragraph_buffer:
                summary_lines.append(summarize_paragraph(paragraph_buffer))
                paragraph_buffer = []
            summary_lines.append(line)
            continue
        
        # Empty line - flush paragraph buffer
        if not stripped:
            if paragraph_buffer:
                summary_lines.append(summarize_paragraph(paragraph_buffer))
                paragraph_buffer = []
            summary_lines.append('')
            continue
        
        # Regular text - buffer for paragraph summarization
        paragraph_buffer.append(line)
    
    # Flush remaining buffer
    if paragraph_buffer:
        summary_lines.append(summarize_paragraph(paragraph_buffer))
    
    # Clean up multiple empty lines
    result = '\n'.join(summary_lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result.strip()


def summarize_paragraph(lines: list) -> str:
    """Summarize a paragraph by keeping first and last sentences if long."""
    text = ' '.join(l.strip() for l in lines)
    
    if len(text) < 200:
        return text
    
    # Split into sentences (rough)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    if len(sentences) <= 2:
        return text[:200] + '...' if len(text) > 200 else text
    
    # Keep first and last sentence
    return f"{sentences[0]} [...] {sentences[-1]}"


def summarize_file(filepath: str, dry_run: bool = False) -> dict:
    """
    Summarize a single file.
    Returns dict with stats.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    original_size = len(original)
    
    # Extract key content
    summarized = extract_key_content(original)
    
    # Add summary header
    filename = os.path.basename(filepath)
    summary_header = f"<!-- Summarized from {filename} on {datetime.now().strftime('%Y-%m-%d')} -->\n\n"
    summarized = summary_header + summarized
    
    new_size = len(summarized)
    reduction = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
    
    result = {
        "file": filepath,
        "original_size": original_size,
        "new_size": new_size,
        "reduction_pct": reduction,
    }
    
    if dry_run:
        return result
    
    # Archive original
    rel_path = os.path.relpath(filepath, MEMORY_DIR)
    archive_path = os.path.join(ARCHIVE_DIR, rel_path)
    os.makedirs(os.path.dirname(archive_path), exist_ok=True)
    shutil.copy2(filepath, archive_path)
    
    # Write summarized version
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(summarized)
    
    result["archived_to"] = archive_path
    return result


def main():
    parser = argparse.ArgumentParser(description="Summarize old memory entries to save tokens")
    parser.add_argument("--days", type=int, default=30, help="Summarize files older than N days (default: 30)")
    parser.add_argument("--min-size", type=int, default=500, help="Minimum file size in chars to summarize (default: 500)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show detailed output")
    args = parser.parse_args()
    
    print("🦊 Jasper Recall — Memory Summarizer")
    print("=" * 40)
    print(f"Summarizing files older than {args.days} days")
    if args.dry_run:
        print("(dry-run mode - no changes will be made)")
    print()
    
    # Find files to summarize
    files_to_process = []
    
    for subdir in SUMMARIZE_DIRS:
        dir_path = os.path.join(MEMORY_DIR, subdir)
        if not os.path.exists(dir_path):
            continue
        
        for filepath in Path(dir_path).rglob("*.md"):
            filepath = str(filepath)
            
            if should_skip(filepath):
                continue
            
            age = get_file_age_days(filepath)
            if age < args.days:
                continue
            
            size = os.path.getsize(filepath)
            if size < args.min_size:
                continue
            
            files_to_process.append((filepath, age, size))
    
    if not files_to_process:
        print("✓ No files need summarization.")
        return
    
    print(f"Found {len(files_to_process)} files to summarize")
    print()
    
    # Process files
    total_saved = 0
    
    for filepath, age, original_size in files_to_process:
        filename = os.path.basename(filepath)
        
        result = summarize_file(filepath, dry_run=args.dry_run)
        
        saved = result["original_size"] - result["new_size"]
        total_saved += saved
        
        if args.verbose or args.dry_run:
            print(f"  {filename} ({age}d old)")
            print(f"    {result['original_size']:,} → {result['new_size']:,} chars ({result['reduction_pct']:.0f}% reduction)")
        else:
            status = "[dry-run]" if args.dry_run else "✓"
            print(f"  {status} {filename}: {result['reduction_pct']:.0f}% smaller")
    
    print()
    print("=" * 40)
    if args.dry_run:
        print(f"Would save ~{total_saved:,} characters ({total_saved // 4:,} tokens est.)")
    else:
        print(f"✓ Saved {total_saved:,} characters (~{total_saved // 4:,} tokens)")
        print(f"  Originals archived to: {ARCHIVE_DIR}")


if __name__ == "__main__":
    main()
