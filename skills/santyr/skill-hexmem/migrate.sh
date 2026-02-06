#!/bin/bash
# Hex Memory Database Migration Runner
# Usage: ./migrate.sh [command]
# Commands: status, up, down, reset

set -euo pipefail

DB_PATH="${HEXMEM_DB:-$HOME/clawd/hexmem/hexmem.db}"
MIGRATIONS_DIR="$(dirname "$0")/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Ensure database exists with migrations table
init_db() {
    if [[ ! -f "$DB_PATH" ]]; then
        log_info "Creating new database at $DB_PATH"
        sqlite3 "$DB_PATH" "SELECT 1;" > /dev/null
    fi
    
    # Check if migrations table exists
    local has_migrations=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations';" 2>/dev/null)
    if [[ -z "$has_migrations" ]]; then
        log_info "Initializing migrations table"
        sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY,
            version TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now')),
            checksum TEXT
        );"
    fi
}

# Get list of applied migrations
get_applied() {
    sqlite3 "$DB_PATH" "SELECT version FROM migrations ORDER BY version;" 2>/dev/null
}

# Get list of pending migrations
get_pending() {
    local applied=$(get_applied)
    for f in "$MIGRATIONS_DIR"/*.sql; do
        [[ -f "$f" ]] || continue
        local version=$(basename "$f" | cut -d'_' -f1)
        if ! echo "$applied" | grep -q "^${version}$"; then
            echo "$f"
        fi
    done
}

# Calculate checksum of migration file
checksum() {
    sha256sum "$1" | cut -d' ' -f1
}

# Apply a single migration
apply_migration() {
    local file="$1"
    local version=$(basename "$file" | cut -d'_' -f1)
    local name=$(basename "$file" .sql | sed 's/^[0-9]*_//')
    local hash=$(checksum "$file")
    
    log_info "Applying migration $version: $name"
    
    # Run migration in transaction
    sqlite3 "$DB_PATH" <<EOF
BEGIN TRANSACTION;
$(cat "$file")
INSERT INTO migrations (version, name, checksum) VALUES ('$version', '$name', '$hash');
COMMIT;
EOF
    
    if [[ $? -eq 0 ]]; then
        log_info "Migration $version applied successfully"
    else
        log_error "Migration $version failed!"
        return 1
    fi
}

# Show migration status
cmd_status() {
    init_db
    echo "Database: $DB_PATH"
    echo ""
    echo "Applied migrations:"
    sqlite3 -header -column "$DB_PATH" "SELECT version, name, applied_at FROM migrations ORDER BY version;"
    echo ""
    echo "Pending migrations:"
    local pending=$(get_pending)
    if [[ -z "$pending" ]]; then
        echo "  (none)"
    else
        for f in $pending; do
            echo "  $(basename "$f")"
        done
    fi
}

# Apply all pending migrations
cmd_up() {
    init_db

    # Safety: take a timestamped backup before applying anything.
    local backup_script="$(dirname "$0")/scripts/backup.sh"
    if [[ -x "$backup_script" ]]; then
        "$backup_script" >/dev/null
    else
        log_warn "Backup script not found/executable at: $backup_script"
    fi

    local pending=$(get_pending)

    if [[ -z "$pending" ]]; then
        log_info "No pending migrations"
        return 0
    fi

    for f in $pending; do
        apply_migration "$f" || return 1
    done

    log_info "All migrations applied"
}

# Show help
cmd_help() {
    echo "Hex Memory Database Migration Tool"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status    Show migration status"
    echo "  up        Apply all pending migrations"
    echo "  help      Show this help"
    echo ""
    echo "Environment:"
    echo "  HEXMEM_DB    Database path (default: ~/clawd/hexmem/hexmem.db)"
}

# Main
case "${1:-up}" in
    status) cmd_status ;;
    up) cmd_up ;;
    help|--help|-h) cmd_help ;;
    *) log_error "Unknown command: $1"; cmd_help; exit 1 ;;
esac
