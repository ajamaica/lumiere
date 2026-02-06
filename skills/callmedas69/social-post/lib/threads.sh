#!/bin/bash
# Thread support for social-post

# Split text into thread parts
# Args: text, platform (twitter|farcaster)
split_into_thread() {
  local text="$1"
  local platform="$2"
  
  # Determine limit based on platform
  local limit=252
  if [ "$platform" = "farcaster" ]; then
    limit=288
  fi
  
  # Reserve space for numbering (e.g., " (1/3)")
  local numbering_space=8
  local effective_limit=$((limit - numbering_space))
  
  # Split text smartly
  local -a parts=()
  local current_part=""
  
  # First try splitting by paragraphs (double newline)
  local paragraphs=$(echo "$text" | sed ':a;N;$!ba;s/\n\n/\x00/g')
  
  IFS=$'\x00' read -ra para_array <<< "$paragraphs"
  
  for para in "${para_array[@]}"; do
    # Remove newlines within paragraph
    para=$(echo "$para" | tr '\n' ' ')
    
    # Check if this paragraph alone exceeds limit
    local para_length=${#para}
    if [ "$platform" = "farcaster" ]; then
      para_length=$(echo -n "$para" | wc -c)
    fi
    
    if [ "$para_length" -gt "$effective_limit" ]; then
      # Paragraph too long - split by sentences
      IFS='.' read -ra sentences <<< "$para"
      
      for sent in "${sentences[@]}"; do
        sent=$(echo "$sent" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        [ -z "$sent" ] && continue
        sent="$sent."
        
        local sent_length=${#sent}
        if [ "$platform" = "farcaster" ]; then
          sent_length=$(echo -n "$sent" | wc -c)
        fi
        
        # Check if adding sentence exceeds limit
        local test_part="$current_part"
        [ -n "$test_part" ] && test_part="$test_part "
        test_part="$test_part$sent"
        
        local test_length=${#test_part}
        if [ "$platform" = "farcaster" ]; then
          test_length=$(echo -n "$test_part" | wc -c)
        fi
        
        if [ "$test_length" -gt "$effective_limit" ] && [ -n "$current_part" ]; then
          parts+=("$current_part")
          current_part="$sent"
        else
          if [ -n "$current_part" ]; then
            current_part="$current_part $sent"
          else
            current_part="$sent"
          fi
        fi
      done
    else
      # Paragraph fits, check if adding to current part
      local test_part="$current_part"
      [ -n "$test_part" ] && test_part="$test_part

"
      test_part="$test_part$para"
      
      local test_length=${#test_part}
      if [ "$platform" = "farcaster" ]; then
        test_length=$(echo -n "$test_part" | wc -c)
      fi
      
      if [ "$test_length" -gt "$effective_limit" ] && [ -n "$current_part" ]; then
        parts+=("$current_part")
        current_part="$para"
      else
        if [ -n "$current_part" ]; then
          current_part="$current_part

$para"
        else
          current_part="$para"
        fi
      fi
    fi
  done
  
  # Add final part
  if [ -n "$current_part" ]; then
    parts+=("$current_part")
  fi
  
  # Output parts with numbering
  local total=${#parts[@]}
  for i in "${!parts[@]}"; do
    local num=$((i + 1))
    echo "${parts[$i]} ($num/$total)"
    echo "---THREAD_SEPARATOR---"
  done
}

# Check if text needs threading
needs_threading() {
  local text="$1"
  local platform="$2"
  
  local limit=252
  if [ "$platform" = "farcaster" ]; then
    limit=288
    local byte_count=$(echo -n "$text" | wc -c)
    [ "$byte_count" -gt "$limit" ] && return 0
  else
    [ "${#text}" -gt "$limit" ] && return 0
  fi
  
  return 1
}
