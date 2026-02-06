#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Generate images using Google's Nano Banana Pro (Gemini 3 Pro Image) API.

Supports:
- Text-to-image generation
- Image editing (in-context editing)
- Reference images for style/character/subject consistency

Usage:
    # Basic generation
    uv run generate_image.py --prompt "your description" --filename "output.png"
    
    # With reference image for style transfer
    uv run generate_image.py --prompt "a burger in this style" --filename "output.png" \
        --reference-image "style.jpg" --reference-type STYLE
    
    # Edit an existing image
    uv run generate_image.py --prompt "change the background to a beach" --filename "output.png" \
        --input-image "original.jpg"
"""

import argparse
import base64
import os
import sys
from pathlib import Path


def get_api_key(provided_key: str | None) -> str | None:
    """Get API key from argument first, then environment."""
    if provided_key:
        return provided_key
    return os.environ.get("GEMINI_API_KEY")


def image_to_base64(image_path: str) -> str:
    """Convert image file to base64 string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_mime_type(image_path: str) -> str:
    """Get MIME type from file extension."""
    ext = Path(image_path).suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return mime_types.get(ext, "image/jpeg")


def main():
    parser = argparse.ArgumentParser(
        description="Generate images using Nano Banana Pro (Gemini 3 Pro Image)"
    )
    parser.add_argument(
        "--prompt", "-p",
        required=True,
        help="Image description/prompt"
    )
    parser.add_argument(
        "--filename", "-f",
        required=True,
        help="Output filename (e.g., sunset-mountains.png)"
    )
    parser.add_argument(
        "--input-image", "-i",
        help="Input image path for editing/modification (in-context editing)"
    )
    parser.add_argument(
        "--reference-image", "-ref",
        action="append",
        help="Reference image(s) for style/character/subject consistency (can specify multiple)"
    )
    parser.add_argument(
        "--reference-type", "-rt",
        choices=["STYLE", "CHARACTER", "SUBJECT"],
        default="STYLE",
        help="Type of reference: STYLE (transfer style), CHARACTER (face/traits), SUBJECT (composition)"
    )
    parser.add_argument(
        "--aspect-ratio", "-ar",
        choices=["1:1", "4:3", "3:4", "16:9", "9:16"],
        help="Output aspect ratio (default: auto or 1:1)"
    )
    parser.add_argument(
        "--resolution", "-r",
        choices=["1K", "2K", "4K"],
        default="2K",
        help="Output resolution: 1K, 2K (default), or 4K"
    )
    parser.add_argument(
        "--num-images", "-n",
        type=int,
        default=1,
        help="Number of images to generate (1-4)"
    )
    parser.add_argument(
        "--api-key", "-k",
        help="Gemini API key (overrides GEMINI_API_KEY env var)"
    )

    args = parser.parse_args()

    # Get API key
    api_key = get_api_key(args.api_key)
    if not api_key:
        print("Error: No API key provided.", file=sys.stderr)
        print("Please either:", file=sys.stderr)
        print("  1. Provide --api-key argument", file=sys.stderr)
        print("  2. Set GEMINI_API_KEY environment variable", file=sys.stderr)
        sys.exit(1)

    # Import here after checking API key to avoid slow import on error
    from google import genai
    from google.genai import types
    from PIL import Image as PILImage

    # Initialize client
    client = genai.Client(api_key=api_key)

    # Set up output path
    output_path = Path(args.filename)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Build content parts
    parts = []
    
    # Add reference images if provided
    if args.reference_image:
        for ref_path in args.reference_image:
            try:
                ref_img = PILImage.open(ref_path)
                parts.append(ref_img)
                print(f"Added reference image ({args.reference_type}): {ref_path}")
            except Exception as e:
                print(f"Error loading reference image {ref_path}: {e}", file=sys.stderr)
                sys.exit(1)
    
    # Add input image for editing if provided
    if args.input_image:
        try:
            input_img = PILImage.open(args.input_image)
            parts.append(input_img)
            print(f"Added input image for editing: {args.input_image}")
        except Exception as e:
            print(f"Error loading input image: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Build prompt with reference type instruction if using references
    prompt = args.prompt
    if args.reference_image and not args.input_image:
        # Add reference type context to prompt
        if args.reference_type == "STYLE":
            prompt = f"Using the style from the reference image(s), create: {args.prompt}"
        elif args.reference_type == "CHARACTER":
            prompt = f"Maintaining the character/person consistency from the reference image(s), create: {args.prompt}"
        elif args.reference_type == "SUBJECT":
            prompt = f"Using the subject/composition from the reference image(s), create: {args.prompt}"
    
    parts.append(prompt)
    
    # Determine what we're doing
    if args.input_image:
        print(f"Editing image with resolution {args.resolution}...")
    elif args.reference_image:
        print(f"Generating with {len(args.reference_image)} reference image(s), resolution {args.resolution}...")
    else:
        print(f"Generating image with resolution {args.resolution}...")

    try:
        # Build generation config
        gen_config = types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(
                image_size=args.resolution
            )
        )
        
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=parts,
            config=gen_config
        )
        
        # Process response and save images
        image_count = 0
        for part in response.parts:
            if part.text is not None:
                print(f"Model response: {part.text}")
            elif part.inline_data is not None:
                from io import BytesIO
                
                image_data = part.inline_data.data
                if isinstance(image_data, str):
                    image_data = base64.b64decode(image_data)
                
                image = PILImage.open(BytesIO(image_data))
                
                # Determine output filename (add suffix for multiple images)
                if args.num_images > 1 and image_count > 0:
                    stem = output_path.stem
                    suffix = output_path.suffix
                    save_path = output_path.parent / f"{stem}-{image_count + 1}{suffix}"
                else:
                    save_path = output_path
                
                # Save as PNG
                if image.mode == 'RGBA':
                    rgb_image = PILImage.new('RGB', image.size, (255, 255, 255))
                    rgb_image.paste(image, mask=image.split()[3])
                    rgb_image.save(str(save_path), 'PNG')
                elif image.mode == 'RGB':
                    image.save(str(save_path), 'PNG')
                else:
                    image.convert('RGB').save(str(save_path), 'PNG')
                
                print(f"Image saved: {save_path.resolve()}")
                image_count += 1
        
        if image_count == 0:
            print("Error: No image was generated in the response.", file=sys.stderr)
            sys.exit(1)
        
        print(f"\nTotal images saved: {image_count}")
            
    except Exception as e:
        print(f"Error generating image: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
