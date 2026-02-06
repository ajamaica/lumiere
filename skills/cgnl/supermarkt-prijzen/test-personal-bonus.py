#!/usr/bin/env python3
"""
Test: Hoe haalt AH persoonlijke bonussen op?
Hypothese: GraphQL met filterSet=APP_PERSONAL + session cookies
"""

import requests
import json
from datetime import datetime, timedelta

# GraphQL endpoint
URL = "https://www.ah.nl/gql"

# Bonuskaart nummer (test)
BONUS_CARD = "2622207012068"

# Periode (deze week)
today = datetime.now()
period_start = today.strftime("%Y-%m-%d")
period_end = (today + timedelta(days=7)).strftime("%Y-%m-%d")

# GraphQL query
query = """
query FetchBonusPromotions($periodStart: String, $periodEnd: String) {
  bonusPromotions(
    filterSet: APP_PERSONAL
    input: {
      periodStart: $periodStart
      periodEnd: $periodEnd
      filterUnavailableProducts: false
      forcePromotionVisibility: true
    }
  ) {
    id
    title
    promotionType
    price {
      now {
        amount
      }
    }
    product {
      title
      category
    }
  }
}
"""

variables = {
    "periodStart": period_start,
    "periodEnd": period_end
}

payload = {
    "query": query,
    "variables": variables
}

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; AH-Test/1.0)"
}

print("Testing: APP_PERSONAL filterSet")
print(f"Bonuskaart: {BONUS_CARD}")
print(f"Periode: {period_start} → {period_end}")
print()

# Test 1: Zonder cookies (anoniem)
print("Test 1: Zonder cookies")
print("-" * 40)
response = requests.post(URL, json=payload, headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    if "errors" in data:
        print("❌ Errors:")
        print(json.dumps(data["errors"], indent=2))
    else:
        promotions = data.get("data", {}).get("bonusPromotions", [])
        print(f"✅ Promotions found: {len(promotions)}")
        if len(promotions) > 0:
            print("\nFirst 3:")
            for promo in promotions[:3]:
                print(f"  - {promo['title']}")
else:
    print(f"❌ HTTP {response.status_code}")

print()

# Test 2: Met bonuskaartnummer in URL parameter?
print("Test 2: Met bonuskaartnummer in headers")
print("-" * 40)
headers_with_card = headers.copy()
headers_with_card["X-Bonus-Card"] = BONUS_CARD

response2 = requests.post(URL, json=payload, headers=headers_with_card)
print(f"Status: {response2.status_code}")

if response2.status_code == 200:
    data2 = response2.json()
    if "errors" in data2:
        print("❌ Errors:")
        print(json.dumps(data2["errors"], indent=2))
    else:
        promotions2 = data2.get("data", {}).get("bonusPromotions", [])
        print(f"✅ Promotions found: {len(promotions2)}")
else:
    print(f"❌ HTTP {response2.status_code}")

