#!/bin/bash

# Baidu Baike Skill Implementation
# This script provides access to Baidu Baike API for encyclopedia lookups

set -e

# Check if required environment variable is set
if [ -z "$BAIDU_API_KEY" ]; then
    echo '{"error": "BAIDU_API_KEY environment variable not set"}'
    exit 1
fi

ACTION="$1"
shift

case "$ACTION" in
    "search")
        TITLE="$1"
        if [ -z "$TITLE" ]; then
            echo '{"error": "Missing title parameter"}'
            exit 1
        fi
        
        # Using Baidu Baike API to get lemma content
        curl -s -X GET \
          -H "Authorization: Bearer $BAIDU_API_KEY" \
          "https://appbuilder.baidu.com/v2/baike/lemma/get_content?search_type=lemmaTitle&search_key=$TITLE"
        ;;
        
    "search_by_id")
        ID="$1"
        if [ -z "$ID" ]; then
            echo '{"error": "Missing ID parameter"}'
            exit 1
        fi
        
        curl -s -X GET \
          -H "Authorization: Bearer $BAIDU_API_KEY" \
          "https://appbuilder.baidu.com/v2/baike/lemma/get_content?search_type=lemmaId&search_key=$ID"
        ;;
        
    "list_by_title")
        TITLE="$1"
        TOP_K="${2:-5}"  # Default to 5 results
        
        if [ -z "$TITLE" ]; then
            echo '{"error": "Missing title parameter"}'
            exit 1
        fi
        
        curl -s -X GET \
          -H "Authorization: Bearer $BAIDU_API_KEY" \
          "https://appbuilder.baidu.com/v2/baike/lemma/get_list_by_title?lemma_title=$TITLE&top_k=$TOP_K"
        ;;
        
    *)
        echo '{"error": "Invalid action. Use: search <title>, search_by_id <id>, or list_by_title <title> [top_k]"}'
        exit 1
        ;;
esac
