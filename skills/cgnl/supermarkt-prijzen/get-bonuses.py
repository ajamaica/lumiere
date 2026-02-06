#!/usr/bin/env python3
"""
Albert Heijn Bonus Fetcher
Uses curl-cffi to bypass bot detection

Usage:
  ./get-bonuses.py [--filter FILTER] [--output FILE]

Filters:
  APP_PERSONAL       - Your personal offers
  WEB_BONUS_PAGE     - All bonuses (default)
  APP_BONUS_BOX      - Bonus box offers
  WEB_BONUS_BOX      - Web bonus box
  COUPON             - Coupons
  FREE_DELIVERY      - Free delivery offers
  SPOTLIGHT          - Spotlight offers
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

# GraphQL endpoint
GQL_URL = "https://www.ah.nl/gql"

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
    cookies = load_cookies()
    
    # Date range
    today = datetime.now().strftime("%Y-%m-%d")
    end_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    
    # GraphQL query (from APK decompilation)
    query = """
    query FetchBonusPromotions($periodStart: String, $periodEnd: String) {
      bonusPromotions(
        filterSet: """ + filter_set + """
        input: {
          periodStart: $periodStart
          periodEnd: $periodEnd
          filterUnavailableProducts: false
          forcePromotionVisibility: true
        }
      ) {
        id
        hqId
        title
        subtitle
        activationStatus
        promotionType
        segmentType
        periodDescription
        periodStart
        periodEnd
        productCount
        exampleText
        storeOnly
        redemptionCount
        salesUnitSize
        webPath
        images {
          url
          title
          width
          height
        }
        price {
          now {
            amount
            formattedV2
          }
          was {
            amount
            formattedV2
          }
          label
        }
        product {
          id
          hqId
          title
          category
          shopType
          availability {
            availabilityLabel
          }
        }
      }
    }
    """
    
    headers = {
        "Content-Type": "application/json",
        "x-client-name": "ah-account",
        "x-client-platform-type": "Web",
        "x-client-version": "3.2.0",
        "origin": "https://www.ah.nl",
        "referer": "https://www.ah.nl/bonus"
    }
    
    # Use curl-cffi with Chrome fingerprint to bypass bot detection
    response = requests.post(
        GQL_URL,
        json={
            "operationName": "FetchBonusPromotions",
            "variables": {
                "periodStart": today,
                "periodEnd": end_date
            },
            "query": query
        },
        headers=headers,
        cookies=cookies,
        impersonate="chrome120",  # Real Chrome TLS fingerprint
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
    
    return result

def main():
    parser = argparse.ArgumentParser(description="Fetch Albert Heijn bonuses")
    parser.add_argument(
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
        help="Bonus filter type (default: WEB_BONUS_PAGE)"
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output file (default: stdout)"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Days ahead to fetch (default: 7)"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output"
    )
    
    args = parser.parse_args()
    
    # Fetch bonuses
    result = fetch_bonuses(args.filter, args.days)
    
    # Prepare output
    bonuses = result.get('data', {}).get('bonusPromotions', [])
    
    output = {
        "filter": args.filter,
        "count": len(bonuses),
        "fetched_at": datetime.now().isoformat(),
        "period": {
            "start": datetime.now().strftime("%Y-%m-%d"),
            "end": (datetime.now() + timedelta(days=args.days)).strftime("%Y-%m-%d")
        },
        "bonuses": bonuses
    }
    
    # Write output
    json_str = json.dumps(output, indent=2 if args.pretty else None, ensure_ascii=False)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(json_str)
        print(f"✅ Saved {len(bonuses)} bonuses to {args.output}", file=sys.stderr)
    else:
        print(json_str)

if __name__ == "__main__":
    main()
