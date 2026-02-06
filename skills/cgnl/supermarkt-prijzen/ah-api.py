#!/usr/bin/env python3
"""
Albert Heijn API Client
Supports both bonuses (GraphQL) and product search (REST API)

Usage:
  # Fetch bonuses
  ./ah-api.py bonuses --filter WEB_BONUS_PAGE
  
  # Search products
  ./ah-api.py search --query "melk" --limit 10
  
  # Get product details
  ./ah-api.py product --id 123456
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    from curl_cffi import requests
except ImportError:
    print("❌ curl-cffi not installed!", file=sys.stderr)
    print("Run: pip3 install curl-cffi --break-system-packages", file=sys.stderr)
    sys.exit(1)

# API endpoints
GQL_URL = "https://www.ah.nl/gql"
SEARCH_URL = "https://www.ah.nl/zoeken/api/products/search"
PRODUCT_URL = "https://www.ah.nl/zoeken/api/products/product"

# Cookie file location
COOKIE_FILE = Path.home() / ".ah_cookies.json"

def load_cookies():
    """Load cookies from ~/.ah_cookies.json"""
    if not COOKIE_FILE.exists():
        print(f"❌ Cookie file not found: {COOKIE_FILE}", file=sys.stderr)
        print("\nCreate it with:", file=sys.stderr)
        print('{\n  "SSOC": "...",\n  "jsessionid_myah": "...",\n  "ASC": "...",\n  "RCC": "..."\n}', file=sys.stderr)
        sys.exit(1)
    
    with open(COOKIE_FILE) as f:
        return json.load(f)

def fetch_bonuses(filter_set="WEB_BONUS_PAGE", days_ahead=7):
    """
    Fetch bonuses from Albert Heijn
    
    Args:
        filter_set: One of the PromotionsFilterSet enum values
        days_ahead: How many days ahead to fetch bonuses for
    
    Returns:
        dict with bonuses data
    """
    # Date range (note: bonuses use week numbers!)
    today = datetime.now()
    week_number = today.isocalendar()[1]
    period_start = today.strftime("%Y-%m-%d")
    period_end = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    
    # GraphQL query (verified from browser DevTools, Feb 2026)
    query = """
    query bonusCategories($input: PromotionSearchInput) {
      bonusCategories(filterSet: WEB_CATEGORIES, input: $input) {
        id
        title
        type
        promotions {
          ...promotion
          __typename
        }
        __typename
      }
    }
    
    fragment promotion on Promotion {
      id
      title
      subtitle
      category
      exampleText
      storeOnly
      productCount
      salesUnitSize
      webPath
      exceptionRule
      promotionType
      segmentType
      periodDescription
      periodStart
      periodEnd
      extraDescriptions
      activationStatus
      promotionLabels {
        topText
        centerText
        bottomText
        emphasis
        title
        variant
        __typename
      }
      images {
        url
        title
        width
        height
        __typename
      }
      price {
        label
        now {
          amount
          __typename
        }
        was {
          amount
          __typename
        }
        __typename
      }
      __typename
    }
    """
    
    # Headers from working browser request (Feb 2026)
    headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9,es-CO;q=0.8,es;q=0.7,nl;q=0.6',
        'cache-control': 'no-cache',
        'client-name': 'ah-bonus',
        'client-version': '3.545.8',
        'content-type': 'application/json',
        'origin': 'https://www.ah.nl',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.ah.nl/bonus',
        'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
    }
    
    # Use curl-cffi with Chrome fingerprint to bypass bot detection
    response = requests.post(
        GQL_URL,
        json={
            "operationName": "bonusCategories",
            "variables": {
                "input": {
                    "weekNumber": week_number,
                    "periodStart": period_start,
                    "periodEnd": period_end
                }
            },
            "query": query
        },
        headers=headers,
        impersonate="chrome120",  # Close enough to bypass bot detection
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ HTTP {response.status_code}", file=sys.stderr)
        print(response.text[:500], file=sys.stderr)
        sys.exit(1)
    
    result = response.json()
    
    if 'errors' in result:
        print("❌ GraphQL errors:", file=sys.stderr)
        for err in result['errors']:
            print(f"  - {err['message']}", file=sys.stderr)
        sys.exit(1)
    
    # Extract bonuses from categories
    categories = result.get('data', {}).get('bonusCategories', [])
    bonuses = []
    for cat in categories:
        bonuses.extend(cat.get('promotions', []))
    
    return {
        "filter": filter_set,
        "count": len(bonuses),
        "categories": len(categories),
        "fetched_at": datetime.now().isoformat(),
        "period": {
            "week": week_number,
            "start": period_start,
            "end": period_end
        },
        "bonuses": bonuses
    }

def search_products(query, limit=20):
    """
    Search for products (REST API endpoint from ah-bonus-bot)
    Works WITHOUT cookies using curl-cffi impersonation!
    
    Args:
        query: Search query string
        limit: Max number of results
    
    Returns:
        dict with search results
    """
    # No cookies needed - curl-cffi handles it!
    response = requests.get(
        SEARCH_URL,
        params={
            "query": query,
            "size": limit
        },
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': f'https://www.ah.nl/zoeken?query={query}'
        },
        impersonate="chrome120",
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ HTTP {response.status_code}", file=sys.stderr)
        print(response.text[:500], file=sys.stderr)
        sys.exit(1)
    
    result = response.json()
    
    # Extract products from cards
    products = []
    for card in result.get('cards', []):
        if 'products' in card:
            products.extend(card['products'])
    
    page_info = result.get('page', {})
    
    return {
        "query": query,
        "count": len(products),
        "total": page_info.get('totalElements', 0),
        "fetched_at": datetime.now().isoformat(),
        "products": products
    }

def get_product(product_id):
    """
    Get detailed product info
    
    Args:
        product_id: Product webshopId
    
    Returns:
        dict with product details
    """
    cookies = load_cookies()
    
    # Create session
    session = requests.Session()
    session.get("https://www.ah.nl", impersonate="chrome120")
    
    # Get product
    response = session.get(
        PRODUCT_URL,
        params={"webshopId": product_id},
        cookies=cookies,
        impersonate="chrome120",
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"❌ HTTP {response.status_code}", file=sys.stderr)
        print(response.text[:500], file=sys.stderr)
        sys.exit(1)
    
    return response.json()

def main():
    parser = argparse.ArgumentParser(description="Albert Heijn API Client")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Bonuses command
    bonuses_parser = subparsers.add_parser("bonuses", help="Fetch bonuses")
    bonuses_parser.add_argument(
        "--filter",
        default="WEB_BONUS_PAGE",
        choices=[
            "APP_PERSONAL",
            "WEB_BONUS_PAGE",
            "APP_BONUS_BOX",
            "WEB_BONUS_BOX",
            "COUPON",
            "FREE_DELIVERY",
            "SPOTLIGHT"
        ],
        help="Bonus filter type"
    )
    bonuses_parser.add_argument("--days", type=int, default=7, help="Days ahead")
    bonuses_parser.add_argument("--output", "-o", help="Output file")
    bonuses_parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    
    # Search command
    search_parser = subparsers.add_parser("search", help="Search products")
    search_parser.add_argument("--query", "-q", required=True, help="Search query")
    search_parser.add_argument("--limit", "-l", type=int, default=20, help="Max results")
    search_parser.add_argument("--output", "-o", help="Output file")
    search_parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    
    # Product command
    product_parser = subparsers.add_parser("product", help="Get product details")
    product_parser.add_argument("--id", required=True, help="Product webshopId")
    product_parser.add_argument("--output", "-o", help="Output file")
    product_parser.add_argument("--pretty", action="store_true", help="Pretty JSON")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    if args.command == "bonuses":
        result = fetch_bonuses(args.filter, args.days)
    elif args.command == "search":
        result = search_products(args.query, args.limit)
    elif args.command == "product":
        result = get_product(args.id)
    
    # Output
    json_str = json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False)
    
    if hasattr(args, 'output') and args.output:
        with open(args.output, 'w') as f:
            f.write(json_str)
        print(f"✅ Saved to {args.output}", file=sys.stderr)
    else:
        print(json_str)

if __name__ == "__main__":
    main()
