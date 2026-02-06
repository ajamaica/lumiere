#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# Simple introspection - list all Query fields
query = """
{
  __schema {
    queryType {
      fields {
        name
        description
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
    json={'query': query},
    cookies=cookies,
    impersonate='chrome120'
)

result = response.json()

if 'data' in result and '__schema' in result['data']:
    print("=== AVAILABLE QUERY FIELDS ===")
    for field in result['data']['__schema']['queryType']['fields']:
        if 'recipe' in field['name'].lower() or 'search' in field['name'].lower():
            desc = field.get('description', 'N/A')
            print(f"• {field['name']}: {desc}")
else:
    print("Introspection disabled or error:")
    print(json.dumps(result, indent=2))
