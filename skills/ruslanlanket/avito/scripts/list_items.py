import requests
import sys
import json

def list_items(token):
    url = "https://api.avito.ru/core/v1/items"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: list_items.py <token>")
        sys.exit(1)
    
    items = list_items(sys.argv[1])
    print(json.dumps(items))
