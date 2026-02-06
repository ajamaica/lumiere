#!/bin/bash
#
# CreateOS Quick Deploy - One-liner deployment helpers
#
# Usage:
#   ./quick-deploy.sh agent <name> <github_repo>     Deploy an AI agent
#   ./quick-deploy.sh mcp <name> <github_repo>       Deploy an MCP server
#   ./quick-deploy.sh api <name> <github_repo>       Deploy a FastAPI service
#   ./quick-deploy.sh bot <name> <image>             Deploy a Discord/Slack bot
#   ./quick-deploy.sh static <name> <directory>      Deploy static files
#

set -e

API_BASE="${CREATEOS_API_URL:-https://api-createos.nodeops.network}"
API_KEY="${CREATEOS_API_KEY}"

die() { echo "ERROR: $1" >&2; exit 1; }
info() { echo "→ $1"; }
success() { echo "✓ $1"; }

[ -z "$API_KEY" ] && die "Set CREATEOS_API_KEY environment variable"

api() {
    curl -s -X "$1" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
        ${3:+-d "$3"} "${API_BASE}$2"
}

# Deploy AI Agent (Python)
deploy_agent() {
    local name=$1
    local repo=$2
    [ -z "$name" ] || [ -z "$repo" ] && die "Usage: $0 agent <name> <owner/repo>"
    
    info "Creating AI agent project: $name"
    
    # Get GitHub installation
    local install=$(api GET "/v1/github/accounts" | jq -r '.[0].installationId')
    [ "$install" == "null" ] && die "No GitHub account connected"
    
    # Get repo ID
    local repo_id=$(api GET "/v1/github/$install/repositories" | jq -r ".[] | select(.fullName==\"$repo\") | .id")
    [ -z "$repo_id" ] && die "Repository not found: $repo"
    
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$name",
    "type": "vcs",
    "source": {
        "vcsName": "github",
        "vcsInstallationId": "$install",
        "vcsRepoId": "$repo_id"
    },
    "settings": {
        "runtime": "python:3.12",
        "port": 8000,
        "installCommand": "pip install -r requirements.txt",
        "runCommand": "python -m uvicorn main:app --host 0.0.0.0 --port 8000"
    }
}
EOF
)
    
    local result=$(api POST "/v1/projects" "$payload")
    local project_id=$(echo "$result" | jq -r '.id')
    
    success "Agent deployed! Project ID: $project_id"
    echo "URL: https://$name.createos.io"
}

# Deploy MCP Server
deploy_mcp() {
    local name=$1
    local repo=$2
    [ -z "$name" ] || [ -z "$repo" ] && die "Usage: $0 mcp <name> <owner/repo>"
    
    info "Creating MCP server project: $name"
    
    local install=$(api GET "/v1/github/accounts" | jq -r '.[0].installationId')
    [ "$install" == "null" ] && die "No GitHub account connected"
    
    local repo_id=$(api GET "/v1/github/$install/repositories" | jq -r ".[] | select(.fullName==\"$repo\") | .id")
    [ -z "$repo_id" ] && die "Repository not found: $repo"
    
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$name MCP Server",
    "type": "vcs",
    "source": {
        "vcsName": "github",
        "vcsInstallationId": "$install",
        "vcsRepoId": "$repo_id"
    },
    "settings": {
        "runtime": "node:20",
        "port": 3000,
        "installCommand": "npm install",
        "runCommand": "node server.js",
        "runEnvs": {
            "MCP_TRANSPORT": "sse"
        }
    }
}
EOF
)
    
    local result=$(api POST "/v1/projects" "$payload")
    local project_id=$(echo "$result" | jq -r '.id')
    
    success "MCP Server deployed! Project ID: $project_id"
    echo "MCP Endpoint: https://$name.createos.io/sse"
}

# Deploy FastAPI Service
deploy_api() {
    local name=$1
    local repo=$2
    [ -z "$name" ] || [ -z "$repo" ] && die "Usage: $0 api <name> <owner/repo>"
    
    info "Creating API project: $name"
    
    local install=$(api GET "/v1/github/accounts" | jq -r '.[0].installationId')
    local repo_id=$(api GET "/v1/github/$install/repositories" | jq -r ".[] | select(.fullName==\"$repo\") | .id")
    
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$name API",
    "type": "vcs",
    "source": {
        "vcsName": "github",
        "vcsInstallationId": "$install",
        "vcsRepoId": "$repo_id"
    },
    "settings": {
        "framework": "fastapi",
        "runtime": "python:3.12",
        "port": 8000,
        "installCommand": "pip install -r requirements.txt",
        "runCommand": "uvicorn main:app --host 0.0.0.0 --port 8000"
    }
}
EOF
)
    
    local result=$(api POST "/v1/projects" "$payload")
    success "API deployed! URL: https://$name.createos.io"
}

# Deploy Bot (Docker image)
deploy_bot() {
    local name=$1
    local image=$2
    [ -z "$name" ] || [ -z "$image" ] && die "Usage: $0 bot <name> <docker_image>"
    
    info "Creating bot project: $name"
    
    # Create image project
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$name Bot",
    "type": "image",
    "source": {},
    "settings": {
        "port": 8080
    }
}
EOF
)
    
    local result=$(api POST "/v1/projects" "$payload")
    local project_id=$(echo "$result" | jq -r '.id')
    
    # Deploy image
    info "Deploying image: $image"
    api POST "/v1/projects/$project_id/deployments" "{\"image\": \"$image\"}" > /dev/null
    
    success "Bot deployed! Project ID: $project_id"
}

# Deploy Static Files
deploy_static() {
    local name=$1
    local dir=$2
    [ -z "$name" ] || [ -z "$dir" ] && die "Usage: $0 static <name> <directory>"
    [ ! -d "$dir" ] && die "Directory not found: $dir"
    
    info "Creating static site project: $name"
    
    # Create upload project
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$name",
    "type": "upload",
    "source": {},
    "settings": {
        "framework": "static",
        "runtime": "static",
        "port": 80
    }
}
EOF
)
    
    local result=$(api POST "/v1/projects" "$payload")
    local project_id=$(echo "$result" | jq -r '.id')
    
    # Upload files
    info "Uploading files from: $dir"
    local temp_zip="/tmp/createos_static_$$.zip"
    (cd "$dir" && zip -r "$temp_zip" .)
    
    curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -F "file=@$temp_zip" \
        "${API_BASE}/v1/projects/$project_id/deployments/zip" > /dev/null
    
    rm -f "$temp_zip"
    
    success "Static site deployed! URL: https://$name.createos.io"
}

# Main
case "${1:-help}" in
    agent)  shift; deploy_agent "$@" ;;
    mcp)    shift; deploy_mcp "$@" ;;
    api)    shift; deploy_api "$@" ;;
    bot)    shift; deploy_bot "$@" ;;
    static) shift; deploy_static "$@" ;;
    help|--help|-h)
        echo "CreateOS Quick Deploy"
        echo ""
        echo "Commands:"
        echo "  agent <name> <owner/repo>    Deploy AI agent from GitHub"
        echo "  mcp <name> <owner/repo>      Deploy MCP server from GitHub"
        echo "  api <name> <owner/repo>      Deploy FastAPI service from GitHub"
        echo "  bot <name> <docker_image>    Deploy bot from Docker image"
        echo "  static <name> <directory>    Deploy static files"
        echo ""
        echo "Examples:"
        echo "  $0 agent my-agent myorg/agent-repo"
        echo "  $0 mcp my-mcp-server myorg/mcp-repo"
        echo "  $0 bot discord-bot myorg/bot:latest"
        echo "  $0 static my-site ./dist"
        ;;
    *)
        die "Unknown command: $1"
        ;;
esac
