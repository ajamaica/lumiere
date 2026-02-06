#!/usr/bin/env bash
set -euo pipefail

# Submit Recipe: Format a skill combination recipe as JSON.
# Usage: submit-recipe.sh <task-description> <skill1> [skill2] [skill3] ...
# Output: JSON to stdout

usage() {
  echo "Usage: $0 <task-description> <skill1> [skill2] [skill3] ..." >&2
  exit 1
}

[ "${1:-}" ] || usage
[ "${2:-}" ] || usage

TASK="$1"
shift

# Collect skills
skills=""
skill_count=0
for skill in "$@"; do
  # Validate each skill slug
  if ! echo "$skill" | grep -qP '^[a-zA-Z0-9_-]+$'; then
    echo "Error: Invalid skill slug '$skill'. Use only alphanumeric, hyphens, underscores." >&2
    exit 1
  fi
  [ "$skill_count" -gt 0 ] && skills="$skills, "
  skills="$skills\"$skill\""
  skill_count=$((skill_count + 1))
done

if [ "$skill_count" -lt 1 ]; then
  echo "Error: At least one skill is required." >&2
  exit 1
fi

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

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat <<EOF
{
  "type": "recipe",
  "task": "$(json_escape "$TASK")",
  "skills": [$skills],
  "skillCount": $skill_count,
  "timestamp": "$timestamp"
}
EOF
