#!/usr/bin/env python3
"""
Background Image Search
Searches Unsplash or Pexels for images matching story sections.
"""

import json
import os
import requests
from pathlib import Path
from typing import List, Dict

def search_unsplash(query: str, per_page: int = 5) -> List[str]:
    """
    Search Unsplash for images matching query.
    Returns list of image URLs.
    """
    api_key = os.getenv("UNSPLASH_API_KEY", "")
    
    # Try with API key first, fallback to public access
    headers = {}
    if api_key:
        headers["Authorization"] = f"Client-ID {api_key}"
    
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": per_page,
        "order_by": "relevant"
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract download URLs
        urls = [photo["links"]["download"] for photo in data.get("results", [])]
        return urls
    except Exception as e:
        print(f"⚠️  Unsplash search failed: {e}")
        return []

def search_pexels(query: str, per_page: int = 5) -> List[str]:
    """
    Search Pexels for images matching query.
    Returns list of image URLs.
    """
    api_key = os.getenv("PEXELS_API_KEY", "")
    
    if not api_key:
        print("⚠️  PEXELS_API_KEY not set, skipping Pexels search")
        return []
    
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    params = {
        "query": query,
        "per_page": per_page
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract download URLs
        urls = [photo["src"]["large"] for photo in data.get("photos", [])]
        return urls
    except Exception as e:
        print(f"⚠️  Pexels search failed: {e}")
        return []

def search_images(
    sections: List[Dict],
    source: str = "unsplash",
    cache_dir: str = "/tmp/story-video-cache"
) -> Dict[int, str]:
    """
    Search for images for each section.
    
    Args:
        sections: List of {start_time, end_time, search_query}
        source: unsplash or pexels
        cache_dir: Directory to cache downloaded images
    
    Returns:
        Dict mapping section index to image file path
    """
    Path(cache_dir).mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    for i, section in enumerate(sections):
        query = section.get("search_query", "")
        print(f"🔍 Section {i}: Searching for '{query}'")
        
        # Try primary source first
        if source == "unsplash":
            urls = search_unsplash(query)
        elif source == "pexels":
            urls = search_pexels(query)
        else:
            urls = []
        
        # Fallback to other sources if needed
        if not urls:
            print(f"   Falling back to alternative source...")
            urls = search_unsplash(query) if source != "unsplash" else search_pexels(query)
        
        if urls:
            # Download first result
            image_url = urls[0]
            image_path = Path(cache_dir) / f"section_{i:02d}.jpg"
            
            try:
                response = requests.get(image_url, timeout=10)
                response.raise_for_status()
                
                with open(image_path, "wb") as f:
                    f.write(response.content)
                
                results[i] = str(image_path)
                print(f"   ✅ Downloaded: {image_path}")
            except Exception as e:
                print(f"   ⚠️  Download failed: {e}")
        else:
            print(f"   ⚠️  No images found for this section")
    
    return results

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Search for background images")
    parser.add_argument("--config", required=True, help="Config JSON with sections")
    parser.add_argument("--source", default="unsplash", help="Image source (unsplash/pexels)")
    parser.add_argument("--output", required=True, help="Output JSON with image paths")
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config) as f:
        config = json.load(f)
    
    # Search for images
    results = search_images(config.get("sections", []), source=args.source)
    
    # Save results
    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Image search complete: {args.output}")
    print(f"   Found: {len(results)}/{len(config.get('sections', []))} images")

if __name__ == "__main__":
    main()
