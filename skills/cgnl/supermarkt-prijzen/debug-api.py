#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# Test what the autosuggestion API actually returns
query = """
query recipeAutosuggestion($query: String!) {
  recipeAutoSuggestions(query: $query)
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
        'operationName': 'recipeAutosuggestion',
        'query': query,
        'variables': {'query': 'bloemkool'}
    },
    cookies=cookies,
    impersonate='chrome120'
)

print("=== RAW API RESPONSE ===")
print(json.dumps(response.json(), indent=2))
