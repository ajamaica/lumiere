#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# GraphQL introspection for Query type
query = """
{
  __type(name: "Query") {
    fields {
      name
      description
      args {
        name
        type {
          name
        }
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

data = response.json()
if 'data' in data and '__type' in data['data']:
    for field in data['data']['__type']['fields']:
        if 'recipe' in field['name'].lower() or 'search' in field['name'].lower():
            print(f"{field['name']}: {field.get('description', 'N/A')}")
            if field['args']:
                print(f"  Args: {', '.join(a['name'] for a in field['args'])}")
