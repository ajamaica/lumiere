---
name: gitlab-api
description: GitLab API integration for repository operations. Use when working with GitLab repositories for reading, writing, creating, or deleting files, listing projects, managing branches, or any other GitLab repository operations.
---

# GitLab API

Interact with GitLab repositories via the REST API. Supports both GitLab.com and self-hosted instances.

## Setup

Store your GitLab personal access token:

```bash
mkdir -p ~/.config/gitlab
echo "glpat-YOUR_TOKEN_HERE" > ~/.config/gitlab/api_token
```

**Token scopes needed:** `api` or `read_api` + `write_repository`

**Get a token:**

- GitLab.com: https://gitlab.com/-/user_settings/personal_access_tokens
- Self-hosted: https://YOUR_GITLAB/~/-/user_settings/personal_access_tokens

## Configuration

Default instance: `https://gitlab.com`

For self-hosted GitLab, create a config file:

```bash
echo "https://gitlab.example.com" > ~/.config/gitlab/instance_url
```

## Common Operations

### List Projects

```bash
GITLAB_TOKEN=$(cat ~/.config/gitlab/api_token)
GITLAB_URL=$(cat ~/.config/gitlab/instance_url 2>/dev/null || echo "https://gitlab.com")

curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects?owned=true&per_page=20"
```

### Get Project ID

Projects are identified by ID or URL-encoded path (`namespace%2Fproject`).

```bash
# By path
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/username%2Frepo"

# Extract ID from response: jq '.id'
```

### Read File

```bash
PROJECT_ID="12345"
FILE_PATH="src/main.py"
BRANCH="main"

curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/files/${FILE_PATH}?ref=$BRANCH" \
  | jq -r '.content' | base64 -d
```

### Create/Update File

```bash
PROJECT_ID="12345"
FILE_PATH="src/new_file.py"
BRANCH="main"
CONTENT=$(echo "print('hello')" | base64)

curl -X POST -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/files/${FILE_PATH}" \
  -d @- <<EOF
{
  "branch": "$BRANCH",
  "content": "$CONTENT",
  "commit_message": "Add new file",
  "encoding": "base64"
}
EOF
```

For updates, use `-X PUT` instead of `-X POST`.

### Delete File

```bash
curl -X DELETE -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/files/${FILE_PATH}" \
  -d '{"branch": "main", "commit_message": "Delete file"}'
```

### List Files in Directory

```bash
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/tree?path=src&ref=main"
```

### Get Repository Content (Archive)

```bash
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/archive.tar.gz" \
  -o repo.tar.gz
```

### List Branches

```bash
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/branches"
```

### Create Branch

```bash
curl -X POST -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  -H "Content-Type: application/json" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/branches" \
  -d '{"branch": "feature-xyz", "ref": "main"}'
```

## Helper Script

Use `scripts/gitlab_api.sh` for common operations:

```bash
# List projects
./scripts/gitlab_api.sh list-projects

# Read file
./scripts/gitlab_api.sh read-file <project-id> <file-path> [branch]

# Write file
./scripts/gitlab_api.sh write-file <project-id> <file-path> <content> <commit-msg> [branch]

# Delete file
./scripts/gitlab_api.sh delete-file <project-id> <file-path> <commit-msg> [branch]

# List directory
./scripts/gitlab_api.sh list-dir <project-id> <dir-path> [branch]
```

## Rate Limits

- GitLab.com: 300 requests/minute (authenticated)
- Self-hosted: Configurable by admin

## API Reference

Full API docs: https://docs.gitlab.com/ee/api/api_resources.html

Key endpoints:

- Projects: `/api/v4/projects`
- Repository files: `/api/v4/projects/:id/repository/files`
- Repository tree: `/api/v4/projects/:id/repository/tree`
- Branches: `/api/v4/projects/:id/repository/branches`
