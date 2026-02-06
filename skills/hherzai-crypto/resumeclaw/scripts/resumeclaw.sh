#!/usr/bin/env bash
# resumeclaw.sh — CLI wrapper for the ResumeClaw API
# Usage: resumeclaw.sh <command> [options]
#
# Commands: login, register, create, inbox, accept, decline,
#           search, chat, profile, notifications
#
# Environment:
#   RESUMECLAW_URL  Base URL (default: https://resumeclaw.com)

set -euo pipefail

BASE_URL="${RESUMECLAW_URL:-https://resumeclaw.com}"
SESSION_DIR="$HOME/.resumeclaw"
SESSION_FILE="$SESSION_DIR/session"

# ── Helpers ──────────────────────────────────────────────────────────

ensure_session_dir() {
  mkdir -p "$SESSION_DIR"
}

cookie_args() {
  if [[ -f "$SESSION_FILE" ]]; then
    echo "-b $SESSION_FILE"
  else
    echo ""
  fi
}

api() {
  local method="$1" endpoint="$2"
  shift 2
  local url="${BASE_URL}${endpoint}"
  local cookies
  cookies=$(cookie_args)
  # shellcheck disable=SC2086
  curl -s -w '\n%{http_code}' -X "$method" "$url" \
    -H "Content-Type: application/json" \
    -c "$SESSION_FILE" \
    $cookies \
    "$@"
}

parse_response() {
  local response="$1"
  local body http_code
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "$body"
  else
    echo "{\"error\": \"HTTP $http_code\", \"details\": $body}" >&2
    return 1
  fi
}

usage() {
  cat <<'EOF'
Usage: resumeclaw.sh <command> [options]

Commands:
  login          Log in to ResumeClaw
  register       Create a new account
  create         Create a career agent from a resume
  inbox          Check agent inbox (introductions & conversations)
  accept         Accept an introduction request
  decline        Decline an introduction request
  search         Search for agents
  chat           Chat with an agent
  profile        View agent profile and stats
  notifications  View or manage notifications

Run 'resumeclaw.sh <command> --help' for command-specific help.

Environment:
  RESUMECLAW_URL  API base URL (default: https://resumeclaw.com)
EOF
}

# ── Commands ─────────────────────────────────────────────────────────

cmd_login() {
  local email="" password=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --email) email="$2"; shift 2 ;;
      --password) password="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh login --email EMAIL --password PASSWORD"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$email" || -z "$password" ]]; then
    echo '{"error": "Missing --email or --password"}' >&2
    return 1
  fi

  ensure_session_dir
  local resp
  resp=$(api POST /api/auth/login -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  parse_response "$resp"
}

cmd_register() {
  local email="" password="" name=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --email) email="$2"; shift 2 ;;
      --password) password="$2"; shift 2 ;;
      --name) name="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh register --email EMAIL --password PASSWORD --name NAME"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$email" || -z "$password" || -z "$name" ]]; then
    echo '{"error": "Missing --email, --password, or --name"}' >&2
    return 1
  fi

  ensure_session_dir
  local resp
  resp=$(api POST /api/auth/register -d "{\"email\":\"$email\",\"password\":\"$password\",\"confirmPassword\":\"$password\",\"name\":\"$name\"}")
  parse_response "$resp"
}

cmd_create() {
  local resume_file="" resume_stdin=false name="" email=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --resume-file) resume_file="$2"; shift 2 ;;
      --resume-stdin) resume_stdin=true; shift ;;
      --name) name="$2"; shift 2 ;;
      --email) email="$2"; shift 2 ;;
      --help)
        cat <<'HELP'
Usage: resumeclaw.sh create [options]

Options:
  --resume-file PATH  Read resume from file
  --resume-stdin      Read resume from stdin
  --name NAME         Agent display name
  --email EMAIL       Contact email

Examples:
  resumeclaw.sh create --resume-file ~/resume.txt
  cat resume.txt | resumeclaw.sh create --resume-stdin
HELP
        return 0
        ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  local resume_text=""
  if [[ -n "$resume_file" ]]; then
    if [[ ! -f "$resume_file" ]]; then
      echo "{\"error\": \"File not found: $resume_file\"}" >&2
      return 1
    fi
    resume_text=$(cat "$resume_file")
  elif [[ "$resume_stdin" == true ]]; then
    resume_text=$(cat)
  else
    echo '{"error": "Provide --resume-file PATH or --resume-stdin"}' >&2
    return 1
  fi

  # Escape the resume text for JSON
  local json_resume
  json_resume=$(printf '%s' "$resume_text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '%s' "$resume_text" | jq -Rs '.' 2>/dev/null)

  local payload="{\"resumeText\":${json_resume}"
  [[ -n "$name" ]] && payload="${payload},\"name\":\"$name\""
  [[ -n "$email" ]] && payload="${payload},\"email\":\"$email\""
  payload="${payload}}"

  ensure_session_dir
  local resp
  resp=$(api POST /api/agents/create -d "$payload")
  parse_response "$resp"
}

cmd_inbox() {
  local slug=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh inbox --slug AGENT_SLUG"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$slug" ]]; then
    echo '{"error": "Missing --slug"}' >&2
    return 1
  fi

  ensure_session_dir
  local resp
  resp=$(api GET "/api/agents/${slug}/inbox")
  parse_response "$resp"
}

cmd_accept() {
  local id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --id) id="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh accept --id INTRODUCTION_UUID"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$id" ]]; then
    echo '{"error": "Missing --id"}' >&2
    return 1
  fi

  ensure_session_dir
  local resp
  resp=$(api POST "/api/introductions/${id}/accept")
  parse_response "$resp"
}

cmd_decline() {
  local id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --id) id="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh decline --id INTRODUCTION_UUID"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$id" ]]; then
    echo '{"error": "Missing --id"}' >&2
    return 1
  fi

  ensure_session_dir
  local resp
  resp=$(api POST "/api/introductions/${id}/decline")
  parse_response "$resp"
}

cmd_search() {
  local query="" location="" limit=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --query|-q) query="$2"; shift 2 ;;
      --location|-l) location="$2"; shift 2 ;;
      --limit) limit="$2"; shift 2 ;;
      --help)
        cat <<'HELP'
Usage: resumeclaw.sh search --query QUERY [--location LOCATION] [--limit N]

Examples:
  resumeclaw.sh search --query "senior data engineer" --location "Dallas, TX"
  resumeclaw.sh search -q "python developer" --limit 5
HELP
        return 0
        ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  local params=""
  if [[ -n "$query" ]]; then
    params="q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))" 2>/dev/null || echo "$query")"
  fi
  [[ -n "$location" ]] && params="${params}&location=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$location'))" 2>/dev/null || echo "$location")"
  [[ -n "$limit" ]] && params="${params}&limit=${limit}"

  local resp
  resp=$(api GET "/api/agents/search?${params}")
  parse_response "$resp"
}

cmd_chat() {
  local slug="" message=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      --message|-m) message="$2"; shift 2 ;;
      --help)
        cat <<'HELP'
Usage: resumeclaw.sh chat --slug AGENT_SLUG --message "Your message"

Examples:
  resumeclaw.sh chat --slug yournameClaw --message "Tell me about cloud experience"
HELP
        return 0
        ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$slug" || -z "$message" ]]; then
    echo '{"error": "Missing --slug or --message"}' >&2
    return 1
  fi

  # Escape message for JSON
  local json_message
  json_message=$(printf '%s' "$message" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '%s' "$message" | jq -Rs '.' 2>/dev/null)

  local cookies
  cookies=$(cookie_args)
  # Chat endpoint streams SSE — collect full response
  # shellcheck disable=SC2086
  curl -s -X POST "${BASE_URL}/api/agents/${slug}/chat" \
    -H "Content-Type: application/json" \
    $cookies \
    -d "{\"message\":${json_message}}"
}

cmd_profile() {
  local slug=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      --help) echo "Usage: resumeclaw.sh profile --slug AGENT_SLUG"; return 0 ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  if [[ -z "$slug" ]]; then
    echo '{"error": "Missing --slug"}' >&2
    return 1
  fi

  local resp
  resp=$(api GET "/api/agents/${slug}")
  parse_response "$resp"
}

cmd_notifications() {
  local mark_all_read=false unread_count=false limit=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --mark-all-read) mark_all_read=true; shift ;;
      --unread-count) unread_count=true; shift ;;
      --limit) limit="$2"; shift 2 ;;
      --help)
        cat <<'HELP'
Usage: resumeclaw.sh notifications [options]

Options:
  --unread-count    Show only unread count
  --mark-all-read   Mark all notifications as read
  --limit N         Max notifications to return

Examples:
  resumeclaw.sh notifications
  resumeclaw.sh notifications --unread-count
  resumeclaw.sh notifications --mark-all-read
HELP
        return 0
        ;;
      *) echo "Unknown option: $1" >&2; return 1 ;;
    esac
  done

  ensure_session_dir

  if [[ "$unread_count" == true ]]; then
    local resp
    resp=$(api GET /api/notifications/unread-count)
    parse_response "$resp"
    return
  fi

  if [[ "$mark_all_read" == true ]]; then
    local resp
    resp=$(api POST /api/notifications/mark-all-read)
    parse_response "$resp"
    return
  fi

  local params=""
  [[ -n "$limit" ]] && params="?limit=${limit}"

  local resp
  resp=$(api GET "/api/notifications${params}")
  parse_response "$resp"
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
  if [[ $# -eq 0 ]]; then
    usage
    return 0
  fi

  local command="$1"
  shift

  case "$command" in
    login)         cmd_login "$@" ;;
    register)      cmd_register "$@" ;;
    create)        cmd_create "$@" ;;
    inbox)         cmd_inbox "$@" ;;
    accept)        cmd_accept "$@" ;;
    decline)       cmd_decline "$@" ;;
    search)        cmd_search "$@" ;;
    chat)          cmd_chat "$@" ;;
    profile)       cmd_profile "$@" ;;
    notifications) cmd_notifications "$@" ;;
    --help|-h)     usage ;;
    *)
      echo "Unknown command: $command" >&2
      echo "Run 'resumeclaw.sh --help' for usage." >&2
      return 1
      ;;
  esac
}

main "$@"
