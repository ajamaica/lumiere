#!/bin/bash
# Preprocess conversation for reward/accomplishment signals
# Extracts signals about wins, completions, social rewards, etc.

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
AGENT_ID="${AGENT_ID:-main}"
TRANSCRIPT_DIR="$HOME/.openclaw/agents/$AGENT_ID/sessions"
OUTPUT="$WORKSPACE/memory/reward-signals.jsonl"
STATE="$WORKSPACE/memory/reward-state.json"

FULL_MODE=false
if [ "$1" = "--full" ]; then
    FULL_MODE=true
fi

WATERMARK=""
if [ "$FULL_MODE" = false ]; then
    WATERMARK=$(cat "$STATE" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('lastProcessedSignal',''))" 2>/dev/null || echo "")
fi

SESSION_FILE=$(ls -t "$TRANSCRIPT_DIR"/*.jsonl 2>/dev/null | head -1)

if [ -z "$SESSION_FILE" ]; then
    echo "No session transcript found"
    exit 1
fi

echo "Processing: $SESSION_FILE"
echo "Mode: $([ "$FULL_MODE" = true ] && echo 'FULL' || echo 'incremental')"
echo "Watermark: ${WATERMARK:-'(none)'}"

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

# Reward/accomplishment keywords
reward_keywords = [
    # Accomplishment
    'done', 'finished', 'completed', 'built', 'created', 'fixed', 'solved',
    'works', 'working', 'success', 'shipped', 'deployed', 'published',
    # Social
    'thank', 'appreciate', 'love', 'great', 'awesome', 'nice', 'good job',
    'well done', 'proud', 'impressed', 'amazing',
    # Curiosity satisfied
    'learned', 'discovered', 'understand', 'figured', 'realized', 'insight',
    # Connection
    'together', 'we did', 'our', 'team', 'helped', 'support',
    # Creative
    'new', 'idea', 'design', 'invented', 'original', 'creative',
    # Competence
    'mastered', 'expert', 'skilled', 'capable', 'improved', 'better'
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
        
        if watermark and msg_id == watermark:
            found_watermark = True
            continue
        
        if not full_mode and not found_watermark:
            continue
        
        if data.get('type') != 'message':
            continue
        
        msg = data.get('message', {})
        role = msg.get('role', '')
        
        if role not in ['user', 'assistant']:
            continue
        
        content = msg.get('content', [])
        text = ''
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'text':
                    text = item.get('text', '')
                    break
        elif isinstance(content, str):
            text = content
        
        text = text[:800]
        text = re.sub(r'[\x00-\x1f]', ' ', text)
        text = ' '.join(text.split())
        
        if len(text) < 10:
            continue
        
        if text.startswith('System:') and 'Cron:' in text:
            continue
        
        text_lower = text.lower()
        has_reward = any(kw in text_lower for kw in reward_keywords)
        
        # Include user messages + reward-relevant assistant messages
        if role == 'user' or has_reward:
            signals.append({
                'id': msg_id,
                'timestamp': data.get('timestamp', ''),
                'role': role,
                'text': text
            })

with open(output_file, 'w', encoding='utf-8') as f:
    for sig in signals:
        f.write(json.dumps(sig, ensure_ascii=False) + '\n')

print(f'Wrote {len(signals)} reward signals to {output_file}')
"
