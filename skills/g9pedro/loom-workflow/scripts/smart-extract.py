#!/usr/bin/env python3
"""
Smart frame extraction coupled with transcript timing.
Extracts frames when:
1. Scene changes significantly (visual)
2. Narrator says something meaningful (audio)
3. UI interactions occur (detected via motion/click indicators)
"""

import subprocess
import json
import sys
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import tempfile

@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str

@dataclass
class ExtractedFrame:
    timestamp: float
    path: str
    reason: str  # 'scene_change', 'speech_start', 'action_detected'
    transcript_context: Optional[str] = None

def run_whisper(video_path: str, output_dir: str, model: str = "tiny") -> list[TranscriptSegment]:
    """Run whisper and get word-level timestamps."""
    print(f"[transcribe] Running whisper ({model}) on {video_path}...")
    
    # Extract audio first
    audio_path = os.path.join(output_dir, "audio.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "mp3", "-q:a", "2",
        audio_path
    ], capture_output=True)
    
    # Run whisper with JSON output
    result = subprocess.run([
        "whisper", audio_path,
        "--model", model,
        "--output_format", "json",
        "--output_dir", output_dir,
        "--word_timestamps", "True"
    ], capture_output=True, text=True)
    
    # Parse the JSON output
    json_path = os.path.join(output_dir, "audio.json")
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        
        segments = []
        for seg in data.get("segments", []):
            segments.append(TranscriptSegment(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"].strip()
            ))
        return segments
    
    return []

def detect_scene_changes(video_path: str, threshold: float = 0.3) -> list[float]:
    """Use ffmpeg scene detection to find visual changes."""
    print(f"[scene] Detecting scene changes (threshold={threshold})...")
    
    result = subprocess.run([
        "ffmpeg", "-i", video_path,
        "-vf", f"select='gt(scene,{threshold})',showinfo",
        "-f", "null", "-"
    ], capture_output=True, text=True)
    
    timestamps = []
    for line in result.stderr.split('\n'):
        if 'pts_time:' in line:
            try:
                pts = float(line.split('pts_time:')[1].split()[0])
                timestamps.append(pts)
            except (IndexError, ValueError):
                continue
    
    return timestamps

def extract_frame(video_path: str, timestamp: float, output_path: str) -> bool:
    """Extract a single frame at the given timestamp."""
    result = subprocess.run([
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path
    ], capture_output=True)
    return result.returncode == 0

def smart_extract(video_path: str, output_dir: str, 
                  min_interval: float = 3.0,
                  scene_threshold: float = 0.3,
                  whisper_model: str = "tiny") -> list[ExtractedFrame]:
    """
    AI-native extraction: combine scene detection with transcript timing.
    
    Strategy:
    1. Get transcript with timestamps
    2. Detect scene changes
    3. For each transcript segment start, check if near a scene change
    4. Extract frames at meaningful moments (speech + visual change)
    5. Also extract at regular intervals if no activity (max 10s gaps)
    """
    frames_dir = os.path.join(output_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # Step 1: Transcribe
    segments = run_whisper(video_path, output_dir, model=whisper_model)
    print(f"[transcribe] Found {len(segments)} segments")
    
    # Step 2: Scene detection
    scene_times = detect_scene_changes(video_path, scene_threshold)
    print(f"[scene] Found {len(scene_times)} scene changes")
    
    # Step 3: Merge extraction points
    extraction_points = []
    
    # Add scene changes
    for t in scene_times:
        extraction_points.append((t, "scene_change", None))
    
    # Add speech segment starts (when someone starts talking about something new)
    for seg in segments:
        # Find if there's a scene change near this speech
        near_scene = any(abs(t - seg.start) < 2.0 for t in scene_times)
        if near_scene:
            extraction_points.append((seg.start, "speech_with_visual", seg.text))
        else:
            # Still valuable - new topic being discussed
            extraction_points.append((seg.start, "speech_start", seg.text))
    
    # Sort and deduplicate (keep minimum interval)
    extraction_points.sort(key=lambda x: x[0])
    
    filtered_points = []
    last_time = -min_interval
    for t, reason, context in extraction_points:
        if t - last_time >= min_interval:
            filtered_points.append((t, reason, context))
            last_time = t
    
    # Step 4: Fill gaps (max 10s without a frame)
    video_duration = get_video_duration(video_path)
    gap_filled = []
    last_time = 0
    for t, reason, context in filtered_points:
        while t - last_time > 10.0:
            last_time += 10.0
            gap_filled.append((last_time, "interval", None))
        gap_filled.append((t, reason, context))
        last_time = t
    
    # Add final frames if needed
    while video_duration - last_time > 10.0:
        last_time += 10.0
        gap_filled.append((last_time, "interval", None))
    
    filtered_points = sorted(gap_filled, key=lambda x: x[0])
    
    # Step 5: Extract frames
    extracted = []
    for i, (t, reason, context) in enumerate(filtered_points):
        frame_path = os.path.join(frames_dir, f"frame_{i:04d}_{t:.1f}s.jpg")
        if extract_frame(video_path, t, frame_path):
            extracted.append(ExtractedFrame(
                timestamp=t,
                path=frame_path,
                reason=reason,
                transcript_context=context
            ))
            print(f"[extract] {t:.1f}s - {reason}" + (f" | {context[:50]}..." if context else ""))
    
    return extracted

def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds."""
    result = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json", video_path
    ], capture_output=True, text=True)
    
    try:
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except:
        return 0.0

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Smart frame extraction with transcript coupling")
    parser.add_argument("video_path", help="Path to video file")
    parser.add_argument("output_dir", nargs="?", default="./output", help="Output directory")
    parser.add_argument("--whisper-model", "-m", default="tiny", 
                        choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: tiny)")
    args = parser.parse_args()
    
    os.makedirs(args.output_dir, exist_ok=True)
    
    frames = smart_extract(args.video_path, args.output_dir, whisper_model=args.whisper_model)
    
    # Save extraction manifest
    manifest = {
        "video": video_path,
        "frames": [
            {
                "timestamp": f.timestamp,
                "path": f.path,
                "reason": f.reason,
                "transcript": f.transcript_context
            }
            for f in frames
        ]
    }
    
    manifest_path = os.path.join(output_dir, "extraction-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n[done] Extracted {len(frames)} frames")
    print(f"[done] Manifest: {manifest_path}")

if __name__ == "__main__":
    main()
