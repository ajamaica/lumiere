#!/usr/bin/env python3
"""
HexMem Semantic Search with Rich Output

Usage: python search.py "query" [--limit N] [--source TYPE]
"""

import argparse
import json
import os
import sqlite3
import sys

# Add parent directory for embed module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embed import get_db_path, load_sqlite_vec, generate_embedding, serialize_embedding


def get_content(conn, source: str, item_id: int) -> dict:
    """Fetch the actual content for a search result."""
    if source == 'events':
        cur = conn.execute("""
            SELECT summary, details, category, occurred_at 
            FROM events WHERE id = ?
        """, (item_id,))
        row = cur.fetchone()
        if row:
            return {
                'summary': row[0],
                'details': row[1],
                'category': row[2],
                'date': row[3]
            }
    
    elif source == 'lessons':
        cur = conn.execute("""
            SELECT lesson, context, domain, confidence
            FROM lessons WHERE id = ?
        """, (item_id,))
        row = cur.fetchone()
        if row:
            return {
                'lesson': row[0],
                'context': row[1],
                'domain': row[2],
                'confidence': row[3]
            }
    
    elif source == 'entities':
        cur = conn.execute("""
            SELECT name, entity_type, description
            FROM entities WHERE id = ?
        """, (item_id,))
        row = cur.fetchone()
        if row:
            return {
                'name': row[0],
                'type': row[1],
                'description': row[2]
            }
    
    elif source == 'facts':
        cur = conn.execute("""
            SELECT subject_text, predicate, object_text
            FROM facts WHERE id = ?
        """, (item_id,))
        row = cur.fetchone()
        if row:
            return {
                'subject': row[0],
                'predicate': row[1],
                'object': row[2]
            }
    
    return {}


def search_with_content(conn, query: str, source: str = None, limit: int = 10):
    """Search and return results with full content."""
    if not load_sqlite_vec(conn):
        print("Cannot search without sqlite-vec extension", file=sys.stderr)
        return []
    
    embedding = generate_embedding(query)
    embedding_blob = serialize_embedding(embedding)
    
    results = []
    
    tables_to_search = []
    if source:
        vec_tables = {
            'events': 'vec_events',
            'lessons': 'vec_lessons', 
            'facts': 'vec_facts',
            'entities': 'vec_entities',
        }
        tables_to_search = [(source, vec_tables.get(source))]
    else:
        tables_to_search = [
            ('events', 'vec_events'),
            ('lessons', 'vec_lessons'),
            ('facts', 'vec_facts'),
            ('entities', 'vec_entities'),
        ]
    
    for src, vec_table in tables_to_search:
        if not vec_table:
            continue
        
        id_col = f"{src.rstrip('s')}_id" if src != 'entities' else 'entity_id'
        
        try:
            cur = conn.execute(f"""
                SELECT {id_col}, distance
                FROM {vec_table}
                WHERE embedding MATCH ?
                ORDER BY distance
                LIMIT ?
            """, (embedding_blob, limit))
            
            for row in cur.fetchall():
                content = get_content(conn, src, row[0])
                results.append({
                    'source': src,
                    'id': row[0],
                    'distance': round(row[1], 4),
                    'content': content
                })
        except sqlite3.OperationalError:
            pass
    
    results.sort(key=lambda x: x['distance'])
    return results[:limit]


def format_result(result: dict) -> str:
    """Format a single result for display."""
    source = result['source']
    content = result['content']
    distance = result['distance']
    
    lines = [f"[{source}] (distance: {distance})"]
    
    if source == 'events':
        lines.append(f"  📅 {content.get('date', 'unknown')[:10]} | {content.get('category', 'unknown')}")
        lines.append(f"  {content.get('summary', 'No summary')}")
        if content.get('details'):
            details = content['details'][:100] + '...' if len(content.get('details', '')) > 100 else content.get('details', '')
            lines.append(f"  └─ {details}")
    
    elif source == 'lessons':
        lines.append(f"  💡 [{content.get('domain', 'general')}] {content.get('lesson', 'No lesson')}")
        if content.get('context'):
            lines.append(f"  └─ Context: {content.get('context', '')[:80]}")
    
    elif source == 'entities':
        lines.append(f"  🏷️ {content.get('name', 'Unknown')} ({content.get('type', 'unknown')})")
        if content.get('description'):
            lines.append(f"  └─ {content.get('description', '')[:100]}")
    
    elif source == 'facts':
        lines.append(f"  📌 {content.get('subject', '?')} → {content.get('predicate', '?')} → {content.get('object', '?')}")
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='HexMem Semantic Search')
    parser.add_argument('query', help='Search query')
    parser.add_argument('--limit', '-l', type=int, default=5, help='Max results')
    parser.add_argument('--source', '-s', choices=['events', 'lessons', 'facts', 'entities'],
                       help='Limit to specific source')
    parser.add_argument('--json', '-j', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    # Suppress model loading messages
    import warnings
    warnings.filterwarnings('ignore')
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    
    conn = sqlite3.connect(get_db_path())
    results = search_with_content(conn, args.query, args.source, args.limit)
    conn.close()
    
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n🔍 Search: \"{args.query}\"\n")
        print("-" * 60)
        for result in results:
            print(format_result(result))
            print()


if __name__ == '__main__':
    main()
