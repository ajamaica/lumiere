#!/usr/bin/env python3
"""
Mesh Monitor - Standalone script for checking mesh messages
Can be run by agent or cron job
"""

import json
import re
import hashlib
from datetime import datetime
from pathlib import Path

MESSAGES_FILE = "/tmp/mesh_messages.txt"
STATE_FILE = "/tmp/mesh_monitor_state.json"
LOG_FILE = "/tmp/mesh_monitor_log.txt"

# Noise patterns to ignore
NOISE_PATTERNS = [
    r"^Hello!?$",
    r"^hey!?$",
    r"^hey2?$",
    r"^mqtt-test",
    r"^Hello, world!?$",
    r"^test$",
    r"^ping$",
    r"^pong$",
]

# Priority keywords (alert immediately)
PRIORITY_KEYWORDS = ["help", "emergency", "sos", "urgent", "mayday", "lost", "injured"]

# Interesting keywords (worth reporting)
INTERESTING_KEYWORDS = ["local", "help", "emergency"]  # Customize your keywords

def load_state():
    """Load monitor state"""
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {"last_check": 0, "seen_hashes": []}

def save_state(state):
    """Save monitor state"""
    # Keep only last 1000 hashes
    state["seen_hashes"] = state["seen_hashes"][-1000:]
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

def is_noise(text):
    """Check if message is noise"""
    text_clean = text.strip()
    for pattern in NOISE_PATTERNS:
        if re.match(pattern, text_clean, re.IGNORECASE):
            return True
    return len(text_clean) < 3

def get_priority(text):
    """Get message priority: 'high', 'medium', 'low'"""
    text_lower = text.lower()
    for kw in PRIORITY_KEYWORDS:
        if kw in text_lower:
            return "high"
    for kw in INTERESTING_KEYWORDS:
        if kw in text_lower:
            return "medium"
    return "low"

def msg_hash(msg):
    """Hash a message for deduplication"""
    return hashlib.md5(f"{msg['sender']}:{msg['text']}".encode()).hexdigest()[:12]

def parse_messages(since_timestamp=0):
    """Parse messages file and return new messages"""
    messages = []
    try:
        with open(MESSAGES_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split('|', 4)
                if len(parts) < 5:
                    continue
                
                ts_str, channel, sender, distance, text = parts
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    ts_epoch = ts.timestamp()
                except:
                    continue
                
                if ts_epoch > since_timestamp:
                    messages.append({
                        "timestamp": ts_str,
                        "ts_epoch": ts_epoch,
                        "channel": channel,
                        "sender": sender,
                        "distance": distance,
                        "text": text
                    })
    except FileNotFoundError:
        pass
    
    return messages

def check_messages():
    """
    Check for new interesting messages.
    Returns dict with alerts to send.
    """
    state = load_state()
    last_check = state.get("last_check", 0)
    seen_hashes = set(state.get("seen_hashes", []))
    
    messages = parse_messages(last_check)
    
    alerts = {
        "high": [],    # Emergency - send immediately
        "medium": [],  # Interesting - batch together
        "low": []      # Normal - only if very few
    }
    
    new_hashes = []
    
    for msg in messages:
        # Skip noise
        if is_noise(msg["text"]):
            continue
        
        # Skip duplicates
        h = msg_hash(msg)
        if h in seen_hashes:
            continue
        
        new_hashes.append(h)
        priority = get_priority(msg["text"])
        alerts[priority].append(msg)
    
    # Update state
    state["last_check"] = max([m["ts_epoch"] for m in messages]) if messages else last_check
    state["seen_hashes"] = list(seen_hashes) + new_hashes
    save_state(state)
    
    return alerts

def format_alert(msg, emoji="📡"):
    """Format a message for alerting"""
    dist = msg["distance"] if msg["distance"] != "?" else "unknown"
    return f"{emoji} [{msg['channel']}] {msg['sender']} ({dist}): {msg['text']}"

def main():
    """Main check - prints alerts in JSON format for agent to process"""
    alerts = check_messages()
    
    # Include all non-noise messages (not just high/medium priority)
    all_interesting = alerts["high"] + alerts["medium"] + alerts["low"]
    
    output = {
        "high_priority": [format_alert(m, "🚨") for m in alerts["high"]],
        "interesting": [format_alert(m, "📡") for m in alerts["medium"]],
        "normal": [format_alert(m, "💬") for m in alerts["low"][:10]],  # Max 10 normal
        "all_messages": [format_alert(m) for m in all_interesting[:15]],  # Combined list
        "counts": {
            "high": len(alerts["high"]),
            "medium": len(alerts["medium"]),
            "low": len(alerts["low"]),
            "total": len(all_interesting)
        }
    }
    
    # Log what we found
    if any([alerts["high"], alerts["medium"]]):
        with open(LOG_FILE, 'a') as f:
            f.write(f"\n--- {datetime.utcnow().isoformat()} ---\n")
            for msg in alerts["high"] + alerts["medium"]:
                f.write(f"{format_alert(msg)}\n")
    
    print(json.dumps(output, indent=2))
    return output

if __name__ == "__main__":
    main()
