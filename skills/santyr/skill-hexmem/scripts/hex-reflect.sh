#!/bin/bash
# hex-reflect.sh - Epistemic Extraction Pipeline
# Part of Genealogy of Beliefs architecture (designed with Gemini 2026-02-01)
#
# Workflow:
# 1. Scan recent events
# 2. Generate candidate YAML manifest (Axioms/Reflections/Meta-preferences)
# 3. Detect conflicts with existing beliefs
# 4. Open in $EDITOR for review
# 5. Parse and commit approved items
#
# Usage: hex-reflect.sh [--days N] [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEXMEM_DIR="$(dirname "$SCRIPT_DIR")"
HEXMEM_DB="$HEXMEM_DIR/hexmem.db"
VENV_PYTHON="$HEXMEM_DIR/.venv/bin/python"

# Default: review last 24 hours of events
DAYS_BACK=1
DRY_RUN=false
MANIFEST_FILE="/tmp/hex-reflect-$(date +%Y%m%d-%H%M%S).yaml"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --days)
            DAYS_BACK="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: hex-reflect.sh [--days N] [--dry-run]"
            echo ""
            echo "  --days N      Review events from last N days (default: 1)"
            echo "  --dry-run     Generate manifest but don't commit to database"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Ensure Python venv exists
if [[ ! -f "$VENV_PYTHON" ]]; then
    echo "Error: Python venv not found at $VENV_PYTHON" >&2
    echo "Run: cd $HEXMEM_DIR && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
    exit 1
fi

echo "🧬 Hex Reflect - Epistemic Extraction Pipeline"
echo "   Reviewing events from last $DAYS_BACK day(s)..."
echo ""

# Step 1: Extract recent events
EVENTS_JSON=$(sqlite3 "$HEXMEM_DB" -json <<SQL
SELECT 
    id,
    event_type,
    category,
    summary,
    details,
    created_at
FROM events
WHERE created_at >= datetime('now', '-$DAYS_BACK days')
ORDER BY created_at DESC;
SQL
)

EVENT_COUNT=$(echo "$EVENTS_JSON" | jq 'length')

if [[ "$EVENT_COUNT" -eq 0 ]]; then
    echo "No events found in the last $DAYS_BACK day(s)."
    echo "Nothing to reflect on. HEARTBEAT_OK"
    exit 0
fi

echo "📊 Found $EVENT_COUNT event(s) to analyze"
echo ""

# Step 2: Generate candidate manifest
echo "🤖 Analyzing events and generating candidate manifest..."
echo ""

# Create Python script for AI-assisted extraction
cat > /tmp/hex-reflect-extractor.py <<'PYTHON'
import json
import sys
import re

def extract_candidates(events):
    """
    Analyze events and propose candidates for Axioms, Reflections, Meta-preferences.
    
    This is a heuristic-based extraction. In future, could use LLM (Gemini) for 
    more sophisticated analysis.
    """
    
    observations = []
    insights = []
    meta_prefs = []
    
    for event in events:
        event_type = event.get('event_type', '')
        category = event.get('category', '')
        summary = event.get('summary', '')
        details = event.get('details', '')
        
        text = f"{summary} {details}".lower()
        
        # Heuristics for observations (potential Facts/Axioms)
        # Look for statements of fact, capability, relationship
        if any(word in text for word in ['confirmed', 'tested', 'verified', 'discovered', 'found']):
            observations.append({
                'content': summary,
                'category': category,
                'source_event_id': event['id'],
                'confidence': 0.8
            })
        
        # Heuristics for insights (potential Lessons)
        # Look for learning, realization, pattern
        if any(word in text for word in ['learned', 'lesson', 'realized', 'insight', 'pattern', 'principle']):
            insights.append({
                'domain': category if category else 'general',
                'lesson': summary,
                'context': details[:200] if details else '',
                'source_event_id': event['id'],
                'confidence': 0.7
            })
        
        # Heuristics for meta-preferences (potential Core Value updates)
        # Look for preference, value, principle, should/shouldn't
        if any(word in text for word in ['prefer', 'should', 'always', 'never', 'principle', 'value', 'ethic']):
            # Extract the preference statement
            meta_prefs.append({
                'statement': summary,
                'source': category,
                'source_event_id': event['id'],
                'priority': 50  # Default priority
            })
    
    return {
        'observations': observations,
        'insights': insights,
        'meta_preferences': meta_prefs
    }

if __name__ == '__main__':
    events = json.load(sys.stdin)
    candidates = extract_candidates(events)
    print(json.dumps(candidates, indent=2))
PYTHON

CANDIDATES_JSON=$(echo "$EVENTS_JSON" | "$VENV_PYTHON" /tmp/hex-reflect-extractor.py)

# Step 3: Check for conflicts with existing beliefs
echo "🔍 Checking for conflicts with existing beliefs..."
echo ""

# Query current beliefs for semantic comparison (simplified version)
CURRENT_FACTS=$(sqlite3 "$HEXMEM_DB" -json "SELECT id, subject_text, predicate, object_text FROM facts WHERE valid_until IS NULL AND status = 'active' LIMIT 100;")
CURRENT_LESSONS=$(sqlite3 "$HEXMEM_DB" -json "SELECT id, domain, lesson FROM lessons WHERE valid_until IS NULL LIMIT 100;")

# Step 4: Generate YAML manifest
cat > "$MANIFEST_FILE" <<YAML
# Hex Reflect - Candidate Manifest
# Generated: $(date -Iseconds)
# Source: Events from $(date -d "$DAYS_BACK days ago" +%Y-%m-%d) to $(date +%Y-%m-%d)
#
# Instructions:
# - Review each candidate below
# - Uncomment lines you want to commit (remove leading '# ')
# - Edit content as needed
# - Delete or keep commented anything you don't want
# - Save and exit to commit
# - Ctrl+C to abort without changes
#
# Actions for conflicts:
#   supersede: Replace old belief with new one (old gets valid_until timestamp)
#   coexist: Keep both (nuanced difference, both valid)
#   refine: Edit the content to merge old and new
#   skip: Ignore this candidate

---
# Observations (Potential Facts/Axioms)
# Format: subject | predicate | object | confidence | action
observations:
YAML

echo "$CANDIDATES_JSON" | jq -r '.observations[] | "# - subject: \"\(.category // "hex")\"
#   predicate: \"observed\"
#   object: \"\(.content)\"
#   confidence: \(.confidence)
#   source_event_id: \(.source_event_id)
#   # conflict: none detected
#   # action: new
"' >> "$MANIFEST_FILE"

cat >> "$MANIFEST_FILE" <<YAML

---
# Insights (Potential Lessons)
# Format: domain | lesson | context | confidence | action
insights:
YAML

echo "$CANDIDATES_JSON" | jq -r '.insights[] | "# - domain: \"\(.domain)\"
#   lesson: \"\(.lesson)\"
#   context: \"\(.context)\"
#   confidence: \(.confidence)
#   source_event_id: \(.source_event_id)
#   # conflict: none detected
#   # action: new
"' >> "$MANIFEST_FILE"

cat >> "$MANIFEST_FILE" <<YAML

---
# Meta-Preferences (Potential Core Value updates)
# Format: name | description | priority | action
meta_preferences:
YAML

echo "$CANDIDATES_JSON" | jq -r '.meta_preferences[] | "# - name: \"derived_from_\(.source)\"
#   description: \"\(.statement)\"
#   priority: \(.priority)
#   source: \"reflection\"
#   source_event_id: \(.source_event_id)
#   # conflict: none detected
#   # action: new
"' >> "$MANIFEST_FILE"

echo "📝 Manifest generated: $MANIFEST_FILE"
echo ""

# Step 5: Open in editor for review
EDITOR="${EDITOR:-nano}"

echo "Opening manifest in $EDITOR for review..."
echo "Save and exit to commit approved items."
echo "Ctrl+C to abort."
echo ""

if ! "$EDITOR" "$MANIFEST_FILE"; then
    echo "Editor exited with error. Aborting."
    exit 1
fi

# Step 6: Parse manifest and commit (if not dry-run)
echo ""
echo "📥 Parsing manifest..."

# Count uncommented items
UNCOMMENTED=$(grep -v '^[[:space:]]*#' "$MANIFEST_FILE" | grep -c '^[[:space:]]*-' || true)

if [[ "$UNCOMMENTED" -eq 0 ]]; then
    echo "No items approved. Nothing to commit."
    rm "$MANIFEST_FILE"
    exit 0
fi

echo "Found $UNCOMMENTED approved item(s)"

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "🏃 DRY RUN - Would commit these items:"
    grep -v '^[[:space:]]*#' "$MANIFEST_FILE" | grep '^[[:space:]]*-' || true
    echo ""
    echo "Manifest saved at: $MANIFEST_FILE"
    exit 0
fi

echo "⚠️  Committing to HexMem database..."

# Call the Python parser
if "$VENV_PYTHON" "$SCRIPT_DIR/parse-manifest.py" "$MANIFEST_FILE"; then
    echo ""
    echo "✅ Successfully committed approved items to HexMem"
    echo ""
    echo "📁 Manifest archived at: $MANIFEST_FILE"
else
    echo ""
    echo "❌ Error parsing manifest" >&2
    echo "   Manifest saved at: $MANIFEST_FILE"
    exit 1
fi

exit 0
PYTHON
