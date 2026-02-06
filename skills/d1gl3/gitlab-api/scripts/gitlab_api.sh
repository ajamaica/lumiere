#!/bin/bash
# GitLab API Helper Script
# Usage: See SKILL.md for examples

set -e

# Load config
GITLAB_TOKEN="${GITLAB_TOKEN:-$(cat ~/.config/gitlab/api_token 2>/dev/null)}"
GITLAB_URL="${GITLAB_URL:-$(cat ~/.config/gitlab/instance_url 2>/dev/null || echo "https://gitlab.com")}"

# Ensure URL has https:// prefix
if [[ "$GITLAB_URL" != http* ]]; then
    GITLAB_URL="https://$GITLAB_URL"
fi

if [ -z "$GITLAB_TOKEN" ]; then
    echo "Error: GitLab token not found" >&2
    echo "Set GITLAB_TOKEN env var or create ~/.config/gitlab/api_token" >&2
    exit 1
fi

API_BASE="$GITLAB_URL/api/v4"

# Helper: URL encode
urlencode() {
    echo "$1" | jq -sRr @uri
}

# Command: list-projects
cmd_list_projects() {
    curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "$API_BASE/projects?owned=true&per_page=50" \
        | jq -r '.[] | "\(.id)\t\(.path_with_namespace)\t\(.web_url)"'
}

# Command: read-file <project-id> <file-path> [branch]
cmd_read_file() {
    local project_id="$1"
    local file_path="$2"
    local branch="${3:-main}"
    
    if [ -z "$project_id" ] || [ -z "$file_path" ]; then
        echo "Usage: read-file <project-id> <file-path> [branch]" >&2
        exit 1
    fi
    
    local encoded_path=$(urlencode "$file_path")
    
    curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "$API_BASE/projects/$project_id/repository/files/$encoded_path?ref=$branch" \
        | jq -r '.content' | base64 -d
}

# Command: write-file <project-id> <file-path> <content> <commit-msg> [branch]
cmd_write_file() {
    local project_id="$1"
    local file_path="$2"
    local content="$3"
    local commit_msg="$4"
    local branch="${5:-main}"
    
    if [ -z "$project_id" ] || [ -z "$file_path" ] || [ -z "$content" ] || [ -z "$commit_msg" ]; then
        echo "Usage: write-file <project-id> <file-path> <content> <commit-msg> [branch]" >&2
        exit 1
    fi
    
    local encoded_path=$(urlencode "$file_path")
    local encoded_content=$(echo -n "$content" | base64)
    
    # Check if file exists
    if curl -s -f -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "$API_BASE/projects/$project_id/repository/files/$encoded_path?ref=$branch" \
        >/dev/null 2>&1; then
        # Update existing file
        local method="PUT"
    else
        # Create new file
        local method="POST"
    fi
    
    curl -s -X "$method" -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE/projects/$project_id/repository/files/$encoded_path" \
        -d @- <<EOF | jq -r '.file_path + " " + .branch'
{
  "branch": "$branch",
  "content": "$encoded_content",
  "commit_message": "$commit_msg",
  "encoding": "base64"
}
EOF
}

# Command: delete-file <project-id> <file-path> <commit-msg> [branch]
cmd_delete_file() {
    local project_id="$1"
    local file_path="$2"
    local commit_msg="$3"
    local branch="${4:-main}"
    
    if [ -z "$project_id" ] || [ -z "$file_path" ] || [ -z "$commit_msg" ]; then
        echo "Usage: delete-file <project-id> <file-path> <commit-msg> [branch]" >&2
        exit 1
    fi
    
    local encoded_path=$(urlencode "$file_path")
    
    curl -s -X DELETE -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE/projects/$project_id/repository/files/$encoded_path" \
        -d @- <<EOF | jq -r '"Deleted: " + .file_path'
{
  "branch": "$branch",
  "commit_message": "$commit_msg"
}
EOF
}

# Command: list-dir <project-id> <dir-path> [branch]
cmd_list_dir() {
    local project_id="$1"
    local dir_path="$2"
    local branch="${3:-main}"
    
    if [ -z "$project_id" ]; then
        echo "Usage: list-dir <project-id> <dir-path> [branch]" >&2
        exit 1
    fi
    
    local url="$API_BASE/projects/$project_id/repository/tree?ref=$branch&per_page=100"
    if [ -n "$dir_path" ]; then
        url="$url&path=$(urlencode "$dir_path")"
    fi
    
    curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" "$url" \
        | jq -r '.[] | "\(.type)\t\(.path)"'
}

# Main dispatcher
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    list-projects)
        cmd_list_projects "$@"
        ;;
    read-file)
        cmd_read_file "$@"
        ;;
    write-file)
        cmd_write_file "$@"
        ;;
    delete-file)
        cmd_delete_file "$@"
        ;;
    list-dir)
        cmd_list_dir "$@"
        ;;
    *)
        echo "Usage: $0 <command> [args...]" >&2
        echo "" >&2
        echo "Commands:" >&2
        echo "  list-projects" >&2
        echo "  read-file <project-id> <file-path> [branch]" >&2
        echo "  write-file <project-id> <file-path> <content> <commit-msg> [branch]" >&2
        echo "  delete-file <project-id> <file-path> <commit-msg> [branch]" >&2
        echo "  list-dir <project-id> <dir-path> [branch]" >&2
        exit 1
        ;;
esac
