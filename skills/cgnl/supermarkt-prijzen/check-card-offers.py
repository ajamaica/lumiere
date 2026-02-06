#!/usr/bin/env python3
"""
Link AH card → check personal offers
"""
import sys, json, random
from curl_cffi import requests

def generate_ah_card():
    """Generate valid AH bonus card number"""
    ranges = [
        (2621100, 2621140),
        (2622000, 2622030),
        (2622200, 2622270),
        (2623013, 2623036),
    ]
    
    start, end = random.choice(ranges)
    prefix = random.randint(start, end)
    base = f"{prefix:07d}"
    
    for _ in range(5):
        base += str(random.randint(0, 9))
    
    total = 0
    for i, digit in enumerate(base):
        weight = 1 if i % 2 == 0 else 3
        total += int(digit) * weight
    
    checksum = (10 - (total % 10)) % 10
    return base + str(checksum)

def load_cookies():
    try:
        with open("/Users/sander/.ah_cookies.json") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ No cookies: {e}")
        sys.exit(1)

def update_card(card_number, cookies):
    """Link card to session"""
    url = "https://www.ah.nl/gql"
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "x-client-name": "ah-loyalty",
        "x-client-platform-type": "Web",
        "x-client-version": "3.2.0"
    }
    
    mutation = """
    mutation UpdateCard($input: UpdateCardInput!) {
      updateCard(input: $input) {
        number
        type
      }
    }
    """
    
    payload = {
        "query": mutation,
        "variables": {
            "input": {
                "number": card_number,
                "type": "BONUS"
            }
        }
    }
    
    r = requests.post(url, json=payload, headers=headers, cookies=cookies, impersonate="chrome120", timeout=10)
    return r.json() if r.status_code == 200 else {"error": r.text, "status": r.status_code}

def get_personal_offers(cookies):
    """Fetch personal offers"""
    url = "https://www.ah.nl/gql"
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "x-client-name": "ah-account",
        "x-client-platform-type": "Web",
        "x-client-version": "3.2.0"
    }
    
    query = """
    query FetchBonusPromotions {
      bonusPromotions(
        filterSet: APP_PERSONAL
        input: {
          periodStart: "2026-02-01"
          periodEnd: "2026-02-08"
          filterUnavailableProducts: false
          forcePromotionVisibility: true
        }
      ) {
        id title promotionType
        price { now { amount } }
        product { title category }
      }
    }
    """
    
    r = requests.post(url, json={"query": query}, headers=headers, cookies=cookies, impersonate="chrome120", timeout=10)
    
    if r.status_code == 200:
        data = r.json()
        return data.get('data', {}).get('bonusPromotions', [])
    else:
        return {"error": r.text, "status": r.status_code}

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--card", help="Specific card (or random)")
    parser.add_argument("--tries", type=int, default=1)
    args = parser.parse_args()
    
    cookies = load_cookies()
    
    for i in range(args.tries):
        card = args.card if args.card else generate_ah_card()
        
        print(f"\n🎴 Card: {card}")
        print("  ⚙️  Linking...")
        
        result = update_card(card, cookies)
        
        if "error" in result:
            print(f"  ❌ Link failed: {str(result.get('error', ''))[:100]}")
            continue
        
        print(f"  ✅ Linked!")
        print("  🔍 Fetching offers...")
        
        offers = get_personal_offers(cookies)
        
        if isinstance(offers, dict) and "error" in offers:
            print(f"  ❌ Fetch failed: {str(offers.get('error', ''))[:100]}")
        elif len(offers) == 0:
            print(f"  📭 No personal offers")
        else:
            print(f"  🎁 {len(offers)} personal offers!")
            for offer in offers[:5]:
                title = offer.get('title', 'N/A')
                price = offer.get('price', {}).get('now', {}).get('amount', 'N/A')
                print(f"    - {title} (€{price})")
        
        if args.tries > 1 and i < args.tries - 1:
            import time
            time.sleep(2)
