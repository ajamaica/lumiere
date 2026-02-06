#!/bin/bash
# Preprocess ALL session transcripts into clean signals for hippocampus
# Uses datetime watermark to track progress across session files
#
# Usage:
#   preprocess.sh                    # Process messages after watermark
#   preprocess.sh --full             # Process ALL messages (ignore watermark)
#   preprocess.sh --limit N          # Limit to last N signals
#
# Environment:
#   WORKSPACE - OpenClaw workspace directory (default: ~/.openclaw/workspace)
#   AGENT_ID - Agent ID for transcript lookup (default: main)

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
AGENT_ID="${AGENT_ID:-main}"
TRANSCRIPT_DIR="$HOME/.openclaw/agents/$AGENT_ID/sessions"
OUTPUT="$WORKSPACE/memory/signals.jsonl"
INDEX="$WORKSPACE/memory/index.json"

# Parse arguments
FULL_MODE=false
LIMIT=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_MODE=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Count session files
SESSION_COUNT=$(ls "$TRANSCRIPT_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' ')
if [ "$SESSION_COUNT" -eq 0 ]; then
    echo "No session transcripts found in $TRANSCRIPT_DIR"
    exit 1
fi

echo "Processing: $SESSION_COUNT session files in $TRANSCRIPT_DIR"
echo "Mode: $([ "$FULL_MODE" = true ] && echo 'FULL (all messages)' || echo 'incremental')"

# Export variables for Python
export TRANSCRIPT_DIR OUTPUT INDEX FULL_MODE LIMIT

# Use Python for robust multi-file JSON parsing
python3 << 'PYTHON_SCRIPT'
import os
import sys
import json
import re
from datetime import datetime
from glob import glob

transcript_dir = os.environ.get('TRANSCRIPT_DIR', '')
output_file = os.environ.get('OUTPUT', '')
index_file = os.environ.get('INDEX', '')
full_mode = os.environ.get('FULL_MODE', 'false') == 'true'
limit_str = os.environ.get('LIMIT', '')
limit = int(limit_str) if limit_str and limit_str.isdigit() else None

# Get watermark timestamp from index
watermark_ts = None
if not full_mode and os.path.exists(index_file):
    try:
        with open(index_file, 'r') as f:
            index_data = json.load(f)
        # Support both old (lastProcessedMessageId) and new (lastProcessedTimestamp) formats
        watermark = index_data.get('lastProcessedTimestamp') or index_data.get('lastProcessedMessageId')
        if watermark:
            # If it looks like a timestamp, use it
            if 'T' in str(watermark) or '-' in str(watermark):
                try:
                    watermark_ts = datetime.fromisoformat(watermark.replace('Z', '+00:00'))
                    print(f"Watermark: {watermark}")
                except:
                    print(f"Watermark: (invalid timestamp, ignoring)")
            else:
                # Old message ID format - can't use it, start fresh
                print(f"Watermark: (legacy message ID, starting fresh)")
    except:
        pass

if watermark_ts is None and not full_mode:
    print("Watermark: (none)")

if limit:
    print(f"Limit: last {limit} signals")

# Collect all messages from all sessions
all_messages = []
session_files = glob(os.path.join(transcript_dir, '*.jsonl'))

for session_file in session_files:
    try:
        with open(session_file, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                
                # Only process message types
                if data.get('type') != 'message':
                    continue
                
                msg = data.get('message', {})
                role = msg.get('role', '')
                if role not in ('user', 'assistant'):
                    continue
                
                # Parse timestamp
                ts_str = data.get('timestamp', '')
                if not ts_str:
                    continue
                
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                except:
                    continue
                
                # Filter by watermark (unless full mode)
                if not full_mode and watermark_ts and ts <= watermark_ts:
                    continue
                
                # Extract text content
                content = msg.get('content', [])
                text = ''
                if isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get('type') == 'text':
                            text = item.get('text', '')
                            break
                elif isinstance(content, str):
                    text = content
                
                # Clean up text
                text = text[:500]  # Limit length
                text = re.sub(r'[\x00-\x1f]', ' ', text)  # Remove control chars
                text = re.sub(r'<file[^>]*>.*?</file>', '', text, flags=re.DOTALL)
                text = re.sub(r'<file[^>]*>[^<]*', '', text)
                text = re.sub(r'<media:[^>]*>', '', text)
                text = re.sub(r'\[Audio\]', '', text)
                text = re.sub(r'Transcript:', '', text)
                text = re.sub(r'[^\x20-\x7E\u00A0-\uFFFF]', '', text)
                text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf]+', '', text)  # Remove CJK garbage
                text = re.sub(r'\[Telegram[^\]]*\]', '', text)
                text = re.sub(r'\[message_id:[^\]]*\]', '', text)
                text = ' '.join(text.split())  # Normalize whitespace
                
                # Skip empty, short, or JSON-looking messages
                if len(text) < 10 or text.startswith('{'):
                    continue
                
                # Skip mostly non-ASCII
                ascii_ratio = sum(1 for c in text if ord(c) < 128) / max(len(text), 1)
                if ascii_ratio < 0.7:
                    continue
                
                # Skip system cron messages
                if text.startswith('System:') and 'Cron:' in text:
                    continue
                
                # Skip media attachment messages
                if '[media attached:' in text or 'To send an image back' in text:
                    continue
                
                # Skip file path messages
                if '/Users/' in text and ('/.openclaw/' in text or '/media/' in text):
                    continue
                
                all_messages.append({
                    'id': data.get('id', ''),
                    'timestamp': ts_str,
                    'ts_parsed': ts,
                    'role': role,
                    'text': text
                })
    except Exception as e:
        # Skip problematic files
        continue

# Sort by timestamp
all_messages.sort(key=lambda x: x['ts_parsed'])

# Apply limit (take last N)
if limit and len(all_messages) > limit:
    all_messages = all_messages[-limit:]

# Write output (without ts_parsed helper field)
with open(output_file, 'w', encoding='utf-8') as f:
    for msg in all_messages:
        output_msg = {
            'id': msg['id'],
            'timestamp': msg['timestamp'],
            'role': msg['role'],
            'text': msg['text']
        }
        f.write(json.dumps(output_msg, ensure_ascii=False) + '\n')

print(f"Wrote {len(all_messages)} signals to {output_file}")

# Report the latest timestamp for reference
if all_messages:
    latest = all_messages[-1]['timestamp']
    print(f"Latest signal: {latest}")
PYTHON_SCRIPT
