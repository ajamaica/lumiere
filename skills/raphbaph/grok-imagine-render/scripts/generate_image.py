#!/usr/bin/env python3
"""
Generate images using Grok (xAI) API.
Reads GROK_API_KEY from environment or .env file.
Uses curl for API calls (no httpx dependency).
"""
import os
import sys
import json
import argparse
import subprocess
from pathlib import Path

def load_env():
    """Load .env file if it exists."""
    env_path = Path.home() / ".clawdbot" / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

def run_curl(cmd):
    """Run a curl command and return parsed JSON."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Curl failed: {result.stderr}")
    return json.loads(result.stdout)

def generate_image(prompt: str, output_path: str = None, size: str = "1024x1024") -> str:
    """
    Generate an image using Grok's API.
    
    Args:
        prompt: Description of the image to generate
        output_path: Path to save the image (optional)
        size: Image size - 256x256, 512x512, or 1024x1024
    
    Returns:
        Path to saved image or URL
    """
    api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")
    if not api_key:
        raise ValueError("GROK_API_KEY not found in environment. Add it to ~/.clawdbot/.env")
    
    # Generate image
    cmd = f'''curl -s -X POST "https://api.x.ai/v1/images/generations" \
      -H "Authorization: Bearer {api_key}" \
      -H "Content-Type: application/json" \
      -d '{{"model": "grok-imagine-image", "prompt": {json.dumps(prompt)}, "n": 1}}' '''
    
    data = run_curl(cmd)
    image_url = data["data"][0]["url"]
    
    if output_path:
        # Download and save the image
        cmd = f"curl -s -o {output_path} {image_url}"
        subprocess.run(cmd, shell=True, check=True)
        return output_path
    
    return image_url

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate images using Grok API")
    parser.add_argument("prompt", help="Image prompt")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--size", default="1024x1024", choices=["256x256", "512x512", "1024x1024"],
                       help="Image size")
    
    args = parser.parse_args()
    
    load_env()
    
    try:
        result = generate_image(args.prompt, args.output, args.size)
        print(f"Image saved to: {result}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
