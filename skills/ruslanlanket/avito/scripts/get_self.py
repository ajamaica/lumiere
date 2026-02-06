import requests
import sys
import json

def get_self(token):
    url = "https://api.avito.ru/core/v1/accounts/self"
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
        print("Usage: get_self.py <token>")
        sys.exit(1)
    
    user = get_self(sys.argv[1])
    print(json.dumps(user))
