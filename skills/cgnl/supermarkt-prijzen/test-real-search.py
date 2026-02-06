#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# The REAL search query from the website!
query = """
query search($query: String!, $limit: Int) {
  search(query: $query, limit: $limit) {
    ...topSuggestion
  }
}

fragment suggestion on SearchSuggestion {
  label
  value
  href
  type
  icon
}

fragment topSuggestion on SearchSuggestion {
  ...suggestion
  suggestions {
    ...suggestion
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
        'operationName': 'search',
        'query': query,
        'variables': {'query': 'bloemkool', 'limit': 6}
    },
    cookies=cookies,
    impersonate='chrome120'
)

print(json.dumps(response.json(), indent=2))
