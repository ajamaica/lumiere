#!/usr/bin/env python3
from curl_cffi import requests

response = requests.get(
    'https://www.ah.nl/zoeken/api/products/search',
    params={'query': 'melk'},
    headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.ah.nl/zoeken?query=melk'
    },
    impersonate='chrome120',
    timeout=10
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"✅ Found products!")
    
    # Extract products
    cards = data.get('cards', [])
    products = []
    for card in cards:
        products.extend(card.get('products', []))
    
    print(f"Total: {len(products)} products")
    for p in products[:5]:
        price = p.get('price', {})
        print(f"  • {p['title']}: €{price.get('now', 'N/A')}")
else:
    print(f"❌ Error: {response.text[:200]}")
