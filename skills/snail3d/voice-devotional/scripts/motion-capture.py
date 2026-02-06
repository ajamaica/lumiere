#!/usr/bin/env python3
"""
USB Webcam Motion Detection
Triggers capture when motion is detected
"""

import cv2
import os
import sys
import time
from datetime import datetime

# Settings
MOTION_THRESHOLD = 25  # Pixel difference threshold (0-255)
MIN_CONTOUR_AREA = 500  # Minimum size of motion to trigger
CAPTURE_DIR = os.path.expanduser("~/.clawdbot/motion-captures")
COOLDOWN_SECONDS = 5  # Don't capture more often than this

def ensure_dir():
    os.makedirs(CAPTURE_DIR, exist_ok=True)

def detect_motion(frame1, frame2):
    """Detect motion between two frames"""
    # Convert to grayscale
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    
    # Gaussian blur to reduce noise
    gray1 = cv2.GaussianBlur(gray1, (21, 21), 0)
    gray2 = cv2.GaussianBlur(gray2, (21, 21), 0)
    
    # Calculate difference
    diff = cv2.absdiff(gray1, gray2)
    
    # Threshold
    thresh = cv2.threshold(diff, MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)[1]
    
    # Dilate to fill holes
    thresh = cv2.dilate(thresh, None, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Check for significant motion
    for contour in contours:
        if cv2.contourArea(contour) > MIN_CONTOUR_AREA:
            return True, cv2.contourArea(contour)
    
    return False, 0

def capture_image(cap, filename):
    """Capture high-res image"""
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(filename, frame)
        return True
    return False

def main():
    ensure_dir()
    
    # Open webcam (0 = default, try 1 if that fails)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam")
        print("Try: ls /dev/video*")
        sys.exit(1)
    
    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    print("🎥 Motion detection started")
    print(f"📁 Captures saved to: {CAPTURE_DIR}")
    print(f"⏱️  Cooldown: {COOLDOWN_SECONDS}s between captures")
    print("Press Ctrl+C to stop\n")
    
    # Read initial frames
    ret, frame1 = cap.read()
    ret, frame2 = cap.read()
    
    if not ret:
        print("ERROR: Could not read from webcam")
        cap.release()
        sys.exit(1)
    
    last_capture = 0
    motion_count = 0
    
    try:
        while True:
            # Detect motion
            motion_detected, area = detect_motion(frame1, frame2)
            
            if motion_detected:
                motion_count += 1
                now = time.time()
                
                # Check cooldown
                if now - last_capture > COOLDOWN_SECONDS:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = os.path.join(CAPTURE_DIR, f"motion_{timestamp}.jpg")
                    
                    # Capture using current frame
                    if capture_image(cap, filename):
                        size = os.path.getsize(filename)
                        print(f"📸 MOTION DETECTED! ({area}px)")
                        print(f"   Saved: {filename} ({size//1024}KB)")
                        last_capture = now
                    else:
                        print("❌ Capture failed")
                else:
                    print(f"⏳ Motion detected (cooldown: {COOLDOWN_SECONDS - int(now - last_capture)}s)")
            
            # Update frames
            frame1 = frame2
            ret, frame2 = cap.read()
            
            if not ret:
                print("ERROR: Frame capture failed")
                break
            
            # Small delay to reduce CPU
            time.sleep(0.1)
            
    except KeyboardInterrupt:
        print(f"\n\n✅ Stopped. {motion_count} motion events detected.")
        print(f"📁 Captures in: {CAPTURE_DIR}")
    
    cap.release()

if __name__ == "__main__":
    main()
