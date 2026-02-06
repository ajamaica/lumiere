import requests
import sys
import json

def get_token(client_id, client_secret):
    url = "https://api.avito.ru/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: auth.py <client_id> <client_secret>")
        sys.exit(1)
    
    token_data = get_token(sys.argv[1], sys.argv[2])
    print(json.dumps(token_data))
