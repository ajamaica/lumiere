#!/usr/bin/env python3
"""
Write a learning to the agent_learnings collection.
Designed for sandboxed agents to contribute back to shared memory.

Usage:
  write-learning "Brief title" "Learning content..."
  write-learning --agent moltbook "Title" "Content"
  write-learning --category engagement "Title" "Content"
  write-learning --dry-run "Title" "Content"
"""

import os
import sys
import argparse
import json
import hashlib
from datetime import datetime
from pathlib import Path

# Support custom paths via environment
WORKSPACE = os.environ.get("RECALL_WORKSPACE", os.path.expanduser("~/.openclaw/workspace"))
CHROMA_DIR = os.environ.get("RECALL_CHROMA_DB", os.path.expanduser("~/.openclaw/chroma-db"))
VENV_PATH = os.environ.get("RECALL_VENV", os.path.expanduser("~/.openclaw/rag-env"))

SHARED_DIR = os.path.join(WORKSPACE, "memory", "shared")
LEARNINGS_FILE = os.path.join(SHARED_DIR, "agent-learnings.md")

COLLECTION_LEARNINGS = "agent_learnings"

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


def generate_id(title: str, agent: str, timestamp: str) -> str:
    """Generate a unique ID for the learning."""
    content = f"{agent}:{title}:{timestamp}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def append_to_learnings_file(title: str, content: str, agent: str, category: str, dry_run: bool = False):
    """Append learning to the markdown file for human readability."""
    os.makedirs(os.path.dirname(LEARNINGS_FILE), exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    date = datetime.now().strftime("%Y-%m-%d")
    
    entry = f"\n## {date} [{category}] - {title}\n"
    entry += f"*Agent: {agent} | {timestamp}*\n\n"
    entry += f"{content}\n"
    
    if dry_run:
        print("\n📄 Would append to agent-learnings.md:")
        print("-" * 40)
        print(entry)
        return
    
    # Create file with header if it doesn't exist
    if not os.path.exists(LEARNINGS_FILE):
        with open(LEARNINGS_FILE, 'w') as f:
            f.write("# Agent Learnings\n\n")
            f.write("Insights and learnings contributed by sandboxed agents.\n\n")
            f.write("---\n")
    
    # Append entry
    with open(LEARNINGS_FILE, 'a') as f:
        f.write(entry)
    
    print(f"📄 Added to {os.path.relpath(LEARNINGS_FILE, WORKSPACE)}")


def index_to_chromadb(title: str, content: str, agent: str, category: str, dry_run: bool = False):
    """Index the learning directly to ChromaDB."""
    if dry_run:
        print("\n🗄️ Would index to agent_learnings collection")
        return
    
    # Initialize
    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    collection = client.get_or_create_collection(
        name=COLLECTION_LEARNINGS,
        metadata={"description": "Learnings written by sandboxed agents"}
    )
    
    # Load model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Prepare document
    timestamp = datetime.now().isoformat()
    doc_id = generate_id(title, agent, timestamp)
    
    # Combine title and content for embedding
    full_text = f"{title}\n\n{content}"
    embedding = model.encode([full_text])[0].tolist()
    
    metadata = {
        "source": f"agent-learnings/{agent}/{doc_id}",
        "filename": "agent-learnings.md",
        "agent": agent,
        "category": category,
        "title": title,
        "timestamp": timestamp,
    }
    
    # Add to collection
    collection.add(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[full_text],
        metadatas=[metadata]
    )
    
    print(f"🗄️ Indexed to {COLLECTION_LEARNINGS} (id: {doc_id})")


def main():
    parser = argparse.ArgumentParser(description="Write a learning to shared memory")
    parser.add_argument("title", help="Brief title for the learning")
    parser.add_argument("content", help="Learning content/description")
    parser.add_argument("--agent", default="unknown", help="Agent name (e.g., moltbook, coder)")
    parser.add_argument("--category", default="insight", 
                       choices=["insight", "engagement", "pattern", "bug", "success", "failure"],
                       help="Category of learning")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    # Validate inputs
    if len(args.title) > 200:
        print("❌ Title too long (max 200 chars)", file=sys.stderr)
        sys.exit(1)
    
    if len(args.content) > 5000:
        print("❌ Content too long (max 5000 chars)", file=sys.stderr)
        sys.exit(1)
    
    print(f"📝 Writing learning from agent '{args.agent}'...")
    print(f"   Category: {args.category}")
    print(f"   Title: {args.title}")
    
    if args.dry_run:
        print("\n(DRY RUN - no changes will be made)")
    
    # Write to both file and ChromaDB
    append_to_learnings_file(args.title, args.content, args.agent, args.category, args.dry_run)
    index_to_chromadb(args.title, args.content, args.agent, args.category, args.dry_run)
    
    if not args.dry_run:
        print("\n✅ Learning saved!")
        
        if args.json:
            print(json.dumps({
                "success": True,
                "title": args.title,
                "agent": args.agent,
                "category": args.category
            }))


if __name__ == "__main__":
    main()
