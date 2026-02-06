#!/usr/bin/env python3
"""
Index markdown files into ChromaDB for RAG retrieval.
Reads from memory/, session-digests/, repos/, and founder-logs/.

v0.3.0: Multi-collection architecture
- private_memories: main agent only (default)
- shared_memories: accessible to sandboxed agents  
- agent_learnings: insights from agent interactions (moltbook, etc.)
"""

import os
import sys
import glob
import hashlib
from pathlib import Path

# Support custom paths via environment
WORKSPACE = os.environ.get("RECALL_WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))
CHROMA_DIR = os.environ.get("RECALL_CHROMA_DB", os.path.expanduser("~/.openclaw/chroma-db"))
VENV_PATH = os.environ.get("RECALL_VENV", os.path.expanduser("~/.openclaw/rag-env"))

MEMORY_DIR = os.path.join(WORKSPACE, "memory")
DIGESTS_DIR = os.path.join(MEMORY_DIR, "session-digests")

# Chunking config
CHUNK_SIZE = 500  # characters
CHUNK_OVERLAP = 100

# Activate the venv
sys.path.insert(0, os.path.join(VENV_PATH, "lib/python3.12/site-packages"))
for pyver in ["python3.11", "python3.10"]:
    alt_path = os.path.join(VENV_PATH, f"lib/{pyver}/site-packages")
    if os.path.exists(alt_path):
        sys.path.insert(0, alt_path)

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"❌ Missing dependency: {e}", file=sys.stderr)
    print("Run 'npx jasper-recall setup' to install dependencies.", file=sys.stderr)
    sys.exit(1)


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


def get_file_hash(content: str) -> str:
    """Get MD5 hash of content."""
    return hashlib.md5(content.encode()).hexdigest()


def determine_collection(rel_path: str, content: str) -> str:
    """
    Determine which collection a file belongs to based on path and content.
    
    Returns: 'private', 'shared', or 'learnings'
    """
    rel_lower = rel_path.lower()
    content_lower = content.lower()
    
    # Agent learnings: moltbook insights, agent collaboration notes
    if any(x in rel_lower for x in ['moltbook/', 'learnings/', 'agent-insights/']):
        return 'learnings'
    if '[learning]' in content_lower or '[insight]' in content_lower:
        return 'learnings'
    
    # Shared: explicit shared folder or [public] tag
    if 'shared/' in rel_lower:
        return 'shared'
    if '[public]' in content_lower:
        return 'shared'
    
    # Default: private
    return 'private'


def index_to_collection(collection, model, filepath, rel_path, content, file_hash, stats):
    """Index a file's chunks into a specific collection."""
    filename = os.path.basename(filepath)
    
    # Check for existing chunks from this file
    try:
        existing = collection.get(
            where={"source": rel_path},
            include=[]
        )
    except Exception:
        existing = {'ids': []}
    
    if existing['ids']:
        # Check if hash matches (stored in first chunk's metadata)
        try:
            existing_meta = collection.get(
                ids=[existing['ids'][0]],
                include=["metadatas"]
            )
            if existing_meta['metadatas'] and existing_meta['metadatas'][0].get('file_hash') == file_hash:
                stats['skipped'] += 1
                return False
        except Exception:
            pass
        
        # File changed, delete old chunks
        collection.delete(ids=existing['ids'])
    
    # Chunk the content
    chunks = chunk_text(content)
    
    if not chunks:
        return False
    
    # Generate embeddings
    embeddings = model.encode(chunks).tolist()
    
    # Create IDs and metadata
    ids = [f"{rel_path}::{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "source": rel_path,
            "chunk_index": i,
            "file_hash": file_hash,
            "filename": filename,
        }
        for i in range(len(chunks))
    ]
    
    # Add to collection
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas
    )
    
    stats['chunks'] += len(chunks)
    stats['files'] += 1
    return True


def main():
    print("🦊 Jasper Recall — RAG Indexer v0.3.0")
    print("=" * 40)
    
    # Check if memory dir exists
    if not os.path.exists(MEMORY_DIR):
        print(f"⚠ Memory directory not found: {MEMORY_DIR}")
        print("Create some markdown files there first.")
        sys.exit(1)
    
    # Initialize embedding model (will download on first run)
    print("Loading embedding model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✓ Model loaded")
    
    # Initialize ChromaDB
    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Create collections with descriptions
    collections = {
        "private": client.get_or_create_collection(
            name="private_memories",
            metadata={"description": "Private agent memories - main agent only"}
        ),
        "shared": client.get_or_create_collection(
            name="shared_memories",
            metadata={"description": "Shared memories - accessible to sandboxed agents"}
        ),
        "learnings": client.get_or_create_collection(
            name="agent_learnings",
            metadata={"description": "Agent learnings and insights from interactions"}
        ),
    }
    
    # Also maintain legacy collection for backwards compatibility
    legacy_collection = client.get_or_create_collection(
        name="jasper_memory",
        metadata={"description": "Legacy collection - use specific collections instead"}
    )
    
    print(f"✓ Collections: private_memories, shared_memories, agent_learnings")
    
    # Gather files to index
    files_to_index = []
    
    # Session digests
    if os.path.exists(DIGESTS_DIR):
        files_to_index.extend(glob.glob(os.path.join(DIGESTS_DIR, "*.md")))
    
    # Daily notes and other memory files (but not subdirs)
    files_to_index.extend(glob.glob(os.path.join(MEMORY_DIR, "*.md")))
    
    # Repos documentation
    repos_dir = os.path.join(MEMORY_DIR, "repos")
    if os.path.exists(repos_dir):
        files_to_index.extend(glob.glob(os.path.join(repos_dir, "*.md")))
    
    # Founder Logs
    for logs_dir_name in ["founder-logs", "founderLogs"]:
        logs_dir = os.path.join(MEMORY_DIR, logs_dir_name)
        if os.path.exists(logs_dir):
            files_to_index.extend(glob.glob(os.path.join(logs_dir, "*.md")))
    
    # SOPs
    sops_dir = os.path.join(MEMORY_DIR, "sops")
    if os.path.exists(sops_dir):
        files_to_index.extend(glob.glob(os.path.join(sops_dir, "*.md")))
    
    # Shared memory (public content for sandboxed agents)
    shared_dir = os.path.join(MEMORY_DIR, "shared")
    if os.path.exists(shared_dir):
        files_to_index.extend(glob.glob(os.path.join(shared_dir, "*.md")))
        files_to_index.extend(glob.glob(os.path.join(shared_dir, "**/*.md"), recursive=True))
    
    # Moltbook learnings
    moltbook_dir = os.path.join(MEMORY_DIR, "shared", "moltbook")
    if os.path.exists(moltbook_dir):
        files_to_index.extend(glob.glob(os.path.join(moltbook_dir, "*.md")))
    
    # Remove duplicates while preserving order
    files_to_index = list(dict.fromkeys(files_to_index))
    
    print(f"Found {len(files_to_index)} files to index")
    
    # Track stats per collection
    stats = {
        "private": {"files": 0, "chunks": 0, "skipped": 0},
        "shared": {"files": 0, "chunks": 0, "skipped": 0},
        "learnings": {"files": 0, "chunks": 0, "skipped": 0},
        "legacy": {"files": 0, "chunks": 0, "skipped": 0},
    }
    
    for filepath in files_to_index:
        filename = os.path.basename(filepath)
        rel_path = os.path.relpath(filepath, WORKSPACE)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"  ⚠ Error reading {filename}: {e}")
            continue
        
        if not content.strip():
            continue
        
        file_hash = get_file_hash(content)
        
        # Determine target collection
        coll_key = determine_collection(rel_path, content)
        collection = collections[coll_key]
        
        # Index to the appropriate collection
        indexed = index_to_collection(
            collection, model, filepath, rel_path, content, file_hash, stats[coll_key]
        )
        
        # Also index to legacy collection for backwards compatibility
        index_to_collection(
            legacy_collection, model, filepath, rel_path, content, file_hash, stats["legacy"]
        )
        
        if indexed:
            print(f"  ✓ {filename} → {coll_key} ({stats[coll_key]['chunks']} chunks)")
    
    print("=" * 40)
    print("✓ Indexing complete")
    for key, s in stats.items():
        if key == "legacy":
            continue
        if s['files'] > 0 or s['skipped'] > 0:
            print(f"  {key}: {s['files']} files ({s['chunks']} chunks), {s['skipped']} skipped")
    print(f"  Database: {CHROMA_DIR}")


if __name__ == "__main__":
    main()
