#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import argparse
import time

BASE_URL = "https://graph.threads.net/v1.0"

def call_api(method, endpoint, params=None, data=None, token=None):
    url = f"{BASE_URL}/{endpoint}"
    cmd = ["curl", "-s", "-X", method]
    
    if token:
        cmd.extend(["-H", f"Authorization: Bearer {token}"])
    
    if params:
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        url += f"?{query}" if "?" not in url else f"&{query}"
            
    cmd.append(url)
            
    if data:
        for k, v in data.items():
            cmd.extend(["-F", f"{k}={v}"])
            
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Curl failed: {result.stderr}")
    
    try:
        data = json.loads(result.stdout)
        if "error" in data:
            print(f"API Error: {json.dumps(data, indent=2)}")
            sys.exit(1)
        return data
    except json.JSONDecodeError:
        return {"raw": result.stdout}

def upload_to_catbox(file_path):
    cmd = ["curl", "-s", "-F", "reqtype=fileupload", "-F", f"fileToUpload=@{file_path}", "https://catbox.moe/user/api.php"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.startswith("https://"):
        return result.stdout.strip()
    return None

def main():
    # ... inside main, after parsing args ...
    try:
        if args.command == "me":
            # ...
        elif args.command == "post":
            me = call_api("GET", "me", params={"fields": "id"}, token=token)
            user_id = me["id"]
            
            raw_images = args.image if args.image else []
            images = []
            for img in raw_images:
                if os.path.exists(img):
                    print(f"Uploading local file {img} to Catbox...")
                    url = upload_to_catbox(img)
                    if url:
                        print(f"Uploaded: {url}")
                        images.append(url)
                    else:
                        print(f"Error uploading {img}")
                        sys.exit(1)
                else:
                    images.append(img)
            
            if len(images) > 1:
                # Carousel Logic
                child_ids = []
                for img_url in images[:10]: # Max 10 items
                    child = call_api("POST", f"{user_id}/threads", data={
                        "media_type": "IMAGE",
                        "image_url": img_url,
                        "is_carousel_item": "true"
                    }, token=token)
                    child_ids.append(child["id"])
                    # Small delay to ensure order and avoid rate limits
                    time.sleep(1)
                
                children_str = ",".join(child_ids)
                container = call_api("POST", f"{user_id}/threads", data={
                    "media_type": "CAROUSEL",
                    "children": children_str,
                    "text": args.text
                }, token=token)
            else:
                # Single Post Logic
                media_data = {"media_type": "IMAGE" if images else "TEXT", "text": args.text}
                if images: media_data["image_url"] = images[0]
                container = call_api("POST", f"{user_id}/threads", data=media_data, token=token)
            
            if "id" not in container:
                print(f"Error creating container: {container}")
                sys.exit(1)
            
            publish = call_api("POST", f"{user_id}/threads_publish", data={"creation_id": container["id"]}, token=token)
            print(f"Post published! ID: {publish.get('id', publish)}")
        elif args.command == "list":
            me = call_api("GET", "me", params={"fields": "id"}, token=token)
            user_id = me["id"]
            res = call_api("GET", f"{user_id}/threads", params={"fields": "id,text,timestamp,permalink"}, token=token)
            print(json.dumps(res, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
