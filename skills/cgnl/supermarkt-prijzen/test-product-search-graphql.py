#!/usr/bin/env python3
from curl_cffi import requests
import json

# Try different product search queries
queries_to_test = [
    # Try 1: Simple product search
    """
    query searchProducts($query: String!) {
      products(searchTerm: $query) {
        id
        title
        price
      }
    }
    """,
    # Try 2: Product by query
    """
    query ProductSearch($query: String!) {
      productSearch(query: $query) {
        id
        title
      }
    }
    """,
    # Try 3: Search (like we use for recipes)
    """
    query search($query: String!, $limit: Int) {
      search(query: $query, limit: $limit) {
        label
        value
        href
        type
      }
    }
    """
]

for i, query in enumerate(queries_to_test, 1):
    print(f"\n=== Test {i} ===")
    response = requests.post(
        'https://www.ah.nl/gql',
        headers={
            'Content-Type': 'application/json',
            'x-client-name': 'ah-allerhande',
            'x-client-version': '3.13.30',
            'origin': 'https://www.ah.nl',
            'referer': 'https://www.ah.nl/'
        },
        json={
            'query': query,
            'variables': {'query': 'melk', 'limit': 5}
        },
        impersonate='chrome120',
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        if 'errors' in data:
            print(f"❌ GraphQL Error: {data['errors'][0]['message']}")
        else:
            print(f"✅ Success!")
            print(json.dumps(data, indent=2)[:500])
    else:
        print(f"❌ HTTP {response.status_code}")
