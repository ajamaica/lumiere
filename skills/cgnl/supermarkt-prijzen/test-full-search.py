#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

# Load cookies
cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# Full recipe search query (not autosuggestion)
query = """
query searchRecipes($searchTerm: String!) {
  recipes(searchTerm: $searchTerm, from: 0, size: 10) {
    total
    recipes {
      id
      title
      cookTime
      summary
      images {
        url
      }
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
        'referer': 'https://www.ah.nl/allerhande'
    },
    json={
        'operationName': 'searchRecipes',
        'query': query,
        'variables': {'searchTerm': 'bloemkool aardappel'}
    },
    cookies=cookies,
    impersonate='chrome120'
)

print(json.dumps(response.json(), indent=2))
