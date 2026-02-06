#!/usr/bin/env python3
"""
Fetch active markets from Polymarket.

Usage:
    python fetch_markets.py [--output markets.json] [--min-volume 1000]

Output:
    JSON file containing market data with probabilities and volumes
"""

import json
import sys
import argparse
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: Missing dependencies. Install with:", file=sys.stderr)
    print("  pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)


def fetch_polymarket_homepage():
    """Fetch and parse the Polymarket homepage."""
    url = "https://polymarket.com"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching Polymarket: {e}", file=sys.stderr)
        sys.exit(1)


def parse_market_volume(volume_str):
    """Convert volume string like '$8m' to integer."""
    if not volume_str:
        return 0
    
    volume_str = volume_str.strip().lower().replace('$', '').replace(',', '')
    
    multipliers = {'k': 1000, 'm': 1_000_000, 'b': 1_000_000_000}
    
    for suffix, mult in multipliers.items():
        if suffix in volume_str:
            try:
                return int(float(volume_str.replace(suffix, '')) * mult)
            except ValueError:
                return 0
    
    try:
        return int(float(volume_str))
    except ValueError:
        return 0


def extract_markets(html):
    """Extract market data from Polymarket HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    markets = []
    
    # Find all market links
    market_links = soup.find_all('a', href=lambda x: x and '/event/' in x)
    
    for link in market_links:
        href = link.get('href', '')
        if not href.startswith('/event/'):
            continue
        
        # Extract market ID from URL
        market_id = href.replace('/event/', '').split('/')[0]
        
        # Get market title (try to find it in the link or parent)
        title = link.get_text(strip=True)
        if not title or len(title) < 5:
            # Try parent elements
            parent = link.parent
            if parent:
                title = parent.get_text(strip=True)[:200]
        
        # Look for probabilities (percentage signs)
        prob_elements = link.find_all(string=lambda x: x and '%' in str(x))
        probabilities = []
        for prob in prob_elements:
            try:
                prob_val = float(str(prob).replace('%', '').strip())
                probabilities.append(prob_val)
            except ValueError:
                continue
        
        # Look for volume
        volume_str = ''
        vol_elements = link.find_all(string=lambda x: x and 'Vol' in str(x))
        if vol_elements:
            volume_str = vol_elements[0].strip()
        
        volume = parse_market_volume(volume_str)
        
        if title and probabilities:
            markets.append({
                'market_id': market_id,
                'title': title,
                'url': f'https://polymarket.com{href}',
                'probabilities': probabilities,
                'volume': volume,
                'volume_str': volume_str,
                'outcome_count': len(probabilities),
                'prob_sum': sum(probabilities),
                'fetched_at': datetime.utcnow().isoformat()
            })
    
    return markets


def filter_markets(markets, min_volume=0):
    """Filter markets by minimum volume."""
    if min_volume > 0:
        markets = [m for m in markets if m['volume'] >= min_volume]
    
    # Remove duplicates (same market_id)
    seen = set()
    unique_markets = []
    for m in markets:
        if m['market_id'] not in seen:
            seen.add(m['market_id'])
            unique_markets.append(m)
    
    return unique_markets


def main():
    parser = argparse.ArgumentParser(description='Fetch Polymarket markets')
    parser.add_argument('--output', default='markets.json', help='Output JSON file')
    parser.add_argument('--min-volume', type=int, default=0, help='Minimum volume filter')
    parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    
    args = parser.parse_args()
    
    print("Fetching Polymarket homepage...", file=sys.stderr)
    html = fetch_polymarket_homepage()
    
    print("Parsing markets...", file=sys.stderr)
    markets = extract_markets(html)
    
    print(f"Found {len(markets)} markets", file=sys.stderr)
    
    markets = filter_markets(markets, args.min_volume)
    
    print(f"After filtering: {len(markets)} markets", file=sys.stderr)
    
    # Write output
    output_data = {
        'fetched_at': datetime.utcnow().isoformat(),
        'market_count': len(markets),
        'markets': markets
    }
    
    with open(args.output, 'w') as f:
        if args.pretty:
            json.dump(output_data, f, indent=2)
        else:
            json.dump(output_data, f)
    
    print(f"Saved to {args.output}", file=sys.stderr)
    
    # Print summary to stdout
    print(json.dumps({
        'success': True,
        'market_count': len(markets),
        'output_file': args.output
    }))


if __name__ == '__main__':
    main()
