#!/bin/bash
# generate-dashboard.sh — Generate unified Brain Dashboard (Amygdala version)
# Professional design with glassmorphism and subtle animations

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
OUTPUT_FILE="$WORKSPACE/brain-dashboard.html"

# Data files
HIPPOCAMPUS_FILE="$WORKSPACE/memory/index.json"
AMYGDALA_FILE="$WORKSPACE/memory/emotional-state.json"
VTA_FILE="$WORKSPACE/memory/reward-state.json"

# Detect installed skills
HAS_HIPPOCAMPUS=false
HAS_AMYGDALA=false
HAS_VTA=false

[ -f "$HIPPOCAMPUS_FILE" ] && HAS_HIPPOCAMPUS=true
[ -f "$AMYGDALA_FILE" ] && HAS_AMYGDALA=true
[ -f "$VTA_FILE" ] && HAS_VTA=true

if [ "$HAS_HIPPOCAMPUS" != "true" ]; then
    echo "❌ No hippocampus data found at $HIPPOCAMPUS_FILE"
    exit 1
fi

# Auto-detect from IDENTITY.md
AGENT_NAME="Agent"
AVATAR_PATH=""
if [ -f "$WORKSPACE/IDENTITY.md" ]; then
    AGENT_NAME=$(grep -E "^\*\*Name:\*\*|^- \*\*Name:\*\*" "$WORKSPACE/IDENTITY.md" | head -1 | sed 's/.*Name:\*\* *//' | sed 's/`//g' | tr -d '\r')
    AVATAR_RAW=$(grep -E "^\*\*Avatar:\*\*|^- \*\*Avatar:\*\*" "$WORKSPACE/IDENTITY.md" | head -1 | sed 's/.*Avatar:\*\* *//' | sed 's/`//g' | tr -d '\r')
    if [ -n "$AVATAR_RAW" ]; then
        if [[ "$AVATAR_RAW" == /* ]] || [[ "$AVATAR_RAW" == ~/* ]]; then
            AVATAR_PATH="${AVATAR_RAW/#\~/$HOME}"
        else
            AVATAR_PATH="$WORKSPACE/$AVATAR_RAW"
        fi
    fi
fi
[ -z "$AGENT_NAME" ] && AGENT_NAME="Agent"

# Fallback avatar
if [ -z "$AVATAR_PATH" ] || [ ! -f "$AVATAR_PATH" ]; then
    for candidate in "$WORKSPACE/avatar.png" "$WORKSPACE/avatar.jpg"; do
        [ -f "$candidate" ] && AVATAR_PATH="$candidate" && break
    done
fi

# Convert avatar to base64
AVATAR_BASE64=""
if [ -n "$AVATAR_PATH" ] && [ -f "$AVATAR_PATH" ]; then
    MIME_TYPE="image/png"
    [[ "$AVATAR_PATH" == *.jpg ]] || [[ "$AVATAR_PATH" == *.jpeg ]] && MIME_TYPE="image/jpeg"
    AVATAR_BASE64="data:$MIME_TYPE;base64,$(base64 < "$AVATAR_PATH" | tr -d '\n')"
fi

# Read amygdala data
VALENCE=$(jq -r '.dimensions.valence // 0' "$AMYGDALA_FILE")
AROUSAL=$(jq -r '.dimensions.arousal // 0.3' "$AMYGDALA_FILE")
CONNECTION=$(jq -r '.dimensions.connection // 0.4' "$AMYGDALA_FILE")
CURIOSITY=$(jq -r '.dimensions.curiosity // 0.5' "$AMYGDALA_FILE")
ENERGY=$(jq -r '.dimensions.energy // 0.5' "$AMYGDALA_FILE")
ANTICIPATION=$(jq -r '.dimensions.anticipation // 0' "$AMYGDALA_FILE")
TRUST=$(jq -r '.dimensions.trust // 0.5' "$AMYGDALA_FILE")
RECENT_EMOTIONS=$(jq -c '[.recentEmotions[-5:] // [] | .[] | {label, intensity, trigger}]' "$AMYGDALA_FILE")

vi=$(echo "$VALENCE * 100" | bc | cut -d. -f1)
ai=$(echo "$AROUSAL * 100" | bc | cut -d. -f1)
if [ "$vi" -gt 70 ] && [ "$ai" -gt 60 ]; then MOOD_EMOJI="😄"; MOOD_LABEL="Energized"; MOOD_COLOR="#10b981"
elif [ "$vi" -gt 50 ] && [ "$ai" -le 40 ]; then MOOD_EMOJI="😌"; MOOD_LABEL="Content"; MOOD_COLOR="#6366f1"
elif [ "$vi" -gt 50 ]; then MOOD_EMOJI="🙂"; MOOD_LABEL="Positive"; MOOD_COLOR="#8b5cf6"
elif [ "$vi" -lt -10 ] && [ "$ai" -gt 60 ]; then MOOD_EMOJI="😤"; MOOD_LABEL="Stressed"; MOOD_COLOR="#ef4444"
elif [ "$vi" -lt -10 ]; then MOOD_EMOJI="😔"; MOOD_LABEL="Low"; MOOD_COLOR="#64748b"
else MOOD_EMOJI="😐"; MOOD_LABEL="Neutral"; MOOD_COLOR="#94a3b8"; fi

# Read hippocampus if available
MEMORY_COUNT=0 CORE_COUNT=0 TOP_MEMORIES="[]"
if [ "$HAS_HIPPOCAMPUS" = "true" ]; then
    MEMORY_COUNT=$(jq '.memories | length' "$HIPPOCAMPUS_FILE")
    CORE_COUNT=$(jq '[.memories[] | select(.importance >= 0.7)] | length' "$HIPPOCAMPUS_FILE")
    TOP_MEMORIES=$(jq -c '[.memories | sort_by(-.importance) | .[:5] | .[] | {id, domain, importance, summary: (.content[:80] + "...")}]' "$HIPPOCAMPUS_FILE")
fi

# Read VTA if available
DRIVE=0.5 SEEKING="[]" ANTICIPATING="[]" RECENT_REWARDS="[]"
if [ "$HAS_VTA" = "true" ]; then
    DRIVE=$(jq -r '.drive // 0.5' "$VTA_FILE")
    SEEKING=$(jq -c '.seeking // []' "$VTA_FILE")
    ANTICIPATING=$(jq -c '.anticipating // []' "$VTA_FILE")
    RECENT_REWARDS=$(jq -c '[.recentRewards[-5:] // [] | .[] | {type, source, intensity}]' "$VTA_FILE")
fi

DRIVE_PCT=$(echo "$DRIVE * 100" | bc | cut -d. -f1)

# Generate HTML
cat > "$OUTPUT_FILE" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brain Dashboard</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --bg-dark: #09090b;
            --bg-card: rgba(24, 24, 27, 0.8);
            --bg-elevated: rgba(39, 39, 42, 0.6);
            --border: rgba(63, 63, 70, 0.5);
            --text: #fafafa;
            --text-secondary: #a1a1aa;
            --text-muted: #71717a;
            --accent: #a855f7;
            --accent-glow: rgba(168, 85, 247, 0.3);
            --cyan: #06b6d4;
            --pink: #ec4899;
            --amber: #f59e0b;
            --emerald: #10b981;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-dark);
            background-image: 
                radial-gradient(ellipse at top, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
            color: var(--text);
            min-height: 100vh;
            padding: 24px 16px;
            line-height: 1.5;
        }
        
        .container { max-width: 480px; margin: 0 auto; }
        
        /* Header */
        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding: 16px;
            background: var(--bg-card);
            border-radius: 16px;
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
        }
        
        .avatar-wrap {
            position: relative;
        }
        
        .avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
            box-shadow: 0 0 24px var(--accent-glow);
        }
        
        .avatar-placeholder {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent) 0%, var(--pink) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 0 24px var(--accent-glow);
        }
        
        .status-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 3px solid var(--bg-dark);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
        }
        
        .header-info h1 { font-size: 1.25rem; font-weight: 600; }
        .header-info .subtitle { color: var(--text-muted); font-size: 0.8rem; margin-top: 2px; }
        .header-info .mood { 
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
            padding: 4px 10px;
            background: var(--bg-elevated);
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        /* Tabs */
        .tabs {
            display: flex;
            gap: 6px;
            margin-bottom: 20px;
        }
        
        .tab {
            flex: 1;
            padding: 12px 8px;
            border: none;
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.2s;
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .tab:hover { 
            background: var(--bg-elevated);
            border-color: rgba(168, 85, 247, 0.3);
        }
        
        .tab.active { 
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%);
            border-color: var(--accent);
            color: var(--text);
            box-shadow: 0 0 20px var(--accent-glow);
        }
        
        .tab-icon { font-size: 1rem; }
        
        .tab-content { display: none; animation: fadeIn 0.3s ease; }
        .tab-content.active { display: block; }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Cards */
        .card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
        }
        
        .card-title {
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            margin-bottom: 12px;
        }
        
        /* Stats */
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        
        .stat {
            background: var(--bg-elevated);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            border: 1px solid var(--border);
        }
        
        .stat-val { 
            font-size: 2rem; 
            font-weight: 700;
            background: linear-gradient(135deg, var(--cyan) 0%, var(--emerald) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .stat-label { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; }
        
        /* Dimensions */
        .dim {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .dim:last-child { border: none; }
        .dim-icon { width: 28px; font-size: 1rem; }
        .dim-name { flex: 1; font-size: 0.85rem; font-weight: 500; }
        
        .dim-bar {
            width: 100px;
            height: 6px;
            background: var(--bg-elevated);
            border-radius: 3px;
            margin: 0 12px;
            overflow: hidden;
        }
        
        .dim-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease;
        }
        
        .dim-val { 
            width: 40px; 
            text-align: right; 
            font-size: 0.8rem; 
            color: var(--text-secondary);
            font-variant-numeric: tabular-nums;
        }
        
        /* Quadrant */
        .quadrant { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        
        .q-cell {
            background: var(--bg-elevated);
            border-radius: 12px;
            padding: 14px 10px;
            text-align: center;
            border: 1px solid var(--border);
            transition: all 0.3s;
        }
        
        .q-cell .emoji { font-size: 1.5rem; margin-bottom: 4px; }
        .q-cell .label { font-size: 0.75rem; font-weight: 500; }
        
        .q-cell.active {
            border-color: var(--accent);
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%);
            box-shadow: 0 0 20px var(--accent-glow);
            transform: scale(1.02);
        }
        
        /* List items */
        .list-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .list-item:last-child { border: none; }
        
        .badge {
            background: var(--bg-elevated);
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: capitalize;
            white-space: nowrap;
            border: 1px solid var(--border);
        }
        
        .list-text { flex: 1; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; }
        
        .empty { color: var(--text-muted); text-align: center; padding: 20px; font-size: 0.85rem; }
        
        /* Install prompt */
        .install-prompt { text-align: center; padding: 32px 16px; }
        .install-prompt .icon { 
            font-size: 3rem; 
            margin-bottom: 12px;
            opacity: 0.4;
        }
        .install-prompt p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 8px; }
        .install-prompt code { 
            display: inline-block;
            background: var(--bg-elevated); 
            padding: 10px 16px; 
            border-radius: 8px; 
            font-size: 0.8rem;
            border: 1px solid var(--border);
            margin-top: 8px;
        }
        
        /* Drive meter */
        .drive-meter { text-align: center; padding: 24px 16px; }
        
        .drive-val { 
            font-size: 3.5rem; 
            font-weight: 700;
            background: linear-gradient(135deg, var(--amber) 0%, #ef4444 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .drive-label { font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; }
        
        .drive-bar {
            height: 8px;
            background: var(--bg-elevated);
            border-radius: 4px;
            margin-top: 16px;
            overflow: hidden;
        }
        
        .drive-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--amber) 0%, #ef4444 100%);
            border-radius: 4px;
            transition: width 0.5s;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }
        
        /* Tags */
        .tags { display: flex; flex-wrap: wrap; gap: 8px; }
        
        .tag {
            background: var(--bg-elevated);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 16px;
            font-size: 0.7rem;
            color: var(--text-muted);
        }
        
        .footer a { 
            color: var(--accent); 
            text-decoration: none;
            transition: color 0.2s;
        }
        
        .footer a:hover { color: var(--pink); }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="avatar-wrap">
HTMLHEAD

# Avatar
if [ -n "$AVATAR_BASE64" ]; then
    echo "            <img src=\"$AVATAR_BASE64\" class=\"avatar\">" >> "$OUTPUT_FILE"
else
    echo "            <div class=\"avatar-placeholder\">🎭</div>" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << HEADER
            <div class="status-dot" style="background: $MOOD_COLOR;"></div>
        </div>
        <div class="header-info">
            <h1>$AGENT_NAME</h1>
            <div class="subtitle">Brain Dashboard</div>
            <div class="mood">
                <span>$MOOD_EMOJI</span>
                <span style="color: $MOOD_COLOR;">$MOOD_LABEL</span>
            </div>
        </div>
    </div>
    
    <div class="tabs">
        <button class="tab active" data-tab="hippocampus"><span class="tab-icon">🧠</span> Memory</button>
        <button class="tab" data-tab="amygdala"><span class="tab-icon">🎭</span> Emotions</button>
        <button class="tab" data-tab="vta"><span class="tab-icon">⭐</span> Drive</button>
    </div>
    
    <!-- Hippocampus Tab -->
    <div class="tab-content active" id="tab-hippocampus">
HEADER

if [ "$HAS_HIPPOCAMPUS" = "true" ]; then
    cat >> "$OUTPUT_FILE" << HIPPO
        <div class="card">
            <div class="stats">
                <div class="stat"><div class="stat-val">$MEMORY_COUNT</div><div class="stat-label">Total Memories</div></div>
                <div class="stat"><div class="stat-val">$CORE_COUNT</div><div class="stat-label">Core Memories</div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Top Memories</div>
            <div id="topMemories"></div>
        </div>
HIPPO
else
    cat >> "$OUTPUT_FILE" << 'INSTALL_HIPPO'
        <div class="card">
            <div class="install-prompt">
                <div class="icon">🧠</div>
                <p><strong>Hippocampus</strong> not installed</p>
                <p>Add memory formation & recall</p>
                <code>clawdhub install hippocampus</code>
            </div>
        </div>
INSTALL_HIPPO
fi

cat >> "$OUTPUT_FILE" << 'AMYGDALA_START'
    </div>
    
    <!-- Amygdala Tab -->
    <div class="tab-content" id="tab-amygdala">
        <div class="card">
            <div class="card-title">Dimensions</div>
            <div id="dimensions"></div>
        </div>
        <div class="card">
            <div class="card-title">Mood Quadrant</div>
            <div class="quadrant">
                <div class="q-cell" id="q-stressed"><div class="emoji">😤</div><div class="label">Stressed</div></div>
                <div class="q-cell" id="q-energized"><div class="emoji">😄</div><div class="label">Energized</div></div>
                <div class="q-cell" id="q-depleted"><div class="emoji">😔</div><div class="label">Depleted</div></div>
                <div class="q-cell" id="q-content"><div class="emoji">😌</div><div class="label">Content</div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Recent Feelings</div>
            <div id="recentEmotions"></div>
        </div>
    </div>
    
    <!-- VTA Tab -->
    <div class="tab-content" id="tab-vta">
AMYGDALA_START

if [ "$HAS_VTA" = "true" ]; then
    cat >> "$OUTPUT_FILE" << VTA
        <div class="card">
            <div class="drive-meter">
                <div class="drive-val">${DRIVE_PCT}%</div>
                <div class="drive-label">Drive Level</div>
                <div class="drive-bar"><div class="drive-fill" style="width:${DRIVE_PCT}%"></div></div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">Seeking</div>
            <div id="vtaSeeking" class="tags"></div>
        </div>
        <div class="card">
            <div class="card-title">Looking Forward To</div>
            <div id="vtaAnticipating" class="tags"></div>
        </div>
        <div class="card">
            <div class="card-title">Recent Rewards</div>
            <div id="recentRewards"></div>
        </div>
VTA
else
    cat >> "$OUTPUT_FILE" << 'INSTALL_VTA'
        <div class="card">
            <div class="install-prompt">
                <div class="icon">⭐</div>
                <p><strong>VTA</strong> not installed</p>
                <p>Add motivation & rewards</p>
                <code>clawdhub install vta-memory</code>
            </div>
        </div>
INSTALL_VTA
fi

cat >> "$OUTPUT_FILE" << 'FOOTER'
    </div>
    
    <div class="footer">
        Part of the <a href="https://github.com/ImpKind">AI Brain Series</a> 🧠
    </div>
</div>
<script>
FOOTER

# Inject data
cat >> "$OUTPUT_FILE" << JSDATA
const state = {
    hippocampus: { installed: $HAS_HIPPOCAMPUS, topMemories: $TOP_MEMORIES },
    amygdala: { dimensions: { valence:$VALENCE, arousal:$AROUSAL, connection:$CONNECTION, curiosity:$CURIOSITY, energy:$ENERGY, trust:$TRUST, anticipation:$ANTICIPATION }, recentEmotions: $RECENT_EMOTIONS },
    vta: { installed: $HAS_VTA, drive: $DRIVE, seeking: $SEEKING, anticipating: $ANTICIPATING, recentRewards: $RECENT_REWARDS }
};
JSDATA

cat >> "$OUTPUT_FILE" << 'JSEND'

// Tabs
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
}));

// Hippocampus
if (state.hippocampus.installed) {
    const memEl = document.getElementById('topMemories');
    if (state.hippocampus.topMemories?.length) {
        state.hippocampus.topMemories.forEach(m => {
            memEl.innerHTML += `<div class="list-item"><span class="badge">${(m.importance*100).toFixed(0)}%</span><span class="list-text">${m.summary}</span></div>`;
        });
    } else memEl.innerHTML = '<div class="empty">No memories yet</div>';
}

// Amygdala dimensions
const dims = [
    {k:'valence',n:'Valence',i:'🎭',min:-1,max:1,c:'linear-gradient(90deg,#ef4444,#fbbf24,#10b981)'},
    {k:'arousal',n:'Arousal',i:'⚡',min:0,max:1,c:'linear-gradient(90deg,#3b82f6,#f97316)'},
    {k:'connection',n:'Connection',i:'💕',min:0,max:1,c:'#ec4899'},
    {k:'curiosity',n:'Curiosity',i:'🔍',min:0,max:1,c:'#06b6d4'},
    {k:'energy',n:'Energy',i:'🔋',min:0,max:1,c:'#eab308'},
    {k:'trust',n:'Trust',i:'🤝',min:0,max:1,c:'#10b981'},
    {k:'anticipation',n:'Anticipation',i:'✨',min:0,max:1,c:'#a855f7'}
];
const dimsEl = document.getElementById('dimensions');
dims.forEach(d => {
    const v = state.amygdala.dimensions[d.k]||0;
    const pct = ((v-d.min)/(d.max-d.min))*100;
    dimsEl.innerHTML += `<div class="dim"><span class="dim-icon">${d.i}</span><span class="dim-name">${d.n}</span><div class="dim-bar"><div class="dim-fill" style="width:${pct}%;background:${d.c}"></div></div><span class="dim-val">${v.toFixed(2)}</span></div>`;
});

// Quadrant
const v=state.amygdala.dimensions.valence, a=state.amygdala.dimensions.arousal;
const q = (v>=0&&a>=0.5)?'energized':(v>=0)?'content':(a>=0.5)?'stressed':'depleted';
document.getElementById('q-'+q)?.classList.add('active');

// Recent emotions
const emotionsEl = document.getElementById('recentEmotions');
if (state.amygdala.recentEmotions?.length) {
    state.amygdala.recentEmotions.slice().reverse().forEach(e => {
        emotionsEl.innerHTML += `<div class="list-item"><span class="badge">${e.label}</span><span class="list-text">${e.trigger||'—'}</span></div>`;
    });
} else emotionsEl.innerHTML = '<div class="empty">No recent emotions</div>';

// VTA
if (state.vta.installed) {
    const seekEl = document.getElementById('vtaSeeking');
    const antEl = document.getElementById('vtaAnticipating');
    const rewEl = document.getElementById('recentRewards');
    
    (state.vta.seeking||[]).forEach(s => seekEl.innerHTML += `<span class="tag">${s}</span>`);
    if (!state.vta.seeking?.length) seekEl.innerHTML = '<div class="empty">Nothing actively sought</div>';
    
    (state.vta.anticipating||[]).forEach(a => antEl.innerHTML += `<span class="tag">${a}</span>`);
    if (!state.vta.anticipating?.length) antEl.innerHTML = '<div class="empty">Nothing anticipated</div>';
    
    if (state.vta.recentRewards?.length) {
        state.vta.recentRewards.slice().reverse().forEach(r => {
            rewEl.innerHTML += `<div class="list-item"><span class="badge">${r.type}</span><span class="list-text">${r.source||'—'}</span></div>`;
        });
    } else rewEl.innerHTML = '<div class="empty">No recent rewards</div>';
}
</script>
</body>
</html>
JSEND

echo "🧠 Dashboard generated: $OUTPUT_FILE"
