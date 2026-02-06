#!/usr/bin/env python3
"""
Index markdown files into ChromaDB for RAG retrieval.
Reads from memory/, session-digests/, repos/, and founder-logs/.
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


def main():
    print("🦊 Jasper Recall — RAG Indexer")
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
    
    # Get or create collection
    collection = client.get_or_create_collection(
        name="jasper_memory",
        metadata={"description": "Agent session digests and memory files"}
    )
    
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
    
    print(f"Found {len(files_to_index)} files to index")
    
    # Track stats
    total_chunks = 0
    indexed_files = 0
    skipped_files = 0
    
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
        
        # Check if already indexed with same hash
        file_hash = get_file_hash(content)
        
        # Check for existing chunks from this file
        existing = collection.get(
            where={"source": rel_path},
            include=[]
        )
        
        if existing['ids']:
            # Check if hash matches (stored in first chunk's metadata)
            existing_meta = collection.get(
                ids=[existing['ids'][0]],
                include=["metadatas"]
            )
            if existing_meta['metadatas'] and existing_meta['metadatas'][0].get('file_hash') == file_hash:
                skipped_files += 1
                continue
            
            # File changed, delete old chunks
            collection.delete(ids=existing['ids'])
        
        # Chunk the content
        chunks = chunk_text(content)
        
        if not chunks:
            continue
        
        # Generate embeddings
        embeddings = model.encode(chunks).tolist()
        
        # Create IDs and metadata
        ids = [f"{rel_path}::{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source": rel_path,
                "chunk_index": i,
                "file_hash": file_hash,
                "filename": filename
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
        
        total_chunks += len(chunks)
        indexed_files += 1
        print(f"  ✓ {filename}: {len(chunks)} chunks")
    
    print("=" * 40)
    print(f"✓ Indexed {indexed_files} files ({total_chunks} chunks)")
    print(f"  Skipped {skipped_files} unchanged files")
    print(f"  Database: {CHROMA_DIR}")


if __name__ == "__main__":
    main()
