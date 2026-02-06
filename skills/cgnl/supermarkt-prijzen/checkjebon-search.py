#!/usr/bin/env python3
"""
Checkjebon.nl Multi-Supermarket Search
Search and compare prices across 12 Dutch supermarkets

Usage:
  ./checkjebon-search.py --query "melk" --limit 10
  ./checkjebon-search.py --query "campina" --store jumbo
  ./checkjebon-search.py --compare "melk" --top 3
"""
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
import urllib.request

# Data file location
DATA_FILE = Path("/tmp/checkjebon-supermarkets.json")
DATA_URL = "https://raw.githubusercontent.com/supermarkt/checkjebon/main/data/supermarkets.json"

def download_data(force=False):
    """Download latest supermarket data"""
    if DATA_FILE.exists() and not force:
        # Check if file is recent (< 24h old)
        age_hours = (datetime.now().timestamp() - DATA_FILE.stat().st_mtime) / 3600
        if age_hours < 24:
            return
    
    print(f"📥 Downloading latest data from Checkjebon.nl...", file=sys.stderr)
    urllib.request.urlretrieve(DATA_URL, DATA_FILE)
    print(f"✅ Downloaded {DATA_FILE.stat().st_size / 1024 / 1024:.1f}MB", file=sys.stderr)

def load_data():
    """Load supermarket data"""
    if not DATA_FILE.exists():
        download_data()
    
    with open(DATA_FILE) as f:
        return json.load(f)

def search_products(query, store=None, limit=20):
    """
    Search products across supermarkets
    
    Args:
        query: Search query (product name)
        store: Filter by store name (ah, jumbo, etc.) or None for all
        limit: Max results per store
    
    Returns:
        dict with results per store
    """
    data = load_data()
    query_lower = query.lower()
    results = {}
    
    for supermarket in data:
        store_name = supermarket['n']
        
        # Skip if filtering by specific store
        if store and store_name.lower() != store.lower():
            continue
        
        # Search products
        matches = []
        for product in supermarket['d']:
            if query_lower in product['n'].lower():
                matches.append({
                    "name": product['n'],
                    "price": product['p'],
                    "size": product['s'],
                    "link": f"https://www.{store_name}.nl/{product['l']}" if 'l' in product else None,
                    "price_per_unit": calculate_unit_price(product['p'], product['s'])
                })
        
        # Sort by price
        matches.sort(key=lambda x: x['price'])
        
        if matches:
            results[store_name.upper()] = matches[:limit]
    
    return results

def calculate_unit_price(price, size):
    """Calculate price per kg/liter"""
    try:
        # Parse size (e.g. "1,5 l", "500 g", "2 stuks")
        size_lower = size.lower()
        
        # Extract number
        num_str = ''.join(c for c in size if c.isdigit() or c == ',' or c == '.')
        num_str = num_str.replace(',', '.')
        if not num_str:
            return None
        amount = float(num_str)
        
        # Convert to standard units
        if 'ml' in size_lower:
            amount /= 1000  # ml to l
        elif 'g' in size_lower and 'kg' not in size_lower:
            amount /= 1000  # g to kg
        elif 'stuks' in size_lower or 'st' in size_lower:
            return price / amount  # price per piece
        
        if amount > 0:
            return price / amount
    except:
        pass
    return None

def compare_prices(query, top=5):
    """
    Find cheapest products across all stores
    
    Args:
        query: Search query
        top: Number of cheapest options to return
    
    Returns:
        List of cheapest products with store info
    """
    results = search_products(query, store=None, limit=50)
    
    # Flatten results
    all_products = []
    for store, products in results.items():
        for product in products:
            all_products.append({
                **product,
                "store": store
            })
    
    # Sort by price
    all_products.sort(key=lambda x: x['price'])
    
    return all_products[:top]

def main():
    parser = argparse.ArgumentParser(description="Search Checkjebon.nl supermarket prices")
    parser.add_argument("--query", "-q", help="Search query")
    parser.add_argument("--store", "-s", help="Filter by store (ah, jumbo, plus, etc.)")
    parser.add_argument("--limit", "-l", type=int, default=10, help="Max results per store")
    parser.add_argument("--compare", "-c", help="Compare prices across all stores")
    parser.add_argument("--top", "-t", type=int, default=5, help="Top N cheapest (with --compare)")
    parser.add_argument("--pretty", action="store_true", help="Pretty JSON output")
    parser.add_argument("--refresh", action="store_true", help="Force download latest data")
    parser.add_argument("--stats", action="store_true", help="Show data statistics")
    
    args = parser.parse_args()
    
    if args.refresh:
        download_data(force=True)
    
    if args.stats:
        data = load_data()
        print(json.dumps({
            "total_stores": len(data),
            "stores": {s['n'].upper(): len(s['d']) for s in data},
            "total_products": sum(len(s['d']) for s in data),
            "data_file": str(DATA_FILE),
            "data_size_mb": DATA_FILE.stat().st_size / 1024 / 1024
        }, indent=2))
        return
    
    if args.compare:
        results = compare_prices(args.compare, args.top)
        output = {
            "query": args.compare,
            "total_found": len(results),
            "cheapest": results
        }
    elif args.query:
        results = search_products(args.query, args.store, args.limit)
        output = {
            "query": args.query,
            "store_filter": args.store,
            "stores_searched": len(results),
            "results": results
        }
    else:
        parser.print_help()
        return
    
    # Print output
    json_str = json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False)
    print(json_str)

if __name__ == "__main__":
    main()
