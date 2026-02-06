#!/usr/bin/env python3
"""
Wyze Camera Multi-Cam System
Supports multiple Wyze cameras via RTSP
"""

import subprocess
import os
import sys
import time
from datetime import datetime

# Camera configurations - set via environment variables
# Example: export WYZE_SHED_URL="rtsp://user:pass@192.168.1.10/live"
CAMERAS = {
    "shed": os.getenv("WYZE_SHED_URL", ""),
    # Add more cameras:
    # "garage": os.getenv("WYZE_GARAGE_URL", ""),
    # "front": os.getenv("WYZE_FRONT_URL", ""),
}

def capture_camera(name, rtsp_url, output_dir="/tmp/wyze-captures"):
    """Capture a frame from a Wyze camera"""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"{name}_{timestamp}.jpg")
    
    cmd = [
        "ffmpeg", "-y",
        "-i", rtsp_url,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-q:v", "2",
        output_file
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=10)
        if result.returncode == 0 and os.path.exists(output_file):
            size = os.path.getsize(output_file)
            print(f"✅ {name}: Captured {size} bytes -> {output_file}")
            return output_file
        else:
            print(f"❌ {name}: Failed to capture")
            return None
    except subprocess.TimeoutExpired:
        print(f"⏱️ {name}: Timeout")
        return None
    except Exception as e:
        print(f"❌ {name}: Error - {e}")
        return None

def capture_all():
    """Capture from all configured cameras"""
    results = {}
    for name, url in CAMERAS.items():
        if url and url.startswith("rtsp://"):
            results[name] = capture_camera(name, url)
        else:
            print(f"⚠️ {name}: No RTSP URL configured")
            print(f"   Set: export WYZE_{name.upper()}_URL=\"rtsp://user:pass@ip/live\"")
    return results

def main():
    if len(sys.argv) > 1:
        camera_name = sys.argv[1]
        if camera_name in CAMERAS:
            capture_camera(camera_name, CAMERAS[camera_name])
        else:
            print(f"Unknown camera: {camera_name}")
            print(f"Available: {list(CAMERAS.keys())}")
    else:
        print("Wyze Multi-Cam Capture")
        print("=" * 40)
        capture_all()

if __name__ == "__main__":
    main()
