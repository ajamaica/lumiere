import requests
import sys
import os
import json
import uuid

BASE_URL = "http://localhost:8080/api"
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "config", "token.txt")

def get_token():
    # Priority: Env var > token.txt
    env_token = os.getenv("TELDRIVE_TOKEN")
    if env_token:
        return env_token
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    return None

def get_session_hash():
    # Priority: Env var
    return os.getenv("TELDRIVE_SESSION_HASH")

def headers(token):
    return {"Authorization": f"Bearer {token}"}

def list_files(token, path="/"):
    url = f"{BASE_URL}/files"
    params = {"path": path, "page": 1, "order": "asc", "sort": "name"}
    res = requests.get(url, headers=headers(token), params=params)
    res.raise_for_status()
    return res.json()

def mkdir(token, path):
    url = f"{BASE_URL}/files/mkdir"
    payload = {"path": path}
    res = requests.post(url, headers=headers(token), json=payload)
    res.raise_for_status()
    return True

def upload_file(token, local_path, remote_dir="/"):
    file_name = os.path.basename(local_path)
    file_size = os.path.getsize(local_path)
    upload_id = str(uuid.uuid4())
    
    url = f"{BASE_URL}/uploads/{upload_id}"
    params = {"fileName": file_name, "partName": file_name, "partNo": 1}
    
    h = headers(token)
    h["Content-Length"] = str(file_size)
    h["Content-Type"] = "application/octet-stream"
    
    with open(local_path, "rb") as f:
        res = requests.post(url, headers=h, params=params, data=f)
    res.raise_for_status()
    
    url = f"{BASE_URL}/files"
    payload = {
        "name": file_name,
        "type": "file",
        "mimeType": "application/octet-stream",
        "size": file_size,
        "path": remote_dir,
        "uploadId": upload_id,
        "encrypted": False
    }
    res = requests.post(url, headers=headers(token), json=payload)
    res.raise_for_status()
    return res.json()

def download_file(token, file_id, local_path):
    url_info = f"{BASE_URL}/files/{file_id}"
    res = requests.get(url_info, headers=headers(token))
    res.raise_for_status()
    file_info = res.json()
    name = file_info["name"]
    
    session_hash = get_session_hash()
    if not session_hash:
        print("Error: TELDRIVE_SESSION_HASH not set.")
        return False
        
    url = f"{BASE_URL}/files/{file_id}/{name}"
    params = {"download": "1", "hash": session_hash}
    
    with requests.get(url, params=params, stream=True) as r:
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return True

def delete_file(token, file_id):
    url = f"{BASE_URL}/files/delete"
    payload = {"ids": [file_id]}
    res = requests.post(url, headers=headers(token), json=payload)
    res.raise_for_status()
    return True

def rename_file(token, file_id, new_name):
    url = f"{BASE_URL}/files/{file_id}"
    payload = {"name": new_name}
    res = requests.patch(url, headers=headers(token), json=payload)
    res.raise_for_status()
    return res.json()

if __name__ == "__main__":
    token = get_token()
    if not token:
        print("Error: No token found.")
        sys.exit(1)
        
    if len(sys.argv) < 2:
        print("Usage: client.py [list|mkdir|upload|download|delete|rename] ...")
        sys.exit(1)
        
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            path = sys.argv[2] if len(sys.argv) > 2 else "/"
            print(json.dumps(list_files(token, path), indent=2))
        elif cmd == "mkdir":
            print(mkdir(token, sys.argv[2]))
        elif cmd == "upload":
            remote = sys.argv[3] if len(sys.argv) > 3 else "/"
            print(json.dumps(upload_file(token, sys.argv[2], remote), indent=2))
        elif cmd == "download":
            print(download_file(token, sys.argv[2], sys.argv[3]))
        elif cmd == "delete":
            print(delete_file(token, sys.argv[2]))
        elif cmd == "rename":
            print(json.dumps(rename_file(token, sys.argv[2], sys.argv[3]), indent=2))
    except Exception as e:
        if hasattr(e, 'response') and e.response is not None:
            print(f"Error: {e.response.status_code} {e.response.text}")
        else:
            print(f"Error: {e}")
        sys.exit(1)
