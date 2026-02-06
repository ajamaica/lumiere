#!/bin/bash
# Validation library for social-post

# 10% safety buffer applied
TWITTER_LIMIT=252        # 280 - 10% = 252
FARCASTER_BYTE_LIMIT=288  # 320 - 10% = 288

# Check Twitter character count
validate_twitter() {
  local text="$1"
  local char_count=${#text}
  
  if [ "$char_count" -gt "$TWITTER_LIMIT" ]; then
    echo "❌ Twitter: $char_count/$TWITTER_LIMIT characters (over by $(($char_count - $TWITTER_LIMIT)))" >&2
    return 1
  else
    echo "✅ Twitter: $char_count/$TWITTER_LIMIT characters" >&2
    return 0
  fi
}

# Check Farcaster byte count (UTF-8)
validate_farcaster() {
  local text="$1"
  local byte_count=$(echo -n "$text" | wc -c)
  
  if [ "$byte_count" -gt "$FARCASTER_BYTE_LIMIT" ]; then
    echo "❌ Farcaster: $byte_count/$FARCASTER_BYTE_LIMIT bytes (over by $(($byte_count - $FARCASTER_BYTE_LIMIT)))" >&2
    return 1
  else
    echo "✅ Farcaster: $byte_count/$FARCASTER_BYTE_LIMIT bytes" >&2
    return 0
  fi
}

# Truncate text to fit platform
truncate_for_twitter() {
  local text="$1"
  if [ "${#text}" -gt "$TWITTER_LIMIT" ]; then
    echo "${text:0:$((TWITTER_LIMIT-3))}..."
  else
    echo "$text"
  fi
}

truncate_for_farcaster() {
  local text="$1"
  local byte_count=$(echo -n "$text" | wc -c)
  
  if [ "$byte_count" -gt "$FARCASTER_BYTE_LIMIT" ]; then
    # Simple truncation (not perfect for multi-byte chars, but safe)
    local cutoff=$((FARCASTER_BYTE_LIMIT - 3))
    echo "${text:0:$cutoff}..."
  else
    echo "$text"
  fi
}

# Validate both platforms
validate_both() {
  local text="$1"
  local twitter_ok=0
  local farcaster_ok=0
  
  validate_twitter "$text" && twitter_ok=1
  validate_farcaster "$text" && farcaster_ok=1
  
  if [ "$twitter_ok" -eq 1 ] && [ "$farcaster_ok" -eq 1 ]; then
    return 0
  else
    return 1
  fi
}
