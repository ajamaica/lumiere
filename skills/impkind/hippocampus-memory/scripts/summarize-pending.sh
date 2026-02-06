#!/bin/bash
# summarize-pending.sh — Memory summarization (sub-agent task)
#
# Processes pending signals in BATCHES to avoid context overflow.
# Each run processes up to BATCH_SIZE signals, then re-runs if more remain.
#
# Usage: ./summarize-pending.sh [--batch-size N]
#
# Environment:
#   BATCH_SIZE - Signals per batch (default: 30)

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
PENDING_FILE="$WORKSPACE/memory/pending-memories.json"
INDEX_FILE="$WORKSPACE/memory/index.json"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BATCH_SIZE="${BATCH_SIZE:-30}"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --batch-size) BATCH_SIZE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

if [ ! -f "$PENDING_FILE" ]; then
    echo "No pending memories file found. Nothing to summarize."
    exit 0
fi

# Extract batch and prepare for processing
python3 << PYTHON
import json
import os

WORKSPACE = os.environ.get("WORKSPACE", "$WORKSPACE")
PENDING_FILE = "$PENDING_FILE"
INDEX_FILE = "$INDEX_FILE"
BATCH_SIZE = $BATCH_SIZE

with open(PENDING_FILE, 'r') as f:
    data = json.load(f)

pending = data.get("pending", [])
if not pending:
    print("No pending signals.")
    exit(0)

# Get current memory count for next ID
if os.path.exists(INDEX_FILE):
    with open(INDEX_FILE, 'r') as f:
        index = json.load(f)
    next_id = len(index.get("memories", [])) + 1
else:
    next_id = 1

# Filter obvious noise
filtered = []
for p in pending:
    text = p.get("raw_text", "").strip()
    if len(text) < 20:
        continue
    noise = ["HEARTBEAT_OK", "NO_REPLY", "Exec completed", "function_results", 
             "antml:", "sessionId", "Successfully wrote", "Command still running",
             "process still running", "tool:", "status:", "Command exited"]
    if any(n in text for n in noise):
        continue
    filtered.append(p)

total_filtered = len(filtered)
total_batches = (total_filtered + BATCH_SIZE - 1) // BATCH_SIZE

# Sort by importance (high first)
filtered.sort(key=lambda x: x.get("score", 0.5), reverse=True)

# Take current batch
batch = filtered[:BATCH_SIZE]
remaining = filtered[BATCH_SIZE:]

print(f"📊 BATCH PROCESSING")
print(f"   Total signals: {len(pending)} raw → {total_filtered} filtered")
print(f"   This batch: {len(batch)} signals")
print(f"   Remaining: {len(remaining)} signals ({total_batches} total batches)")
print(f"   Next memory ID: mem_{next_id:03d}")
print()
print(f"📁 INDEX_FILE: {INDEX_FILE}")
print(f"📁 PENDING_FILE: {PENDING_FILE}")
print()
print("="*60)
print(f"BATCH SIGNALS ({len(batch)} items, sorted by importance)")
print("="*60)

for i, p in enumerate(batch):
    text = p.get("raw_text", "")[:300].replace('\n', ' ').strip()
    score = p.get("score", 0.5)
    print(f"\n[{i+1}] importance={score:.2f}")
    print(f"{text}")

print()
print("="*60)

# Update pending file with remaining signals
if remaining:
    data["pending"] = remaining
    with open(PENDING_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n⏳ Updated pending file with {len(remaining)} remaining signals")
    print(f"   Run summarize-pending.sh again after this batch to continue")
else:
    print(f"\n✅ This is the FINAL batch - delete pending file after processing")

PYTHON

cat << 'INSTRUCTIONS'

YOUR TASK: Create memory summaries from THIS BATCH of signals.

RULES:
1. Read each signal, extract FACTS worth remembering
2. Create concise summaries (max 80 chars each)
3. Start with "User..." for user facts, "Agent..." for agent facts
4. Skip routine chatter, code output, questions without answers
5. Be SELECTIVE: 3-10 good memories per batch is normal

MEMORY FORMAT:
{
  "id": "mem_NNN",
  "domain": "user|self|relationship|world",
  "category": "preferences|patterns|context|emotions|decisions|facts|work",
  "content": "Concise fact here",
  "importance": 0.7,
  "created": "YYYY-MM-DD",
  "lastAccessed": "YYYY-MM-DD",
  "timesReinforced": 1,
  "keywords": []
}

STEPS:
1. Read INDEX_FILE, add new memories to "memories" array
2. Write updated index back
3. If this was the FINAL batch: delete PENDING_FILE and run sync-core.sh
4. If more batches remain: report what you added, then run this script again

GOOD: "User prefers local solutions" | "Agent fixed encoding bug"
BAD: "User asked about X" | "Agent ran the script"
INSTRUCTIONS
