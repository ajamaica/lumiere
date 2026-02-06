#!/usr/bin/env python3
"""
NVIDIA FLUX Image Generation Script
Supports text-to-image generation and image editing with full parameter control.
"""

import requests
import base64
import sys
import os
import json
from pathlib import Path

# API Configuration
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "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")

# Model endpoints
MODELS = {
    "dev": "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev",
    "schnell": "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell",
    "kontext": "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev",
}

# Supported sizes for text-to-image
SUPPORTED_SIZES = {
    "1:1": (1024, 1024),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
    "4:3": (1216, 832),
    "3:4": (832, 1216),
}

def encode_image_to_base64(image_path: str) -> str:
    """Encode an image file to base64 data URI."""
    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    
    ext = Path(image_path).suffix.lower()
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime_type = mime_types.get(ext, "image/png")
    
    return f"data:{mime_type};base64,{data}"

def generate_image(
    prompt: str,
    input_image: str = None,
    output_path: str = "output.png",
    width: int = None,
    height: int = None,
    aspect_ratio: str = "1:1",
    steps: int = 30,
    guidance_scale: float = 3.5,
    seed: int = 0,
    model: str = "auto",
) -> str:
    """
    Generate or edit an image using NVIDIA FLUX model.
    
    Args:
        prompt: Text description of what to generate/edit
        input_image: Path to input image (for editing) or None (for generation)
        output_path: Path to save the output image
        width: Output width (overrides aspect_ratio)
        height: Output height (overrides aspect_ratio)
        aspect_ratio: Output aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
        steps: Number of diffusion steps (higher = better quality, slower)
        guidance_scale: CFG scale (higher = more prompt adherence)
        seed: Random seed (0 for random)
        model: Model to use ("dev", "schnell", "kontext", or "auto")
    
    Returns:
        Path to the generated image
    """
    # Auto-select model based on whether input image is provided
    if model == "auto":
        model = "kontext" if input_image else "dev"
    
    invoke_url = MODELS.get(model)
    if not invoke_url:
        raise ValueError(f"Unknown model: {model}. Available: {list(MODELS.keys())}")
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Build payload based on model type
    if model == "kontext":
        # Image editing model
        if not input_image:
            raise ValueError("kontext model requires an input image for editing")
        if not os.path.exists(input_image):
            raise FileNotFoundError(f"Input image not found: {input_image}")
        
        payload = {
            "prompt": prompt,
            "image": encode_image_to_base64(input_image),
            "aspect_ratio": "match_input_image",
            "steps": steps,
            "cfg_scale": guidance_scale,
            "seed": seed,
        }
        print(f"🎨 Editing image with prompt: {prompt}", file=sys.stderr)
        print(f"📷 Input image: {input_image}", file=sys.stderr)
    else:
        # Text-to-image models (dev, schnell)
        # Note: FLUX API only supports prompt, width, height, steps, seed
        payload = {
            "prompt": prompt,
        }
        
        # Add optional parameters only if specified
        if steps and steps != 30:
            payload["steps"] = steps
        if seed and seed != 0:
            payload["seed"] = seed
        
        # Set dimensions
        if width and height:
            payload["width"] = width
            payload["height"] = height
            print(f"📐 Size: {width}x{height}", file=sys.stderr)
        elif aspect_ratio in SUPPORTED_SIZES:
            w, h = SUPPORTED_SIZES[aspect_ratio]
            payload["width"] = w
            payload["height"] = h
            print(f"📐 Aspect ratio: {aspect_ratio} ({w}x{h})", file=sys.stderr)
        
        print(f"🎨 Generating image with prompt: {prompt}", file=sys.stderr)
    
    info_parts = [f"Model: {model}"]
    if steps: info_parts.append(f"Steps: {steps}")
    if seed: info_parts.append(f"Seed: {seed}")
    print(f"🤖 {' | '.join(info_parts)}", file=sys.stderr)
    
    response = requests.post(invoke_url, headers=headers, json=payload, timeout=180)
    
    if response.status_code != 200:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get("detail", error_detail)
        except:
            pass
        raise Exception(f"API error ({response.status_code}): {error_detail}")
    
    result = response.json()
    
    # Extract and save the image
    image_data = None
    
    # Try different response formats
    if "artifacts" in result and len(result["artifacts"]) > 0:
        image_data = result["artifacts"][0].get("base64")
    elif "image" in result:
        image_data = result["image"]
    
    if image_data:
        # Remove data URI prefix if present
        if image_data.startswith("data:"):
            image_data = image_data.split(",", 1)[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        with open(output_path, "wb") as f:
            f.write(image_bytes)
        
        print(f"✅ Image saved to: {output_path}", file=sys.stderr)
        return output_path
    else:
        print(f"⚠️ Unexpected response format: {json.dumps(result, indent=2)}", file=sys.stderr)
        return None

def main():
    """CLI interface for image generation."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate images using NVIDIA FLUX models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Simple generation
  %(prog)s "A mountain landscape at sunset"
  
  # Portrait aspect ratio
  %(prog)s "A professional headshot" --aspect-ratio 9:16
  
  # Custom size
  %(prog)s "A wide banner" --width 1344 --height 768
  
  # High quality with more steps
  %(prog)s "Detailed fantasy castle" --steps 50 --cfg 5.0
  
  # Fast generation
  %(prog)s "Quick sketch" --model schnell
  
  # Edit an image
  %(prog)s "Add sunglasses" -i photo.jpg -o edited.png
  
  # Reproducible with seed
  %(prog)s "A robot" --seed 12345
        """
    )
    parser.add_argument("prompt", help="Text prompt for image generation/editing")
    parser.add_argument("-i", "--input", help="Input image path (for editing with kontext model)")
    parser.add_argument("-o", "--output", default="output.png", help="Output image path (default: output.png)")
    parser.add_argument("--width", type=int, help="Output width in pixels")
    parser.add_argument("--height", type=int, help="Output height in pixels")
    parser.add_argument("--aspect-ratio", "-ar", default="16:9", 
                        choices=list(SUPPORTED_SIZES.keys()),
                        help="Aspect ratio (default: 16:9)")
    parser.add_argument("--steps", "-s", type=int, default=30, 
                        help="Diffusion steps, higher=better quality (default: 30)")
    parser.add_argument("--cfg", "--guidance-scale", type=float, default=3.5, dest="guidance_scale",
                        help="CFG guidance scale (default: 3.5)")
    parser.add_argument("--seed", type=int, default=0, 
                        help="Random seed, 0=random (default: 0)")
    parser.add_argument("--model", "-m", default="auto", 
                        choices=["auto", "dev", "schnell", "kontext"],
                        help="Model: auto, dev (quality), schnell (fast), kontext (edit)")
    
    args = parser.parse_args()
    
    try:
        result = generate_image(
            prompt=args.prompt,
            input_image=args.input,
            output_path=args.output,
            width=args.width,
            height=args.height,
            aspect_ratio=args.aspect_ratio,
            steps=args.steps,
            guidance_scale=args.guidance_scale,
            seed=args.seed,
            model=args.model,
        )
        if result:
            # Output in MEDIA format for Moltbot
            print(f"MEDIA:{os.path.abspath(result)}")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
