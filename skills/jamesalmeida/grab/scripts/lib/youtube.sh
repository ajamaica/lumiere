# --- YouTube Handler ---

grab_youtube() {
    local url="$1"

    info "Fetching YouTube metadata..."

    local json_data
    json_data=$(yt-dlp --no-update --dump-json --no-download "$url" 2>/dev/null) || {
        err "Failed to fetch YouTube metadata"
        exit 1
    }

    local title
    title=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','video'))" 2>/dev/null) || title="video"
    local uploader
    uploader=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uploader','unknown'))" 2>/dev/null) || uploader="unknown"
    local description
    description=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('description',''))" 2>/dev/null) || description=""
    local thumbnail
    thumbnail=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('thumbnail',''))" 2>/dev/null) || thumbnail=""
    local duration
    duration=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('duration_string',''))" 2>/dev/null) || duration=""
    local view_count
    view_count=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('view_count',''))" 2>/dev/null) || view_count=""
    local like_count
    like_count=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('like_count',''))" 2>/dev/null) || like_count=""
    local upload_date
    upload_date=$(echo "$json_data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('upload_date',''))" 2>/dev/null) || upload_date=""

    local slug
    slug=$(slugify "$title")
    local sub_dir="$BASE_DIR/Youtube"
    local folder_name="$(date_str)_${slug}"
    local out_dir="$sub_dir/$folder_name"
    mkdir -p "$out_dir"

    info "Saving to: $folder_name/"

    # Save description
    {
        echo "Title: $title"
        echo "Channel: $uploader"
        echo "Date: $upload_date"
        echo "Duration: $duration"
        echo "URL: $url"
        [[ -n "$view_count" ]] && echo "Views: $view_count"
        [[ -n "$like_count" ]] && echo "Likes: $like_count"
        echo ""
        echo "---"
        echo ""
        echo "$description"
    } > "$out_dir/description.txt"
    log "Description saved"

    # Download thumbnail
    if [[ -n "$thumbnail" ]]; then
        info "Downloading thumbnail..."
        curl -sS -o "$out_dir/thumbnail.jpg" "$thumbnail" 2>/dev/null && log "Thumbnail saved" || warn "Thumbnail download failed"
    fi

    # Download video
    info "Downloading video..."
    yt-dlp --no-update --no-warnings \
        -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best" \
        --merge-output-format mp4 \
        -o "$out_dir/video.%(ext)s" \
        "$url" 2>/dev/null || {
            warn "Video download failed"
        }

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
            summarize_text "$out_dir/transcript.txt" "$out_dir/summary.txt" "YouTube video titled '$title'"
        fi
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

