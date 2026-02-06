#!/usr/bin/env bash
# collect_news.sh — Gather OpenClaw ecosystem news from all sources
# Outputs raw JSON to state/raw_data.json for format_briefing.sh to consume
#
# Usage:
#   ./collect_news.sh          # Incremental (since last run)
#   ./collect_news.sh --full   # Full scan (24h lookback, ignore state)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
STATE_DIR="$SKILL_DIR/state"
RAW_OUTPUT="$STATE_DIR/raw_data.json"
LAST_RUN_FILE="$STATE_DIR/last_run.json"

mkdir -p "$STATE_DIR"

# --- Determine time window ---
FULL_SCAN=false
if [[ "${1:-}" == "--full" ]]; then
  FULL_SCAN=true
fi

NOW_EPOCH=$(date +%s)
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEFAULT_LOOKBACK=86400  # 24 hours

if [[ "$FULL_SCAN" == "true" ]] || [[ ! -f "$LAST_RUN_FILE" ]]; then
  SINCE_EPOCH=$((NOW_EPOCH - DEFAULT_LOOKBACK))
else
  SINCE_EPOCH=$(cat "$LAST_RUN_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('epoch', $(($NOW_EPOCH - $DEFAULT_LOOKBACK))))" 2>/dev/null || echo $((NOW_EPOCH - DEFAULT_LOOKBACK)))
fi

SINCE_ISO=$(date -u -r "$SINCE_EPOCH" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "@$SINCE_EPOCH" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
if [[ -z "$SINCE_ISO" ]]; then
  # Fallback for systems where neither -r nor -d works
  SINCE_ISO=$(python3 -c "from datetime import datetime,timezone; print(datetime.fromtimestamp($SINCE_EPOCH, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
fi

echo "📡 Collecting OpenClaw ecosystem news..."
echo "   Since: $SINCE_ISO"
echo "   Mode: $(if $FULL_SCAN; then echo 'full scan'; else echo 'incremental'; fi)"
echo ""

# Initialize output structure
cat > "$RAW_OUTPUT" <<EOF
{
  "collected_at": "$NOW_ISO",
  "since": "$SINCE_ISO",
  "since_epoch": $SINCE_EPOCH,
  "releases": [],
  "pull_requests": [],
  "clawhub_skills": [],
  "security": [],
  "community": [],
  "ecosystem_news": [],
  "moltbook": [],
  "errors": []
}
EOF

# Helper: merge a JSON array into a field of raw_data.json
merge_field() {
  local field="$1"
  local data_file="$2"
  if [[ -f "$data_file" ]] && [[ -s "$data_file" ]]; then
    python3 -c "
import json, sys
with open('$RAW_OUTPUT') as f:
    out = json.load(f)
try:
    with open('$data_file') as f:
        items = json.load(f)
    if isinstance(items, list):
        out['$field'] = items
    else:
        out['$field'] = [items]
except Exception as e:
    out['errors'].append({'source': '$field', 'error': str(e)})
with open('$RAW_OUTPUT', 'w') as f:
    json.dump(out, f, indent=2)
"
  fi
}

# Helper: append an error
add_error() {
  local source="$1"
  local msg="$2"
  python3 -c "
import json
with open('$RAW_OUTPUT') as f:
    out = json.load(f)
out['errors'].append({'source': '$source', 'error': '''$msg'''})
with open('$RAW_OUTPUT', 'w') as f:
    json.dump(out, f, indent=2)
"
}

TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# ============================================================
# 1. GitHub Releases
# ============================================================
echo "🚀 Checking GitHub releases..."
if command -v gh &>/dev/null; then
  gh api repos/openclaw/openclaw/releases \
    --jq "[.[] | select(.published_at >= \"$SINCE_ISO\") | {tag: .tag_name, name: .name, url: .html_url, published: .published_at, body: (.body // \"\" | .[0:300])}]" \
    > "$TMP_DIR/releases.json" 2>/dev/null || echo "[]" > "$TMP_DIR/releases.json"
  merge_field "releases" "$TMP_DIR/releases.json"
  echo "   ✓ Releases checked"
else
  add_error "releases" "gh CLI not installed"
  echo "   ⚠ gh CLI not found, skipping"
fi

# ============================================================
# 2. Important Pull Requests (merged recently)
# ============================================================
echo "📋 Checking recent PRs..."
if command -v gh &>/dev/null; then
  gh api "repos/openclaw/openclaw/pulls?state=all&sort=updated&direction=desc&per_page=20" \
    --jq "[.[] | select(.updated_at >= \"$SINCE_ISO\") | select(.labels | map(.name) | any(test(\"breaking|security|important|highlight\"; \"i\")) or (.title | test(\"breaking|security|major|release\"; \"i\"))) | {number: .number, title: .title, state: .state, url: .html_url, merged: .merged_at, updated: .updated_at, labels: [.labels[].name]}]" \
    > "$TMP_DIR/prs.json" 2>/dev/null || echo "[]" > "$TMP_DIR/prs.json"
  merge_field "pull_requests" "$TMP_DIR/prs.json"
  echo "   ✓ PRs checked"
else
  echo "   ⚠ Skipped (no gh CLI)"
fi

# ============================================================
# 3. ClawdHub Skills
# ============================================================
echo "🧩 Checking ClawdHub for new skills..."
if command -v clawdhub &>/dev/null; then
  # Capture clawdhub explore output and parse it
  clawdhub explore --registry https://www.clawhub.ai 2>/dev/null > "$TMP_DIR/clawhub_raw.txt" || true
  
  # Try to extract skill info from the output
  python3 -c "
import json, re, sys

skills = []
try:
    with open('$TMP_DIR/clawhub_raw.txt') as f:
        content = f.read()
    # Parse whatever format clawdhub outputs — adapt as needed
    # Look for lines with skill names, versions, descriptions
    for line in content.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue
        parts = line.split()
        if len(parts) >= 2:
            skills.append({'name': parts[0], 'raw': line})
except Exception as e:
    pass

with open('$TMP_DIR/clawhub_skills.json', 'w') as f:
    json.dump(skills, f, indent=2)
" 2>/dev/null || echo "[]" > "$TMP_DIR/clawhub_skills.json"
  merge_field "clawhub_skills" "$TMP_DIR/clawhub_skills.json"
  echo "   ✓ ClawdHub checked"
else
  add_error "clawhub_skills" "clawdhub CLI not installed"
  echo "   ⚠ clawdhub CLI not found, skipping"
fi

# ============================================================
# 4. Security Advisories
# ============================================================
echo "🔒 Checking security advisories..."
if command -v gh &>/dev/null; then
  # Check for security-labeled issues
  gh api "repos/openclaw/openclaw/issues?labels=security&state=all&sort=updated&direction=desc&per_page=10" \
    --jq "[.[] | select(.updated_at >= \"$SINCE_ISO\") | {number: .number, title: .title, state: .state, url: .html_url, updated: .updated_at}]" \
    > "$TMP_DIR/security.json" 2>/dev/null || echo "[]" > "$TMP_DIR/security.json"
  merge_field "security" "$TMP_DIR/security.json"
  echo "   ✓ Security advisories checked"
else
  echo "   ⚠ Skipped (no gh CLI)"
fi

# ============================================================
# 5 & 6. Community + Ecosystem News (via Brave Search — agent-assisted)
# ============================================================
# These searches require the agent's web_search tool, so we write
# the queries and let the agent (or format_briefing.sh) handle them.
# The agent should call web_search with these queries and merge results.

echo "💬 Preparing community & ecosystem search queries..."

python3 -c "
import json

queries = {
    'community': [
        'OpenClaw AI agent site:news.ycombinator.com',
        'OpenClaw site:reddit.com',
        'OpenClaw bot agent Twitter'
    ],
    'ecosystem': [
        '\"OpenClaw\" news',
        '\"OpenClaw\" integration announcement',
        'OpenClaw AI agent article'
    ],
    'moltbook': [
        'site:moltbook.com trending'
    ]
}

with open('$TMP_DIR/search_queries.json', 'w') as f:
    json.dump(queries, f, indent=2)
"

cp "$TMP_DIR/search_queries.json" "$STATE_DIR/pending_searches.json"
echo "   ✓ Search queries saved to state/pending_searches.json"
echo "   ℹ Agent should run these via web_search and merge results"

# ============================================================
# Save run state
# ============================================================
cat > "$LAST_RUN_FILE" <<EOF
{
  "epoch": $NOW_EPOCH,
  "iso": "$NOW_ISO",
  "mode": "$(if $FULL_SCAN; then echo 'full'; else echo 'incremental'; fi)"
}
EOF

echo ""
echo "✅ Collection complete. Raw data: $RAW_OUTPUT"
echo "   Run format_briefing.sh to generate the briefing."
echo "   Agent: check state/pending_searches.json for web searches to run."
