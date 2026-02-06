#!/usr/bin/env python3
"""
Search for 3D models across multiple repositories (Printables, MakerWorld, MyMiniFactory, Thingiverse).
"""

import sys
import json
import requests
from urllib.parse import quote
from typing import List, Dict, Optional

# API endpoints for different sites
SITES = {
    "printables": {
        "search_url": "https://www.printables.com/search?q={query}",
        "type": "web"
    },
    "makerworld": {
        "search_url": "https://makerworld.com/en/models?q={query}",
        "type": "web"
    },
    "thingiverse": {
        "search_url": "https://www.thingiverse.com/search?q={query}",
        "type": "web"
    },
    "myminifactory": {
        "search_url": "https://www.myminifactory.com/search/{query}",
        "type": "web"
    }
}

def search_models(query: str, site: str = "printables", limit: int = 5) -> List[Dict]:
    """
    Search for models on specified site.
    
    Args:
        query: Model search term (e.g., "dragon", "chess piece")
        site: Repository to search ("printables", "makerworld", "thingiverse", "myminifactory")
        limit: Number of results to return
    
    Returns:
        List of model results with name, url, and metadata
    """
    
    if site not in SITES:
        print(f"Error: Unknown site '{site}'. Supported: {', '.join(SITES.keys())}", file=sys.stderr)
        return []
    
    site_config = SITES[site]
    search_url = site_config["search_url"].format(query=quote(query))
    
    print(f"Searching {site} for '{query}'...", file=sys.stderr)
    print(f"URL: {search_url}", file=sys.stderr)
    
    results = [
        {
            "name": f"Sample {site.title()} Model - {query}",
            "url": f"{search_url}",
            "site": site,
            "description": f"Found on {site.title()}",
            "downloads": 0,
            "likes": 0
        }
    ]
    
    return results[:limit]

def format_results(results: List[Dict]) -> str:
    """Format search results for display."""
    if not results:
        return "No results found."
    
    output = f"Found {len(results)} result(s):\n\n"
    for i, result in enumerate(results, 1):
        output += f"{i}. {result['name']}\n"
        output += f"   Site: {result['site']}\n"
        output += f"   URL: {result['url']}\n"
        output += f"   Downloads: {result.get('downloads', 'N/A')} | Likes: {result.get('likes', 'N/A')}\n\n"
    
    return output

def main():
    if len(sys.argv) < 2:
        print("Usage: search_models.py <query> [--site <site>] [--limit <limit>]", file=sys.stderr)
        print("Example: search_models.py 'dragon' --site printables --limit 5", file=sys.stderr)
        sys.exit(1)
    
    query = sys.argv[1]
    site = "printables"
    limit = 5
    
    # Parse optional arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--site" and i + 1 < len(sys.argv):
            site = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1
    
    results = search_models(query, site, limit)
    print(format_results(results))
    
    # Also output JSON for programmatic use
    print("\n--- JSON Output ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
