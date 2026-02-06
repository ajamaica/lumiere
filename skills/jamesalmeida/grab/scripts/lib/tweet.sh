# --- Tweet Handler ---

grab_tweet() {
    local url="$1"

    info "Fetching tweet metadata..."

    # Get tweet JSON via yt-dlp
    local json_data
    json_data=$(yt-dlp --no-update --dump-json "$url" 2>/dev/null) || true

    local has_video=false
    local has_images=false
    local tweet_text=""
    local author=""
    local author_id=""
    local upload_date=""
    local like_count=""
    local repost_count=""
    local reply_count=""
    local view_count=""
    local title=""

    if [[ -n "$json_data" ]]; then
        has_video=true
        author=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uploader','unknown'))" 2>/dev/null) || author="unknown"
        author_id=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uploader_id',''))" 2>/dev/null) || author_id=""
        tweet_text=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('description',''))" 2>/dev/null) || tweet_text=""
        upload_date=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('upload_date',''))" 2>/dev/null) || upload_date=""
        like_count=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('like_count',''))" 2>/dev/null) || like_count=""
        repost_count=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('repost_count',''))" 2>/dev/null) || repost_count=""
        view_count=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('view_count',''))" 2>/dev/null) || view_count=""
        title=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null) || title=""
    fi

    # If no video, try to get tweet text and images via guest API
    if [[ "$has_video" == false ]]; then
        info "No video found, checking for text/images..."

        # Extract tweet ID from URL
        local tweet_id
        tweet_id=$(echo "$url" | grep -oE '[0-9]{15,}' | head -1)

        if [[ -n "$tweet_id" ]]; then
            # Try syndication API for text
            local synd
            synd=$(curl -sS "https://cdn.syndication.twimg.com/tweet-result?id=$tweet_id&token=0" 2>/dev/null) || true

            if [[ -n "$synd" ]]; then
                author=$(echo "$synd" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('name','unknown'))" 2>/dev/null) || author="unknown"
                author_id=$(echo "$synd" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('screen_name',''))" 2>/dev/null) || author_id=""
                tweet_text=$(echo "$synd" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('text',''))" 2>/dev/null) || tweet_text=""
                upload_date=$(echo "$synd" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('created_at','')[:10])" 2>/dev/null) || upload_date=""

                # Check for images
                local image_urls
                image_urls=$(echo "$synd" | python3 -c "
import sys, json
d = json.load(sys.stdin)
photos = d.get('mediaDetails', [])
for p in photos:
    if p.get('type') == 'photo':
        print(p.get('media_url_https', ''))
" 2>/dev/null) || true

                if [[ -n "$image_urls" ]]; then
                    has_images=true
                fi
            fi
        fi
    fi

    # Build folder name
    local slug=""
    if [[ -n "$tweet_text" ]]; then
        slug=$(slugify "$(echo "$tweet_text" | head -c 80)")
    elif [[ -n "$title" ]]; then
        slug=$(slugify "$title")
    fi
    [[ -z "$slug" ]] && slug="tweet"

    local sub_dir="$BASE_DIR/XPosts"
    local folder_name="$(date_str)_${slug}"
    local out_dir="$sub_dir/$folder_name"
    mkdir -p "$out_dir"

    info "Saving to: $folder_name/"

    # Save tweet text
    {
        echo "Author: $author (@${author_id})"
        echo "Date: $upload_date"
        echo "URL: $url"
        [[ -n "$like_count" ]] && echo "Likes: $like_count"
        [[ -n "$repost_count" ]] && echo "Reposts: $repost_count"
        [[ -n "$view_count" ]] && echo "Views: $view_count"
        echo ""
        echo "---"
        echo ""
        echo "$tweet_text"
    } > "$out_dir/tweet.txt"
    log "Tweet text saved"

    # Download video if present
    if [[ "$has_video" == true ]]; then
        info "Downloading video..."
        yt-dlp --no-update --no-warnings \
            -o "$out_dir/video.%(ext)s" \
            "$url" 2>/dev/null || {
                warn "Video download failed"
            }

        # Find the downloaded video file
        local video_file=""
        for f in "$out_dir"/video.*; do
            if [[ -f "$f" && "$f" != *".part" ]]; then
                video_file="$f"
                break
            fi
        done

        if [[ -n "$video_file" ]]; then
            local vsize
            vsize=$(du -h "$video_file" | cut -f1)
            log "Video saved ($vsize)"

            # Transcribe
            if transcribe_audio "$video_file" "$out_dir/transcript.txt"; then
                # Summarize
                summarize_text "$out_dir/transcript.txt" "$out_dir/summary.txt" "video from a tweet"

                # Generate descriptive title from transcript and rename folder
                info "Generating descriptive title..."
                local desc_title
                desc_title=$(generate_title "$out_dir/transcript.txt" "video from a tweet")
                if [[ -n "$desc_title" ]]; then
                    local new_slug
                    new_slug=$(slugify "$desc_title")
                    if [[ -n "$new_slug" ]]; then
                        local new_folder="$(date_str)_${new_slug}"
                        local new_dir="$sub_dir/$new_folder"
                        if [[ "$new_dir" != "$out_dir" && ! -d "$new_dir" ]]; then
                            mv "$out_dir" "$new_dir"
                            out_dir="$new_dir"
                            folder_name="$new_folder"
                            info "Renamed folder → $folder_name/"
                        fi
                    fi
                fi
            fi
        fi
    fi

    # Download images if present
    if [[ "$has_images" == true ]]; then
        info "Downloading images..."
        local i=1
        while IFS= read -r img_url; do
            [[ -z "$img_url" ]] && continue
            local ext="jpg"
            [[ "$img_url" == *".png"* ]] && ext="png"
            local img_file="$out_dir/image_$(printf '%02d' $i).$ext"
            curl -sS -o "$img_file" "${img_url}:large" 2>/dev/null || curl -sS -o "$img_file" "$img_url" 2>/dev/null || true
            if [[ -s "$img_file" ]]; then
                log "Image $i saved"

                # If first image and no video, try to describe it for the folder name
                if [[ $i -eq 1 && "$has_video" == false ]]; then
                    info "Analyzing image for description..."
                    local desc
                    desc=$(describe_image "$img_file")
                    if [[ -n "$desc" && "$desc" != "image" ]]; then
                        local new_slug
                        new_slug=$(slugify "$desc")
                        local new_folder="$(date_str)_${new_slug}"
                        local new_dir="$sub_dir/$new_folder"
                        if [[ "$new_dir" != "$out_dir" ]]; then
                            mv "$out_dir" "$new_dir"
                            out_dir="$new_dir"
                            folder_name="$new_folder"
                            info "Renamed folder to: $folder_name/"
                        fi
                    fi
                fi
            fi
            i=$((i + 1))
        done <<< "$image_urls"
    fi

    echo ""
    log "Done! Saved to: $out_dir/"
    echo ""
    echo "📁 Contents:"
    ls -1 "$out_dir" | while read -r f; do
        local size
        size=$(du -h "$out_dir/$f" | cut -f1 | tr -d ' ')
        echo "   $f ($size)"
    done
}

