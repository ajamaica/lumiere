#!/usr/bin/env python3
import json
from curl_cffi import requests
from pathlib import Path

cookie_file = Path.home() / '.ah_cookies.json'
cookies = json.loads(cookie_file.read_text())

# Try to find a search query that returns full recipe objects
# Let's try different query names based on common GraphQL patterns

queries_to_try = [
    # Try searchRecipes
    """
    query searchRecipes($query: String!) {
      searchRecipes(query: $query) {
        id
        title
      }
    }
    """,
    # Try recipesByKeyword
    """
    query recipesByKeyword($keyword: String!) {
      recipesByKeyword(keyword: $keyword) {
        id
        title
      }
    }
    """,
    # Try allRecipes with filter
    """
    query allRecipes($filter: String!) {
      allRecipes(filter: $filter) {
        id
        title
      }
    }
    """
]

for i, query in enumerate(queries_to_try):
    print(f"\n=== TRYING QUERY {i+1} ===")
    
    try:
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
                'query': query,
                'variables': {'query': 'bloemkool', 'keyword': 'bloemkool', 'filter': 'bloemkool'}
            },
            cookies=cookies,
            impersonate='chrome120'
        )
        
        result = response.json()
        if 'errors' in result:
            print(f"❌ Error: {result['errors'][0]['message']}")
        else:
            print(f"✅ Success!")
            print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"❌ Exception: {e}")
