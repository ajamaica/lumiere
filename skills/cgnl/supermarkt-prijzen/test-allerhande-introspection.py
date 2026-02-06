#!/usr/bin/env python3
from curl_cffi import requests
import json

# Try introspection on Allerhande API
query = """
{
  __schema {
    queryType {
      fields {
        name
        description
        args {
          name
          type {
            name
            kind
          }
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
    impersonate='chrome120',
    timeout=10
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    if 'errors' in data:
        print(f"❌ Introspection disabled: {data['errors'][0]['message']}")
    elif 'data' in data and '__schema' in data['data']:
        print("✅ Introspection ENABLED!")
        fields = data['data']['__schema']['queryType']['fields']
        
        # Find recipe-related queries
        print("\n🔍 Recipe-related queries:")
        for field in fields:
            if 'recipe' in field['name'].lower():
                print(f"\n• {field['name']}")
                if field.get('description'):
                    print(f"  Description: {field['description']}")
                if field.get('args'):
                    print(f"  Args: {', '.join(a['name'] + ':' + str(a['type'].get('name', a['type'].get('kind'))) for a in field['args'])}")
    else:
        print("Unexpected response:", json.dumps(data, indent=2)[:500])
else:
    print(f"❌ HTTP {response.status_code}")
