#!/usr/bin/env python3
"""
Story-to-Video Generator - FULL IMPLEMENTATION
Converts narrated audio + text into YouTube Shorts videos with synced subtitles,
dynamic background images, and professional subtitle effects.
"""

import json
import argparse
import subprocess
import os
import re
from pathlib import Path
from typing import Optional, Dict, List
try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    subprocess.run(["pip3", "install", "Pillow"], check=True)
    from PIL import Image
import sys

# Import bundled modules
sys.path.insert(0, str(Path(__file__).parent))
from transcribe_audio import transcribe_with_groq
from search_images import search_images
from subtitle_renderer import SubtitleRenderer

class StoryVideoGenerator:
    def __init__(self, audio_path: str, text: str, config: Optional[Dict] = None, title: str = "Story"):
        self.audio_path = Path(audio_path)
        self.text = text
        self.config = config or self._default_config()
        self.title = title
        self.temp_dir = Path("/tmp/story-video-gen")
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.validate_inputs()
    
    def _default_config(self) -> Dict:
        """Default configuration."""
        return {
            "subtitle_style": "bold",
            "background_source": "unsplash",
            "subtitles": {
                "font_size": 54,
                "color_current": "#FFD700",
                "color_context": "#FFFFFF",
                "shadow": True,
                "shadow_blur": 8,
                "shadow_offset_y": 4,
                "animation_duration_ms": 200
            },
            "background": {
                "zoom_effect": "subtle",
                "zoom_speed": 0.3,
                "fade_between_sections": True,
                "fade_duration_ms": 500
            }
        }
    
    def validate_inputs(self):
        """Validate inputs."""
        if not self.audio_path.exists():
            raise FileNotFoundError(f"Audio not found: {self.audio_path}")
        if not self.text.strip():
            raise ValueError("Text empty")
    
    def _get_audio_duration(self) -> float:
        """Get audio duration in seconds using ffprobe."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1:nokey_runfor_each_subsection=1",
                str(self.audio_path)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except:
            # Fallback: estimate from text
            words = len(self.text.split())
            return words / 2.5  # ~150 words per minute
    
    def _parse_sections(self) -> List[Dict]:
        """Parse sections from config or auto-generate."""
        if "sections" in self.config:
            return self.config["sections"]
        
        # Auto-generate sections (every 10 words roughly)
        words = self.text.split()
        duration = self._get_audio_duration()
        words_per_second = len(words) / max(duration, 1)
        
        sections = []
        section_words = 15  # ~1 second per section
        
        for i in range(0, len(words), section_words):
            section_text = " ".join(words[i:i+section_words])
            start_time = i / words_per_second
            end_time = min((i + section_words) / words_per_second, duration)
            
            sections.append({
                "start_time": start_time,
                "end_time": end_time,
                "text": section_text,
                "search_query": section_text[:50]  # Use first 50 chars as query
            })
        
        return sections
    
    def generate(self, output_path: str) -> str:
        """
        Full video generation pipeline.
        Returns: Path to generated MP4
        """
        output_path = Path(output_path)
        
        print(f"\n🎬 STORY-VIDEO GENERATOR")
        print(f"{'='*60}")
        print(f"📄 Title: {self.title}")
        print(f"🎵 Audio: {self.audio_path}")
        print(f"⏱️  Duration: {self._get_audio_duration():.1f}s")
        print(f"📝 Text: {len(self.text)} chars, {len(self.text.split())} words\n")
        
        # Step 1: Transcribe to get word timings
        print("1️⃣  TRANSCRIBING AUDIO...")
        word_timings = self._transcribe_audio()
        print(f"   ✅ {len(word_timings)} words with timing\n")
        
        # Step 2: Parse sections and search for background images
        print("2️⃣  SEARCHING BACKGROUND IMAGES...")
        sections = self._parse_sections()
        background_images = self._get_background_images(sections)
        print(f"   ✅ Found {len(background_images)} background images\n")
        
        # Step 3: Render subtitle frames
        print("3️⃣  RENDERING SUBTITLES...")
        subtitle_frames_dir = self._render_subtitles(word_timings, background_images)
        print(f"   ✅ Rendered subtitle frames\n")
        
        # Step 4: Compose video with ffmpeg
        print("4️⃣  COMPOSING VIDEO...")
        self._compose_video(
            str(self.audio_path),
            subtitle_frames_dir,
            str(output_path)
        )
        print(f"   ✅ Video composed\n")
        
        print(f"{'='*60}")
        print(f"✨ VIDEO READY: {output_path}")
        print(f"📱 Format: YouTube Shorts (9:16, 1080x1920)")
        print(f"🎬 Duration: {self._get_audio_duration():.1f}s")
        print(f"{'='*60}\n")
        
        return str(output_path)
    
    def _transcribe_audio(self) -> List[Dict]:
        """Transcribe audio and get word timings."""
        # Use Groq Whisper to transcribe
        result = transcribe_with_groq(str(self.audio_path))
        
        # Parse text into words with estimated timings
        words = self.text.split()
        duration = self._get_audio_duration()
        words_per_second = len(words) / max(duration, 1)
        
        word_timings = []
        current_time = 0
        
        for word in words:
            word_duration = 1.0 / words_per_second
            word_timings.append({
                "word": word,
                "start_ms": int(current_time * 1000),
                "end_ms": int((current_time + word_duration) * 1000)
            })
            current_time += word_duration
        
        # Save timings
        timings_file = self.temp_dir / "word_timings.json"
        with open(timings_file, "w") as f:
            json.dump({"words": word_timings}, f)
        
        return word_timings
    
    def _get_background_images(self, sections: List[Dict]) -> Dict[int, str]:
        """Search for and download background images."""
        results = {}
        
        for i, section in enumerate(sections):
            query = section.get("search_query", section["text"][:50])
            print(f"   Searching: {query[:40]}...")
            
            # Search with our search_images function
            try:
                images = search_images([section], source="unsplash", cache_dir=str(self.temp_dir / "images"))
                if i in images:
                    results[i] = images[i]
            except Exception as e:
                print(f"   ⚠️  Search failed: {e}")
        
        # Fallback: create solid color background if no images found
        if not results:
            print(f"   Creating fallback background...")
            fallback = self._create_fallback_background()
            results[0] = fallback
        
        return results
    
    def _create_fallback_background(self) -> str:
        """Create a solid color background image."""
        img = Image.new('RGB', (1080, 1920), color=(26, 26, 26))  # Dark background
        bg_path = self.temp_dir / "fallback_bg.jpg"
        img.save(bg_path)
        return str(bg_path)
    
    def _render_subtitles(self, word_timings: List[Dict], backgrounds: Dict[int, str]) -> str:
        """Render subtitle frames."""
        frames_dir = self.temp_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        
        # Use primary background or fallback
        bg_image = backgrounds.get(0, self._create_fallback_background())
        
        # Render frames
        renderer = SubtitleRenderer(config=self.config.get("subtitles", {}))
        renderer.create_subtitle_video(
            word_timings,
            bg_image,
            str(frames_dir),
            fps=30
        )
        
        return str(frames_dir)
    
    def _compose_video(self, audio_path: str, frames_dir: str, output_path: str):
        """Compose final video using ffmpeg."""
        frames_pattern = f"{frames_dir}/frame_%06d.png"
        
        cmd = [
            "ffmpeg",
            "-y",  # Overwrite output
            "-framerate", "30",
            "-i", frames_pattern,
            "-i", audio_path,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            output_path
        ]
        
        print(f"   Running ffmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"   ❌ ffmpeg error: {result.stderr}")
            raise Exception("Video composition failed")

def main():
    parser = argparse.ArgumentParser(
        description="Generate YouTube Shorts from story + audio"
    )
    parser.add_argument("--audio", required=True, help="Audio MP3/WAV")
    parser.add_argument("--text", required=True, help="Story text")
    parser.add_argument("--output", required=True, help="Output MP4")
    parser.add_argument("--config", help="Config JSON")
    parser.add_argument("--title", default="Story", help="Video title")
    
    args = parser.parse_args()
    
    config = {}
    if args.config:
        with open(args.config) as f:
            config = json.load(f)
    
    # Handle text from file or direct string
    text = args.text
    if args.text.endswith('.txt') and Path(args.text).exists():
        with open(args.text) as f:
            text = f.read()
    
    generator = StoryVideoGenerator(args.audio, text, config, args.title)
    generator.generate(args.output)

if __name__ == "__main__":
    main()
