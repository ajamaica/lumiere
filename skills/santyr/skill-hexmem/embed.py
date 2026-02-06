#!/usr/bin/env python3
"""
HexMem Embedding Generator

Generates vector embeddings for semantic search using sentence-transformers.
Run with: python embed.py [--process-queue] [--init-vec]
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

# Lazy imports for heavy libraries
_model = None
_vec_loaded = False


def get_db_path():
    """Get database path from environment or default."""
    return os.environ.get("HEXMEM_DB", os.path.expanduser("~/clawd/hexmem/hexmem.db"))


def load_sqlite_vec(conn):
    """Load sqlite-vec extension into connection."""
    global _vec_loaded
    if _vec_loaded:
        return True
    
    try:
        import sqlite_vec
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.enable_load_extension(False)
        _vec_loaded = True
        return True
    except Exception as e:
        print(f"Warning: Could not load sqlite-vec: {e}", file=sys.stderr)
        return False


def get_embedding_model():
    """Lazy-load the embedding model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector for text."""
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.astype('float32').tolist()


def serialize_embedding(embedding: list[float]) -> bytes:
    """Serialize embedding to binary format for sqlite-vec."""
    import struct
    return struct.pack(f'{len(embedding)}f', *embedding)


def init_vec_tables(conn):
    """Initialize vec0 virtual tables for vector search."""
    if not load_sqlite_vec(conn):
        print("Cannot initialize vec tables without sqlite-vec extension")
        return False
    
    # Get embedding dimensions from config
    cur = conn.execute("SELECT dimensions FROM embedding_config WHERE id = 1")
    row = cur.fetchone()
    dimensions = row[0] if row else 384
    
    # Create vec0 virtual tables for each source
    tables = [
        ("vec_events", "event_id"),
        ("vec_lessons", "lesson_id"),
        ("vec_facts", "fact_id"),
        ("vec_entities", "entity_id"),
        ("vec_seeds", "seed_id"),
    ]
    
    for table_name, id_col in tables:
        try:
            conn.execute(f"""
                CREATE VIRTUAL TABLE IF NOT EXISTS {table_name} USING vec0(
                    {id_col} INTEGER PRIMARY KEY,
                    embedding float[{dimensions}]
                )
            """)
            print(f"Created/verified {table_name}")
        except sqlite3.OperationalError as e:
            if "already exists" not in str(e):
                print(f"Error creating {table_name}: {e}")
    
    conn.commit()
    return True


def process_queue(conn, limit: int = 100):
    """Process pending items in the embedding queue."""
    if not load_sqlite_vec(conn):
        print("Cannot process queue without sqlite-vec extension")
        return 0
    
    # Get pending items
    cur = conn.execute("""
        SELECT id, source_table, source_id, text_to_embed 
        FROM embedding_queue 
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT ?
    """, (limit,))
    
    pending = cur.fetchall()
    if not pending:
        print("No pending items in queue")
        return 0
    
    print(f"Processing {len(pending)} items...")
    
    # Table name mapping
    vec_tables = {
        'events': ('vec_events', 'event_id'),
        'lessons': ('vec_lessons', 'lesson_id'),
        'facts': ('vec_facts', 'fact_id'),
        'entities': ('vec_entities', 'entity_id'),
        'memory_seeds': ('vec_seeds', 'seed_id'),
    }
    
    processed = 0
    for queue_id, source_table, source_id, text in pending:
        try:
            # Generate embedding
            embedding = generate_embedding(text)
            embedding_blob = serialize_embedding(embedding)
            
            # Get vec table info
            vec_table, id_col = vec_tables.get(source_table, (None, None))
            if not vec_table:
                raise ValueError(f"Unknown source table: {source_table}")
            
            # Insert into vec table
            conn.execute(f"""
                INSERT OR REPLACE INTO {vec_table} ({id_col}, embedding)
                VALUES (?, ?)
            """, (source_id, embedding_blob))
            
            # Mark as done
            conn.execute("""
                UPDATE embedding_queue 
                SET status = 'done', processed_at = datetime('now')
                WHERE id = ?
            """, (queue_id,))
            
            processed += 1
            if processed % 10 == 0:
                print(f"  Processed {processed}/{len(pending)}...")
                conn.commit()
                
        except Exception as e:
            # Mark as failed
            conn.execute("""
                UPDATE embedding_queue 
                SET status = 'failed', error_message = ?, processed_at = datetime('now')
                WHERE id = ?
            """, (str(e), queue_id))
    
    conn.commit()
    print(f"Processed {processed} items")
    return processed


def search_similar(conn, query: str, source_table: str = None, limit: int = 10):
    """Search for similar items using vector similarity."""
    if not load_sqlite_vec(conn):
        print("Cannot search without sqlite-vec extension")
        return []
    
    # Generate query embedding
    embedding = generate_embedding(query)
    embedding_blob = serialize_embedding(embedding)
    
    results = []
    
    # Search each vec table (or just the specified one)
    tables_to_search = []
    if source_table:
        vec_tables = {
            'events': 'vec_events',
            'lessons': 'vec_lessons',
            'facts': 'vec_facts',
            'entities': 'vec_entities',
            'memory_seeds': 'vec_seeds',
        }
        tables_to_search = [(source_table, vec_tables.get(source_table))]
    else:
        tables_to_search = [
            ('events', 'vec_events'),
            ('lessons', 'vec_lessons'),
            ('facts', 'vec_facts'),
            ('entities', 'vec_entities'),
        ]
    
    for source, vec_table in tables_to_search:
        if not vec_table:
            continue
        
        id_col = f"{source.rstrip('s')}_id" if source != 'entities' else 'entity_id'
        if source == 'memory_seeds':
            id_col = 'seed_id'
        
        try:
            cur = conn.execute(f"""
                SELECT {id_col}, distance
                FROM {vec_table}
                WHERE embedding MATCH ?
                ORDER BY distance
                LIMIT ?
            """, (embedding_blob, limit))
            
            for row in cur.fetchall():
                results.append({
                    'source': source,
                    'id': row[0],
                    'distance': row[1],
                })
        except sqlite3.OperationalError as e:
            # Table might not exist yet
            pass
    
    # Sort by distance
    results.sort(key=lambda x: x['distance'])
    return results[:limit]


def main():
    parser = argparse.ArgumentParser(description='HexMem Embedding Generator')
    parser.add_argument('--init-vec', action='store_true', 
                       help='Initialize vec0 virtual tables')
    parser.add_argument('--process-queue', action='store_true',
                       help='Process pending items in embedding queue')
    parser.add_argument('--limit', type=int, default=100,
                       help='Max items to process (default: 100)')
    parser.add_argument('--search', type=str,
                       help='Search for similar items')
    parser.add_argument('--source', type=str,
                       help='Limit search to source table (events, lessons, etc)')
    parser.add_argument('--stats', action='store_true',
                       help='Show embedding queue stats')
    
    args = parser.parse_args()
    
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    
    if args.init_vec:
        init_vec_tables(conn)
    
    if args.process_queue:
        process_queue(conn, args.limit)
    
    if args.search:
        results = search_similar(conn, args.search, args.source, args.limit)
        print(json.dumps(results, indent=2))
    
    if args.stats:
        cur = conn.execute("SELECT * FROM v_embedding_stats")
        print("Embedding Queue Stats:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]} = {row[2]}")
    
    if not any([args.init_vec, args.process_queue, args.search, args.stats]):
        parser.print_help()
    
    conn.close()


if __name__ == '__main__':
    main()
