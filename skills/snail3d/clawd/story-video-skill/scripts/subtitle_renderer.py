#!/usr/bin/env python3
"""
Subtitle Renderer - Frame-by-frame text rendering with animations
Creates subtitle frames synchronized to audio timing.
"""

import json
from pathlib import Path
from typing import List, Dict, Tuple
from PIL import Image, ImageDraw, ImageFont
import math

class SubtitleRenderer:
    def __init__(self, width: int = 1080, height: int = 1920, config: Dict = None):
        self.width = width
        self.height = height
        self.config = config or {}
        
        # Subtitle styling
        self.font_size = self.config.get('font_size', 54)
        self.color_current = self.config.get('color_current', '#FFD700')
        self.color_context = self.config.get('color_context', '#FFFFFF')
        self.shadow = self.config.get('shadow', True)
        self.shadow_blur = self.config.get('shadow_blur', 8)
        self.shadow_offset = self.config.get('shadow_offset_y', 4)
        self.animation_duration = self.config.get('animation_duration_ms', 200)
        
        # Try to load font, fallback to default
        self.font = self._load_font()
    
    def _load_font(self):
        """Load font, fallback to default if not available."""
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",  # macOS
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
            "C:\\Windows\\Fonts\\arial.ttf",  # Windows
        ]
        
        for path in font_paths:
            try:
                return ImageFont.truetype(path, self.font_size)
            except:
                continue
        
        # Fallback to default
        return ImageFont.load_default()
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def render_subtitle_frame(
        self,
        words: List[Dict],
        current_word_idx: int,
        background_image: Image.Image,
        frame_num: int
    ) -> Image.Image:
        """
        Render a single subtitle frame.
        
        Args:
            words: List of {word, animation_progress (0-1)}
            current_word_idx: Index of current word being spoken
            background_image: PIL Image for background
            frame_num: Frame number for animation timing
        
        Returns:
            PIL Image with rendered subtitles
        """
        # Start with background
        img = background_image.copy()
        draw = ImageDraw.Draw(img)
        
        # Build subtitle text with different colors
        subtitle_parts = []
        for i, word_data in enumerate(words):
            word = word_data['word']
            
            if i == current_word_idx:
                # Current word - highlight
                color = self._hex_to_rgb(self.color_current)
                # Add animation scaling
                scale = 1.0 + (word_data.get('animation_progress', 0) * 0.15)
            elif i < current_word_idx:
                # Past words - faded
                color = self._hex_to_rgb(self.color_context)
                alpha = 0.6
            else:
                # Future words - normal
                color = self._hex_to_rgb(self.color_context)
                alpha = 1.0
            
            subtitle_parts.append({
                'word': word,
                'color': color,
                'scale': scale if i == current_word_idx else 1.0
            })
        
        # Render full text
        full_text = ' '.join(part['word'] for part in subtitle_parts)
        
        # Get text bounding box (approximate) to center it
        bbox = draw.textbbox((0, 0), full_text, font=self.font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (self.width - text_width) // 2
        y = (self.height - text_height) // 2
        
        # Draw shadow for readability
        if self.shadow:
            shadow_color = (0, 0, 0, 200)
            draw.text(
                (x + self.shadow_offset, y + self.shadow_offset),
                full_text,
                font=self.font,
                fill=(0, 0, 0),
                anchor="lt"
            )
        
        # Draw main text
        draw.text(
            (x, y),
            full_text,
            font=self.font,
            fill=self._hex_to_rgb(self.color_context),
            anchor="lt"
        )
        
        # Optionally highlight current word differently
        if current_word_idx < len(subtitle_parts):
            current_color = self._hex_to_rgb(self.color_current)
            # This is simplified; full implementation would render word-by-word
            # for true individual word color/scale effects
        
        return img
    
    def create_subtitle_video(
        self,
        word_timings: List[Dict],
        background_image_path: str,
        output_dir: str,
        fps: int = 30
    ) -> str:
        """
        Create subtitle video frames.
        
        Args:
            word_timings: List of {word, start_ms, end_ms}
            background_image_path: Path to background image
            output_dir: Directory to save frame images
            fps: Frames per second
        
        Returns:
            Path to output directory with frames
        """
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # Load background
        bg_img = Image.open(background_image_path).convert('RGB')
        
        # Scale to 9:16 (1080x1920)
        bg_img.thumbnail((self.width, self.height), Image.Resampling.LANCZOS)
        
        # Center crop to exact size
        left = (bg_img.width - self.width) // 2
        top = (bg_img.height - self.height) // 2
        bg_img = bg_img.crop((left, top, left + self.width, top + self.height))
        
        # Get total duration from last word
        if word_timings:
            total_ms = max(w['end_ms'] for w in word_timings) + 500
        else:
            total_ms = 1000
        
        total_frames = int((total_ms / 1000) * fps)
        
        frame_num = 0
        for frame_num in range(total_frames):
            time_ms = (frame_num / fps) * 1000
            
            # Find current and upcoming words
            current_idx = 0
            for i, timing in enumerate(word_timings):
                if timing['start_ms'] <= time_ms <= timing['end_ms']:
                    current_idx = i
                    break
            
            # Create animation progress (0-1) for current word
            if current_idx < len(word_timings):
                word_start = word_timings[current_idx]['start_ms']
                word_end = word_timings[current_idx]['end_ms']
                word_duration = word_end - word_start
                
                if word_duration > 0:
                    progress = (time_ms - word_start) / word_duration
                    progress = min(max(progress, 0), 1)
                else:
                    progress = 0
            
            # Create words list with animation info
            words_with_progress = []
            for i, timing in enumerate(word_timings):
                words_with_progress.append({
                    'word': timing['word'],
                    'animation_progress': progress if i == current_idx else 0
                })
            
            # Render frame
            frame = self.render_subtitle_frame(
                words_with_progress,
                current_idx,
                bg_img,
                frame_num
            )
            
            # Save frame
            frame_path = Path(output_dir) / f"frame_{frame_num:06d}.png"
            frame.save(frame_path)
            
            if frame_num % 30 == 0:
                print(f"  Rendered frame {frame_num}/{total_frames}")
        
        print(f"✅ Subtitle frames: {total_frames} frames in {output_dir}")
        return output_dir

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Render subtitle video")
    parser.add_argument("--timings", required=True, help="Word timings JSON")
    parser.add_argument("--background", required=True, help="Background image")
    parser.add_argument("--output", required=True, help="Output directory for frames")
    
    args = parser.parse_args()
    
    # Load timings
    with open(args.timings) as f:
        timings = json.load(f)
    
    # Render
    renderer = SubtitleRenderer()
    renderer.create_subtitle_video(
        timings.get('words', []),
        args.background,
        args.output
    )

if __name__ == "__main__":
    main()
