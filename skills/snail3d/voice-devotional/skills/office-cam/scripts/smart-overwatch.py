#!/usr/bin/env python3
"""
Smart Overwatch - AI-Escalated Monitoring
Local motion detection → AI analysis only when needed
"""

import subprocess
import os
import time
import json
from datetime import datetime

# Config
MOTION_DIR = os.path.expanduser("~/.clawdbot/overwatch")
TRIGGER_DIR = os.path.expanduser("~/.clawdbot/overwatch/triggers")
REF_FRAME = "/tmp/smart-overwatch-ref.jpg"
ACTIVE_FILE = "/tmp/smart-overwatch-active"
LOG_FILE = "/tmp/smart-overwatch.log"

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{timestamp}] {msg}\n")

def capture_frame(path):
    try:
        result = subprocess.run(
            ["imagesnap", "-q", path],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0 and os.path.exists(path)
    except:
        return False

def detect_motion():
    new_frame = "/tmp/smart-overwatch-new.jpg"
    
    if not capture_frame(new_frame):
        return False
    
    if not os.path.exists(REF_FRAME):
        os.rename(new_frame, REF_FRAME)
        return False
    
    ref_size = os.path.getsize(REF_FRAME)
    new_size = os.path.getsize(new_frame)
    
    if ref_size == 0:
        diff_pct = 0
    else:
        diff_pct = abs(new_size - ref_size) / ref_size * 100
    
    os.remove(REF_FRAME)
    os.rename(new_frame, REF_FRAME)
    
    return diff_pct > 2.0

def trigger_ai_analysis(image_path):
    """Create trigger file that OpenClaw will detect"""
    os.makedirs(TRIGGER_DIR, exist_ok=True)
    
    trigger = {
        "type": "motion_detected",
        "timestamp": datetime.now().isoformat(),
        "image_path": image_path,
        "status": "needs_analysis"
    }
    
    trigger_file = f"{TRIGGER_DIR}/trigger_{int(time.time())}.json"
    with open(trigger_file, 'w') as f:
        json.dump(trigger, f)
    
    log(f"🚨 Motion! Triggered AI analysis: {trigger_file}")
    return trigger_file

def main():
    os.makedirs(MOTION_DIR, exist_ok=True)
    
    with open(ACTIVE_FILE, 'w') as f:
        f.write(str(os.getpid()))
    
    log("🔥 SMART OVERWATCH ACTIVATED")
    log("Mode: Local motion detection → AI escalation on person detected")
    log("=" * 50)
    
    capture_frame(REF_FRAME)
    check_count = 0
    last_trigger = 0
    COOLDOWN = 5  # seconds between triggers
    
    try:
        while os.path.exists(ACTIVE_FILE):
            time.sleep(0.5)
            check_count += 1
            
            if check_count % 120 == 0:  # Every minute
                log("👀 Still watching locally (zero cost)...")
            
            if detect_motion():
                now = time.time()
                
                if now - last_trigger > COOLDOWN:
                    # Capture high-res for AI analysis
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_path = f"{MOTION_DIR}/motion_{timestamp}.jpg"
                    subprocess.run(["imagesnap", "-q", image_path], timeout=5)
                    
                    # Trigger AI analysis
                    trigger_ai_analysis(image_path)
                    last_trigger = now
                    
                    # Pause for 2 minutes to let AI analyze
                    # (Prevents spam while AI is checking)
                    log("⏸️  Paused 2min for AI analysis...")
                    time.sleep(120)
                    log("▶️  Resuming local monitoring...")
                else:
                    remaining = int(COOLDOWN - (now - last_trigger))
                    log(f"⏳ Motion (cooldown: {remaining}s)")
    
    except KeyboardInterrupt:
        log("🛑 Stopped by user")
    except Exception as e:
        log(f"❌ Error: {e}")
    finally:
        if os.path.exists(ACTIVE_FILE):
            os.remove(ACTIVE_FILE)
        log("👋 Smart overwatch deactivated")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        if os.path.exists(ACTIVE_FILE):
            os.remove(ACTIVE_FILE)
            print("🛑 Stop signal sent")
    else:
        main()
