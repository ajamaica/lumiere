#!/bin/bash

# Baidu Scholar Search Skill Implementation

set -e

# Check if required environment variable is set
if [ -z "$BAIDU_API_KEY" ]; then
    echo '{"error": "BAIDU_API_KEY environment variable not set"}'
    exit 1
fi

WD="$1"
if [ -z "$WD" ]; then
    echo '{"error": "Missing wd parameter"}'
    exit 1
fi

pageNum="${2:-0}"
enable_abstract="${3:-false}"

curl -s -X GET \
  -H "Authorization: Bearer $BAIDU_API_KEY" \
  "https://qianfan.baidubce.com/v2/tools/baidu_scholar/search?wd=$WD&pageNum=$pageNum&enable_abstract=$enable_abstract"