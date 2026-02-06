#!/bin/bash
#
# CreateOS Deployment Script
# Usage: ./deploy.sh <command> [options]
#
# Commands:
#   create-project    Create a new project
#   deploy            Trigger deployment
#   upload            Upload files to deploy
#   status            Check deployment status
#   logs              View deployment logs
#   env-vars          Update environment variables
#   list-projects     List all projects
#   list-deployments  List deployments for a project
#

set -e

# Configuration
API_BASE="${CREATEOS_API_URL:-https://api-createos.nodeops.network}"
API_KEY="${CREATEOS_API_KEY}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_api_key() {
    if [ -z "$API_KEY" ]; then
        log_error "CREATEOS_API_KEY environment variable is not set"
    fi
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    local url="${API_BASE}${endpoint}"
    local curl_args=(-s -X "$method" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json")
    
    if [ -n "$data" ]; then
        curl_args+=(-d "$data")
    fi
    
    curl "${curl_args[@]}" "$url"
}

# Commands

cmd_create_project() {
    local name=$1
    local display_name=$2
    local type=${3:-upload}
    local runtime=${4:-node:20}
    local port=${5:-3000}
    
    if [ -z "$name" ] || [ -z "$display_name" ]; then
        echo "Usage: $0 create-project <unique_name> <display_name> [type] [runtime] [port]"
        echo "  type: vcs, image, upload (default: upload)"
        echo "  runtime: node:20, python:3.12, etc (default: node:20)"
        echo "  port: application port (default: 3000)"
        exit 1
    fi
    
    log_info "Creating project: $name"
    
    local payload=$(cat <<EOF
{
    "uniqueName": "$name",
    "displayName": "$display_name",
    "type": "$type",
    "source": {},
    "settings": {
        "runtime": "$runtime",
        "port": $port
    }
}
EOF
)
    
    local response=$(api_call POST "/v1/projects" "$payload")
    echo "$response" | jq .
    
    local project_id=$(echo "$response" | jq -r '.id // empty')
    if [ -n "$project_id" ]; then
        log_success "Project created: $project_id"
    else
        log_error "Failed to create project"
    fi
}

cmd_deploy() {
    local project_id=$1
    local branch=${2:-main}
    
    if [ -z "$project_id" ]; then
        echo "Usage: $0 deploy <project_id> [branch]"
        exit 1
    fi
    
    log_info "Triggering deployment for project: $project_id (branch: $branch)"
    
    local response=$(api_call POST "/v1/projects/$project_id/deployments/trigger" "{\"branch\": \"$branch\"}")
    echo "$response" | jq .
    
    local deployment_id=$(echo "$response" | jq -r '.id // empty')
    if [ -n "$deployment_id" ]; then
        log_success "Deployment triggered: $deployment_id"
    fi
}

cmd_deploy_image() {
    local project_id=$1
    local image=$2
    
    if [ -z "$project_id" ] || [ -z "$image" ]; then
        echo "Usage: $0 deploy-image <project_id> <image>"
        echo "  image: Docker image reference (e.g., nginx:latest, myapp:v1.0.0)"
        exit 1
    fi
    
    log_info "Deploying image: $image to project: $project_id"
    
    local response=$(api_call POST "/v1/projects/$project_id/deployments" "{\"image\": \"$image\"}")
    echo "$response" | jq .
}

cmd_upload() {
    local project_id=$1
    local file_path=$2
    
    if [ -z "$project_id" ] || [ -z "$file_path" ]; then
        echo "Usage: $0 upload <project_id> <file_or_directory>"
        exit 1
    fi
    
    if [ -d "$file_path" ]; then
        log_info "Uploading directory: $file_path"
        
        # Create temporary zip
        local temp_zip="/tmp/createos_upload_$$.zip"
        (cd "$file_path" && zip -r "$temp_zip" .)
        
        curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -F "file=@$temp_zip" \
            "${API_BASE}/v1/projects/$project_id/deployments/zip" | jq .
        
        rm -f "$temp_zip"
    elif [ -f "$file_path" ]; then
        if [[ "$file_path" == *.zip ]]; then
            log_info "Uploading zip file: $file_path"
            curl -s -X POST \
                -H "Authorization: Bearer $API_KEY" \
                -F "file=@$file_path" \
                "${API_BASE}/v1/projects/$project_id/deployments/zip" | jq .
        else
            log_error "For single files, please provide a directory or zip file"
        fi
    else
        log_error "Path not found: $file_path"
    fi
}

cmd_status() {
    local project_id=$1
    local deployment_id=$2
    
    if [ -z "$project_id" ]; then
        echo "Usage: $0 status <project_id> [deployment_id]"
        exit 1
    fi
    
    if [ -n "$deployment_id" ]; then
        log_info "Getting deployment status: $deployment_id"
        api_call GET "/v1/projects/$project_id/deployments/$deployment_id" | jq .
    else
        log_info "Getting latest deployments for project: $project_id"
        api_call GET "/v1/projects/$project_id/deployments?limit=5" | jq .
    fi
}

cmd_logs() {
    local project_id=$1
    local deployment_id=$2
    local log_type=${3:-runtime}
    
    if [ -z "$project_id" ] || [ -z "$deployment_id" ]; then
        echo "Usage: $0 logs <project_id> <deployment_id> [build|runtime]"
        exit 1
    fi
    
    log_info "Getting $log_type logs for deployment: $deployment_id"
    
    if [ "$log_type" == "build" ]; then
        api_call GET "/v1/projects/$project_id/deployments/$deployment_id/logs/build" | jq -r '.logs // .'
    else
        api_call GET "/v1/projects/$project_id/deployments/$deployment_id/logs/runtime?since-seconds=300" | jq -r '.logs // .'
    fi
}

cmd_env_vars() {
    local project_id=$1
    local environment_id=$2
    shift 2
    
    if [ -z "$project_id" ] || [ -z "$environment_id" ]; then
        echo "Usage: $0 env-vars <project_id> <environment_id> KEY1=value1 KEY2=value2 ..."
        exit 1
    fi
    
    # Build JSON object from KEY=value pairs
    local env_json="{"
    local first=true
    for pair in "$@"; do
        local key="${pair%%=*}"
        local value="${pair#*=}"
        if [ "$first" = true ]; then
            first=false
        else
            env_json+=","
        fi
        env_json+="\"$key\":\"$value\""
    done
    env_json+="}"
    
    log_info "Updating environment variables for environment: $environment_id"
    
    local payload="{\"runEnvs\": $env_json}"
    api_call PATCH "/v1/projects/$project_id/environments/$environment_id/variables" "$payload" | jq .
}

cmd_list_projects() {
    local limit=${1:-10}
    log_info "Listing projects (limit: $limit)"
    api_call GET "/v1/projects?limit=$limit" | jq .
}

cmd_list_deployments() {
    local project_id=$1
    local limit=${2:-10}
    
    if [ -z "$project_id" ]; then
        echo "Usage: $0 list-deployments <project_id> [limit]"
        exit 1
    fi
    
    log_info "Listing deployments for project: $project_id"
    api_call GET "/v1/projects/$project_id/deployments?limit=$limit" | jq .
}

cmd_rollback() {
    local project_id=$1
    local environment_id=$2
    local deployment_id=$3
    
    if [ -z "$project_id" ] || [ -z "$environment_id" ] || [ -z "$deployment_id" ]; then
        echo "Usage: $0 rollback <project_id> <environment_id> <deployment_id>"
        exit 1
    fi
    
    log_info "Rolling back environment $environment_id to deployment $deployment_id"
    
    local payload="{\"deploymentId\": \"$deployment_id\"}"
    api_call POST "/v1/projects/$project_id/environments/$environment_id/assign" "$payload" | jq .
    
    log_success "Rollback initiated"
}

cmd_wake() {
    local project_id=$1
    local deployment_id=$2
    
    if [ -z "$project_id" ] || [ -z "$deployment_id" ]; then
        echo "Usage: $0 wake <project_id> <deployment_id>"
        exit 1
    fi
    
    log_info "Waking deployment: $deployment_id"
    api_call POST "/v1/projects/$project_id/deployments/$deployment_id/wake" | jq .
}

cmd_analytics() {
    local project_id=$1
    local environment_id=$2
    
    if [ -z "$project_id" ] || [ -z "$environment_id" ]; then
        echo "Usage: $0 analytics <project_id> <environment_id>"
        exit 1
    fi
    
    log_info "Getting analytics for environment: $environment_id"
    api_call GET "/v1/projects/$project_id/environments/$environment_id/analytics" | jq .
}

# Main
check_api_key

case "${1:-help}" in
    create-project)
        shift
        cmd_create_project "$@"
        ;;
    deploy)
        shift
        cmd_deploy "$@"
        ;;
    deploy-image)
        shift
        cmd_deploy_image "$@"
        ;;
    upload)
        shift
        cmd_upload "$@"
        ;;
    status)
        shift
        cmd_status "$@"
        ;;
    logs)
        shift
        cmd_logs "$@"
        ;;
    env-vars)
        shift
        cmd_env_vars "$@"
        ;;
    list-projects)
        shift
        cmd_list_projects "$@"
        ;;
    list-deployments)
        shift
        cmd_list_deployments "$@"
        ;;
    rollback)
        shift
        cmd_rollback "$@"
        ;;
    wake)
        shift
        cmd_wake "$@"
        ;;
    analytics)
        shift
        cmd_analytics "$@"
        ;;
    help|--help|-h)
        echo "CreateOS Deployment Script"
        echo ""
        echo "Environment Variables:"
        echo "  CREATEOS_API_KEY    Your CreateOS API key (required)"
        echo "  CREATEOS_API_URL    API base URL (default: https://api-createos.nodeops.network)"
        echo ""
        echo "Commands:"
        echo "  create-project <name> <display_name> [type] [runtime] [port]"
        echo "  deploy <project_id> [branch]"
        echo "  deploy-image <project_id> <image>"
        echo "  upload <project_id> <file_or_directory>"
        echo "  status <project_id> [deployment_id]"
        echo "  logs <project_id> <deployment_id> [build|runtime]"
        echo "  env-vars <project_id> <environment_id> KEY=value ..."
        echo "  list-projects [limit]"
        echo "  list-deployments <project_id> [limit]"
        echo "  rollback <project_id> <environment_id> <deployment_id>"
        echo "  wake <project_id> <deployment_id>"
        echo "  analytics <project_id> <environment_id>"
        echo ""
        echo "Examples:"
        echo "  $0 create-project my-app \"My Application\" upload node:20 3000"
        echo "  $0 upload abc123 ./dist"
        echo "  $0 deploy abc123 main"
        echo "  $0 logs abc123 def456 build"
        echo "  $0 env-vars abc123 env789 API_KEY=secret DEBUG=true"
        ;;
    *)
        log_error "Unknown command: $1. Use '$0 help' for usage."
        ;;
esac
