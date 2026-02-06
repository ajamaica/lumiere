#!/usr/bin/env python3
"""
AH Recipe Search via GraphQL
Find recipes based on ingredients, get shopping lists
"""

import sys
import json
import argparse
import re
from pathlib import Path
from curl_cffi import requests

# Cookie file
COOKIE_FILE = Path.home() / ".ah_cookies.json"

def refresh_cookies():
    """Auto-refresh cookies via browser if expired"""
    import subprocess
    script_dir = Path(__file__).parent
    refresh_script = script_dir / 'auto-fetch-cookies.sh'
    
    if refresh_script.exists():
        print("🔄 Refreshing cookies from browser...", file=sys.stderr)
        subprocess.run([str(refresh_script)], check=True)
    else:
        print(f"❌ Auto-refresh script not found: {refresh_script}", file=sys.stderr)
        sys.exit(1)

def load_cookies():
    """Load session cookies"""
    if not COOKIE_FILE.exists():
        # Auto-fetch cookies from browser
        print(f"🔄 No cookies found, fetching from browser...", file=sys.stderr)
        refresh_cookies()
    
    with open(COOKIE_FILE) as f:
        return json.load(f)

def graphql_query(query, variables=None, operation_name=None, retry_on_403=True):
    """Execute GraphQL query against AH API"""
    cookies = load_cookies()
    
    headers = {
        'Content-Type': 'application/json',
        'x-client-name': 'ah-allerhande',
        'x-client-platform-type': 'Web',
        'x-client-version': '3.13.30',
        'origin': 'https://www.ah.nl',
        'referer': 'https://www.ah.nl/allerhande'
    }
    
    payload = {
        'query': query,
        'variables': variables or {}
    }
    
    if operation_name:
        payload['operationName'] = operation_name
    
    response = requests.post(
        'https://www.ah.nl/gql',
        headers=headers,
        json=payload,
        cookies=cookies,
        impersonate='chrome120'
    )
    
    # Auto-retry with fresh cookies on 403
    if response.status_code == 403 and retry_on_403:
        print("⚠️  Cookies expired (403), refreshing...", file=sys.stderr)
        refresh_cookies()
        # Retry once with new cookies
        return graphql_query(query, variables, operation_name, retry_on_403=False)
    
    if response.status_code != 200:
        print(f"❌ HTTP {response.status_code}", file=sys.stderr)
        print(f"Response: {response.text[:500]}", file=sys.stderr)
    
    response.raise_for_status()
    return response.json()

def search_recipes(query_text, size=10, detailed=False):
    """Search recipes by text query (uses recipeSearchV2 API)
    
    Args:
        query_text: Search term (e.g., "pasta carbonara")
        size: Number of results to return (client-side limit)
        detailed: If True, returns full recipe summaries with time, ratings, images, etc.
    
    Note: start/size parameters cause server errors, so we fetch all and limit client-side
    """
    
    if detailed:
        # Extended query with cook time, ratings, servings
        query = """
        query recipeSearchV2($searchText: String) {
          recipeSearchV2(searchText: $searchText) {
            page {
              total
              hasNextPage
            }
            result {
              id
              title
              slug
              time {
                cook
                oven
                wait
              }
              servings: serving {
                number
                type
              }
              rating {
                average
                count
              }
              images(renditions: [D440X324, D612X450]) {
                rendition
                url
                width
                height
              }
            }
          }
        }
        """
    else:
        # Simple query (just ID + title)
        query = """
        query recipeSearchV2($searchText: String) {
          recipeSearchV2(searchText: $searchText) {
            result {
              id
              title
            }
            page {
              total
              hasNextPage
            }
          }
        }
        """
    
    variables = {'searchText': query_text}
    result = graphql_query(query, variables, operation_name='recipeSearchV2')
    
    # Returns list of recipes with IDs
    search_result = result.get('data', {}).get('recipeSearchV2', {})
    recipes = search_result.get('result', [])
    
    # Limit to requested size (client-side)
    recipes = recipes[:size]
    
    return {
        'recipes': recipes,
        'total': search_result.get('page', {}).get('total', 0),
        'hasMore': search_result.get('page', {}).get('hasNextPage', False)
    }

def get_recipe_details(recipe_id):
    """Get full recipe details including ingredients and preparation"""
    query = """
    query recipe($id: Int!) {
      recipe(id: $id) {
        id
        title
        cookTime
        description
        preparation {
          steps
        }
        ingredients {
          name {
            singular
            plural
          }
          quantity
        }
        images {
          url
          width
          height
        }
      }
    }
    """
    
    result = graphql_query(query, {'id': int(recipe_id)}, operation_name='recipe')
    return result.get('data', {}).get('recipe')

def recipe_by_ingredients(ingredients_list):
    """Find recipes that use given ingredients"""
    # Join ingredients as search query
    search_query = ' '.join(ingredients_list)
    return search_recipes(search_query, size=20)

def get_recipe_from_url(url):
    """Extract recipe ID from URL and fetch details"""
    # URL format: https://www.ah.nl/allerhande/recept/R-R{ID}/{slug}
    id_match = re.search(r'R-R(\d+)', url)
    
    if not id_match:
        raise ValueError(f"Cannot extract recipe ID from URL: {url}")
    
    recipe_id = int(id_match.group(1))
    return get_recipe_details(recipe_id)

def main():
    parser = argparse.ArgumentParser(description='AH Recipe Search')
    parser.add_argument('action', choices=['search', 'details', 'ingredients', 'url'],
                        help='Action to perform')
    parser.add_argument('--query', help='Search query')
    parser.add_argument('--recipe-id', help='Recipe ID')
    parser.add_argument('--url', help='Recipe URL (extracts ID automatically)')
    parser.add_argument('--ingredients', help='Comma-separated ingredient list')
    parser.add_argument('--size', type=int, default=10, help='Number of results')
    parser.add_argument('--detailed', action='store_true', help='Return detailed recipe info (nutrition, images, ratings)')
    parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    
    args = parser.parse_args()
    
    result = None
    
    if args.action == 'search':
        if not args.query:
            print("❌ --query required for search", file=sys.stderr)
            sys.exit(1)
        result = search_recipes(args.query, args.size, detailed=args.detailed)
    
    elif args.action == 'details':
        if not args.recipe_id:
            print("❌ --recipe-id required for details", file=sys.stderr)
            sys.exit(1)
        result = get_recipe_details(args.recipe_id)
    
    elif args.action == 'ingredients':
        if not args.ingredients:
            print("❌ --ingredients required (comma-separated)", file=sys.stderr)
            sys.exit(1)
        ingredients_list = [i.strip() for i in args.ingredients.split(',')]
        result = recipe_by_ingredients(ingredients_list)
    
    elif args.action == 'url':
        if not args.url:
            print("❌ --url required for url action", file=sys.stderr)
            sys.exit(1)
        result = get_recipe_from_url(args.url)
    
    # Output
    if args.pretty:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
