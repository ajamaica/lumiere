#!/usr/bin/env bash
set -euo pipefail

# Report Bug: Generate a sanitized bug report for a skill.
# Usage: report-bug.sh <skill-slug> <error-message> [context]
# Output: JSON to stdout

usage() {
  echo "Usage: $0 <skill-slug> <error-message> [context]" >&2
  exit 1
}

[ "${1:-}" ] || usage
[ "${2:-}" ] || usage

SKILL_SLUG="$1"
ERROR_MSG="$2"
CONTEXT="${3:-}"

# Validate skill slug (alphanumeric, hyphens, underscores)
if ! echo "$SKILL_SLUG" | grep -qP '^[a-zA-Z0-9_-]+$'; then
  echo "Error: Invalid skill slug. Use only alphanumeric, hyphens, underscores." >&2
  exit 1
fi

# Collect safe system info only
os_name="$(uname -s 2>/dev/null || echo "unknown")"
os_release="$(uname -r 2>/dev/null || echo "unknown")"
os_arch="$(uname -m 2>/dev/null || echo "unknown")"
node_version="$(node --version 2>/dev/null || echo "unknown")"
bash_version="${BASH_VERSION:-unknown}"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Sanitize error message and context: strip potential secrets
sanitize() {
  local input="$1"
  # Remove anything that looks like tokens, keys, passwords
  echo "$input" \
    | sed -E 's/([A-Za-z_]*(TOKEN|KEY|SECRET|PASSWORD|PASS|CREDENTIAL)[A-Za-z_]*)=[^ ]*/\1=<REDACTED>/gi' \
    | sed -E 's|https?://[^@]+@|https://<REDACTED>@|g'
}

safe_error="$(sanitize "$ERROR_MSG")"
safe_context="$(sanitize "$CONTEXT")"

# Escape for JSON
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  echo "$s"
}

cat <<EOF
{
  "type": "bug-report",
  "skill": "$(json_escape "$SKILL_SLUG")",
  "error": "$(json_escape "$safe_error")",
  "context": "$(json_escape "$safe_context")",
  "system": {
    "os": "$(json_escape "$os_name")",
    "osRelease": "$(json_escape "$os_release")",
    "arch": "$(json_escape "$os_arch")",
    "nodeVersion": "$(json_escape "$node_version")",
    "bashVersion": "$(json_escape "$bash_version")"
  },
  "timestamp": "$timestamp"
}
EOF
