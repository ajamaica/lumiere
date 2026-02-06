#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# Correct recipeSearch structure
query = """
query recipeSearch($params: RecipeSearchParams!) {
  recipeSearch(params: $params) {
    total
    recipes {
      id
      title
      slug
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
        'operationName': 'recipeSearch',
        'query': query,
        'variables': {
            'params': {
                'query': 'bloemkool aardappel',
                'size': 10
            }
        }
    },
    cookies=cookies,
    impersonate='chrome120'
)

print(json.dumps(response.json(), indent=2))
