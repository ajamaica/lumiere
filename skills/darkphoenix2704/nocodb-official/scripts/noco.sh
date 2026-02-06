#!/usr/bin/env bash
###############################################################################
# nc - NocoDB v3 CLI
###############################################################################
set -euo pipefail

NC_URL="${NOCODB_URL:-https://app.nocodb.com}"
NC_TOKEN="${NOCODB_TOKEN:-}"
NC_VERBOSE="${NOCODB_VERBOSE:-0}"

[[ -z "$NC_TOKEN" ]] && { echo "NOCODB_TOKEN required" >&2; exit 1; }

# Verbose helper - shows resolved IDs
_v() { [[ "$NC_VERBOSE" == "1" ]] && echo "→ $*" >&2 || true; }

###############################################################################
# HTTP helpers
###############################################################################
_get()    { curl -sS -H "xc-token: $NC_TOKEN" "$NC_URL/api/v3/$1"; }
_post()   { curl -sS -X POST -H "xc-token: $NC_TOKEN" -H "Content-Type: application/json" "$NC_URL/api/v3/$1" -d "${2:-}"; }
_patch()  { curl -sS -X PATCH -H "xc-token: $NC_TOKEN" -H "Content-Type: application/json" "$NC_URL/api/v3/$1" -d "${2:-}"; }
_put()    { curl -sS -X PUT -H "xc-token: $NC_TOKEN" -H "Content-Type: application/json" "$NC_URL/api/v3/$1" -d "${2:-}"; }
_delete() { curl -sS -X DELETE -H "xc-token: $NC_TOKEN" -H "Content-Type: application/json" "$NC_URL/api/v3/$1" ${2:+-d "$2"}; }
_upload() { curl -sS -X POST -H "xc-token: $NC_TOKEN" -F "file=@$2" "$NC_URL/api/v3/$1"; }

_enc() {
    local s="$1" o="" c
    for ((i=0; i<${#s}; i++)); do c="${s:i:1}"; [[ "$c" =~ [a-zA-Z0-9._~-] ]] && o+="$c" || o+=$(printf '%%%02X' "'$c"); done
    echo "$o"
}

_jqf() { jq -r --arg n "$2" '.[]|select(.title|ascii_downcase==($n|ascii_downcase))|.id' <<< "$1" | head -1; }

###############################################################################
# Validation helpers
###############################################################################
_err() { echo "error: $1" >&2; exit 1; }

_require() {
    local name="$1" val="${2:-}"
    [[ -z "$val" ]] && _err "$name is required"
    return 0
}

_require_json() {
    local name="$1" val="$2"
    [[ -z "$val" ]] && _err "$name is required"
    echo "$val" | jq . >/dev/null 2>&1 || _err "$name must be valid JSON"
}

_require_json_obj() {
    local name="$1" val="$2"
    [[ -z "$val" ]] && _err "$name is required"
    echo "$val" | jq -e 'type == "object"' >/dev/null 2>&1 || _err "$name must be a JSON object"
}

_require_json_arr() {
    local name="$1" val="$2"
    [[ -z "$val" ]] && _err "$name is required"
    echo "$val" | jq -e 'type == "array"' >/dev/null 2>&1 || _err "$name must be a JSON array"
}

_require_int() {
    local name="$1" val="$2"
    [[ -z "$val" ]] && return 0
    [[ "$val" =~ ^[0-9]+$ ]] || _err "$name must be a positive integer"
    return 0
}

_require_nonempty() {
    local name="$1" val="$2"
    [[ -z "$val" ]] && _err "$name is required and cannot be empty"
    return 0
}

_require_file() {
    local path="$1"
    [[ -z "$path" ]] && _err "file path is required"
    [[ -f "$path" ]] || _err "file not found: $path"
    [[ -r "$path" ]] || _err "file not readable: $path"
    return 0
}

_validate_where() {
    local val="$1"
    [[ -z "$val" ]] && return 0
    # Basic format check - should start with ( or ~not(
    if [[ ! "$val" =~ ^\(.*\)$ ]] && [[ ! "$val" =~ ^~not\( ]]; then
        echo "warning: where clause should be in format (field,op,value)" >&2
        echo "  Examples: (name,eq,John) (status,in,active,pending) (age,gte,18)" >&2
        echo "  Combine:  (field1,eq,x)~and(field2,eq,y)  or  (f1,eq,x)~or(f2,eq,y)" >&2
    fi
    # Check for common mistakes
    if [[ "$val" =~ \)and\( ]] || [[ "$val" =~ \)or\( ]]; then
        _err "use ~and and ~or (with tilde), not plain 'and'/'or'. Example: (a,eq,1)~and(b,eq,2)"
    fi
}

# Field-specific validators for JSON payloads
_validate_workspace_json() {
    local json="$1" op="$2"
    _require_json_obj "json" "$json"
    if [[ "$op" == "create" ]]; then
        echo "$json" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    fi
}

_validate_base_json() {
    local json="$1" op="$2"
    _require_json_obj "json" "$json"
    if [[ "$op" == "create" ]]; then
        echo "$json" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    fi
}

_validate_table_json() {
    local json="$1" op="$2"
    _require_json_obj "json" "$json"
    if [[ "$op" == "create" ]]; then
        echo "$json" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    fi
}

_validate_field_json() {
    local json="$1" op="$2"
    _require_json_obj "json" "$json"
    if [[ "$op" == "create" ]]; then
        echo "$json" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
        echo "$json" | jq -e '.type' >/dev/null 2>&1 || _err "json must contain 'type' field"
    fi
}

_validate_view_json() {
    local json="$1" op="$2"
    _require_json_obj "json" "$json"
    if [[ "$op" == "create" ]]; then
        echo "$json" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
        echo "$json" | jq -e '.type' >/dev/null 2>&1 || _err "json must contain 'type' field (grid, gallery, form, kanban, calendar)"
    fi
}

_validate_filter_json() {
    local json="$1"
    _require_json_obj "json" "$json"
    # Either a simple filter with field_id+operator, or a group with group_operator+filters
    if ! echo "$json" | jq -e '.group_operator' >/dev/null 2>&1; then
        echo "$json" | jq -e '.field_id' >/dev/null 2>&1 || _err "json must contain 'field_id'"
        echo "$json" | jq -e '.operator' >/dev/null 2>&1 || _err "json must contain 'operator' (eq|neq|gt|lt|gte|lte|like|nlike|is|isnot|empty|notempty|null|notnull)"
    fi
}

_validate_sort_json() {
    local json="$1"
    _require_json_obj "json" "$json"
    echo "$json" | jq -e '.field_id' >/dev/null 2>&1 || _err "json must contain 'field_id'"
    # direction is optional, defaults to 'asc'
    if echo "$json" | jq -e '.direction' >/dev/null 2>&1; then
        local dir; dir=$(echo "$json" | jq -r '.direction')
        [[ "$dir" == "asc" || "$dir" == "desc" ]] || _err "direction must be 'asc' or 'desc'"
    fi
}

_validate_record_json() {
    local json="$1"
    _require_json "json" "$json"
    # Can be object with fields, or array of objects with fields
    if echo "$json" | jq -e 'type == "object"' >/dev/null 2>&1; then
        echo "$json" | jq -e '.fields // keys[0]' >/dev/null 2>&1 || _err "json object must contain field data"
    elif echo "$json" | jq -e 'type == "array"' >/dev/null 2>&1; then
        echo "$json" | jq -e '.[0]' >/dev/null 2>&1 || _err "json array must not be empty"
    fi
}

_validate_link_json() {
    local json="$1"
    _require_json "json" "$json"
    # Must be array of objects with id field: [{"id": ...}]
    if ! echo "$json" | jq -e 'type == "array" and .[0].id' >/dev/null 2>&1; then
        _err "json must be array of objects with 'id' field, e.g. [{\"id\":42}]"
    fi
}

_validate_members_json() {
    local json="$1"
    _require_json "json" "$json"
    echo "$json" | jq -e '.email // .emails // .[0].email' >/dev/null 2>&1 || _err "json must contain email(s)"
}

###############################################################################
# ID resolvers (with verbose output)
# NocoDB IDs: prefix + nanoid (lowercase alphanumeric 0-9a-z)
###############################################################################
_is_ws_id()   { [[ "$1" =~ ^w[a-z0-9]+$ ]]; }
_is_base_id() { [[ "$1" =~ ^p[a-z0-9]+$ ]]; }
_is_tbl_id()  { [[ "$1" =~ ^m[a-z0-9]+$ ]]; }
_is_view_id() { [[ "$1" =~ ^vw[a-z0-9]+$ ]]; }
_is_fld_id()  { [[ "$1" =~ ^c[a-z0-9]+$ ]]; }

_ws() {
    if _is_ws_id "$1"; then
        _v "workspace: $1"; echo "$1"; return
    fi
    local r; r=$(_jqf "$(_get meta/workspaces | jq -c .list)" "$1")
    [[ -n "$r" ]] && { _v "workspace: $1 → $r"; echo "$r"; } || { echo "workspace not found: $1" >&2; exit 1; }
}

_base() {
    if _is_base_id "$1"; then
        _v "base: $1"; echo "$1"; return
    fi
    local wl bl r; wl=$(_get meta/workspaces | jq -c .list)
    for w in $(jq -r '.[].id' <<< "$wl"); do
        bl=$(_get "meta/workspaces/$w/bases" | jq -c .list)
        r=$(_jqf "$bl" "$1"); [[ -n "$r" ]] && { _v "base: $1 → $r"; echo "$r"; return; }
    done
    echo "base not found: $1" >&2; exit 1
}

_tbl() {
    if _is_tbl_id "$2"; then
        _v "table: $2"; echo "$2"; return
    fi
    local r; r=$(_jqf "$(_get "meta/bases/$1/tables" | jq -c .list)" "$2")
    [[ -n "$r" ]] && { _v "table: $2 → $r"; echo "$r"; } || { echo "table not found: $2" >&2; exit 1; }
}

_view() {
    if _is_view_id "$3"; then
        _v "view: $3"; echo "$3"; return
    fi
    local r; r=$(_jqf "$(_get "meta/bases/$1/tables/$2/views" | jq -c .list)" "$3")
    [[ -n "$r" ]] && { _v "view: $3 → $r"; echo "$r"; } || { echo "view not found: $3" >&2; exit 1; }
}

_fld() {
    if _is_fld_id "$3"; then
        _v "field: $3"; echo "$3"; return
    fi
    local r; r=$(_get "meta/bases/$1/tables/$2" | jq -r --arg n "$3" '.fields[]|select(.title|ascii_downcase==($n|ascii_downcase))|.id' | head -1)
    [[ -n "$r" ]] && { _v "field: $3 → $r"; echo "$r"; } || { echo "field not found: $3" >&2; exit 1; }
}

###############################################################################
# Commands
###############################################################################
cmd=$1; shift || true

case "$cmd" in

#=============================================================================
# WORKSPACES
#=============================================================================
workspace:list)
    _get meta/workspaces | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
workspace:get)
    [[ -z "${1:-}" ]] && { echo "usage: nc workspace:get <workspace>" >&2; exit 1; }
    _get "meta/workspaces/$(_ws "$1")" | jq .
    ;;
workspace:create)
    [[ -z "${1:-}" ]] && { echo "usage: nc workspace:create '<json>'" >&2; exit 1; }
    _validate_workspace_json "$1" "create"
    _post meta/workspaces "$1" | jq .
    ;;
workspace:update)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc workspace:update <workspace> '<json>'" >&2; exit 1; }
    _validate_workspace_json "$2" "update"
    _patch "meta/workspaces/$(_ws "$1")" "$2" | jq .
    ;;
workspace:delete)
    [[ -z "${1:-}" ]] && { echo "usage: nc workspace:delete <workspace>" >&2; exit 1; }
    _delete "meta/workspaces/$(_ws "$1")" | jq .
    ;;
workspace:members)
    [[ -z "${1:-}" ]] && { echo "usage: nc workspace:members <workspace>" >&2; exit 1; }
    _get "meta/workspaces/$(_ws "$1")?include[]=members" | jq .members
    ;;
workspace:members:add)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc workspace:members:add <workspace> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _post "meta/workspaces/$(_ws "$1")/members" "$2" | jq .
    ;;
workspace:members:update)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc workspace:members:update <workspace> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _patch "meta/workspaces/$(_ws "$1")/members" "$2" | jq .
    ;;
workspace:members:remove)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc workspace:members:remove <workspace> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _delete "meta/workspaces/$(_ws "$1")/members" "$2" | jq .
    ;;

#=============================================================================
# BASES
#=============================================================================
base:list)
    [[ -z "${1:-}" ]] && { echo "usage: nc base:list <workspace>" >&2; exit 1; }
    _get "meta/workspaces/$(_ws "$1")/bases" | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
base:get)
    [[ -z "${1:-}" ]] && { echo "usage: nc base:get <base>" >&2; exit 1; }
    _get "meta/bases/$(_base "$1")" | jq .
    ;;
base:create)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc base:create <workspace> '<json>'" >&2; exit 1; }
    _validate_base_json "$2" "create"
    _post "meta/workspaces/$(_ws "$1")/bases" "$2" | jq .
    ;;
base:update)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc base:update <base> '<json>'" >&2; exit 1; }
    _validate_base_json "$2" "update"
    _patch "meta/bases/$(_base "$1")" "$2" | jq .
    ;;
base:delete)
    [[ -z "${1:-}" ]] && { echo "usage: nc base:delete <base>" >&2; exit 1; }
    _delete "meta/bases/$(_base "$1")" | jq .
    ;;
base:members)
    [[ -z "${1:-}" ]] && { echo "usage: nc base:members <base>" >&2; exit 1; }
    _get "meta/bases/$(_base "$1")?include[]=members" | jq .members
    ;;
base:members:add)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc base:members:add <base> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _post "meta/bases/$(_base "$1")/members" "$2" | jq .
    ;;
base:members:update)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc base:members:update <base> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _patch "meta/bases/$(_base "$1")/members" "$2" | jq .
    ;;
base:members:remove)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc base:members:remove <base> '<json>'" >&2; exit 1; }
    _validate_members_json "$2"
    _delete "meta/bases/$(_base "$1")/members" "$2" | jq .
    ;;

#=============================================================================
# TABLES
#=============================================================================
table:list)
    [[ -z "${1:-}" ]] && { echo "usage: nc table:list <base>" >&2; exit 1; }
    b=$(_base "$1")
    _get "meta/bases/$b/tables" | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
table:get)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc table:get <base> <table>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _get "meta/bases/$b/tables/$t" | jq .
    ;;
table:create)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc table:create <base> '<json>'" >&2; exit 1; }
    _validate_table_json "$2" "create"
    _post "meta/bases/$(_base "$1")/tables" "$2" | jq .
    ;;
table:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc table:update <base> <table> '<json>'" >&2; exit 1; }
    _validate_table_json "$3" "update"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _patch "meta/bases/$b/tables/$t" "$3" | jq .
    ;;
table:delete)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc table:delete <base> <table>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _delete "meta/bases/$b/tables/$t" | jq .
    ;;

#=============================================================================
# FIELDS
#=============================================================================
field:list)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc field:list <base> <table>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _get "meta/bases/$b/tables/$t" | jq -r '.fields[]|[.title,.type,.id]|@tsv'
    ;;
field:get)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc field:get <base> <table> <field>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _get "meta/bases/$b/fields/$f" | jq .
    ;;
field:create)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc field:create <base> <table> '<json>'" >&2; exit 1; }
    _validate_field_json "$3" "create"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _post "meta/bases/$b/tables/$t/fields" "$3" | jq .
    ;;
field:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc field:update <base> <table> <field> '<json>'" >&2; exit 1; }
    _validate_field_json "$4" "update"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _patch "meta/bases/$b/fields/$f" "$4" | jq .
    ;;
field:delete)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc field:delete <base> <table> <field>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _delete "meta/bases/$b/fields/$f" | jq .
    ;;

#=============================================================================
# VIEWS
#=============================================================================
view:list)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc view:list <base> <table>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _get "meta/bases/$b/tables/$t/views" | jq -r '.list[]|[.title,.type,.id]|@tsv'
    ;;
view:get)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc view:get <base> <table> <view>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _get "meta/bases/$b/views/$v" | jq .
    ;;
view:create)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc view:create <base> <table> '<json>'" >&2; exit 1; }
    _validate_view_json "$3" "create"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _post "meta/bases/$b/tables/$t/views" "$3" | jq .
    ;;
view:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc view:update <base> <table> <view> '<json>'" >&2; exit 1; }
    _validate_view_json "$4" "update"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _patch "meta/bases/$b/views/$v" "$4" | jq .
    ;;
view:delete)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc view:delete <base> <table> <view>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _delete "meta/bases/$b/views/$v" | jq .
    ;;

#=============================================================================
# VIEW FILTERS
#=============================================================================
filter:list)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc filter:list <base> <table> <view>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _get "meta/bases/$b/views/$v/filters" | jq .
    ;;
filter:create)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc filter:create <base> <table> <view> '<json>'" >&2; exit 1; }
    _validate_filter_json "$4"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _post "meta/bases/$b/views/$v/filters" "$4" | jq .
    ;;
filter:replace)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc filter:replace <base> <table> <view> '<json>'" >&2; exit 1; }
    _require_json "json" "$4"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _put "meta/bases/$b/views/$v/filters" "$4" | jq .
    ;;
filter:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc filter:update <base> <filterId> '<json>'" >&2; exit 1; }
    _validate_filter_json "$3"
    _patch "meta/bases/$(_base "$1")/filters/$2" "$3" | jq .
    ;;
filter:delete)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc filter:delete <base> <filterId>" >&2; exit 1; }
    _delete "meta/bases/$(_base "$1")/filters/$2" | jq .
    ;;

#=============================================================================
# VIEW SORTS
#=============================================================================
sort:list)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc sort:list <base> <table> <view>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _get "meta/bases/$b/views/$v/sorts" | jq .
    ;;
sort:create)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc sort:create <base> <table> <view> '<json>'" >&2; exit 1; }
    _validate_sort_json "$4"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); v=$(_view "$b" "$t" "$3")
    _post "meta/bases/$b/views/$v/sorts" "$4" | jq .
    ;;
sort:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc sort:update <base> <sortId> '<json>'" >&2; exit 1; }
    _validate_sort_json "$3"
    _patch "meta/bases/$(_base "$1")/sorts/$2" "$3" | jq .
    ;;
sort:delete)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc sort:delete <base> <sortId>" >&2; exit 1; }
    _delete "meta/bases/$(_base "$1")/sorts/$2" | jq .
    ;;

#=============================================================================
# RECORDS
#=============================================================================
record:list)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc record:list <base> <table> [page] [size] [where] [sort] [fields] [viewId]" >&2; exit 1; }
    _require_int "page" "${3:-}"
    _require_int "size" "${4:-}"
    _validate_where "${5:-}"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    pg="${3:-1}"; sz="${4:-25}"; wh="${5:-}"; so="${6:-}"; fl="${7:-}"; vi="${8:-}"
    q="page=$pg&pageSize=$sz"
    [[ -n "$wh" ]] && q+="&where=$(_enc "$wh")"
    [[ -n "$so" ]] && q+="&sort=$(_enc "$so")"
    [[ -n "$fl" ]] && q+="&fields=$(_enc "$fl")"
    [[ -n "$vi" ]] && q+="&viewId=$vi"
    _get "data/$b/$t/records?$q" | jq .records
    ;;
record:get)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc record:get <base> <table> <id> [fields]" >&2; exit 1; }
    _require_nonempty "id" "$3"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    q=""; [[ -n "${4:-}" ]] && q="?fields=$(_enc "$4")"
    _get "data/$b/$t/records/$3$q" | jq .
    ;;
record:create)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc record:create <base> <table> '<json>'" >&2; exit 1; }
    _validate_record_json "$3"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _post "data/$b/$t/records" "$3" | jq .
    ;;
record:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc record:update <base> <table> <id> '<json>'" >&2; exit 1; }
    _require_nonempty "id" "$3"
    _require_json_obj "json" "$4"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _patch "data/$b/$t/records" "[{\"id\":$3,\"fields\":$4}]" | jq '.records[0]'
    ;;
record:update-many)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc record:update-many <base> <table> '<json-array>'" >&2; exit 1; }
    _require_json_arr "json" "$3"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    _patch "data/$b/$t/records" "$3" | jq .
    ;;
record:delete)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc record:delete <base> <table> <id|json-array>" >&2; exit 1; }
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    if [[ "$3" =~ ^\[ ]]; then
        # Array format: [{"id":"x"},{"id":"y"}] or ["x","y"]
        if echo "$3" | jq -e '.[0].id' >/dev/null 2>&1; then
            ids="$3"
        elif echo "$3" | jq -e '.[0]|type == "string"' >/dev/null 2>&1; then
            # Convert ["x","y"] to [{"id":"x"},{"id":"y"}]
            ids=$(echo "$3" | jq '[.[]|{id:.}]')
        else
            _err "array must contain strings or objects with 'id' field"
        fi
    else
        _require_nonempty "id" "$3"
        ids="[{\"id\":\"$3\"}]"
    fi
    _delete "data/$b/$t/records" "$ids" | jq .
    ;;
record:count)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc record:count <base> <table> [where] [viewId]" >&2; exit 1; }
    _validate_where "${3:-}"
    b=$(_base "$1"); t=$(_tbl "$b" "$2")
    q=""; [[ -n "${3:-}" ]] && q="where=$(_enc "$3")"; [[ -n "${4:-}" ]] && q+="${q:+&}viewId=$4"
    _get "data/$b/$t/count${q:+?$q}" | jq -r .count
    ;;

#=============================================================================
# LINKED RECORDS
#=============================================================================
link:list)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc link:list <base> <table> <linkField> <recordId> [page] [size]" >&2; exit 1; }
    _require_nonempty "recordId" "$4"
    _require_int "page" "${5:-}"
    _require_int "size" "${6:-}"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    pg="${5:-1}"; sz="${6:-25}"
    _get "data/$b/$t/links/$f/$4?page=$pg&pageSize=$sz" | jq .
    ;;
link:add)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" || -z "${5:-}" ]] && { echo "usage: nc link:add <base> <table> <linkField> <recordId> '<ids-json>'" >&2; exit 1; }
    _require_nonempty "recordId" "$4"
    _validate_link_json "$5"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _post "data/$b/$t/links/$f/$4" "$5" | jq .
    ;;
link:remove)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" || -z "${5:-}" ]] && { echo "usage: nc link:remove <base> <table> <linkField> <recordId> '<ids-json>'" >&2; exit 1; }
    _require_nonempty "recordId" "$4"
    _validate_link_json "$5"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _delete "data/$b/$t/links/$f/$4" "$5" | jq .
    ;;

#=============================================================================
# ATTACHMENTS
#=============================================================================
attachment:upload)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" || -z "${5:-}" ]] && { echo "usage: nc attachment:upload <base> <table> <recordId> <field> <filepath>" >&2; exit 1; }
    _require_nonempty "recordId" "$3"
    _require_file "$5"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$4")
    _upload "data/$b/$t/records/$3/fields/$f/upload" "$5" | jq .
    ;;

#=============================================================================
# BUTTON ACTIONS
#=============================================================================
action:trigger)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" || -z "${4:-}" ]] && { echo "usage: nc action:trigger <base> <table> <buttonField> <recordId>" >&2; exit 1; }
    _require_nonempty "recordId" "$4"
    b=$(_base "$1"); t=$(_tbl "$b" "$2"); f=$(_fld "$b" "$t" "$3")
    _post "data/$b/$t/actions/$f" "{\"recordId\":\"$4\"}" | jq .
    ;;

#=============================================================================
# SCRIPTS
#=============================================================================
script:list)
    [[ -z "${1:-}" ]] && { echo "usage: nc script:list <base>" >&2; exit 1; }
    _get "meta/bases/$(_base "$1")/scripts" | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
script:get)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc script:get <base> <scriptId>" >&2; exit 1; }
    _get "meta/bases/$(_base "$1")/scripts/$2" | jq .
    ;;
script:create)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc script:create <base> '<json>'" >&2; exit 1; }
    _require_json_obj "json" "$2"
    echo "$2" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    _post "meta/bases/$(_base "$1")/scripts" "$2" | jq .
    ;;
script:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc script:update <base> <scriptId> '<json>'" >&2; exit 1; }
    _require_json_obj "json" "$3"
    _patch "meta/bases/$(_base "$1")/scripts/$2" "$3" | jq .
    ;;
script:delete)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc script:delete <base> <scriptId>" >&2; exit 1; }
    _delete "meta/bases/$(_base "$1")/scripts/$2" | jq .
    ;;

#=============================================================================
# TEAMS
#=============================================================================
team:list)
    [[ -z "${1:-}" ]] && { echo "usage: nc team:list <workspace>" >&2; exit 1; }
    _get "meta/workspaces/$(_ws "$1")/teams" | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
team:get)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc team:get <workspace> <teamId>" >&2; exit 1; }
    _get "meta/workspaces/$(_ws "$1")/teams/$2" | jq .
    ;;
team:create)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc team:create <workspace> '<json>'" >&2; exit 1; }
    _require_json_obj "json" "$2"
    echo "$2" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    _post "meta/workspaces/$(_ws "$1")/teams" "$2" | jq .
    ;;
team:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc team:update <workspace> <teamId> '<json>'" >&2; exit 1; }
    _require_json_obj "json" "$3"
    _patch "meta/workspaces/$(_ws "$1")/teams/$2" "$3" | jq .
    ;;
team:delete)
    [[ -z "${1:-}" || -z "${2:-}" ]] && { echo "usage: nc team:delete <workspace> <teamId>" >&2; exit 1; }
    _delete "meta/workspaces/$(_ws "$1")/teams/$2" | jq .
    ;;
team:members:add)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc team:members:add <workspace> <teamId> '<json>'" >&2; exit 1; }
    _validate_members_json "$3"
    _post "meta/workspaces/$(_ws "$1")/teams/$2/members" "$3" | jq .
    ;;
team:members:update)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc team:members:update <workspace> <teamId> '<json>'" >&2; exit 1; }
    _require_json "json" "$3"
    _patch "meta/workspaces/$(_ws "$1")/teams/$2/members" "$3" | jq .
    ;;
team:members:remove)
    [[ -z "${1:-}" || -z "${2:-}" || -z "${3:-}" ]] && { echo "usage: nc team:members:remove <workspace> <teamId> '<json>'" >&2; exit 1; }
    _require_json "json" "$3"
    _delete "meta/workspaces/$(_ws "$1")/teams/$2/members" "$3" | jq .
    ;;

#=============================================================================
# API TOKENS
#=============================================================================
token:list)
    _get meta/tokens | jq -r '.list[]|[.title,.id]|@tsv'
    ;;
token:create)
    [[ -z "${1:-}" ]] && { echo "usage: nc token:create '<json>'" >&2; exit 1; }
    _require_json_obj "json" "$1"
    echo "$1" | jq -e '.title' >/dev/null 2>&1 || _err "json must contain 'title' field"
    _post meta/tokens "$1" | jq .
    ;;
token:delete)
    [[ -z "${1:-}" ]] && { echo "usage: nc token:delete <tokenId>" >&2; exit 1; }
    _delete "meta/tokens/$1" | jq .
    ;;

#=============================================================================
# WHERE FILTER HELP
#=============================================================================
where:help|filter:help)
    cat <<'WHEREHELP'
WHERE FILTER SYNTAX
===================

BASIC SYNTAX:
  (field,operator,value)           Basic filter
  (field,operator)                 No-value operators (blank, null, checked, etc.)
  (field,op,sub_op)                Date with sub-operator
  (field,op,sub_op,value)          Date with sub-operator and value
  (field,operator,val1,val2,val3)  Multiple values

OPERATORS:

  Text/General:
    eq        Equal to                    (name,eq,John)
    neq       Not equal to                (status,neq,archived)
    like      Contains (use % wildcard)   (name,like,%john%)
    nlike     Does not contain            (name,nlike,%test%)
    in        In list of values           (status,in,active,pending,review)

  Numeric:
    gt        Greater than (>)            (price,gt,100)
    lt        Less than (<)               (stock,lt,10)
    gte       Greater than or equal (>=)  (rating,gte,4)
    lte       Less than or equal (<=)     (age,lte,65)

  Range:
    btw       Between (inclusive)         (price,btw,10,100)
    nbtw      Not between                 (score,nbtw,0,50)

  Null/Empty (no value needed):
    blank     Is blank (null or empty)    (notes,blank)
    notblank  Is not blank                (email,notblank)
    null      Is null                     (deleted_at,null)
    notnull   Is not null                 (created_by,notnull)
    empty     Is empty string             (description,empty)
    notempty  Is not empty string         (title,notempty)

  Boolean/Checkbox (no value needed):
    checked      Is checked/true          (is_active,checked)
    notchecked   Is not checked/false     (is_archived,notchecked)

  Multi-Select/Tags:
    allof     Contains all of             (tags,allof,urgent,important)
    anyof     Contains any of             (tags,anyof,bug,feature)
    nallof    Does not contain all of     (tags,nallof,spam,junk)
    nanyof    Does not contain any of     (categories,nanyof,draft,deleted)

DATE/TIME FILTERING:

  isWithin - Date falls within time range:
    Sub-ops (no value): pastWeek, pastMonth, pastYear, nextWeek, nextMonth, nextYear
    Sub-ops (with days): pastNumberOfDays, nextNumberOfDays
    Examples:
      (created_at,isWithin,pastWeek)
      (due_date,isWithin,pastNumberOfDays,14)

  eq, neq, gt, lt, gte, lte - Date comparisons:
    Sub-ops (no value): today, tomorrow, yesterday, oneWeekAgo, oneWeekFromNow
    Sub-ops (with days): daysAgo, daysFromNow
    Sub-op (with YYYY-MM-DD): exactDate
    Examples:
      (created_at,eq,today)
      (due_date,lt,today)                      # Overdue
      (event_date,eq,exactDate,2024-06-15)
      (created_at,gte,daysAgo,7)

  btw - Date range:
      (event_date,btw,2024-01-01,2024-12-31)

LOGICAL OPERATIONS:

  IMPORTANT: Use ~and, ~or, ~not (with tilde prefix)

  AND: (filter1)~and(filter2)
  OR:  (filter1)~or(filter2)
  NOT: ~not(filter)

  Examples:
    (name,eq,John)~and(age,gte,18)
    (status,eq,active)~or(status,eq,pending)
    ~not(is_deleted,checked)
    (status,in,active,pending)~and(country,eq,USA)

SPECIAL VALUES:
  NULL value:         (field,eq,null)
  Empty string:       (field,eq,'') or (field,eq,"")
  Value with comma:   (field,eq,"hello, world")
  Value with quotes:  (field,eq,"it's here")

COMPLEX EXAMPLES:
  Active users this month:
    (status,eq,active)~and(created_at,isWithin,pastMonth)

  Overdue high-priority:
    (due_date,lt,today)~and(priority,eq,high)~and(completed,notchecked)

  Orders $100-$500 pending:
    (amount,gte,100)~and(amount,lte,500)~and(status,in,pending,processing)

  Updated recently, not archived:
    (updated_at,isWithin,pastNumberOfDays,14)~and~not(is_archived,checked)
WHEREHELP
    ;;

#=============================================================================
# HELP
#=============================================================================
*)
    cat <<'HELP'
nc - NocoDB v3 CLI (Feature Complete)

ARGUMENT ORDER: Commands follow a hierarchical pattern:
  workspace → base → table → view/field → record

  Most commands accept NAMES or IDs. Use IDs directly for faster execution.
  Set NOCODB_VERBOSE=1 to see resolved IDs.

WORKSPACES
  workspace:list
  workspace:get        WORKSPACE
  workspace:create     JSON
  workspace:update     WORKSPACE  JSON
  workspace:delete     WORKSPACE
  workspace:members    WORKSPACE
  workspace:members:add/update/remove  WORKSPACE  JSON

BASES  (workspace contains bases)
  base:list    WORKSPACE
  base:get     BASE
  base:create  WORKSPACE  JSON
  base:update  BASE  JSON
  base:delete  BASE
  base:members BASE
  base:members:add/update/remove  BASE  JSON

TABLES  (base contains tables)
  table:list    BASE
  table:get     BASE  TABLE
  table:create  BASE  JSON
  table:update  BASE  TABLE  JSON
  table:delete  BASE  TABLE

FIELDS  (table contains fields)
  field:list    BASE  TABLE
  field:get     BASE  TABLE  FIELD
  field:create  BASE  TABLE  JSON
  field:update  BASE  TABLE  FIELD  JSON
  field:delete  BASE  TABLE  FIELD

VIEWS  (table contains views)
  view:list    BASE  TABLE
  view:get     BASE  TABLE  VIEW
  view:create  BASE  TABLE  JSON
  view:update  BASE  TABLE  VIEW  JSON
  view:delete  BASE  TABLE  VIEW

FILTERS  (view contains filters)
  filter:list     BASE  TABLE  VIEW
  filter:create   BASE  TABLE  VIEW  JSON
  filter:replace  BASE  TABLE  VIEW  JSON
  filter:update   BASE  FILTER_ID  JSON
  filter:delete   BASE  FILTER_ID

SORTS  (view contains sorts)
  sort:list    BASE  TABLE  VIEW
  sort:create  BASE  TABLE  VIEW  JSON
  sort:update  BASE  SORT_ID  JSON
  sort:delete  BASE  SORT_ID

RECORDS  (table contains records)
  record:list        BASE  TABLE  [PAGE] [SIZE] [WHERE] [SORT] [FIELDS] [VIEW_ID]
  record:get         BASE  TABLE  RECORD_ID  [FIELDS]
  record:create      BASE  TABLE  JSON
  record:update      BASE  TABLE  RECORD_ID  JSON
  record:update-many BASE  TABLE  JSON_ARRAY
  record:delete      BASE  TABLE  RECORD_ID_OR_ARRAY
  record:count       BASE  TABLE  [WHERE] [VIEW_ID]

LINKED RECORDS  (link field on a record)
  link:list    BASE  TABLE  LINK_FIELD  RECORD_ID  [PAGE] [SIZE]
  link:add     BASE  TABLE  LINK_FIELD  RECORD_ID  JSON_ARRAY
  link:remove  BASE  TABLE  LINK_FIELD  RECORD_ID  JSON_ARRAY

ATTACHMENTS
  attachment:upload  BASE  TABLE  RECORD_ID  FIELD  FILEPATH

BUTTON ACTIONS
  action:trigger  BASE  TABLE  BUTTON_FIELD  RECORD_ID

SCRIPTS
  script:list    BASE
  script:get     BASE  SCRIPT_ID
  script:create  BASE  JSON
  script:update  BASE  SCRIPT_ID  JSON
  script:delete  BASE  SCRIPT_ID

TEAMS  (workspace contains teams)
  team:list    WORKSPACE
  team:get     WORKSPACE  TEAM_ID
  team:create  WORKSPACE  JSON
  team:update  WORKSPACE  TEAM_ID  JSON
  team:delete  WORKSPACE  TEAM_ID
  team:members:add/update/remove  WORKSPACE  TEAM_ID  JSON

API TOKENS
  token:list
  token:create  JSON
  token:delete  TOKEN_ID

WHERE HELP
  where:help    Show where filter syntax and operators

ENVIRONMENT
  NOCODB_URL      Base URL (default: https://app.nocodb.com)
  NOCODB_TOKEN    API token (required)
  NOCODB_VERBOSE  Set to 1 to show resolved IDs

EXAMPLES
  # IDs: w=workspace, p=base, m=table, c=column, vw=view (all lowercase alphanumeric)

  # List workspaces, bases, tables (use IDs from output)
  nc workspace:list                                   # → wabc1234xyz
  nc base:list wabc1234xyz                            # → pdef5678uvw
  nc table:list pdef5678uvw                           # → mghi9012rst
  nc field:list pdef5678uvw mghi9012rst               # → cjkl3456opq
  nc view:list pdef5678uvw mghi9012rst                # → vwmno7890abc

  # Records (BASE_ID TABLE_ID ...)
  nc record:list pdef5678uvw mghi9012rst 1 50 "(Status,eq,active)"
  nc record:get pdef5678uvw mghi9012rst 31
  nc record:create pdef5678uvw mghi9012rst '{"fields":{"Name":"Alice"}}'
  nc record:update pdef5678uvw mghi9012rst 31 '{"Status":"done"}'
  nc record:delete pdef5678uvw mghi9012rst 31

  # Linked records (BASE_ID TABLE_ID FIELD_ID RECORD_ID JSON)
  nc link:add pdef5678uvw mghi9012rst cjkl3456opq 31 '[{"id":42}]'

  # View filters/sorts (BASE_ID TABLE_ID VIEW_ID JSON)
  nc filter:create pdef5678uvw mghi9012rst vwmno7890abc '{"field_id":"cjkl3456opq","operator":"eq","value":"active"}'

  # Attachments (BASE_ID TABLE_ID RECORD_ID FIELD_ID FILEPATH)
  nc attachment:upload pdef5678uvw mghi9012rst 31 cjkl3456opq ./report.pdf

  # Names also work (resolved to IDs automatically)
  nc record:list MyBase Users
  NOCODB_VERBOSE=1 nc field:list MyBase Users   # shows resolved IDs
HELP
    ;;
esac
