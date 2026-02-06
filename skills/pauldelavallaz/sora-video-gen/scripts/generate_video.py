#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "openai>=1.0.0",
#     "httpx>=0.25.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Generate videos using OpenAI's Sora API.

Usage:
    uv run generate_video.py --prompt "video description" --filename "output.mp4" \
        [--input-image "reference.png"] [--seconds 4|8|12] [--size 720x1280] [--model sora-2]
"""

import argparse
import os
import sys
import time
import tempfile
from pathlib import Path
from io import BytesIO


def get_api_key(provided_key: str | None) -> str | None:
    """Get API key from argument first, then environment."""
    if provided_key:
        return provided_key
    return os.environ.get("OPENAI_API_KEY")


def resize_image_for_sora(image_path: str, target_size: str) -> BytesIO:
    """Resize and crop image to match Sora's required dimensions."""
    from PIL import Image
    
    # Parse target size
    width, height = map(int, target_size.split('x'))
    target_ratio = width / height
    
    # Open and process image
    img = Image.open(image_path)
    img_ratio = img.width / img.height
    
    # Crop to target aspect ratio (center crop)
    if img_ratio > target_ratio:
        # Image is wider - crop width
        new_width = int(img.height * target_ratio)
        left = (img.width - new_width) // 2
        img = img.crop((left, 0, left + new_width, img.height))
    elif img_ratio < target_ratio:
        # Image is taller - crop height
        new_height = int(img.width / target_ratio)
        top = (img.height - new_height) // 2
        img = img.crop((0, top, img.width, top + new_height))
    
    # Resize to exact dimensions
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Save to BytesIO as PNG
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return buffer


def download_video(api_key: str, video_id: str, output_path: Path) -> bool:
    """Download video content using httpx."""
    import httpx
    
    url = f"https://api.openai.com/v1/videos/{video_id}/content"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    try:
        with httpx.stream("GET", url, headers=headers, timeout=120) as response:
            response.raise_for_status()
            with open(output_path, "wb") as f:
                for chunk in response.iter_bytes():
                    f.write(chunk)
        return True
    except Exception as e:
        print(f"Download error: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate videos using OpenAI Sora"
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Video description/prompt"
    )
    parser.add_argument(
        "--filename", "-f",
        required=True,
        help="Output filename (e.g., video.mp4)"
    )
    parser.add_argument(
        "--input-image", "-i",
        help="Optional reference image path"
    )
    parser.add_argument(
        "--seconds", "-s",
        choices=["4", "8", "12"],
        default="8",
        help="Video duration in seconds (4, 8, or 12)"
    )
    parser.add_argument(
        "--size", "-sz",
        choices=["720x1280", "1280x720", "1024x1792", "1792x1024"],
        default="720x1280",
        help="Output resolution"
    )
    parser.add_argument(
        "--model", "-m",
        choices=["sora-2", "sora-2-pro"],
        default="sora-2",
        help="Model to use"
    )
    parser.add_argument(
        "--api-key", "-k",
        help="OpenAI API key (overrides OPENAI_API_KEY env var)"
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=10,
        help="Seconds between status checks"
    )

    args = parser.parse_args()

    # Get API key
    api_key = get_api_key(args.api_key)
    if not api_key:
        print("Error: No API key provided.", file=sys.stderr)
        print("Please either:", file=sys.stderr)
        print("  1. Provide --api-key argument", file=sys.stderr)
        print("  2. Set OPENAI_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    from openai import OpenAI
    
    client = OpenAI(api_key=api_key)
    
    # Set up output path
    output_path = Path(args.filename)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Creating video with {args.model}, {args.seconds}s, {args.size}...")
    print(f"Prompt: {args.prompt[:100]}...")
    
    try:
        # Prepare create params
        if args.input_image:
            print(f"Using reference image: {args.input_image}")
            print(f"Resizing to {args.size}...")
            
            # Resize image to match video dimensions
            resized_buffer = resize_image_for_sora(args.input_image, args.size)
            
            # Save to temp file for API
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(resized_buffer.getvalue())
                tmp_path = tmp.name
            
            try:
                with open(tmp_path, "rb") as image_file:
                    video = client.videos.create(
                        prompt=args.prompt,
                        model=args.model,
                        seconds=args.seconds,
                        size=args.size,
                        input_reference=image_file,
                    )
            finally:
                os.unlink(tmp_path)
        else:
            video = client.videos.create(
                prompt=args.prompt,
                model=args.model,
                seconds=args.seconds,
                size=args.size,
            )
        
        video_id = video.id
        print(f"Video job created: {video_id}")
        print(f"Status: {video.status}")
        
        # Poll for completion
        while True:
            video = client.videos.retrieve(video_id)
            status = video.status
            progress = getattr(video, 'progress', 0)
            
            print(f"Status: {status} | Progress: {progress}%")
            
            if status == "completed":
                break
            elif status == "failed":
                error = getattr(video, 'error', 'Unknown error')
                print(f"Error: Video generation failed - {error}", file=sys.stderr)
                sys.exit(1)
            
            time.sleep(args.poll_interval)
        
        # Download the video using direct HTTP request
        print("Downloading video...")
        
        if download_video(api_key, video_id, output_path):
            print(f"\nVideo saved: {output_path.resolve()}")
        else:
            print("Error: Failed to download video", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
