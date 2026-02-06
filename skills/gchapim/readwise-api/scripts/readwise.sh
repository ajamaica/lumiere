#!/usr/bin/env bash
set -euo pipefail

# Readwise + Reader CLI
# Requires: curl, jq, READWISE_TOKEN env var

READWISE_V2="https://readwise.io/api/v2"
READER_V3="https://readwise.io/api/v3"
MAX_RETRIES=3
RETRY_DELAY=5
PRETTY=0

# ── Helpers ──────────────────────────────────────────────────────────

die()  { echo "error: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed"; }

check_deps() {
  need curl
  need jq
  [[ -n "${READWISE_TOKEN:-}" ]] || die "READWISE_TOKEN env var is not set. Get one at https://readwise.io/access_token"
}

auth_header() { echo "Authorization: Token ${READWISE_TOKEN}"; }

# Curl wrapper with retry on 429
api() {
  local method="$1" url="$2"; shift 2
  local attempt=0 resp code body
  while (( attempt < MAX_RETRIES )); do
    resp=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "$(auth_header)" -H "Content-Type: application/json" "$@" "$url") || true
    code=$(echo "$resp" | tail -1)
    body=$(echo "$resp" | sed '$d')
    if [[ "$code" == "429" ]]; then
      ((attempt++))
      sleep "$RETRY_DELAY"
      continue
    fi
    if [[ "$code" =~ ^2 ]]; then
      if [[ -n "$body" ]]; then
        echo "$body"
      fi
      return 0
    fi
    echo "$body" >&2
    die "HTTP $code from $method $url"
  done
  die "rate-limited after $MAX_RETRIES retries"
}

output() {
  if [[ "$PRETTY" -eq 1 ]]; then
    jq '.' 2>/dev/null || cat
  else
    jq -c '.' 2>/dev/null || cat
  fi
}

# Extract --pretty and other global flags before subcommand parsing
extract_globals() {
  local args=()
  for arg in "$@"; do
    case "$arg" in
      --pretty) PRETTY=1 ;;
      *) args+=("$arg") ;;
    esac
  done
  echo "${args[@]}"
}

usage() {
  cat <<'EOF'
Usage: readwise.sh [--pretty] <command> [args...]

Commands — Reader (documents):
  auth                          Verify API token
  save URL [opts]               Save URL to Reader
  list [opts]                   List Reader documents
  update ID [opts]              Update Reader document
  delete ID                     Delete Reader document
  tags                          List Reader tags
  search QUERY                  Search Reader docs by title

Commands — Readwise (highlights & books):
  highlights [opts]             Export highlights
  highlight ID                  Get highlight detail
  highlight-create [opts]       Create highlight
  highlight-update ID [opts]    Update highlight
  highlight-delete ID           Delete highlight
  books [opts]                  List books/sources
  book ID                       Get book detail
  review                        Get daily review

Global flags:
  --pretty                      Pretty-print JSON output

Run 'readwise.sh <command> --help' for command-specific help.
EOF
  exit 0
}

# ── Commands ─────────────────────────────────────────────────────────

cmd_auth() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "$(auth_header)" "${READWISE_V2}/auth/")
  if [[ "$code" == "204" ]]; then
    echo '{"status":"ok","message":"Token is valid"}' | output
  else
    die "Auth failed (HTTP $code). Check your READWISE_TOKEN."
  fi
}

cmd_save() {
  local url="" title="" tags="" location="" category="" notes="" summary="" author=""
  [[ $# -eq 0 ]] && die "Usage: readwise.sh save URL [--title T] [--tags t1,t2] [--location new|later|archive|feed] [--category C] [--notes N] [--summary S] [--author A]"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help) die "Usage: readwise.sh save URL [--title T] [--tags t1,t2] [--location new|later|archive|feed] [--category C] [--notes N] [--summary S] [--author A]" ;;
      --title)    title="$2"; shift 2 ;;
      --tags)     tags="$2"; shift 2 ;;
      --location) location="$2"; shift 2 ;;
      --category) category="$2"; shift 2 ;;
      --notes)    notes="$2"; shift 2 ;;
      --summary)  summary="$2"; shift 2 ;;
      --author)   author="$2"; shift 2 ;;
      -*) die "Unknown flag: $1" ;;
      *)  url="$1"; shift ;;
    esac
  done
  [[ -n "$url" ]] || die "URL is required"

  local body
  body=$(jq -nc --arg url "$url" --arg title "$title" --arg tags "$tags" \
    --arg location "$location" --arg category "$category" --arg notes "$notes" \
    --arg summary "$summary" --arg author "$author" \
    '{url: $url}
     + (if $title != "" then {title: $title} else {} end)
     + (if $location != "" then {location: $location} else {} end)
     + (if $category != "" then {category: $category} else {} end)
     + (if $notes != "" then {notes: $notes} else {} end)
     + (if $summary != "" then {summary: $summary} else {} end)
     + (if $author != "" then {author: $author} else {} end)
     + (if $tags != "" then {tags: ($tags | split(",") | map(gsub("^\\s+|\\s+$";"")))} else {} end)')

  api POST "${READER_V3}/save/" -d "$body" | output
}

cmd_list() {
  local location="" category="" tag="" limit="20" updated_after="" query="" cursor=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help) die "Usage: readwise.sh list [--location L] [--category C] [--tag T] [--limit N] [--updated-after DATE] [--query Q]" ;;
      --location)      location="$2"; shift 2 ;;
      --category)      category="$2"; shift 2 ;;
      --tag)           tag="$2"; shift 2 ;;
      --limit)         limit="$2"; shift 2 ;;
      --updated-after) updated_after="$2"; shift 2 ;;
      --query)         query="$2"; shift 2 ;;
      *) die "Unknown arg: $1" ;;
    esac
  done

  local all_results="[]" remaining="$limit"
  while true; do
    local page_size=$((remaining > 100 ? 100 : remaining))
    local params="limit=${page_size}"
    [[ -n "$location" ]]      && params+="&location=$location"
    [[ -n "$category" ]]      && params+="&category=$category"
    [[ -n "$tag" ]]           && params+="&tag=$tag"
    [[ -n "$updated_after" ]] && params+="&updatedAfter=$updated_after"
    [[ -n "$cursor" ]]        && params+="&pageCursor=$cursor"

    local resp
    resp=$(api GET "${READER_V3}/list/?${params}")
    local results next
    results=$(echo "$resp" | jq '.results // []')
    next=$(echo "$resp" | jq -r '.nextPageCursor // empty')

    all_results=$(echo "$all_results" "$results" | jq -s '.[0] + .[1]')
    local count
    count=$(echo "$all_results" | jq 'length')
    remaining=$((limit - count))

    if [[ -z "$next" ]] || (( remaining <= 0 )); then
      break
    fi
    cursor="$next"
  done

  # Trim to exact limit
  all_results=$(echo "$all_results" | jq --argjson n "$limit" '.[:$n]')

  # Client-side query filter on title/author
  if [[ -n "$query" ]]; then
    all_results=$(echo "$all_results" | jq --arg q "$query" \
      '[.[] | select((.title // "" | ascii_downcase | contains($q | ascii_downcase)) or (.author // "" | ascii_downcase | contains($q | ascii_downcase)))]')
  fi

  echo "$all_results" | output
}

cmd_update() {
  local id="" title="" location="" tags="" notes="" category=""
  [[ $# -eq 0 ]] && die "Usage: readwise.sh update ID [--title T] [--location L] [--tags t1,t2] [--notes N] [--category C]"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help)     die "Usage: readwise.sh update ID [--title T] [--location L] [--tags t1,t2] [--notes N] [--category C]" ;;
      --title)    title="$2"; shift 2 ;;
      --location) location="$2"; shift 2 ;;
      --tags)     tags="$2"; shift 2 ;;
      --notes)    notes="$2"; shift 2 ;;
      --category) category="$2"; shift 2 ;;
      -*) die "Unknown flag: $1" ;;
      *)  id="$1"; shift ;;
    esac
  done
  [[ -n "$id" ]] || die "Document ID is required"

  local body
  body=$(jq -nc --arg title "$title" --arg location "$location" --arg tags "$tags" \
    --arg notes "$notes" --arg category "$category" \
    '(if $title != "" then {title: $title} else {} end)
     + (if $location != "" then {location: $location} else {} end)
     + (if $category != "" then {category: $category} else {} end)
     + (if $notes != "" then {notes: $notes} else {} end)
     + (if $tags != "" then {tags: ($tags | split(",") | map(gsub("^\\s+|\\s+$";"")))} else {} end)')

  api PATCH "${READER_V3}/update/${id}/" -d "$body" | output
}

cmd_delete() {
  [[ $# -eq 0 ]] && die "Usage: readwise.sh delete ID"
  [[ "$1" == "--help" ]] && die "Usage: readwise.sh delete ID"
  api DELETE "${READER_V3}/delete/${1}/"
  echo '{"status":"ok","message":"Document deleted"}' | output
}

cmd_tags() {
  local all_tags="[]" cursor=""
  while true; do
    local params=""
    [[ -n "$cursor" ]] && params="?pageCursor=$cursor"
    local resp
    resp=$(api GET "${READER_V3}/tags/${params}")
    local results next
    results=$(echo "$resp" | jq '.results // []')
    next=$(echo "$resp" | jq -r '.nextPageCursor // empty')
    all_tags=$(echo "$all_tags" "$results" | jq -s '.[0] + .[1]')
    [[ -z "$next" ]] && break
    cursor="$next"
  done
  echo "$all_tags" | output
}

cmd_search() {
  [[ $# -eq 0 ]] && die "Usage: readwise.sh search QUERY"
  [[ "$1" == "--help" ]] && die "Usage: readwise.sh search QUERY"
  cmd_list --query "$1" --limit 50
}

# ── Readwise v2: Highlights ─────────────────────────────────────────

cmd_highlights() {
  local book_id="" updated_after="" limit="50" cursor=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help)          die "Usage: readwise.sh highlights [--book-id ID] [--updated-after DATE] [--limit N]" ;;
      --book-id)       book_id="$2"; shift 2 ;;
      --updated-after) updated_after="$2"; shift 2 ;;
      --limit)         limit="$2"; shift 2 ;;
      *) die "Unknown arg: $1" ;;
    esac
  done

  local all_highlights="[]"
  while true; do
    local params=""
    [[ -n "$updated_after" ]] && params+="updatedAfter=$updated_after&"
    [[ -n "$book_id" ]]       && params+="ids=$book_id&"
    [[ -n "$cursor" ]]        && params+="pageCursor=$cursor&"
    params="${params%&}"

    local resp
    resp=$(api GET "${READWISE_V2}/export/?${params}")
    local results next
    results=$(echo "$resp" | jq '[.results[]? | {book_id: .user_book_id, title: .title, author: .author, highlights: [.highlights[]? | {id: .id, text: .text, note: .note, color: .color, location: .location, url: .url, highlighted_at: .highlighted_at, tags: [.tags[]?.name]}]}]')
    next=$(echo "$resp" | jq -r '.nextPageCursor // empty')

    all_highlights=$(echo "$all_highlights" "$results" | jq -s '.[0] + .[1]')

    local count
    count=$(echo "$all_highlights" | jq '[.[].highlights[]] | length')
    if [[ -z "$next" ]] || (( count >= limit )); then
      break
    fi
    cursor="$next"
  done

  echo "$all_highlights" | output
}

cmd_highlight() {
  [[ $# -eq 0 ]] && die "Usage: readwise.sh highlight ID"
  [[ "$1" == "--help" ]] && die "Usage: readwise.sh highlight ID"
  api GET "${READWISE_V2}/highlights/${1}/" | output
}

cmd_highlight_create() {
  local text="" title="" author="" source_url="" category="" note=""
  [[ $# -eq 0 ]] && die "Usage: readwise.sh highlight-create --text T [--title B] [--author A] [--source-url U] [--category C] [--note N]"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help)       die "Usage: readwise.sh highlight-create --text T [--title B] [--author A] [--source-url U] [--category C] [--note N]" ;;
      --text)       text="$2"; shift 2 ;;
      --title)      title="$2"; shift 2 ;;
      --author)     author="$2"; shift 2 ;;
      --source-url) source_url="$2"; shift 2 ;;
      --category)   category="$2"; shift 2 ;;
      --note)       note="$2"; shift 2 ;;
      *) die "Unknown arg: $1" ;;
    esac
  done
  [[ -n "$text" ]] || die "--text is required"

  local hl
  hl=$(jq -nc --arg text "$text" --arg title "$title" --arg author "$author" \
    --arg source_url "$source_url" --arg category "$category" --arg note "$note" \
    '{text: $text}
     + (if $title != "" then {title: $title} else {} end)
     + (if $author != "" then {author: $author} else {} end)
     + (if $source_url != "" then {source_url: $source_url} else {} end)
     + (if $category != "" then {category: $category} else {} end)
     + (if $note != "" then {note: $note} else {} end)')

  local body
  body=$(jq -nc --argjson hl "$hl" '{"highlights": [$hl]}')

  api POST "${READWISE_V2}/highlights/" -d "$body" | output
}

cmd_highlight_update() {
  local id="" text="" note="" color=""
  [[ $# -eq 0 ]] && die "Usage: readwise.sh highlight-update ID [--text T] [--note N] [--color C]"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help)  die "Usage: readwise.sh highlight-update ID [--text T] [--note N] [--color C]" ;;
      --text)  text="$2"; shift 2 ;;
      --note)  note="$2"; shift 2 ;;
      --color) color="$2"; shift 2 ;;
      -*) die "Unknown flag: $1" ;;
      *)  id="$1"; shift ;;
    esac
  done
  [[ -n "$id" ]] || die "Highlight ID is required"

  local body
  body=$(jq -nc --arg text "$text" --arg note "$note" --arg color "$color" \
    '(if $text != "" then {text: $text} else {} end)
     + (if $note != "" then {note: $note} else {} end)
     + (if $color != "" then {color: $color} else {} end)')

  api PATCH "${READWISE_V2}/highlights/${id}/" -d "$body" | output
}

cmd_highlight_delete() {
  [[ $# -eq 0 ]] && die "Usage: readwise.sh highlight-delete ID"
  [[ "$1" == "--help" ]] && die "Usage: readwise.sh highlight-delete ID"
  api DELETE "${READWISE_V2}/highlights/${1}/"
  echo '{"status":"ok","message":"Highlight deleted"}' | output
}

# ── Readwise v2: Books ──────────────────────────────────────────────

cmd_books() {
  local category="" limit="20" updated_after="" page=1
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help)          die "Usage: readwise.sh books [--category C] [--limit N] [--updated-after DATE]" ;;
      --category)      category="$2"; shift 2 ;;
      --limit)         limit="$2"; shift 2 ;;
      --updated-after) updated_after="$2"; shift 2 ;;
      *) die "Unknown arg: $1" ;;
    esac
  done

  local all_books="[]" remaining="$limit"
  while true; do
    local page_size=$((remaining > 1000 ? 1000 : remaining))
    local params="page_size=${page_size}&page=${page}"
    [[ -n "$category" ]]      && params+="&category=$category"
    [[ -n "$updated_after" ]] && params+="&updated__gt=$updated_after"

    local resp
    resp=$(api GET "${READWISE_V2}/books/?${params}")
    local results next
    results=$(echo "$resp" | jq '.results // []')
    next=$(echo "$resp" | jq -r '.next // empty')

    all_books=$(echo "$all_books" "$results" | jq -s '.[0] + .[1]')
    local count
    count=$(echo "$all_books" | jq 'length')
    remaining=$((limit - count))

    if [[ -z "$next" ]] || (( remaining <= 0 )); then
      break
    fi
    ((page++))
  done

  echo "$all_books" | jq --argjson n "$limit" '.[:$n]' | output
}

cmd_book() {
  [[ $# -eq 0 ]] && die "Usage: readwise.sh book ID"
  [[ "$1" == "--help" ]] && die "Usage: readwise.sh book ID"
  api GET "${READWISE_V2}/books/${1}/" | output
}

cmd_review() {
  api GET "${READWISE_V2}/review/" | output
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
  # Extract global flags
  local args=()
  for arg in "$@"; do
    case "$arg" in
      --pretty) PRETTY=1 ;;
      *) args+=("$arg") ;;
    esac
  done
  set -- "${args[@]+"${args[@]}"}"

  [[ $# -eq 0 ]] && usage
  local cmd="$1"; shift

  case "$cmd" in
    help|--help|-h)   usage ;;
    *) ;;
  esac

  # Show subcommand help without requiring token
  for arg in "$@"; do
    if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
      # Dispatch to command which will handle --help and exit
      case "$cmd" in
        save)             die "Usage: readwise.sh save URL [--title T] [--tags t1,t2] [--location new|later|archive|feed] [--category C] [--notes N] [--summary S] [--author A]" ;;
        list)             die "Usage: readwise.sh list [--location L] [--category C] [--tag T] [--limit N] [--updated-after DATE] [--query Q]" ;;
        update)           die "Usage: readwise.sh update ID [--title T] [--location L] [--tags t1,t2] [--notes N] [--category C]" ;;
        delete)           die "Usage: readwise.sh delete ID" ;;
        search)           die "Usage: readwise.sh search QUERY" ;;
        highlights)       die "Usage: readwise.sh highlights [--book-id ID] [--updated-after DATE] [--limit N]" ;;
        highlight)        die "Usage: readwise.sh highlight ID" ;;
        highlight-create) die "Usage: readwise.sh highlight-create --text T [--title B] [--author A] [--source-url U] [--category C] [--note N]" ;;
        highlight-update) die "Usage: readwise.sh highlight-update ID [--text T] [--note N] [--color C]" ;;
        highlight-delete) die "Usage: readwise.sh highlight-delete ID" ;;
        books)            die "Usage: readwise.sh books [--category C] [--limit N] [--updated-after DATE]" ;;
        book)             die "Usage: readwise.sh book ID" ;;
        *) ;;
      esac
    fi
  done

  check_deps

  case "$cmd" in
    auth)             cmd_auth "$@" ;;
    save)             cmd_save "$@" ;;
    list)             cmd_list "$@" ;;
    update)           cmd_update "$@" ;;
    delete)           cmd_delete "$@" ;;
    tags)             cmd_tags "$@" ;;
    search)           cmd_search "$@" ;;
    highlights)       cmd_highlights "$@" ;;
    highlight)        cmd_highlight "$@" ;;
    highlight-create) cmd_highlight_create "$@" ;;
    highlight-update) cmd_highlight_update "$@" ;;
    highlight-delete) cmd_highlight_delete "$@" ;;
    books)            cmd_books "$@" ;;
    book)             cmd_book "$@" ;;
    review)           cmd_review "$@" ;;
    *) die "Unknown command: $cmd. Run 'readwise.sh --help' for usage." ;;
  esac
}

main "$@"
