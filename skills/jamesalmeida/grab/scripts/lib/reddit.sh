# --- Reddit Handler ---

grab_reddit() {
    local url="$1"

    # Clean URL: remove query params, trailing slashes, ensure no .json yet
    local clean_url
    clean_url=$(echo "$url" | sed 's/[?#].*//' | sed 's/\/$//')

    info "Fetching Reddit post..."

    # Try JSON API first (multiple User-Agents), fall back to AGENT_FETCH signal
    local json_data=""
    local tmp_json tmp_parsed
    tmp_json=$(mktemp)
    tmp_parsed=$(mktemp)

    for ua in "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "grab-skill/1.0"; do
        json_data=$(curl -sS -L -H "User-Agent: $ua" "${clean_url}.json" 2>/dev/null) || continue
        # Check if it's valid JSON array (not error)
        echo "$json_data" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if isinstance(d, list) and len(d) >= 1:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null && break
        json_data=""
    done

    if [[ -z "$json_data" ]]; then
        # Signal the agent to handle via web_fetch
        echo "REDDIT_FETCH_NEEDED:${clean_url}"
        info "Reddit API blocked — requires agent-level web_fetch."
        info "URL: $clean_url"
        rm -f "$tmp_json" "$tmp_parsed"
        exit 3
    fi

    echo "$json_data" > "$tmp_json"

    GRAB_TMP_JSON="$tmp_json" GRAB_TMP_PARSED="$tmp_parsed" python3 -c "
import json, sys, html, os
from datetime import datetime, timezone

with open(os.environ['GRAB_TMP_JSON']) as f:
    data = json.load(f)

post = data[0]['data']['children'][0]['data']
comments = data[1]['data']['children'] if len(data) > 1 else []

title = html.unescape(post.get('title', ''))
author = post.get('author', 'unknown')
subreddit = post.get('subreddit_prefixed', '')
score = post.get('score', 0)
upvote_ratio = post.get('upvote_ratio', 0)
num_comments = post.get('num_comments', 0)
created_utc = post.get('created_utc', 0)
selftext = html.unescape(post.get('selftext', ''))
permalink = post.get('permalink', '')
post_url = post.get('url', '')
is_video = post.get('is_video', False)
domain = post.get('domain', '')

images = []
if post.get('preview', {}).get('images'):
    for img in post['preview']['images']:
        src = html.unescape(img['source']['url'])
        images.append(src)
if post.get('is_gallery') and post.get('media_metadata'):
    for mid, mdata in post['media_metadata'].items():
        if mdata.get('s', {}).get('u'):
            images.append(html.unescape(mdata['s']['u']))

top_comments = []
for c in comments[:20]:
    if c.get('kind') != 't1':
        continue
    cd = c.get('data', {})
    if not cd.get('body'):
        continue
    top_comments.append({
        'author': cd.get('author', '[deleted]'),
        'score': cd.get('score', 0),
        'body': html.unescape(cd.get('body', ''))
    })

dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
date_str = dt.strftime('%Y-%m-%d %H:%M UTC')

result = {
    'title': title, 'author': author, 'subreddit': subreddit,
    'score': score, 'upvote_ratio': upvote_ratio, 'num_comments': num_comments,
    'date': date_str, 'selftext': selftext, 'permalink': permalink,
    'post_url': post_url, 'is_video': is_video, 'domain': domain,
    'images': images, 'top_comments': top_comments
}

with open(os.environ['GRAB_TMP_PARSED'], 'w') as f:
    json.dump(result, f)
" || {
        rm -f "$tmp_json" "$tmp_parsed"
        err "Failed to parse Reddit data"
        exit 1
    }

    # Extract fields
    local title author subreddit score num_comments date_field selftext post_url is_video domain permalink
    local _extract="import json,os; d=json.load(open(os.environ['GRAB_TMP_PARSED'])); print(d['"
    local _end="'])"
    export GRAB_TMP_PARSED="$tmp_parsed"
    title=$(python3 -c "${_extract}title${_end}")
    author=$(python3 -c "${_extract}author${_end}")
    subreddit=$(python3 -c "${_extract}subreddit${_end}")
    score=$(python3 -c "${_extract}score${_end}")
    num_comments=$(python3 -c "${_extract}num_comments${_end}")
    date_field=$(python3 -c "${_extract}date${_end}")
    selftext=$(python3 -c "${_extract}selftext${_end}")
    post_url=$(python3 -c "${_extract}post_url${_end}")
    is_video=$(python3 -c "${_extract}is_video${_end}")
    domain=$(python3 -c "${_extract}domain${_end}")
    permalink=$(python3 -c "${_extract}permalink${_end}")

    local slug
    slug=$(slugify "$(echo "$title" | head -c 80)")
    [[ -z "$slug" ]] && slug="reddit-post"

    local sub_dir="$BASE_DIR/Reddit"
    local folder_name="$(date_str)_${slug}"
    local out_dir="$sub_dir/$folder_name"
    mkdir -p "$out_dir"

    info "Saving to: $folder_name/"

    # Save post text
    {
        echo "Title: $title"
        echo "Author: u/$author"
        echo "Subreddit: $subreddit"
        echo "Date: $date_field"
        echo "Score: $score"
        echo "Comments: $num_comments"
        echo "URL: https://reddit.com${permalink}"
        [[ -n "$post_url" && "$domain" != "self."* ]] && echo "Link: $post_url"
        echo ""
        echo "---"
        echo ""
        echo "$selftext"
    } > "$out_dir/post.txt"
    log "Post saved"

    # Save top comments
    GRAB_TMP_PARSED="$tmp_parsed" python3 -c "
import json, os
data = json.load(open(os.environ['GRAB_TMP_PARSED']))
comments = data['top_comments']
if not comments:
    exit(0)
for i, c in enumerate(comments, 1):
    print(f\"--- Comment {i} (u/{c['author']}, {c['score']} points) ---\")
    print(c['body'])
    print()
" > "$out_dir/comments.txt" 2>/dev/null
    if [[ -s "$out_dir/comments.txt" ]]; then
        local ccount
        ccount=$(grep -c "^--- Comment" "$out_dir/comments.txt" || echo 0)
        log "Top $ccount comments saved"
    else
        rm -f "$out_dir/comments.txt"
    fi

    # Download images
    local image_count
    image_count=$(GRAB_TMP_PARSED="$tmp_parsed" python3 -c "import json,os; print(len(json.load(open(os.environ['GRAB_TMP_PARSED']))['images']))")
    if [[ "$image_count" -gt 0 ]]; then
        info "Downloading $image_count image(s)..."
        IMG_IDX=1
        GRAB_TMP_PARSED="$tmp_parsed" python3 -c "
import json, os
data = json.load(open(os.environ['GRAB_TMP_PARSED']))
for url in data['images']:
    print(url)
" | while IFS= read -r img_url; do
            [[ -z "$img_url" ]] && continue
            local idx="${IMG_IDX:-1}"
            IMG_IDX=$((idx + 1))
            curl -sS -o "$out_dir/image_$(printf '%02d' $idx).jpg" "$img_url" 2>/dev/null && \
                log "Image $idx saved" || warn "Image $idx failed"
        done
    fi

    # Download video if present
    if [[ "$is_video" == "True" ]]; then
        info "Downloading video..."
        yt-dlp --no-update --no-warnings \
            -o "$out_dir/video.%(ext)s" \
            "$clean_url" 2>/dev/null || warn "Video download failed"

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

            if transcribe_audio "$video_file" "$out_dir/transcript.txt"; then
                summarize_text "$out_dir/transcript.txt" "$out_dir/summary.txt" "Reddit video post titled '$title'"
            fi
        fi
    fi

    # Generate summary from post text + comments if substantial
    if [[ -z "$is_video" || "$is_video" == "False" ]]; then
        local combined_size=0
        [[ -s "$out_dir/post.txt" ]] && combined_size=$((combined_size + $(wc -c < "$out_dir/post.txt")))
        [[ -s "$out_dir/comments.txt" ]] && combined_size=$((combined_size + $(wc -c < "$out_dir/comments.txt")))

        if [[ "$combined_size" -gt 500 ]]; then
            local combined_file
            combined_file=$(mktemp)
            cat "$out_dir/post.txt" > "$combined_file"
            [[ -s "$out_dir/comments.txt" ]] && { echo -e "\n\n=== TOP COMMENTS ===\n"; cat "$out_dir/comments.txt"; } >> "$combined_file"
            summarize_text "$combined_file" "$out_dir/summary.txt" "Reddit post and discussion titled '$title' in $subreddit"
            rm -f "$combined_file"
        fi
    fi

    # Cleanup temp files
    rm -f "$tmp_json" "$tmp_parsed"

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

