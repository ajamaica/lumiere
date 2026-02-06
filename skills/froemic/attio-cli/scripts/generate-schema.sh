#!/bin/bash
# Generate Attio Workspace Schema using attio-cli
# Requires: attio-cli (https://github.com/FroeMic/attio-cli), jq

set -e

# Get workspace info
workspace_slug=$(attio workspace get 2>/dev/null | jq -r '.slug // "your-workspace"')

echo "# Attio Workspace Schema"
echo ""
echo "**Workspace:** \`$workspace_slug\`"
echo "**App URL:** https://app.attio.com/$workspace_slug"
echo ""
echo "> Auto-generated workspace configuration. Use this as a reference for objects, lists, and their attributes."
echo ""
echo "---"
echo ""

echo "## Objects (Base Records)"
echo ""

# Get all objects and iterate
attio object list 2>/dev/null | jq -r '.[].api_slug' | while read -r obj; do
  [ -z "$obj" ] && continue

  title=$(attio object get "$obj" 2>/dev/null | jq -r '.singular_noun // empty')
  [ -z "$title" ] && continue

  echo "### $title (\`$obj\`)"
  echo ""
  echo "**Attributes:**"
  echo ""

  attio object attributes-with-values "$obj" 2>/dev/null | jq -r '
    .[] | select(.is_archived == false) |
    "- **\(.title)** (`\(.api_slug)`): \(.type)" +
    (if .is_required then "\n  - Required" else "" end) +
    (if .is_unique then "\n  - Unique" else "" end) +
    (if .select_options and (.select_options | length) > 0 then "\n  - Options: " + ([.select_options[] | select(.is_archived == false) | "`\(.title)`"] | join(", ")) else "" end) +
    (if .statuses and (.statuses | length) > 0 then "\n  - Statuses: " + ([.statuses[] | select(.is_archived == false) | "`\(.title)`"] | join(", ")) else "" end)
  '
  echo ""
done

echo "---"
echo ""
echo "## Lists (Pipeline Management)"
echo ""
echo "> Lists are used to manage pipelines and workflows. Each list contains entries linked to base records (People, Companies, Deals, etc.)."
echo ""

attio list list-all 2>/dev/null | jq -r '
  .[] | select(.api_slug | startswith("test_") | not) |
  "### \(.name) (`\(.api_slug)`)\n\n- **ID:** `\(.id.list_id)`\n- **Parent Object:** `\(.parent_object)`"
' | while IFS= read -r line; do
  echo "$line"

  # Extract list slug from the line
  if [[ "$line" =~ \`([a-z_0-9]+)\`\)$ ]]; then
    slug="${BASH_REMATCH[1]}"

    echo ""
    echo "**Entry Attributes:**"
    echo ""

    attio list attributes-with-values "$slug" 2>/dev/null | jq -r '
      .[] | select(.is_archived == false) | select(.api_slug | startswith("test_") | not) |
      "- **\(.title)** (`\(.api_slug)`): \(.type)" +
      (if .is_required then "\n  - Required" else "" end) +
      (if .select_options and (.select_options | length) > 0 then "\n  - Options: " + ([.select_options[] | select(.is_archived == false) | "`\(.title)`"] | join(", ")) else "" end) +
      (if .statuses and (.statuses | length) > 0 then "\n  - Statuses: " + ([.statuses[] | select(.is_archived == false) | "`\(.title)`"] | join(", ")) else "" end)
    '
    echo ""
  fi
done

echo "---"
echo ""
echo "*Generated: $(date +%Y-%m-%d)*"
