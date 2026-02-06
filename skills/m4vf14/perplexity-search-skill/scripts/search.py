#!/usr/bin/env python3
"""
Perplexity Search API wrapper

Usage:
    search.py <query> [--count N] [--recency FILTER]

Examples:
    search.py "golf coaching trends 2024"
    search.py "AI market research" --count 10
    search.py "recent AI news" --recency week
"""

import argparse
import json
import os
import re
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def sanitize_output(text: str) -> str:
    """Strip ANSI control codes and other potentially dangerous characters"""
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


def search_perplexity(query: str, count: int = 5, recency: str = None) -> dict:
    """
    Search using Perplexity Search API
    
    Args:
        query: Search query string
        count: Number of results (1-10)
        recency: Optional recency filter (day/week/month/year)
    
    Returns:
        Dict with 'results' list containing search results
    """
    api_key = os.environ.get("PERPLEXITY_API_KEY")
    if not api_key:
        raise ValueError(
            "PERPLEXITY_API_KEY environment variable not set. "
            "Set it in ~/.openclaw/openclaw.json under skills.perplexity-search.env.PERPLEXITY_API_KEY"
        )
    
    # Build request
    url = "https://api.perplexity.ai/search"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "max_results": min(max(count, 1), 10)  # Clamp between 1-10
    }
    
    if recency:
        payload["recency_filter"] = recency
    
    # Make request with timeout
    req = Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        # Add 30 second timeout
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        # Sanitize error body before exposing
        error_body = e.read().decode('utf-8')
        # Only show HTTP status code, not full error details
        raise Exception(f"Perplexity API error (HTTP {e.code})")
    except URLError as e:
        raise Exception(f"Network error: {e.reason}")


def main():
    parser = argparse.ArgumentParser(
        description="Search the web using Perplexity Search API"
    )
    parser.add_argument("query", help="Search query")
    parser.add_argument(
        "--count", "-n",
        type=int,
        default=5,
        help="Number of results (1-10, default: 5)"
    )
    parser.add_argument(
        "--recency", "-r",
        choices=["day", "week", "month", "year"],
        help="Filter by recency (day/week/month/year)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON instead of formatted results"
    )
    
    args = parser.parse_args()
    
    try:
        results = search_perplexity(args.query, args.count, args.recency)
        
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            # Format results for human readability
            if "results" in results and results["results"]:
                print(f"Search: {sanitize_output(args.query)}")
                print(f"Found {len(results['results'])} results\n")
                
                for i, result in enumerate(results["results"], 1):
                    title = sanitize_output(result.get('title', 'No title'))
                    url = result.get('url', 'N/A')
                    print(f"{i}. {title}")
                    print(f"   URL: {url}")
                    if result.get('snippet'):
                        snippet = sanitize_output(result['snippet'][:200])
                        print(f"   {snippet}...")
                    print()
            else:
                print("No results found.")
    
    except ValueError as e:
        # Don't expose API key in error messages
        print(f"Configuration error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
