import requests
import sys
import json

def list_chats(token, user_id):
    url = f"https://api.avito.ru/messenger/v2/accounts/{user_id}/chats"
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
    if len(sys.argv) < 3:
        print("Usage: list_chats.py <token> <user_id>")
        sys.exit(1)
    
    chats = list_chats(sys.argv[1], sys.argv[2])
    print(json.dumps(chats))
