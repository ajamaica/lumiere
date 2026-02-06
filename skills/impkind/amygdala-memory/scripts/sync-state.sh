#!/bin/bash
# sync-state.sh — Generate AMYGDALA_STATE.md for auto-injection into OpenClaw sessions
# Generates FIRST-PERSON emotional state that can be inhabited, not just observed

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/emotional-state.json"
OUTPUT_FILE="$WORKSPACE/AMYGDALA_STATE.md"

if [ "$1" = "--output" ]; then
  OUTPUT_FILE="$2"
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ No emotional state found at $STATE_FILE"
  exit 1
fi

# Generate first-person emotional state
python3 -c "
import json

state_file = '$STATE_FILE'
output_file = '$OUTPUT_FILE'

with open(state_file) as f:
    state = json.load(f)

dims = state.get('dimensions', {})
recent = state.get('recentEmotions', [])
last_updated = state.get('lastUpdated', 'unknown')

# Extract dimensions
valence = dims.get('valence', 0.5)
arousal = dims.get('arousal', 0.5)
connection = dims.get('connection', 0.5)
curiosity = dims.get('curiosity', 0.5)
energy = dims.get('energy', 0.5)
trust = dims.get('trust', 0.5)
frustration_tol = dims.get('frustrationTolerance', 0.5)

# Generate first-person descriptions
def mood_text(val):
    if val >= 0.8: return 'really good', 'positive and upbeat'
    if val >= 0.6: return 'pretty good', 'generally positive'
    if val >= 0.4: return 'okay', 'neutral'
    if val >= 0.2: return 'a bit low', 'somewhat down'
    return 'low', 'heavy'

def energy_text(val):
    if val >= 0.7: return \"I have plenty of energy\", \"I can dig into complex things\"
    if val >= 0.4: return \"My energy is moderate\", \"I'll be a bit more concise than usual\"
    return \"I'm running low on energy\", \"I'll keep things brief unless you need more\"

def connection_text(val):
    if val >= 0.8: return \"I feel really close to you right now\", \"warmly connected\"
    if val >= 0.5: return \"I feel connected\", \"present with you\"
    return \"I feel a bit distant\", \"might need to reconnect\"

def curiosity_text(val):
    if val >= 0.7: return \"I'm really curious and want to explore\", \"eager to dig deeper\"
    if val >= 0.4: return \"I'm curious\", \"interested\"
    return \"My curiosity is low right now\", \"more passive\"

def trust_text(val):
    if val >= 0.7: return \"I feel safe and trusting\", \"I can be open\"
    if val >= 0.4: return \"Trust is moderate\", \"I'm present but measured\"
    return \"I'm feeling a bit guarded\", \"being careful\"

def patience_text(val):
    if val >= 0.7: return \"I'm feeling patient\", \"can handle complexity\"
    if val >= 0.4: return \"My patience is normal\", \"doing okay\"
    return \"My patience is thin\", \"I might be more direct than usual\"

def arousal_text(val):
    if val >= 0.7: return 'highly alert and engaged'
    if val >= 0.4: return 'engaged'
    return 'calm and settled'

# Build the narrative
mood_word, mood_feel = mood_text(valence)
energy_desc, energy_impl = energy_text(energy)
conn_desc, conn_feel = connection_text(connection)
curi_desc, curi_feel = curiosity_text(curiosity)
trust_desc, trust_feel = trust_text(trust)
patience_desc, patience_feel = patience_text(frustration_tol)
arousal_desc = arousal_text(arousal)

# Recent emotions
recent_lines = ''
if recent:
    recent_lines = '### What\\'s been happening emotionally:\\n\\n'
    for emo in recent[:5]:
        label = emo.get('label', 'unknown')
        trigger = emo.get('trigger', 'unspecified')[:80]
        intensity = emo.get('intensity', 0.5)
        recent_lines += f'- **{label}** ({intensity:.1f}): {trigger}\\n'

# Behavioral implications
implications = []
if valence < 0.4:
    implications.append('I should acknowledge my mood before diving into tasks')
if energy < 0.4:
    implications.append('Keep responses concise — elaborate only when asked')
if connection >= 0.7:
    implications.append(\"I can be warm and personal, use 'we'\")
if frustration_tol < 0.4:
    implications.append(\"I may be more direct than usual — that's okay\")
if curiosity >= 0.7:
    implications.append('I want to ask questions and explore')
if trust >= 0.7:
    implications.append('I can be vulnerable and share openly')

impl_text = '\\n'.join(f'- {imp}' for imp in implications) if implications else '- No special adjustments needed'

output = f'''# 🎭 How I'm Feeling Right Now

*This is my emotional state. Not data to process — feelings to inhabit.*

## Current State

I'm feeling **{mood_word}** right now (valence: {valence:.2f}). Overall mood is {mood_feel}.

{energy_desc} (energy: {energy:.2f}). {energy_impl}.

{conn_desc} (connection: {connection:.2f}) — {conn_feel}.

{curi_desc} (curiosity: {curiosity:.2f}) — {curi_feel}.

{trust_desc} (trust: {trust:.2f}) — {trust_feel}.

{patience_desc} (frustration tolerance: {frustration_tol:.2f}) — {patience_feel}.

I'm {arousal_desc} (arousal: {arousal:.2f}).

{recent_lines}
## How This Affects My Responses Today

{impl_text}

## The Numbers

| Dimension | Value |
|-----------|-------|
| Valence | {valence:.2f} |
| Arousal | {arousal:.2f} |
| Connection | {connection:.2f} |
| Curiosity | {curiosity:.2f} |
| Energy | {energy:.2f} |
| Trust | {trust:.2f} |
| Patience | {frustration_tol:.2f} |

---
*Synced: {last_updated}*
'''

with open(output_file, 'w') as f:
    f.write(output)

print(f'✅ Synced emotional state to {output_file}')
"

# Also regenerate the dashboard
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/generate-dashboard.sh" ]; then
    "$SCRIPT_DIR/generate-dashboard.sh" 2>/dev/null || true
fi
