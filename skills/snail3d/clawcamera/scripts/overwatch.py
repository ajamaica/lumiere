#!/usr/bin/env python3
"""
Smart Overwatch Pro - Full Camera Control System
Telegram notifications, live feed, remote commands
"""

import subprocess
import os
import time
import json
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver

# Config
MOTION_DIR = os.path.expanduser("~/.clawdbot/overwatch")
TRIGGER_DIR = os.path.expanduser("~/.clawdbot/overwatch/triggers")
STREAM_DIR = os.path.expanduser("~/.clawdbot/overwatch/stream")
REF_FRAME = "/tmp/overwatch-pro-ref.jpg"
ACTIVE_FILE = "/tmp/overwatch-pro-active"
LOG_FILE = "/tmp/overwatch-pro.log"
STREAM_FILE = os.path.join(STREAM_DIR, "frame.jpg")

# Telegram config (loaded from env or file)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "7340030703")

def load_telegram_config():
    """Load from credentials file if env not set"""
    global TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
    cred_file = os.path.expanduser("~/.clawdbot/credentials/telegram.json")
    if os.path.exists(cred_file) and not TELEGRAM_BOT_TOKEN:
        try:
            with open(cred_file) as f:
                cfg = json.load(f)
                TELEGRAM_BOT_TOKEN = cfg.get("token", "")
                TELEGRAM_CHAT_ID = cfg.get("chat_id", TELEGRAM_CHAT_ID)
        except:
            pass

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + "\n")

def send_telegram_photo(photo_path, caption=""):
    """Send photo notification to Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        log("⚠️ No Telegram token configured")
        return False
    
    try:
        import requests
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        with open(photo_path, 'rb') as photo:
            files = {'photo': photo}
            data = {
                'chat_id': TELEGRAM_CHAT_ID,
                'caption': caption
            }
            response = requests.post(url, files=files, data=data, timeout=30)
            if response.status_code == 200:
                log("📤 Photo sent to Telegram")
                return True
            else:
                log(f"❌ Telegram error: {response.text}")
                return False
    except Exception as e:
        log(f"❌ Failed to send photo: {e}")
        return False

def send_telegram_message(text):
    """Send text notification to Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        log("⚠️ No Telegram token configured")
        return False
    
    try:
        import requests
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': text,
            'parse_mode': 'HTML'
        }
        response = requests.post(url, data=data, timeout=10)
        return response.status_code == 200
    except Exception as e:
        log(f"❌ Failed to send message: {e}")
        return False

def capture_frame(path):
    """Capture single frame from webcam"""
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
    """Detect motion between frames"""
    new_frame = "/tmp/overwatch-pro-new.jpg"
    
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
    
    # Update stream frame for live view
    os.makedirs(STREAM_DIR, exist_ok=True)
    subprocess.run(["cp", new_frame, STREAM_FILE], check=False)
    
    # Update reference
    os.remove(REF_FRAME)
    os.rename(new_frame, REF_FRAME)
    
    return diff_pct > 2.0

def trigger_motion_alert(image_path):
    """Create trigger and send Telegram notification"""
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
    
    # Send Telegram notification
    caption = f"🚨 <b>MOTION DETECTED</b>\n\n📍 Office Camera\n🕐 {datetime.now().strftime('%I:%M %p')}\n\nReply with:\n• 'analyze' - I\'ll check what I see\n• 'stream' - Get live view link"
    
    if send_telegram_photo(image_path, caption):
        log("🚨 Motion alert sent to Telegram!")
    else:
        log("⚠️ Failed to send Telegram alert")
    
    return trigger_file

def start_stream_server():
    """Start simple HTTP server for live MJPEG stream"""
    class StreamHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/stream.jpg':
                self.send_response(200)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                
                if os.path.exists(STREAM_FILE):
                    with open(STREAM_FILE, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    # Return placeholder
                    self.wfile.write(b'No stream available')
                    
            elif self.path == '/':
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                html = '''
                <html>
                <head><title>Office Cam Live Stream</title>
                <meta http-equiv="refresh" content="2">
                <style>body{background:#000;text-align:center;margin:0;padding:20px;}
                img{max-width:100%;max-height:90vh;border:2px solid #333;}
                h1{color:#fff;font-family:sans-serif;}</style>
                </head>
                <body>
                <h1>🎥 Office Camera - Live</h1>
                <img src="/stream.jpg?t=''' + str(int(time.time())) + '''" />
                <p style="color:#666;">Auto-refresh every 2 seconds</p>
                </body>
                </html>
                '''
                self.wfile.write(html.encode())
            else:
                self.send_error(404)
        
        def log_message(self, format, *args):
            pass  # Suppress logs
    
    try:
        server = HTTPServer(('0.0.0.0', 8080), StreamHandler)
        log("🌐 Stream server started on http://localhost:8080")
        server.serve_forever()
    except Exception as e:
        log(f"⚠️ Stream server error: {e}")

def update_stream():
    """Continuously update stream frame"""
    while os.path.exists(ACTIVE_FILE):
        capture_frame(STREAM_FILE)
        time.sleep(2)

def main():
    os.makedirs(MOTION_DIR, exist_ok=True)
    os.makedirs(STREAM_DIR, exist_ok=True)
    load_telegram_config()
    
    with open(ACTIVE_FILE, 'w') as f:
        f.write(str(os.getpid()))
    
    log("🔥 OVERWATCH PRO ACTIVATED")
    log("Features:")
    log("  • Motion detection with Telegram alerts")
    log("  • Live stream at http://localhost:8080")
    log("  • Remote commands via Telegram replies")
    log("=" * 50)
    
    # Start stream server in background thread
    stream_thread = threading.Thread(target=start_stream_server, daemon=True)
    stream_thread.start()
    
    # Start stream updater
    updater_thread = threading.Thread(target=update_stream, daemon=True)
    updater_thread.start()
    
    # Initial capture
    capture_frame(REF_FRAME)
    
    last_alert = 0
    COOLDOWN = 30  # 30 seconds between alerts
    
    try:
        while os.path.exists(ACTIVE_FILE):
            time.sleep(0.5)
            
            if detect_motion():
                now = time.time()
                
                if now - last_alert > COOLDOWN:
                    # Capture high-res for alert
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    image_path = f"{MOTION_DIR}/motion_{timestamp}.jpg"
                    subprocess.run(["imagesnap", "-q", image_path], timeout=5)
                    
                    # Trigger alert with Telegram notification
                    trigger_motion_alert(image_path)
                    last_alert = now
                    
                    # Pause briefly after alert
                    time.sleep(5)
                else:
                    remaining = int(COOLDOWN - (now - last_alert))
                    log(f"⏳ Motion (cooldown: {remaining}s)")
    
    except KeyboardInterrupt:
        log("🛑 Stopped by user")
    except Exception as e:
        log(f"❌ Error: {e}")
    finally:
        if os.path.exists(ACTIVE_FILE):
            os.remove(ACTIVE_FILE)
        log("👋 Overwatch Pro deactivated")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "stop":
        if os.path.exists(ACTIVE_FILE):
            os.remove(ACTIVE_FILE)
            print("🛑 Stop signal sent")
    else:
        main()
