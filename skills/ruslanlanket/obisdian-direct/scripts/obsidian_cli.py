#!/usr/bin/env python3
"""
Obsidian CLI - manage notes in Obsidian vault.

Commands:
    search <query>              Fuzzy search vault
    list [folder]               List notes (optionally in folder)
    folders                     List all folders
    read <note>                 Read note content
    create <title> [--folder F] Create new note
    edit <note> <action>        Edit note (append/prepend/replace/rewrite)
    tags                        List all tags
    links <note>                Show links from/to note
    suggest-folder <content>    Suggest best folder for content
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# Default vault path (override with --vault or OBSIDIAN_VAULT env)
DEFAULT_VAULT = os.environ.get('OBSIDIAN_VAULT', '/home/ruslan/webdav/data/ruslain')

def get_vault(args_vault: str = None) -> Path:
    """Get vault path from args, env, or default."""
    vault = args_vault or os.environ.get('OBSIDIAN_VAULT') or DEFAULT_VAULT
    path = Path(vault).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"Vault not found: {vault}")
    return path

def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith('---'):
        return {}, content
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    
    try:
        import yaml
        fm = yaml.safe_load(parts[1]) or {}
        return fm, parts[2].lstrip('\n')
    except:
        return {}, content

def format_frontmatter(fm: dict) -> str:
    """Format dict as YAML frontmatter."""
    if not fm:
        return ''
    import yaml
    return '---\n' + yaml.dump(fm, allow_unicode=True, default_flow_style=False) + '---\n\n'

def find_note(vault: Path, name: str) -> Optional[Path]:
    """Find note by name (with or without .md extension)."""
    name_clean = name.replace('.md', '')
    
    # Exact match
    for md in vault.rglob('*.md'):
        if any(p.startswith('.') for p in md.parts):
            continue
        if md.stem.lower() == name_clean.lower():
            return md
    
    # Partial match
    for md in vault.rglob('*.md'):
        if any(p.startswith('.') for p in md.parts):
            continue
        if name_clean.lower() in md.stem.lower():
            return md
    
    return None

def list_notes(vault: Path, folder: str = None) -> List[Dict]:
    """List all notes in vault or folder."""
    notes = []
    search_path = vault / folder if folder else vault
    
    for md in search_path.rglob('*.md'):
        if any(p.startswith('.') for p in md.parts):
            continue
        
        rel = md.relative_to(vault)
        content = md.read_text(encoding='utf-8')
        fm, body = parse_frontmatter(content)
        
        notes.append({
            'name': md.stem,
            'path': str(rel),
            'folder': str(rel.parent) if rel.parent != Path('.') else '',
            'tags': fm.get('tags', []),
            'modified': datetime.fromtimestamp(md.stat().st_mtime).isoformat(),
            'size': len(content)
        })
    
    return sorted(notes, key=lambda x: x['modified'], reverse=True)

def list_folders(vault: Path) -> List[str]:
    """List all folders in vault."""
    folders = set()
    for item in vault.rglob('*'):
        if item.is_dir() and not any(p.startswith('.') for p in item.parts):
            folders.add(str(item.relative_to(vault)))
    return sorted(folders)

def get_all_tags(vault: Path) -> Dict[str, int]:
    """Get all tags with counts."""
    tags = defaultdict(int)
    
    for md in vault.rglob('*.md'):
        if any(p.startswith('.') for p in md.parts):
            continue
        
        content = md.read_text(encoding='utf-8')
        fm, body = parse_frontmatter(content)
        
        # Frontmatter tags
        fm_tags = fm.get('tags', []) or []
        if isinstance(fm_tags, str):
            fm_tags = [fm_tags]
        for t in fm_tags:
            tags[str(t)] += 1
        
        # Inline #tags
        for match in re.findall(r'#([a-zA-Zа-яА-Я0-9_/-]+)', body):
            tags[match] += 1
    
    return dict(tags)

def get_links(vault: Path, note_path: Path) -> dict:
    """Get all links from and to a note."""
    note_name = note_path.stem.lower()
    content = note_path.read_text(encoding='utf-8')
    
    # Outgoing links [[link]]
    outgoing = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', content)
    
    # Incoming links (notes that link to this one)
    incoming = []
    for md in vault.rglob('*.md'):
        if md == note_path:
            continue
        if any(p.startswith('.') for p in md.parts):
            continue
        
        other_content = md.read_text(encoding='utf-8')
        links_in_other = re.findall(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]', other_content)
        
        for link in links_in_other:
            if link.lower() == note_name:
                incoming.append(md.stem)
                break
    
    return {
        'outgoing': outgoing,
        'incoming': incoming
    }

def suggest_folder(vault: Path, content: str, title: str = '') -> str:
    """Suggest the best folder for new content based on existing structure."""
    folders = list_folders(vault)
    if not folders:
        return ''
    
    # Analyze content and title
    text = (title + ' ' + content).lower()
    
    # Score each folder based on keyword overlap with existing notes
    folder_scores = defaultdict(float)
    
    for folder in folders:
        folder_path = vault / folder
        folder_keywords = set(folder.lower().replace('/', ' ').replace('-', ' ').replace('_', ' ').split())
        
        # Check if folder name matches content
        for kw in folder_keywords:
            if kw in text and len(kw) > 2:
                folder_scores[folder] += 2.0
        
        # Analyze notes in folder for topic similarity
        for md in folder_path.glob('*.md'):
            note_content = md.read_text(encoding='utf-8')
            fm, body = parse_frontmatter(note_content)
            
            # Check tags overlap
            tags = fm.get('tags', []) or []
            if isinstance(tags, str):
                tags = [tags]
            
            for tag in tags:
                if str(tag).lower() in text:
                    folder_scores[folder] += 1.0
            
            # Check title similarity
            if md.stem.lower() in text:
                folder_scores[folder] += 1.5
    
    if not folder_scores:
        return folders[0] if folders else ''
    
    return max(folder_scores.items(), key=lambda x: x[1])[0]

def create_note(vault: Path, title: str, content: str = '', folder: str = None,
                tags: list = None, auto_folder: bool = False) -> Path:
    """Create a new note."""
    if auto_folder and not folder:
        folder = suggest_folder(vault, content, title)
    
    # Determine path
    if folder:
        note_dir = vault / folder
        note_dir.mkdir(parents=True, exist_ok=True)
    else:
        note_dir = vault
    
    # Sanitize filename
    safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
    note_path = note_dir / f"{safe_title}.md"
    
    # Build frontmatter
    fm = {
        'created': datetime.now().isoformat(),
    }
    if tags:
        fm['tags'] = tags
    
    full_content = format_frontmatter(fm) + content
    note_path.write_text(full_content, encoding='utf-8')
    
    return note_path

def edit_note(vault: Path, note_path: Path, action: str, content: str = '',
              section: str = None) -> str:
    """
    Edit a note.
    Actions: append, prepend, replace, replace-section, clear
    """
    current = note_path.read_text(encoding='utf-8')
    fm, body = parse_frontmatter(current)
    
    if action == 'append':
        body = body.rstrip() + '\n\n' + content
    elif action == 'prepend':
        body = content + '\n\n' + body.lstrip()
    elif action == 'replace':
        body = content
    elif action == 'replace-section':
        # Replace a specific section (## heading to next ## or end)
        if not section:
            raise ValueError("Section name required for replace-section")
        
        pattern = rf'(## {re.escape(section)}\n)(.*?)(?=\n## |\Z)'
        
        def replacer(match):
            return f'## {section}\n{content}\n'
        
        body, count = re.subn(pattern, replacer, body, flags=re.DOTALL)
        if count == 0:
            # Section not found, append it
            body = body.rstrip() + f'\n\n## {section}\n{content}'
    elif action == 'clear':
        body = ''
    else:
        raise ValueError(f"Unknown action: {action}")
    
    # Update modified timestamp
    fm['modified'] = datetime.now().isoformat()
    
    full_content = format_frontmatter(fm) + body
    note_path.write_text(full_content, encoding='utf-8')
    
    return f"Updated: {note_path.relative_to(vault)}"

def main():
    parser = argparse.ArgumentParser(description='Obsidian CLI')
    parser.add_argument('--vault', '-v', help='Vault path')
    parser.add_argument('--json', '-j', action='store_true', help='JSON output')
    
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # search
    p_search = subparsers.add_parser('search', help='Search vault')
    p_search.add_argument('query', help='Search query')
    p_search.add_argument('--limit', type=int, default=10)
    
    # list
    p_list = subparsers.add_parser('list', help='List notes')
    p_list.add_argument('folder', nargs='?', help='Folder to list')
    
    # folders
    subparsers.add_parser('folders', help='List folders')
    
    # read
    p_read = subparsers.add_parser('read', help='Read note')
    p_read.add_argument('note', help='Note name')
    
    # create
    p_create = subparsers.add_parser('create', help='Create note')
    p_create.add_argument('title', help='Note title')
    p_create.add_argument('--content', '-c', default='', help='Note content')
    p_create.add_argument('--folder', '-f', help='Target folder')
    p_create.add_argument('--tags', '-t', nargs='+', help='Tags')
    p_create.add_argument('--auto-folder', '-a', action='store_true', help='Auto-detect folder')
    
    # edit
    p_edit = subparsers.add_parser('edit', help='Edit note')
    p_edit.add_argument('note', help='Note name')
    p_edit.add_argument('action', choices=['append', 'prepend', 'replace', 'replace-section', 'clear'])
    p_edit.add_argument('--content', '-c', default='', help='Content')
    p_edit.add_argument('--section', '-s', help='Section name (for replace-section)')
    
    # tags
    subparsers.add_parser('tags', help='List all tags')
    
    # links
    p_links = subparsers.add_parser('links', help='Show note links')
    p_links.add_argument('note', help='Note name')
    
    # suggest-folder
    p_suggest = subparsers.add_parser('suggest-folder', help='Suggest folder for content')
    p_suggest.add_argument('content', help='Content to analyze')
    p_suggest.add_argument('--title', '-t', default='', help='Title')
    
    args = parser.parse_args()
    
    try:
        vault = get_vault(args.vault)
        result = None
        
        if args.command == 'search':
            # Use the separate search script
            from obsidian_search import search_vault
            result = search_vault(str(vault), args.query, args.limit)
        
        elif args.command == 'list':
            result = list_notes(vault, args.folder)
        
        elif args.command == 'folders':
            result = list_folders(vault)
        
        elif args.command == 'read':
            note = find_note(vault, args.note)
            if not note:
                print(f"Note not found: {args.note}", file=sys.stderr)
                sys.exit(1)
            result = {
                'path': str(note.relative_to(vault)),
                'content': note.read_text(encoding='utf-8')
            }
        
        elif args.command == 'create':
            path = create_note(vault, args.title, args.content, args.folder,
                             args.tags, args.auto_folder)
            result = {
                'created': str(path.relative_to(vault)),
                'folder': str(path.parent.relative_to(vault)) if path.parent != vault else ''
            }
        
        elif args.command == 'edit':
            note = find_note(vault, args.note)
            if not note:
                print(f"Note not found: {args.note}", file=sys.stderr)
                sys.exit(1)
            msg = edit_note(vault, note, args.action, args.content, args.section)
            result = {'message': msg}
        
        elif args.command == 'tags':
            result = get_all_tags(vault)
        
        elif args.command == 'links':
            note = find_note(vault, args.note)
            if not note:
                print(f"Note not found: {args.note}", file=sys.stderr)
                sys.exit(1)
            result = get_links(vault, note)
        
        elif args.command == 'suggest-folder':
            result = {'folder': suggest_folder(vault, args.content, args.title)}
        
        # Output
        if args.json or isinstance(result, (list, dict)):
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(result)
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
