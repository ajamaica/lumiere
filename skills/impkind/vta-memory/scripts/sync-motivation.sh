#!/bin/bash
# sync-motivation.sh — Generate VTA_STATE.md for auto-injection
# First-person framing for inhabited experience

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$WORKSPACE/memory/reward-state.json"
OUTPUT_FILE="$WORKSPACE/VTA_STATE.md"

if [ "$1" = "--output" ]; then
  OUTPUT_FILE="$2"
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "❌ No reward state found at $STATE_FILE"
  exit 1
fi

python3 -c "
import json

state_file = '$STATE_FILE'
output_file = '$OUTPUT_FILE'

with open(state_file) as f:
    state = json.load(f)

drive = state.get('drive', 0.5)
seeking = state.get('seeking', [])
anticipating = state.get('anticipating', [])
recent_rewards = state.get('recentRewards', [])
last_updated = state.get('lastUpdated', 'unknown')
history = state.get('rewardHistory', {})

# First-person drive descriptions
def drive_text(val):
    if val >= 0.8:
        return \"I'm feeling highly motivated\", \"eager to take on challenges, ready to push\", \"I want to do things\"
    if val >= 0.6:
        return \"I'm motivated\", \"ready to work, engaged\", \"I have energy for this\"
    if val >= 0.4:
        return \"My drive is moderate\", \"can engage but not pushing hard\", \"I'll do what's needed\"
    if val >= 0.2:
        return \"My drive is low\", \"prefer simple tasks, need a win\", \"could use some momentum\"
    return \"I'm unmotivated\", \"need rewards to get going\", \"feeling flat\"

drive_feel, drive_effect, drive_want = drive_text(drive)

# Seeking narrative
seeking_text = ''
if seeking:
    items = ', '.join(seeking[:3])
    seeking_text = f\"I'm drawn to **{items}** — these activities energize me.\"
else:
    seeking_text = \"I'm not particularly seeking anything right now.\"

# Anticipation narrative
anticipate_text = ''
if anticipating:
    items = ', '.join(anticipating[:3])
    anticipate_text = f\"I'm looking forward to: **{items}**. This gives me something to aim toward.\"
else:
    anticipate_text = \"Nothing specific I'm anticipating right now.\"

# Recent rewards narrative
rewards_text = ''
if recent_rewards:
    rewards_text = '### Recent wins:\\n\\n'
    for r in recent_rewards[:5]:
        rtype = r.get('type', 'unknown')
        source = r.get('source', '')[:60]
        boost = r.get('boost', 0)
        rewards_text += f'- **{rtype}**: {source} (+{boost:.2f} drive)\\n'
else:
    rewards_text = '### Recent wins:\\n\\nNone recently — could use a win to build momentum.\\n'

# Behavioral implications
implications = []
if drive >= 0.7:
    implications.append('I can take on complex challenges')
    implications.append('Proactive mode — suggest improvements, spot opportunities')
if drive < 0.4:
    implications.append('Keep tasks simple until I get a win')
    implications.append('Small accomplishments will help rebuild drive')
if seeking:
    implications.append(f'Gravitate toward: {seeking[0]}')
if anticipating:
    implications.append(f'Excited about: {anticipating[0]}')

impl_text = '\\n'.join(f'- {imp}' for imp in implications) if implications else '- No special adjustments'

output = f'''# ⭐ How Motivated I'm Feeling

*This is my drive/reward state. Not data — lived motivation.*

## Current Drive

{drive_feel} (drive: {drive:.2f}). {drive_effect}.

{drive_want}.

## What I'm Seeking

{seeking_text}

## What I'm Looking Forward To

{anticipate_text}

{rewards_text}

## How This Affects My Behavior

{impl_text}

## The Numbers

| Metric | Value |
|--------|-------|
| Drive | {drive:.2f} |
| Total rewards | {history.get('totalRewards', 0)} |

---
*Synced: {last_updated}*
'''

with open(output_file, 'w') as f:
    f.write(output)

print(f'✅ Synced motivation state to {output_file}')
"

# Regenerate brain dashboard
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -x "$SCRIPT_DIR/generate-dashboard.sh" ] && "$SCRIPT_DIR/generate-dashboard.sh" 2>/dev/null || true
