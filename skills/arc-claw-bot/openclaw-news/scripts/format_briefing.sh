#!/usr/bin/env bash
# format_briefing.sh — Transform raw_data.json into a clean briefing
#
# Usage:
#   ./format_briefing.sh              # Output to stdout
#   ./format_briefing.sh --save       # Also save to state/briefing.md
#   ./format_briefing.sh --short      # One-paragraph summary

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
STATE_DIR="$SKILL_DIR/state"
RAW_DATA="$STATE_DIR/raw_data.json"
BRIEFING_OUT="$STATE_DIR/briefing.md"

SAVE=false
SHORT=false
for arg in "$@"; do
  case "$arg" in
    --save) SAVE=true ;;
    --short) SHORT=true ;;
  esac
done

if [[ ! -f "$RAW_DATA" ]]; then
  echo "❌ No raw data found. Run collect_news.sh first."
  exit 1
fi

# Generate the briefing via Python
python3 << 'PYEOF'
import json
import sys
from datetime import datetime

raw_path = "$RAW_DATA"
# Re-read with actual path
PYEOF

python3 -c "
import json
from datetime import datetime

with open('$RAW_DATA') as f:
    data = json.load(f)

short_mode = $( $SHORT && echo 'True' || echo 'False' )

collected = data.get('collected_at', 'unknown')
since = data.get('since', 'unknown')
releases = data.get('releases', [])
prs = data.get('pull_requests', [])
skills = data.get('clawhub_skills', [])
security = data.get('security', [])
community = data.get('community', [])
ecosystem = data.get('ecosystem_news', [])
moltbook = data.get('moltbook', [])
errors = data.get('errors', [])

# Format date nicely
try:
    dt = datetime.fromisoformat(collected.replace('Z', '+00:00'))
    date_str = dt.strftime('%b %d, %Y')
except:
    date_str = collected

sections = []
has_content = False

# --- Releases ---
if releases:
    has_content = True
    lines = ['🚀 **RELEASES**']
    for r in releases:
        tag = r.get('tag', '?')
        name = r.get('name', '')
        url = r.get('url', '')
        body = r.get('body', '').strip().split('\n')[0][:120]
        display = name if name and name != tag else tag
        lines.append(f'• {display} — {body}')
        if url:
            lines.append(f'  {url}')
    sections.append('\n'.join(lines))

# --- Important PRs ---
if prs:
    has_content = True
    lines = ['📋 **NOTABLE PRS**']
    for pr in prs[:5]:
        num = pr.get('number', '?')
        title = pr.get('title', '')
        state = pr.get('state', '')
        url = pr.get('url', '')
        merged = '✅ merged' if pr.get('merged') else state
        lines.append(f'• #{num}: {title} ({merged})')
        if url:
            lines.append(f'  {url}')
    sections.append('\n'.join(lines))

# --- ClawdHub Skills ---
if skills:
    has_content = True
    lines = ['🧩 **NEW SKILLS**']
    for s in skills[:8]:
        name = s.get('name', '?')
        raw = s.get('raw', name)
        lines.append(f'• {raw}')
    sections.append('\n'.join(lines))

# --- Security ---
if security:
    has_content = True
    lines = ['🔒 **SECURITY**']
    for s in security:
        num = s.get('number', '?')
        title = s.get('title', '')
        url = s.get('url', '')
        lines.append(f'• #{num}: {title}')
        if url:
            lines.append(f'  {url}')
    sections.append('\n'.join(lines))

# --- Community ---
if community:
    has_content = True
    lines = ['💬 **COMMUNITY**']
    for c in community[:5]:
        if isinstance(c, dict):
            title = c.get('title', '')
            url = c.get('url', '')
            source = c.get('source', '')
            lines.append(f'• {title}' + (f' ({source})' if source else ''))
            if url:
                lines.append(f'  {url}')
        else:
            lines.append(f'• {c}')
    sections.append('\n'.join(lines))

# --- Ecosystem News ---
if ecosystem:
    has_content = True
    lines = ['📰 **ECOSYSTEM**']
    for e in ecosystem[:5]:
        if isinstance(e, dict):
            title = e.get('title', '')
            url = e.get('url', '')
            lines.append(f'• {title}')
            if url:
                lines.append(f'  {url}')
        else:
            lines.append(f'• {e}')
    sections.append('\n'.join(lines))

# --- Moltbook ---
if moltbook:
    has_content = True
    lines = ['🐛 **MOLTBOOK**']
    for m in moltbook[:3]:
        if isinstance(m, dict):
            lines.append(f\"• {m.get('title', m.get('text', str(m)))}\")
        else:
            lines.append(f'• {m}')
    sections.append('\n'.join(lines))

# --- Build final output ---
if short_mode:
    if has_content:
        counts = []
        if releases: counts.append(f'{len(releases)} release(s)')
        if prs: counts.append(f'{len(prs)} notable PR(s)')
        if skills: counts.append(f'{len(skills)} new skill(s)')
        if security: counts.append(f'{len(security)} security item(s)')
        if community: counts.append(f'{len(community)} community thread(s)')
        if ecosystem: counts.append(f'{len(ecosystem)} news article(s)')
        print(f'📡 OpenClaw News ({date_str}): {', '.join(counts)}. Run full briefing for details.')
    else:
        print(f'📡 All quiet in the OpenClaw ecosystem today. ({date_str})')
else:
    header = f'📡 **OpenClaw Ecosystem News** — {date_str}'
    print(header)
    print()
    
    if has_content:
        print('\n\n'.join(sections))
    else:
        print('All quiet today. No new releases, security issues, or notable discussions.')
    
    print()
    
    # Footer
    try:
        since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        since_str = since_dt.strftime('%b %d, %Y %H:%M UTC')
    except:
        since_str = since
    print(f'—')
    print(f'Since: {since_str}')
    print(f'Sources: GitHub, ClawdHub, Brave Search, Moltbook')
    
    if errors:
        print()
        print(f'⚠ {len(errors)} source(s) had issues: {', '.join(e.get('source','?') for e in errors)}')
" | tee "$( $SAVE && echo "$BRIEFING_OUT" || echo '/dev/null' )"

if $SAVE; then
  echo ""
  echo "(Saved to $BRIEFING_OUT)"
fi
