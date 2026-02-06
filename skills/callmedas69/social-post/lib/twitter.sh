#!/bin/bash
# Twitter posting library

TWITTER_POST_SCRIPT="/home/phan_harry/.openclaw/workspace/scripts/twitter-post.sh"

# Post text-only to Twitter
twitter_post_text() {
  local text="$1"
  local reply_to_id="$2"
  
  if [ ! -f "$TWITTER_POST_SCRIPT" ]; then
    echo "Error: Twitter post script not found at $TWITTER_POST_SCRIPT" >&2
    return 1
  fi
  
  if [ -n "$reply_to_id" ]; then
    # Post as reply (for threads)
    source /home/phan_harry/.openclaw/.env
    
    python3 - "$text" "$reply_to_id" <<'EOF'
import requests
from requests_oauthlib import OAuth1
import os
import sys
import json

text = sys.argv[1]
reply_to = sys.argv[2]

consumer_key = os.environ['X_CONSUMER_KEY']
consumer_secret = os.environ['X_CONSUMER_SECRET']
access_token = os.environ['X_ACCESS_TOKEN']
access_token_secret = os.environ['X_ACCESS_TOKEN_SECRET']

auth = OAuth1(consumer_key, consumer_secret, access_token, access_token_secret)

url = "https://api.twitter.com/2/tweets"
payload = {
    "text": text,
    "reply": {
        "in_reply_to_tweet_id": reply_to
    }
}

response = requests.post(url, auth=auth, json=payload)

if response.status_code == 201:
    tweet = response.json()
    tweet_id = tweet['data']['id']
    print(tweet_id)
else:
    print(f"Error: {response.status_code} - {response.text}", file=sys.stderr)
    exit(1)
EOF
  else
    "$TWITTER_POST_SCRIPT" "$text"
  fi
}

# Upload image to Twitter and get media_id
twitter_upload_image() {
  local image_path="$1"
  
  if [ ! -f "$image_path" ]; then
    echo "Error: Image not found at $image_path" >&2
    return 1
  fi
  
  # Load credentials
  source /home/phan_harry/.openclaw/.env
  
  # Upload to Twitter media endpoint
  local upload_response=$(python3 - "$image_path" <<'EOF'
import requests
from requests_oauthlib import OAuth1
import os
import sys
import json

image_path = sys.argv[1]

consumer_key = os.environ['X_CONSUMER_KEY']
consumer_secret = os.environ['X_CONSUMER_SECRET']
access_token = os.environ['X_ACCESS_TOKEN']
access_token_secret = os.environ['X_ACCESS_TOKEN_SECRET']

auth = OAuth1(consumer_key, consumer_secret, access_token, access_token_secret)

# Upload image
url = "https://upload.twitter.com/1.1/media/upload.json"

with open(image_path, 'rb') as f:
    files = {'media': f}
    response = requests.post(url, auth=auth, files=files)

if response.status_code == 200:
    media_id = response.json()['media_id_string']
    print(media_id)
else:
    print(f"Error: {response.status_code} - {response.text}", file=sys.stderr)
    exit(1)
EOF
)
  
  if [ $? -eq 0 ]; then
    echo "$upload_response"
  else
    return 1
  fi
}

# Post to Twitter with image
twitter_post_with_image() {
  local text="$1"
  local image_path="$2"
  
  echo "Uploading image to Twitter..." >&2
  local media_id=$(twitter_upload_image "$image_path")
  
  if [ $? -ne 0 ]; then
    echo "Failed to upload image to Twitter" >&2
    return 1
  fi
  
  echo "Image uploaded (media_id: $media_id)" >&2
  
  # Post with media_id
  source /home/phan_harry/.openclaw/.env
  
  python3 - "$text" "$media_id" <<'EOF'
import requests
from requests_oauthlib import OAuth1
import os
import sys
import json

text = sys.argv[1]
media_id = sys.argv[2]

consumer_key = os.environ['X_CONSUMER_KEY']
consumer_secret = os.environ['X_CONSUMER_SECRET']
access_token = os.environ['X_ACCESS_TOKEN']
access_token_secret = os.environ['X_ACCESS_TOKEN_SECRET']

auth = OAuth1(consumer_key, consumer_secret, access_token, access_token_secret)

url = "https://api.twitter.com/2/tweets"
payload = {
    "text": text,
    "media": {
        "media_ids": [media_id]
    }
}

response = requests.post(url, auth=auth, json=payload)

if response.status_code == 201:
    tweet = response.json()
    tweet_id = tweet['data']['id']
    print(f"✓ Twitter posted: https://twitter.com/user/status/{tweet_id}")
else:
    print(f"✗ Twitter failed: {response.status_code} - {response.text}", file=sys.stderr)
    exit(1)
EOF
}
