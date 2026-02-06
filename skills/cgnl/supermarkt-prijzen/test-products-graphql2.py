#!/usr/bin/env python3
from curl_cffi import requests
import json

# The bonuses query returns products - let's filter by product title
query = """
query FetchBonusPromotions($periodStart: String, $periodEnd: String) {
  bonusPromotions(
    filterSet: WEB_BONUS_PAGE
    input: {
      periodStart: $periodStart
      periodEnd: $periodEnd
      filterUnavailableProducts: false
      forcePromotionVisibility: true
    }
  ) {
    id
    title
    product {
      id
      hqId
      title
      category
    }
    price {
      now { amount }
      was { amount }
    }
  }
}
"""

response = requests.post(
    'https://www.ah.nl/gql',
    headers={
        'Content-Type': 'application/json',
        'x-client-name': 'ah-allerhande',
        'x-client-version': '3.13.30',
        'origin': 'https://www.ah.nl',
        'referer': 'https://www.ah.nl/bonus'
    },
    json={
        'operationName': 'FetchBonusPromotions',
        'query': query,
        'variables': {
            'periodStart': '2026-02-02',
            'periodEnd': '2026-02-09'
        }
    },
    impersonate='chrome120',
    timeout=10
)

if response.status_code == 200:
    data = response.json()
    bonuses = data['data']['bonusPromotions']
    
    # Search for "melk" in product titles
    search_term = 'melk'
    results = []
    for bonus in bonuses:
        if bonus.get('product'):
            title = bonus['product']['title'].lower()
            if search_term in title:
                results.append({
                    'title': bonus['product']['title'],
                    'id': bonus['product']['id'],
                    'price': bonus.get('price')
                })
    
    print(f"Found {len(results)} products with '{search_term}' in bonuses:")
    for r in results[:10]:
        if r['price'] and r['price'].get('now'):
            now = r['price']['now']['amount']
            print(f"  • {r['title']}: €{now:.2f}")
        else:
            print(f"  • {r['title']}")
else:
    print(f"❌ HTTP {response.status_code}")
