#!/bin/bash
# encode-pipeline.sh — Hippocampus encoding with sub-agent summarization
#
# Pipeline:
# 1. Preprocess transcript → signals.jsonl
# 2. Score signals using rule-based heuristics
# 3. Write pending signals to pending-memories.json
# 4. Spawn sub-agent for LLM summarization
#
# Usage: ./encode-pipeline.sh [--no-spawn]
#
# Environment:
#   WORKSPACE - OpenClaw workspace (default: ~/.openclaw/workspace)

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIGNALS_FILE="$WORKSPACE/memory/signals.jsonl"
INDEX_FILE="$WORKSPACE/memory/index.json"
PENDING_FILE="$WORKSPACE/memory/pending-memories.json"
NO_SPAWN="${1:-}"

echo "🧠 HIPPOCAMPUS ENCODING PIPELINE"
echo "================================"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Run preprocess
# ═══════════════════════════════════════════════════════════════
echo "📥 Step 1: Preprocessing..."
WORKSPACE="$WORKSPACE" "$SKILL_DIR/scripts/preprocess.sh"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: Check for signals
# ═══════════════════════════════════════════════════════════════
if [ ! -f "$SIGNALS_FILE" ]; then
    echo "❌ No signals file. Done."
    exit 0
fi

SIGNAL_COUNT=$(wc -l < "$SIGNALS_FILE" | tr -d ' ')
echo "📊 Step 2: Found $SIGNAL_COUNT signals"

if [ "$SIGNAL_COUNT" -eq 0 ]; then
    echo "✅ No new signals. Done."
    exit 0
fi

# ═══════════════════════════════════════════════════════════════
# STEP 3: Score and prepare pending memories
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🔄 Step 3: Scoring signals..."

python3 << 'PYTHON'
import json
import os
import re
from datetime import datetime

WORKSPACE = os.environ.get('WORKSPACE', os.path.expanduser('~/.openclaw/workspace'))
SIGNALS_FILE = f"{WORKSPACE}/memory/signals.jsonl"
INDEX_FILE = f"{WORKSPACE}/memory/index.json"
PENDING_FILE = f"{WORKSPACE}/memory/pending-memories.json"

# Load signals
signals = []
with open(SIGNALS_FILE, 'r') as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                signals.append(json.loads(line))
            except:
                pass

# Load index
with open(INDEX_FILE, 'r') as f:
    index = json.load(f)

memories = index.get('memories', [])

# Get next memory ID
max_id = 0
for m in memories:
    try:
        num = int(m['id'].replace('mem_', ''))
        max_id = max(max_id, num)
    except:
        pass

def score_signal(text, role):
    """Rule-based importance scoring"""
    text_lower = text.lower()
    
    # Skip patterns
    skip_patterns = [
        r'^\[?system:',
        r'^heartbeat',
        r'^ok$',
        r'^yes$',
        r'^no$',
        r'^thanks$',
        r'^\[message_id:',
        r'^cron:',
        r'^no_reply$',
    ]
    for pattern in skip_patterns:
        if re.search(pattern, text_lower):
            return 0.0, 'skip'
    
    # High importance (0.85-0.95)
    if any(x in text_lower for x in ['remember this', 'remember that', "don't forget"]):
        return 0.92, 'explicit-remember'
    if any(x in text_lower for x in ['i feel', 'i am worried', 'i am scared', 'i love', 'i hate']):
        return 0.85, 'emotional'
    if any(x in text_lower for x in ['deadline', 'urgent', 'critical', 'important']) and any(y in text_lower for y in ['appointment', 'worried', 'interview', 'tomorrow', 'today']):
        return 0.90, 'deadline-critical'
    
    # Medium-high (0.75-0.84)
    if any(x in text_lower for x in ['i prefer', 'i like', 'i always', 'i never']):
        return 0.80, 'preference'
    if any(x in text_lower for x in ['decided', 'decision', "let's do", "we should"]):
        return 0.75, 'decision'
    if role == 'user' and any(x in text_lower for x in ['thank you', 'good job', 'great work', 'you are']):
        return 0.82, 'relationship'
    
    # Medium (0.60-0.74)
    if len(text) > 200 and role == 'user':
        return 0.70, 'substantial-user-input'
    if any(x in text_lower for x in ['project', 'task', 'working on', 'building']):
        return 0.65, 'project-context'
    
    # Low (skip)
    if len(text) < 30:
        return 0.0, 'too-short'
    
    # Default for longer messages
    if len(text) > 50:
        return 0.55, 'general'
    
    return 0.0, 'skip'

def is_similar(text, memories):
    """Check if similar memory exists"""
    text_lower = text.lower()
    text_words = set(text_lower.split())
    
    for mem in memories:
        mem_words = set(mem['content'].lower().split())
        intersection = len(text_words & mem_words)
        union = len(text_words | mem_words)
        if union > 0 and intersection / union > 0.6:
            return mem['id']
    return None

def categorize(text):
    """Determine domain and category"""
    text_lower = text.lower()
    
    if any(x in text_lower for x in ['i prefer', 'i like', 'i always', 'i never', 'i want']):
        return 'user', 'preferences'
    if any(x in text_lower for x in ['appointment', 'deadline', 'schedule', 'calendar']):
        return 'user', 'context'
    if any(x in text_lower for x in ['you are', 'good job', 'great job', 'thank you']):
        return 'relationship', 'feedback'
    if any(x in text_lower for x in ['project', 'task', 'working', 'building', 'cron']):
        return 'world', 'projects'
    if any(x in text_lower for x in ['i am', 'my fear', 'i believe', 'i want to']):
        return 'self', 'identity'
    
    return 'user', 'context'

# Process signals
pending = []
reinforced = []
skipped = 0
today = datetime.now().strftime('%Y-%m-%d')

for sig in signals:
    text = sig.get('text', '')
    role = sig.get('role', 'user')
    sig_id = sig.get('id', '')
    
    score, reason = score_signal(text, role)
    
    if score < 0.5:
        skipped += 1
        continue
    
    # Check for similar existing memory
    similar_id = is_similar(text, memories)
    if similar_id:
        for mem in memories:
            if mem['id'] == similar_id:
                old_imp = mem['importance']
                mem['importance'] = old_imp + (1 - old_imp) * 0.1
                mem['lastAccessed'] = today
                mem['timesReinforced'] = mem.get('timesReinforced', 1) + 1
                reinforced.append((similar_id, old_imp, mem['importance']))
                break
        continue
    
    # Add to pending for summarization
    max_id += 1
    domain, category = categorize(text)
    
    pending.append({
        "id": f"mem_{max_id:03d}",
        "raw_text": text[:800],  # Limit size
        "role": role,
        "score": round(score, 2),
        "reason": reason,
        "domain": domain,
        "category": category,
        "created": today
    })

# Update watermark in index (use timestamp for cross-session tracking)
if signals:
    last_ts = signals[-1].get('timestamp', '')
    if last_ts:
        index['lastProcessedTimestamp'] = last_ts
        # Remove old message ID watermark if present
        index.pop('lastProcessedMessageId', None)

# Save reinforced memories
index['lastUpdated'] = datetime.now().isoformat()
index['memories'] = memories
with open(INDEX_FILE, 'w') as f:
    json.dump(index, f, indent=2)

# Save pending for sub-agent
with open(PENDING_FILE, 'w') as f:
    json.dump({"pending": pending, "created": today}, f, indent=2)

# Report
print(f"   Pending for summarization: {len(pending)}")
print(f"   Reinforced: {len(reinforced)}")
for mid, old, new in reinforced[:3]:
    print(f"      ↑ {mid}: {old:.2f} → {new:.2f}")
print(f"   Skipped: {skipped}")
print(f"   Total existing: {len(memories)}")
PYTHON

# Check if we have pending memories
PENDING_COUNT=$(python3 -c "import json; d=json.load(open('$PENDING_FILE')); print(len(d.get('pending',[])))" 2>/dev/null || echo "0")

if [ "$PENDING_COUNT" -eq 0 ]; then
    echo ""
    echo "✅ No new memories to summarize. Done."
    # Sync core anyway
    WORKSPACE="$WORKSPACE" "$SKILL_DIR/scripts/sync-core.sh"
    exit 0
fi

echo ""
echo "📝 $PENDING_COUNT memories pending summarization"

if [ "$NO_SPAWN" = "--no-spawn" ]; then
    echo "⏭️  Skipping spawn (--no-spawn flag)"
    exit 0
fi

echo ""
echo "✅ Pipeline phase 1 complete. Sub-agent will handle summarization."
echo ""
echo "To complete manually, run:"
echo "  openclaw sessions:spawn --task 'Run ~/.openclaw/workspace/skills/hippocampus/scripts/summarize-pending.sh'"

# Regenerate brain dashboard
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -x "$SCRIPT_DIR/generate-dashboard.sh" ] && "$SCRIPT_DIR/generate-dashboard.sh" 2>/dev/null || true
