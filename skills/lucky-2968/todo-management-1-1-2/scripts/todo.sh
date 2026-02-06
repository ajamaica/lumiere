#!/usr/bin/env bash
set -euo pipefail

DB="${TODO_DB:-$(pwd)/todo.db}"
DEFAULT_GROUP="Inbox"

die() { echo "error: $*" >&2; exit 2; }

usage() {
  cat <<'USAGE'
todo - manage per-workspace todo.db (SQLite)

Env:
  TODO_DB=/path/to/todo.db   (default: ./todo.db)

Groups:
  todo group create "Name"
  todo group list
  todo group rename "Old" "New"
  todo group edit "Old" "New"          (alias for rename)
  todo group remove "Name" [--delete-entries]

Entries:
  todo entry create "Text" [--group="Name"] [--status=pending|in_progress|done|skipped]
  todo entry list [--group="Name"] [--status=...] [--all]
  todo entry show ID
  todo entry edit ID "New text"
  todo entry move ID --group="Name"
  todo entry status ID --status=pending|in_progress|done|skipped
  todo entry remove ID
USAGE
}

need_sqlite3() {
  command -v sqlite3 >/dev/null 2>&1 || die "sqlite3 not found in PATH"
}

# Escape single quotes for SQL string literals
sql_q() {
  local s="${1//\'/\'\'}"
  printf "'%s'" "$s"
}

sql() { sqlite3 -bail "$DB" "$@"; }
sql_scalar() { sqlite3 -noheader -batch "$DB" "$@"; }

ensure_db() {
  sql "
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','in_progress','done','skipped')),
      group_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_entries_group_id ON entries(group_id);
    CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);

    INSERT OR IGNORE INTO groups (name) VALUES ($(sql_q "$DEFAULT_GROUP"));
  "
}

get_group_id() {
  local name="$1"
  sql_scalar "SELECT id FROM groups WHERE name = $(sql_q "$name");"
}

ensure_group() {
  local name="$1"
  sql "
    INSERT OR IGNORE INTO groups (name) VALUES ($(sql_q "$name"));
    UPDATE groups SET updated_at=CURRENT_TIMESTAMP WHERE name=$(sql_q "$name");
  "
}

require_int() {
  [[ "$1" =~ ^[0-9]+$ ]] || die "ID must be an integer"
}

# --- bash-3.2-safe flag parsing (no associative arrays) ---
REST=()
FLAGS_KEYS=()
FLAGS_VALS=()

parse_flags() {
  REST=()
  FLAGS_KEYS=()
  FLAGS_VALS=()
  local a k v
  for a in "$@"; do
    if [[ "$a" == --*=* ]]; then
      k="${a%%=*}"; k="${k#--}"
      v="${a#*=}"
      FLAGS_KEYS+=("$k")
      FLAGS_VALS+=("$v")
    elif [[ "$a" == --* ]]; then
      k="${a#--}"
      FLAGS_KEYS+=("$k")
      FLAGS_VALS+=("true")
    else
      REST+=("$a")
    fi
  done
}

flag_get() {
  # usage: flag_get key default
  local key="$1" def="${2:-}"
  local i
  for ((i=0; i<${#FLAGS_KEYS[@]}; i++)); do
    if [[ "${FLAGS_KEYS[$i]}" == "$key" ]]; then
      echo "${FLAGS_VALS[$i]}"
      return 0
    fi
  done
  echo "$def"
}

# --- commands ---

cmd_group() {
  local action="${1:-}"; shift || true
  [[ -n "$action" ]] || { usage; exit 2; }

  [[ "$action" == "edit" ]] && action="rename"

  parse_flags "$@"

  case "$action" in
    create)
      [[ ${#REST[@]} -eq 1 ]] || die 'group create requires exactly 1 arg: "Group Name"'
      ensure_group "${REST[0]}"
      echo "ok: group created: \"${REST[0]}\""
      ;;

    list)
      [[ ${#REST[@]} -eq 0 ]] || die "group list takes no args"
      sql_scalar "SELECT name FROM groups ORDER BY CASE WHEN name=$(sql_q "$DEFAULT_GROUP") THEN 0 ELSE 1 END, name;" \
        | sed '/^$/d'
      ;;

    rename)
      [[ ${#REST[@]} -eq 2 ]] || die 'group rename requires 2 args: "Old" "New"'
      local old="${REST[0]}" new="${REST[1]}"
      [[ "$old" != "$DEFAULT_GROUP" ]] || die "cannot rename default group \"$DEFAULT_GROUP\""
      local old_id; old_id="$(get_group_id "$old")"
      [[ -n "$old_id" ]] || die "group not found: \"$old\""
      local new_id; new_id="$(get_group_id "$new")"
      [[ -z "$new_id" ]] || die "group already exists: \"$new\""

      sql "UPDATE groups SET name=$(sql_q "$new"), updated_at=CURRENT_TIMESTAMP WHERE id=$old_id;"
      echo "ok: group renamed: \"$old\" -> \"$new\""
      ;;

    remove)
      [[ ${#REST[@]} -eq 1 ]] || die 'group remove requires exactly 1 arg: "Group Name"'
      local name="${REST[0]}"
      [[ "$name" != "$DEFAULT_GROUP" ]] || die "cannot remove default group \"$DEFAULT_GROUP\""

      local gid; gid="$(get_group_id "$name")"
      [[ -n "$gid" ]] || die "group not found: \"$name\""

      local inbox_id; inbox_id="$(get_group_id "$DEFAULT_GROUP")"
      [[ -n "$inbox_id" ]] || die "internal: Inbox group missing"

      if [[ "$(flag_get delete-entries false)" == "true" ]]; then
        local cnt; cnt="$(sql_scalar "SELECT COUNT(*) FROM entries WHERE group_id=$gid;")"
        sql "
          BEGIN;
          DELETE FROM entries WHERE group_id=$gid;
          DELETE FROM groups WHERE id=$gid;
          COMMIT;
        "
        echo "ok: group removed: \"$name\" (deleted $cnt entries)"
      else
        local cnt; cnt="$(sql_scalar "SELECT COUNT(*) FROM entries WHERE group_id=$gid;")"
        sql "
          BEGIN;
          UPDATE entries SET group_id=$inbox_id, updated_at=CURRENT_TIMESTAMP WHERE group_id=$gid;
          DELETE FROM groups WHERE id=$gid;
          COMMIT;
        "
        echo "ok: group removed: \"$name\" (moved $cnt entries to \"$DEFAULT_GROUP\")"
      fi
      ;;

    *)
      die "unknown group action: $action"
      ;;
  esac
}

cmd_entry() {
  local action="${1:-}"; shift || true
  [[ -n "$action" ]] || { usage; exit 2; }

  parse_flags "$@"

  case "$action" in
    create)
      [[ ${#REST[@]} -eq 1 ]] || die 'entry create requires exactly 1 arg: "Task text"'
      local text="${REST[0]}"
      local group; group="$(flag_get group "$DEFAULT_GROUP")"
      local status; status="$(flag_get status "pending")"

      [[ "$status" =~ ^(pending|in_progress|done|skipped)$ ]] || die "invalid status: $status"

      ensure_group "$group"
      local gid; gid="$(get_group_id "$group")"

      sql "INSERT INTO entries (text,status,group_id) VALUES ($(sql_q "$text"), $(sql_q "$status"), $gid);"
      local id; id="$(sql_scalar "SELECT last_insert_rowid();")"
      echo "ok: entry created: $id"
      ;;

    list)
      [[ ${#REST[@]} -eq 0 ]] || die "entry list takes no positional args"

      local where="1=1"
      local select="SELECT e.id, e.status, g.name, e.text FROM entries e JOIN groups g ON g.id=e.group_id"

      local group status all
      group="$(flag_get group "")"
      status="$(flag_get status "")"
      all="$(flag_get all "false")"

      if [[ -n "$group" ]]; then
        ensure_group "$group"
        local gid; gid="$(get_group_id "$group")"
        where="$where AND e.group_id=$gid"
      fi

      if [[ -n "$status" ]]; then
        [[ "$status" =~ ^(pending|in_progress|done|skipped)$ ]] || die "invalid status: $status"
        where="$where AND e.status=$(sql_q "$status")"
      else
        if [[ "$all" != "true" ]]; then
          where="$where AND e.status NOT IN ('done','skipped')"
        fi
      fi

      sqlite3 -noheader -batch -separator " | " "$DB" \
        "$select WHERE $where ORDER BY e.id;"
      ;;

    show)
      [[ ${#REST[@]} -eq 1 ]] || die "entry show requires exactly 1 arg: ID"
      require_int "${REST[0]}"
      local id="${REST[0]}"

      sqlite3 -batch -line "$DB" "
        SELECT e.id AS id, e.status AS status, g.name AS group_name, e.text AS text,
               e.created_at AS created_at, e.updated_at AS updated_at
        FROM entries e JOIN groups g ON g.id=e.group_id
        WHERE e.id=$id;
      "
      ;;

    edit)
      [[ ${#REST[@]} -eq 2 ]] || die 'entry edit requires 2 args: ID "New text"'
      require_int "${REST[0]}"
      local id="${REST[0]}"
      local new_text="${REST[1]}"

      local exists; exists="$(sql_scalar "SELECT 1 FROM entries WHERE id=$id;")"
      [[ -n "$exists" ]] || die "entry not found: $id"

      sql "UPDATE entries SET text=$(sql_q "$new_text"), updated_at=CURRENT_TIMESTAMP WHERE id=$id;"
      echo "ok: entry edited: $id"
      ;;

    move)
      [[ ${#REST[@]} -eq 1 ]] || die "entry move requires exactly 1 arg: ID"
      require_int "${REST[0]}"
      local group; group="$(flag_get group "")"
      [[ -n "$group" ]] || die 'entry move requires --group="Group Name"'

      local id="${REST[0]}"
      ensure_group "$group"
      local gid; gid="$(get_group_id "$group")"

      local exists; exists="$(sql_scalar "SELECT 1 FROM entries WHERE id=$id;")"
      [[ -n "$exists" ]] || die "entry not found: $id"

      sql "UPDATE entries SET group_id=$gid, updated_at=CURRENT_TIMESTAMP WHERE id=$id;"
      echo "ok: entry moved: $id -> \"$group\""
      ;;

    status)
      [[ ${#REST[@]} -eq 1 ]] || die "entry status requires exactly 1 arg: ID"
      require_int "${REST[0]}"
      local status; status="$(flag_get status "")"
      [[ -n "$status" ]] || die "entry status requires --status=pending|in_progress|done|skipped"
      [[ "$status" =~ ^(pending|in_progress|done|skipped)$ ]] || die "invalid status: $status"

      local id="${REST[0]}"
      local exists; exists="$(sql_scalar "SELECT 1 FROM entries WHERE id=$id;")"
      [[ -n "$exists" ]] || die "entry not found: $id"

      sql "UPDATE entries SET status=$(sql_q "$status"), updated_at=CURRENT_TIMESTAMP WHERE id=$id;"
      echo "ok: entry updated: $id status=$status"
      ;;

    remove)
      [[ ${#REST[@]} -eq 1 ]] || die "entry remove requires exactly 1 arg: ID"
      require_int "${REST[0]}"
      local id="${REST[0]}"

      local exists; exists="$(sql_scalar "SELECT 1 FROM entries WHERE id=$id;")"
      [[ -n "$exists" ]] || die "entry not found: $id"

      sql "DELETE FROM entries WHERE id=$id;"
      echo "ok: entry removed: $id"
      ;;

    *)
      die "unknown entry action: $action"
      ;;
  esac
}

main() {
  need_sqlite3
  if [[ $# -eq 0 || "$1" == "-h" || "$1" == "--help" || "$1" == "help" ]]; then
    usage; exit 0
  fi

  ensure_db

  local top="$1"; shift
  case "$top" in
    group) cmd_group "$@" ;;
    entry) cmd_entry "$@" ;;
    *) usage; exit 2 ;;
  esac
}

main "$@"
