#!/usr/bin/env python3
"""
Fast fuzzy/phonetic search across Obsidian vault.
Uses ripgrep for initial filtering, then ranks results.

Usage:
    python obsidian_search.py <vault_path> <query> [--limit N] [--context LINES]
"""

import os
import sys
import re
import argparse
import subprocess
import json
from pathlib import Path
from difflib import SequenceMatcher
import unicodedata
from typing import Dict, List, Tuple

def normalize_text(text: str) -> str:
    """Normalize text for fuzzy matching."""
    text = text.lower()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def transliterate_ru_en(text: str) -> str:
    """Transliterate Russian to Latin for phonetic matching."""
    ru_en = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    result = []
    for char in text.lower():
        result.append(ru_en.get(char, char))
    return ''.join(result)

def phonetic_similarity(s1: str, s2: str) -> float:
    """Calculate phonetic similarity between two strings."""
    n1 = normalize_text(s1)
    n2 = normalize_text(s2)
    direct = SequenceMatcher(None, n1, n2).ratio()
    t1 = transliterate_ru_en(n1)
    t2 = transliterate_ru_en(n2)
    translit = SequenceMatcher(None, t1, t2).ratio()
    return max(direct, translit)

def extract_frontmatter(content: str) -> Tuple[Dict, str]:
    """Extract YAML frontmatter and body from markdown."""
    frontmatter = {}
    body = content
    
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                import yaml
                frontmatter = yaml.safe_load(parts[1]) or {}
            except:
                pass
            body = parts[2]
    
    return frontmatter, body

def grep_search(vault_path: str, query: str) -> List[str]:
    """Use grep to find files containing query words."""
    words = normalize_text(query).split()
    if not words:
        return []
    
    # Try ripgrep first, fall back to grep
    try:
        # Search for any of the query words (case-insensitive)
        pattern = '|'.join(re.escape(w) for w in words)
        result = subprocess.run(
            ['rg', '-l', '-i', '--type', 'md', pattern, vault_path],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            return [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    # Fallback to grep
    try:
        pattern = '|'.join(re.escape(w) for w in words)
        result = subprocess.run(
            ['grep', '-ril', '-E', pattern, '--include=*.md', vault_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
    except (subprocess.TimeoutExpired,):
        pass
    
    return []

def search_vault(vault_path: str, query: str, limit: int = 10, context_lines: int = 2) -> List[Dict]:
    """
    Search vault for query using fuzzy/phonetic matching.
    Returns list of matches with file path, score, and context.
    """
    vault = Path(vault_path)
    if not vault.exists():
        raise FileNotFoundError(f"Vault not found: {vault_path}")
    
    results = []
    query_normalized = normalize_text(query)
    query_words = query_normalized.split()
    
    # First, get candidate files via grep
    candidate_files = grep_search(vault_path, query)
    
    # Also search by filename match
    for md_file in vault.rglob('*.md'):
        if any(part.startswith('.') for part in md_file.parts):
            continue
        name_sim = phonetic_similarity(query, md_file.stem)
        if name_sim > 0.5 and str(md_file) not in candidate_files:
            candidate_files.append(str(md_file))
    
    # Score each candidate
    for file_path in candidate_files[:200]:  # Limit candidates for speed
        md_file = Path(file_path)
        if not md_file.exists():
            continue
        
        try:
            content = md_file.read_text(encoding='utf-8')
        except:
            continue
        
        frontmatter, body = extract_frontmatter(content)
        
        title = frontmatter.get('title', md_file.stem)
        tags = frontmatter.get('tags', []) or []
        if isinstance(tags, str):
            tags = [tags]
        
        score = 0.0
        matched_lines = []
        
        # Title match (highest weight)
        title_sim = phonetic_similarity(query, title)
        score += title_sim * 3.0
        
        # Exact title match bonus
        if query_normalized in normalize_text(title):
            score += 5.0
        
        # Tag match
        for tag in tags:
            tag_sim = phonetic_similarity(query, str(tag))
            if tag_sim > 0.6:
                score += tag_sim * 1.5
        
        # Content search
        lines = body.split('\n')
        for i, line in enumerate(lines):
            line_normalized = normalize_text(line)
            
            line_score = 0.0
            for word in query_words:
                if word in line_normalized:
                    line_score += 1.0
            
            if line_score > 0:
                score += line_score * 0.3
                if len(matched_lines) < 3:
                    start = max(0, i - context_lines)
                    end = min(len(lines), i + context_lines + 1)
                    context = '\n'.join(lines[start:end]).strip()
                    if context:
                        matched_lines.append({
                            'line_num': i + 1,
                            'context': context[:500]
                        })
        
        if score > 0.5:
            try:
                rel_path = md_file.relative_to(vault)
            except ValueError:
                rel_path = md_file
            
            results.append({
                'path': str(rel_path),
                'full_path': str(md_file),
                'title': title,
                'tags': tags,
                'score': round(score, 2),
                'matches': matched_lines,
                'folder': str(rel_path.parent) if rel_path.parent != Path('.') else ''
            })
    
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:limit]

def main():
    parser = argparse.ArgumentParser(description='Fuzzy search Obsidian vault')
    parser.add_argument('vault', help='Path to Obsidian vault')
    parser.add_argument('query', help='Search query')
    parser.add_argument('--limit', type=int, default=10, help='Max results')
    parser.add_argument('--context', type=int, default=2, help='Context lines')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    try:
        results = search_vault(args.vault, args.query, args.limit, args.context)
        
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        else:
            if not results:
                print("No results found.")
                return
            
            for i, r in enumerate(results, 1):
                print(f"\n{'='*60}")
                print(f"[{i}] {r['title']} (score: {r['score']})")
                print(f"    Path: {r['path']}")
                if r['tags']:
                    print(f"    Tags: {', '.join(str(t) for t in r['tags'])}")
                if r['matches']:
                    print(f"    Matches:")
                    for m in r['matches']:
                        print(f"      Line {m['line_num']}: {m['context'][:100]}...")
    
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
