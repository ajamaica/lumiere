#!/usr/bin/env python3
"""
Gemini Image Generation - OpenAI Python SDK.

Usage:
    python3 generate.py "prompt" output.png
    python3 generate.py "edit instructions" output.png --input original.png

Requires GOOGLE_PROXY_API_KEY and GOOGLE_PROXY_BASE_URL environment variables.
"""

import base64
import os
import sys
from pathlib import Path

from openai import OpenAI

MODEL = "gemini-3-pro-image"


def get_env_var(name):
    """Get required environment variable."""
    value = os.environ.get(name)
    if not value:
        print(f"Error: {name} environment variable not set", file=sys.stderr)
        sys.exit(1)
    return value


def get_api_key():
    """Get API key from environment."""
    return get_env_var("GOOGLE_PROXY_API_KEY")


def get_base_url():
    """Get base URL from environment."""
    return get_env_var("GOOGLE_PROXY_BASE_URL").rstrip("/")


def generate_image(prompt, output_path, input_image_path=None):
    """Generate or edit an image using OpenAI Python SDK."""
    api_key = get_api_key()
    base_url = get_base_url()

    client = OpenAI(api_key=api_key, base_url=base_url)

    if input_image_path:
        if not os.path.exists(input_image_path):
            print(f"Error: Input image not found: {input_image_path}", file=sys.stderr)
            sys.exit(1)

        with open(input_image_path, "rb") as image_file:
            response = client.images.edits(
                model=MODEL,
                prompt=prompt,
                image=image_file,
                response_format="b64_json",
                n=1,
            )
    else:
        response = client.images.generate(
            model=MODEL,
            prompt=prompt,
            response_format="b64_json",
            n=1,
        )

    # Extract image from response
    try:
        data_items = response.data or []
        if not data_items:
            print("Error: No image data in response", file=sys.stderr)
            sys.exit(1)

        b64_data = data_items[0].b64_json
        if not b64_data:
            print("Error: Missing b64_json in response", file=sys.stderr)
            sys.exit(1)

        img_data = base64.b64decode(b64_data)

        # Ensure output directory exists
        output_dir = Path(output_path).parent
        if output_dir and not output_dir.exists():
            output_dir.mkdir(parents=True, exist_ok=True)

        with open(output_path, "wb") as f:
            f.write(img_data)

        print(f"Saved: {output_path}")
        return output_path
    except (AttributeError, IndexError) as e:
        print(f"Error parsing response: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate or edit images using OpenAI Python SDK"
    )
    parser.add_argument("prompt", help="Image prompt or edit instructions")
    parser.add_argument("output", help="Output file path (e.g., output.png)")
    parser.add_argument("--input", "-i", help="Input image for editing (optional)")

    args = parser.parse_args()

    generate_image(args.prompt, args.output, args.input)


if __name__ == "__main__":
    main()
