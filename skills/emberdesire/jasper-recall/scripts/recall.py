#!/usr/bin/env python3
"""
RAG recall: Search agent memory for relevant context.
Usage: recall "query" [--limit N] [--json] [--verbose] [--collection NAME]

v0.3.0: Multi-collection support
- private_memories: main agent only (default for main agent)
- shared_memories: accessible to sandboxed agents
- agent_learnings: insights from agent interactions
- all: search all collections (main agent only)
"""

import os
import sys
import argparse
import json

# Support custom paths via environment
CHROMA_DIR = os.environ.get("RECALL_CHROMA_DB", os.path.expanduser("~/.openclaw/chroma-db"))
VENV_PATH = os.environ.get("RECALL_VENV", os.path.expanduser("~/.openclaw/rag-env"))

# Collection names
COLLECTIONS = {
    "private": "private_memories",
    "shared": "shared_memories",
    "learnings": "agent_learnings",
    "legacy": "jasper_memory",
}

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


def search_collection(collection, query_embedding, limit):
    """Search a single collection and return results."""
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"]
        )
        return results
    except Exception as e:
        return None


def merge_results(all_results, limit):
    """Merge and sort results from multiple collections by similarity."""
    merged = []
    
    for coll_name, results in all_results.items():
        if not results or not results['documents'][0]:
            continue
        
        for doc, meta, dist in zip(
            results['documents'][0],
            results['metadatas'][0],
            results['distances'][0]
        ):
            merged.append({
                "collection": coll_name,
                "document": doc,
                "metadata": meta,
                "distance": dist,
                "similarity": 1 - dist
            })
    
    # Sort by similarity (descending)
    merged.sort(key=lambda x: x['similarity'], reverse=True)
    
    return merged[:limit]


def main():
    parser = argparse.ArgumentParser(description="Search agent memory")
    parser.add_argument("query", help="Search query")
    parser.add_argument("-n", "--limit", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("-v", "--verbose", action="store_true", help="Show similarity scores")
    parser.add_argument("--public-only", action="store_true", 
                        help="Only search shared content (for sandboxed agents)")
    parser.add_argument("-c", "--collection", choices=["private", "shared", "learnings", "all", "legacy"],
                        default=None, help="Specific collection to search (default: all for main, shared for --public-only)")
    args = parser.parse_args()
    
    if not os.path.exists(CHROMA_DIR):
        print("❌ No index found. Run 'index-digests' first.", file=sys.stderr)
        sys.exit(1)
    
    # Load model and database
    model = SentenceTransformer('all-MiniLM-L6-v2')
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Determine which collections to search
    if args.public_only:
        # Sandboxed agents: only shared + learnings (public content)
        if args.collection:
            if args.collection not in ["shared", "learnings"]:
                print(f"❌ --public-only restricts to 'shared' or 'learnings' collections", file=sys.stderr)
                sys.exit(1)
            search_collections = [args.collection]
        else:
            search_collections = ["shared", "learnings"]
    elif args.collection:
        if args.collection == "all":
            search_collections = ["private", "shared", "learnings"]
        else:
            search_collections = [args.collection]
    else:
        # Default for main agent: search all collections
        search_collections = ["private", "shared", "learnings"]
    
    # Get collections
    collections_to_query = {}
    for coll_key in search_collections:
        coll_name = COLLECTIONS.get(coll_key, coll_key)
        try:
            collections_to_query[coll_key] = client.get_collection(coll_name)
        except Exception:
            # Collection doesn't exist yet, skip
            pass
    
    if not collections_to_query:
        # Fallback to legacy collection
        try:
            collections_to_query["legacy"] = client.get_collection("jasper_memory")
        except Exception:
            print("❌ No collections found. Run 'index-digests' first.", file=sys.stderr)
            sys.exit(1)
    
    # Embed query
    query_embedding = model.encode([args.query])[0].tolist()
    
    # Search each collection
    all_results = {}
    for coll_key, collection in collections_to_query.items():
        results = search_collection(collection, query_embedding, args.limit * 2)
        if results:
            all_results[coll_key] = results
    
    # Merge and limit results
    merged = merge_results(all_results, args.limit)
    
    if not merged:
        if args.json:
            print("[]")
        else:
            print(f"🔍 No results for: \"{args.query}\"")
        return
    
    if args.json:
        output = []
        for i, item in enumerate(merged):
            output.append({
                "rank": i + 1,
                "collection": item["collection"],
                "source": item["metadata"].get("source", "unknown"),
                "similarity": round(item["similarity"], 3),
                "content": item["document"]
            })
        print(json.dumps(output, indent=2))
    else:
        searched = ", ".join(search_collections)
        print(f"🔍 Results for: \"{args.query}\" (searched: {searched})\n")
        
        for i, item in enumerate(merged):
            similarity = item["similarity"]
            score_str = f" ({similarity:.1%})" if args.verbose else ""
            source = item["metadata"].get("source", "unknown")
            coll_tag = f"[{item['collection']}] " if len(search_collections) > 1 else ""
            
            print(f"━━━ [{i+1}] {coll_tag}{source}{score_str} ━━━")
            # Truncate long content
            content = item["document"]
            content = content[:500] + "..." if len(content) > 500 else content
            print(content)
            print()


if __name__ == "__main__":
    main()
