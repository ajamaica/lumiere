#!/bin/bash
# Memory Kit Search Library
# Provides semantic search across memory/*.md files

# Configuration
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_DIR="${WORKSPACE}/memory"
PROCEDURES_DIR="${MEMORY_DIR}/procedures"

# Colors for output
COLOR_RESET='\033[0m'
COLOR_DATE='\033[0;36m'      # Cyan
COLOR_FILE='\033[0;90m'      # Gray
COLOR_TAG='\033[0;33m'       # Yellow
COLOR_HEADING='\033[1;37m'   # Bold White
COLOR_PREVIEW='\033[0;37m'   # White
COLOR_HIGHLIGHT='\033[1;32m' # Bold Green

# Parse frontmatter from a file
parse_frontmatter() {
    local file="$1"
    local in_frontmatter=0
    local frontmatter=""
    
    while IFS= read -r line; do
        if [[ "$line" == "---" ]]; then
            if [[ $in_frontmatter -eq 0 ]]; then
                in_frontmatter=1
            else
                break
            fi
        elif [[ $in_frontmatter -eq 1 ]]; then
            frontmatter+="$line"$'\n'
        fi
    done < "$file"
    
    echo "$frontmatter"
}

# Extract tags from content line
extract_tags() {
    local line="$1"
    echo "$line" | grep -o '#[a-z][a-z0-9-]*' | sort -u
}

# Check if file matches date range
matches_date_range() {
    local file="$1"
    local since="$2"
    local until="$3"
    
    # Extract date from filename (YYYY-MM-DD.md)
    local filename=$(basename "$file")
    if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\.md$ ]]; then
        local file_date="${BASH_REMATCH[1]}"
        
        # Check since
        if [[ -n "$since" ]] && [[ "$file_date" < "$since" ]]; then
            return 1
        fi
        
        # Check until
        if [[ -n "$until" ]] && [[ "$file_date" > "$until" ]]; then
            return 1
        fi
    fi
    
    return 0
}

# Convert relative date (e.g., "7d", "2w") to YYYY-MM-DD
relative_to_date() {
    local relative="$1"
    
    if [[ "$relative" =~ ^([0-9]+)d$ ]]; then
        # Days ago
        local days="${BASH_REMATCH[1]}"
        date -v-${days}d +%Y-%m-%d 2>/dev/null || date -d "${days} days ago" +%Y-%m-%d
    elif [[ "$relative" =~ ^([0-9]+)w$ ]]; then
        # Weeks ago
        local weeks="${BASH_REMATCH[1]}"
        local days=$((weeks * 7))
        date -v-${days}d +%Y-%m-%d 2>/dev/null || date -d "${days} days ago" +%Y-%m-%d
    elif [[ "$relative" =~ ^([0-9]+)m$ ]]; then
        # Months ago
        local months="${BASH_REMATCH[1]}"
        date -v-${months}m +%Y-%m-%d 2>/dev/null || date -d "${months} months ago" +%Y-%m-%d
    else
        echo "$relative"
    fi
}

# Check if frontmatter matches filters
matches_frontmatter() {
    local frontmatter="$1"
    local filter_tags="$2"
    local filter_project="$3"
    local filter_agent="$4"
    
    # Check tags
    if [[ -n "$filter_tags" ]]; then
        local fm_tags=$(echo "$frontmatter" | grep "^tags:" | sed 's/tags://; s/\[//; s/\]//; s/,/ /g')
        for tag in $filter_tags; do
            if ! echo "$fm_tags" | grep -q "$tag"; then
                return 1
            fi
        done
    fi
    
    # Check project
    if [[ -n "$filter_project" ]]; then
        local fm_projects=$(echo "$frontmatter" | grep "^projects:" | sed 's/projects://; s/\[//; s/\]//; s/,/ /g')
        if ! echo "$fm_projects" | grep -qi "$filter_project"; then
            return 1
        fi
    fi
    
    # Check agent
    if [[ -n "$filter_agent" ]]; then
        local fm_agents=$(echo "$frontmatter" | grep "^agents:" | sed 's/agents://; s/\[//; s/\]//; s/,/ /g')
        if ! echo "$fm_agents" | grep -qi "$filter_agent"; then
            return 1
        fi
    fi
    
    return 0
}

# Calculate relevance score for a match
calculate_score() {
    local file="$1"
    local line="$2"
    local query="$3"
    local filter_tags="$4"
    local score=0
    
    # Tag match (highest priority)
    for tag in $filter_tags; do
        if echo "$line" | grep -q "#$tag"; then
            score=$((score + 10))
        fi
    done
    
    # Exact query match
    if echo "$line" | grep -qF "$query"; then
        score=$((score + 3))
    fi
    
    # Match in heading
    if echo "$line" | grep -q "^#"; then
        score=$((score + 2))
    fi
    
    # Recent file bonus (within 7 days)
    local filename=$(basename "$file")
    if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\.md$ ]]; then
        local file_date="${BASH_REMATCH[1]}"
        local seven_days_ago=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
        if [[ "$file_date" > "$seven_days_ago" ]]; then
            score=$((score + 1))
        fi
    fi
    
    # Archived penalty
    if echo "$line" | grep -q "#archived"; then
        score=$((score - 5))
    fi
    
    echo "$score"
}

# Search memory files
search_memory() {
    local query="$1"
    local filter_tags="$2"
    local filter_project="$3"
    local filter_agent="$4"
    local since="$5"
    local until="$6"
    local context_lines="${7:-3}"
    local procedure_only="${8:-0}"
    local format="${9:-text}"
    
    # Convert relative dates
    if [[ -n "$since" ]]; then
        since=$(relative_to_date "$since")
    fi
    if [[ -n "$until" ]]; then
        until=$(relative_to_date "$until")
    fi
    
    # Build file list
    local files=()
    
    if [[ "$procedure_only" -eq 1 ]]; then
        # Search procedures only
        if [[ -d "$PROCEDURES_DIR" ]]; then
            while IFS= read -r file; do
                files+=("$file")
            done < <(find "$PROCEDURES_DIR" -name "*.md" -type f)
        fi
    else
        # Search all memory files
        if [[ -d "$MEMORY_DIR" ]]; then
            while IFS= read -r file; do
                # Filter by date range
                if matches_date_range "$file" "$since" "$until"; then
                    files+=("$file")
                fi
            done < <(find "$MEMORY_DIR" -maxdepth 1 -name "*.md" -type f)
        fi
        
        # Add procedures
        if [[ -d "$PROCEDURES_DIR" ]]; then
            while IFS= read -r file; do
                files+=("$file")
            done < <(find "$PROCEDURES_DIR" -name "*.md" -type f)
        fi
    fi
    
    # Search files
    local results=()
    
    for file in "${files[@]}"; do
        # Parse frontmatter
        local frontmatter=$(parse_frontmatter "$file")
        
        # Check frontmatter filters
        if ! matches_frontmatter "$frontmatter" "$filter_tags" "$filter_project" "$filter_agent"; then
            continue
        fi
        
        # Search content
        if [[ -n "$query" ]]; then
            # Use grep with context
            local grep_result=$(grep -n -i -C "$context_lines" "$query" "$file" 2>/dev/null)
            
            if [[ -n "$grep_result" ]]; then
                # Parse grep output
                local line_num=""
                local line_content=""
                
                while IFS= read -r line; do
                    if [[ "$line" =~ ^([0-9]+):(.*)$ ]]; then
                        line_num="${BASH_REMATCH[1]}"
                        line_content="${BASH_REMATCH[2]}"
                        
                        # Extract tags from line
                        local tags=$(extract_tags "$line_content")
                        
                        # Calculate score
                        local score=$(calculate_score "$file" "$line_content" "$query" "$filter_tags")
                        
                        # Store result
                        results+=("$score|$file|$line_num|$tags|$line_content")
                    fi
                done <<< "$grep_result"
            fi
        else
            # No query, just filter by frontmatter/tags
            local line_num=1
            local tags=""
            local preview=$(head -n 5 "$file" | tail -n 1)
            local score=1
            
            results+=("$score|$file|$line_num|$tags|$preview")
        fi
    done
    
    # Sort by score (descending)
    local sorted_results=()
    if [[ ${#results[@]} -gt 0 ]]; then
        sorted_results=($(printf '%s\n' "${results[@]}" | sort -t'|' -k1 -rn))
    fi
    
    # Format output
    if [[ "$format" == "json" ]]; then
        echo "["
        local first=1
        for result in "${sorted_results[@]+"${sorted_results[@]}"}"; do
            IFS='|' read -r score file line_num tags line_content <<< "$result"
            
            if [[ $first -eq 0 ]]; then
                echo ","
            fi
            first=0
            
            local filename=$(basename "$file")
            local date_match=""
            if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\.md$ ]]; then
                date_match="${BASH_REMATCH[1]}"
            fi
            
            echo "  {"
            echo "    \"file\": \"$file\","
            echo "    \"date\": \"$date_match\","
            echo "    \"line\": $line_num,"
            echo "    \"tags\": \"$tags\","
            echo "    \"preview\": $(echo "$line_content" | head -c 100 | jq -Rs .),"
            echo "    \"score\": $score"
            echo -n "  }"
        done
        echo ""
        echo "]"
    else
        # Text format
        local count=0
        for result in "${sorted_results[@]+"${sorted_results[@]}"}"; do
            IFS='|' read -r score file line_num tags line_content <<< "$result"
            
            count=$((count + 1))
            
            local filename=$(basename "$file")
            local date_match=""
            if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\.md$ ]]; then
                date_match="${BASH_REMATCH[1]}"
            fi
            
            # Extract heading/context
            local heading=$(grep -B 5 -m 1 "^###\? " "$file" 2>/dev/null | tail -1 | sed 's/^#* //')
            if [[ -z "$heading" ]]; then
                heading=$(basename "$file" .md)
            fi
            
            echo -e "\n${COLOR_HEADING}${count}. ${heading}${COLOR_RESET}"
            
            if [[ -n "$date_match" ]]; then
                echo -e "   ${COLOR_DATE}📅 $date_match${COLOR_RESET} ${COLOR_FILE}| $file:$line_num${COLOR_RESET}"
            else
                echo -e "   ${COLOR_FILE}📄 $file:$line_num${COLOR_RESET}"
            fi
            
            if [[ -n "$tags" ]]; then
                echo -e "   ${COLOR_TAG}Tags: $tags${COLOR_RESET}"
            fi
            
            # Show preview (first 150 chars)
            local preview=$(echo "$line_content" | head -c 150 | sed 's/^[[:space:]]*//')
            echo -e "   ${COLOR_PREVIEW}$preview...${COLOR_RESET}"
        done
        
        if [[ $count -eq 0 ]]; then
            echo "No results found."
        else
            echo -e "\n${COLOR_HEADING}Found $count result(s)${COLOR_RESET}"
        fi
    fi
}

# Count occurrences
count_occurrences() {
    local query="$1"
    local since="$2"
    local until="$3"
    
    # Convert relative dates
    if [[ -n "$since" ]]; then
        since=$(relative_to_date "$since")
    fi
    if [[ -n "$until" ]]; then
        until=$(relative_to_date "$until")
    fi
    
    # Build file list
    local files=()
    if [[ -d "$MEMORY_DIR" ]]; then
        while IFS= read -r file; do
            if matches_date_range "$file" "$since" "$until"; then
                files+=("$file")
            fi
        done < <(find "$MEMORY_DIR" -name "*.md" -type f)
    fi
    
    # Count occurrences (using temp files for compatibility with bash 3.2)
    local total=0
    local temp_file_counts=$(mktemp)
    local temp_tag_counts=$(mktemp)
    local most_recent=""
    
    for file in "${files[@]}"; do
        local count=$(grep -c -i "$query" "$file" 2>/dev/null | head -1)
        count=${count:-0}
        
        if [[ $count -gt 0 ]]; then
            total=$((total + count))
            echo "$(basename "$file")|$count" >> "$temp_file_counts"
            
            # Check for tags in matching lines
            while IFS= read -r line; do
                local tags=$(extract_tags "$line")
                for tag in $tags; do
                    echo "$tag" >> "$temp_tag_counts"
                done
            done < <(grep -i "$query" "$file" 2>/dev/null)
            
            # Track most recent
            local filename=$(basename "$file")
            if [[ "$filename" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\.md$ ]]; then
                local file_date="${BASH_REMATCH[1]}"
                if [[ -z "$most_recent" ]] || [[ "$file_date" > "$most_recent" ]]; then
                    most_recent="$file_date"
                fi
            fi
        fi
    done
    
    # Display results
    echo -e "${COLOR_HEADING}Found \"$query\" mentioned $total time(s)${COLOR_RESET}\n"
    
    if [[ $total -gt 0 ]]; then
        echo "By file:"
        if [[ -s "$temp_file_counts" ]]; then
            while IFS='|' read -r filename count; do
                echo "  - $filename: $count occurrence(s)"
            done < "$temp_file_counts" | sort
        fi
        
        echo ""
        if [[ -s "$temp_tag_counts" ]]; then
            echo "Tagged as:"
            sort "$temp_tag_counts" | uniq -c | while read -r count tag; do
                echo "  - $tag: $count time(s)"
            done
            echo ""
        fi
        
        if [[ -n "$most_recent" ]]; then
            echo "Most recent: $most_recent"
        fi
    fi
    
    # Cleanup
    rm -f "$temp_file_counts" "$temp_tag_counts"
}
