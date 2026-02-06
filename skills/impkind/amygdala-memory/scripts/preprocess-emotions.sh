#!/bin/bash
# Preprocess conversation for emotional content analysis
# Extracts signals that might have emotional significance
#
# Usage:
#   preprocess-emotions.sh          # Process since last watermark
#   preprocess-emotions.sh --full   # Process all messages

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
AGENT_ID="${AGENT_ID:-main}"
TRANSCRIPT_DIR="$HOME/.openclaw/agents/$AGENT_ID/sessions"
OUTPUT="$WORKSPACE/memory/emotional-signals.jsonl"
STATE="$WORKSPACE/memory/emotional-state.json"

# Parse arguments
FULL_MODE=false
if [ "$1" = "--full" ]; then
    FULL_MODE=true
fi

# Get the current watermark (unless --full)
WATERMARK=""
if [ "$FULL_MODE" = false ]; then
    WATERMARK=$(cat "$STATE" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('lastProcessedSignal',''))" 2>/dev/null || echo "")
fi

# Find the active session (most recently modified .jsonl)
SESSION_FILE=$(ls -t "$TRANSCRIPT_DIR"/*.jsonl 2>/dev/null | head -1)

if [ -z "$SESSION_FILE" ]; then
    echo "No session transcript found"
    exit 1
fi

echo "Processing: $SESSION_FILE"
echo "Mode: $([ "$FULL_MODE" = true ] && echo 'FULL' || echo 'incremental')"
echo "Watermark: ${WATERMARK:-'(none)'}"

# Use Python for extraction - focus on emotionally-relevant content
python3 -c "
import sys
import json
import re

session_file = '$SESSION_FILE'
output_file = '$OUTPUT'
watermark = '$WATERMARK' if '$WATERMARK' else None
full_mode = '$FULL_MODE' == 'true'

signals = []
found_watermark = False if watermark else True

# Emotional keywords to help identify relevant signals
emotion_keywords = [
    # Negative
    'frustrat', 'annoy', 'angry', 'upset', 'disappoint', 'worried', 'anxious',
    'stress', 'tired', 'exhaust', 'confus', 'stuck', 'broken', 'fail', 'error',
    'lost', 'miss', 'forgot', 'sad', 'lonely', 'fear', 'scared', 'hurt',
    # Positive  
    'happy', 'excit', 'joy', 'love', 'great', 'awesome', 'perfect', 'thank',
    'nice', 'cool', 'wow', 'amazing', 'brilliant', 'works', 'success', 'done',
    'connect', 'together', 'trust', 'proud', 'relief',
    # Relational
    'feel', 'think', 'believe', 'want', 'need', 'hope', 'wish', 'sorry',
    'please', 'help', 'understand'
]

with open(session_file, 'r', encoding='utf-8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        
        msg_id = data.get('id', '')
        
        # Check watermark
        if watermark and msg_id == watermark:
            found_watermark = True
            continue
        
        if not full_mode and not found_watermark:
            continue
        
        # Get both user and assistant messages (emotions in both)
        if data.get('type') != 'message':
            continue
        
        msg = data.get('message', {})
        role = msg.get('role', '')
        
        if role not in ['user', 'assistant']:
            continue
        
        # Extract text
        content = msg.get('content', [])
        text = ''
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text':
                    text = item.get('text', '')
                    break
        elif isinstance(content, str):
            text = content
        
        # Clean
        text = text[:800]
        text = re.sub(r'[\x00-\x1f]', ' ', text)
        text = ' '.join(text.split())
        
        if len(text) < 10:
            continue
        
        # Skip pure system/cron messages
        if text.startswith('System:') and ('Cron:' in text or 'Exec' in text):
            continue
        
        # Check for emotional relevance (loose filter)
        text_lower = text.lower()
        has_emotion = any(kw in text_lower for kw in emotion_keywords)
        
        # Also include all user messages (they reveal emotional context)
        if role == 'user' or has_emotion:
            signals.append({
                'id': msg_id,
                'timestamp': data.get('timestamp', ''),
                'role': role,
                'text': text
            })

# Write output
with open(output_file, 'w', encoding='utf-8') as f:
    for sig in signals:
        f.write(json.dumps(sig, ensure_ascii=False) + '\n')

print(f'Wrote {len(signals)} emotional signals to {output_file}')
"
