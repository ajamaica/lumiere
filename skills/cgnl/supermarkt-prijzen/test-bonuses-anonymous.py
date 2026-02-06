#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path
from datetime import datetime, timedelta

# Try bonuses WITHOUT cookies (completely anonymous)
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
    id title promotionType
    price { now { amount } }
    product { title }
  }
}
"""

today = datetime.now()
week_later = today + timedelta(days=7)

response = requests.post(
    'https://www.ah.nl/gql',
    headers={
        'Content-Type': 'application/json',
        'x-client-name': 'ah-allerhande',
        'x-client-version': '3.13.30',
        'origin': 'https://www.ah.nl',
        'referer': 'https://www.ah.nl/bonus',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    json={
        'operationName': 'FetchBonusPromotions',
        'query': query,
        'variables': {
            'periodStart': today.strftime('%Y-%m-%d'),
            'periodEnd': week_later.strftime('%Y-%m-%d')
        }
    },
    impersonate='chrome120',
    timeout=10
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    if 'data' in data and data['data'].get('bonusPromotions'):
        bonuses = data['data']['bonusPromotions']
        print(f"✅ SUCCESS! Found {len(bonuses)} bonuses WITHOUT login!")
        print("\nFirst 3 bonuses:")
        for bonus in bonuses[:3]:
            print(f"  - {bonus.get('title')}")
    else:
        print("Response:", json.dumps(data, indent=2))
else:
    print(f"Error: {response.text[:500]}")
