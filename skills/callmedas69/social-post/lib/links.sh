#!/bin/bash
# Link shortening for social-post

# Shorten a single URL using TinyURL (no API key needed)
shorten_url() {
  local url="$1"
  
  # Use TinyURL API (free, no auth)
  local short_url=$(curl -s "http://tinyurl.com/api-create.php?url=$(echo "$url" | jq -sRr @uri)")
  
  if [[ "$short_url" =~ ^https?://tinyurl.com/ ]]; then
    echo "$short_url"
    return 0
  else
    # Fallback: return original URL
    echo "$url"
    return 1
  fi
}

# Find and shorten all URLs in text
shorten_links_in_text() {
  local text="$1"
  local shortened_text="$text"
  
  # Regex to match URLs
  local url_regex='https?://[^[:space:]]+'
  
  # Find all URLs
  local urls=$(echo "$text" | grep -oE "$url_regex" || true)
  
  if [ -z "$urls" ]; then
    echo "$text"
    return 0
  fi
  
  # Shorten each URL
  while IFS= read -r url; do
    [ -z "$url" ] && continue
    
    echo "Shortening: $url" >&2
    local short=$(shorten_url "$url")
    
    if [ "$short" != "$url" ]; then
      echo "  → $short" >&2
      # Replace in text
      shortened_text="${shortened_text//$url/$short}"
    else
      echo "  → Failed, keeping original" >&2
    fi
  done <<< "$urls"
  
  echo "$shortened_text"
}

# Calculate character savings from link shortening
estimate_link_savings() {
  local text="$1"
  
  local url_regex='https?://[^[:space:]]+'
  local urls=$(echo "$text" | grep -oE "$url_regex" || true)
  
  if [ -z "$urls" ]; then
    echo "0"
    return
  fi
  
  local total_saved=0
  while IFS= read -r url; do
    [ -z "$url" ] && continue
    local url_length=${#url}
    # TinyURL typically produces ~20 char URLs
    local short_length=20
    local saved=$((url_length - short_length))
    [ "$saved" -gt 0 ] && total_saved=$((total_saved + saved))
  done <<< "$urls"
  
  echo "$total_saved"
}
