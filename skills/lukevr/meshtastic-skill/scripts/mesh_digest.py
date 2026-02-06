#!/usr/bin/env python3
"""
Mesh Digest - Collects best messages for periodic digest posts
"""

import json
import re
import hashlib
from datetime import datetime, timedelta
from pathlib import Path

MESSAGES_FILE = "/tmp/mesh_messages.txt"
DIGEST_STATE = "/tmp/mesh_digest_state.json"

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

def load_state():
    try:
        with open(DIGEST_STATE, 'r') as f:
            return json.load(f)
    except:
        return {"last_digest": 0, "seen_hashes": []}

def save_state(state):
    state["seen_hashes"] = state["seen_hashes"][-500:]
    with open(DIGEST_STATE, 'w') as f:
        json.dump(state, f)

def is_noise(text):
    text_clean = text.strip()
    for pattern in NOISE_PATTERNS:
        if re.match(pattern, text_clean, re.IGNORECASE):
            return True
    return len(text_clean) < 3

def msg_hash(sender, text):
    return hashlib.md5(f"{sender}:{text[:50]}".encode()).hexdigest()[:12]

def parse_messages(since_hours=6):
    """Parse messages from the last N hours"""
    messages = []
    cutoff = datetime.utcnow() - timedelta(hours=since_hours)
    
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
                # Clean binary garbage
                text = ''.join(c for c in text if c.isprintable() or c in '\n\t')
                
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00').replace('+00:00', ''))
                    if ts < cutoff:
                        continue
                except:
                    continue
                
                if is_noise(text):
                    continue
                    
                messages.append({
                    "timestamp": ts_str,
                    "channel": channel,
                    "sender": sender,
                    "distance": distance,
                    "text": text.strip()
                })
    except FileNotFoundError:
        pass
    
    return messages

def dedupe_messages(messages):
    """Remove duplicate messages (same text from multiple relays)"""
    seen = {}
    unique = []
    
    for msg in messages:
        # Normalize text for comparison
        text_norm = msg["text"].lower().strip()[:50]
        
        if text_norm in seen:
            # Keep the one with known distance
            if msg["distance"] != "?" and seen[text_norm]["distance"] == "?":
                seen[text_norm] = msg
        else:
            seen[text_norm] = msg
            unique.append(msg)
    
    return list(seen.values())

def score_message(msg):
    """Score message interestingness (higher = more interesting)"""
    score = 0
    text = msg["text"].lower()
    
    # Longer messages more interesting
    score += min(len(msg["text"]) / 20, 5)
    
    # Conversations (questions, responses) more interesting
    if "?" in msg["text"]:
        score += 2
    if any(w in text for w in ["thanks", "cheers", "gracias", "danke", "merci"]):
        score += 2
    
    # Technical/interesting topics
    if any(w in text for w in ["solar", "antenna", "node", "router", "distance", "range"]):
        score += 3
    
    # Non-English bonus (cultural diversity)
    if any(ord(c) > 127 for c in msg["text"]):
        score += 1
    
    # Known distance bonus
    if msg["distance"] != "?":
        score += 1
        try:
            dist = int(msg["distance"].replace("km", "").replace("m", ""))
            if dist > 1000:
                score += 2  # Long distance bonus
        except:
            pass
    
    return score

def get_digest(hours=6, max_messages=15):
    """Get digest of best messages from last N hours"""
    state = load_state()
    seen_hashes = set(state.get("seen_hashes", []))
    
    messages = parse_messages(hours)
    messages = dedupe_messages(messages)
    
    # Filter already-digested
    new_messages = []
    new_hashes = []
    for msg in messages:
        h = msg_hash(msg["sender"], msg["text"])
        if h not in seen_hashes:
            new_messages.append(msg)
            new_hashes.append(h)
    
    # Score and sort
    for msg in new_messages:
        msg["score"] = score_message(msg)
    
    new_messages.sort(key=lambda m: m["score"], reverse=True)
    top_messages = new_messages[:max_messages]
    
    # Update state
    state["last_digest"] = datetime.utcnow().timestamp()
    state["seen_hashes"] = list(seen_hashes) + new_hashes
    save_state(state)
    
    return {
        "messages": top_messages,
        "total_processed": len(messages),
        "unique_new": len(new_messages),
        "included": len(top_messages)
    }

def format_digest(digest):
    """Format digest for display"""
    if not digest["messages"]:
        return None
    
    lines = [f"📡 **Mesh Digest** ({digest['included']} highlights from {digest['total_processed']} msgs)\n"]
    
    for msg in digest["messages"]:
        dist = msg["distance"] if msg["distance"] != "?" else "?"
        lines.append(f"• [{msg['channel']}] {msg['sender']} ({dist}): {msg['text'][:100]}")
    
    return "\n".join(lines)

def main():
    digest = get_digest(hours=6, max_messages=15)
    print(json.dumps(digest, indent=2, default=str))
    return digest

if __name__ == "__main__":
    main()
