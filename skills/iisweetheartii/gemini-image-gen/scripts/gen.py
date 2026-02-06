#!/usr/bin/env python3
"""Generate and edit images via Google Gemini API.

Supports two engines:
  - gemini: Native Gemini image generation (gemini-2.5-flash-image). Supports editing.
  - imagen: Google Imagen 3 (imagen-3.0-generate-002). High-quality generation.

Zero external dependencies — pure Python stdlib only.
"""

import argparse
import base64
import datetime as dt
import json
import os
import random
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

STYLE_PRESETS = {
    "photo": "ultra-detailed photorealistic photography, 8K resolution, sharp focus",
    "anime": "high-quality anime illustration, Studio Ghibli inspired, vibrant colors",
    "watercolor": "delicate watercolor painting on textured paper, soft edges, gentle color bleeding",
    "cyberpunk": "neon-lit cyberpunk scene, rain-soaked streets, holographic displays, Blade Runner aesthetic",
    "minimalist": "clean minimalist design, geometric shapes, limited color palette, white space",
    "oil-painting": "classical oil painting with visible brushstrokes, rich textures, Renaissance lighting",
    "pixel-art": "detailed pixel art, retro 16-bit style, crisp edges, nostalgic palette",
    "sketch": "pencil sketch on cream paper, hatching and cross-hatching, artistic imperfections",
    "3d-render": "professional 3D render, ambient occlusion, global illumination, photorealistic materials",
    "pop-art": "bold pop art style, Ben-Day dots, strong outlines, vibrant contrasting colors",
}

API_BASE = "https://generativelanguage.googleapis.com/v1beta"

GEMINI_DEFAULT_MODEL = "gemini-2.5-flash-image"
IMAGEN_DEFAULT_MODEL = "imagen-3.0-generate-002"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:50] or "image"


def default_out_dir() -> Path:
    now = dt.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    preferred = Path.home() / "Projects" / "tmp"
    base = preferred if preferred.is_dir() else Path("./tmp")
    base.mkdir(parents=True, exist_ok=True)
    return base / f"gemini-image-gen-{now}"


def pick_prompts(count: int) -> list:
    subjects = [
        "a space lobster piloting a tiny rocket",
        "a cozy Japanese tea house in autumn rain",
        "a brutalist concrete library floating in clouds",
        "a cyberpunk street food vendor at midnight",
        "a miniature garden inside a lightbulb",
        "a steampunk clockwork butterfly",
        "an underwater city made of coral and glass",
        "a fox reading a book under cherry blossoms",
        "a retro-futuristic diner on the moon",
        "a crystal cave reflecting aurora borealis",
    ]
    styles = [
        "ultra-detailed digital art",
        "35mm film photography",
        "soft watercolor illustration",
        "cinematic wide-angle shot",
        "isometric 3D render",
        "editorial magazine photo",
        "Studio Ghibli anime style",
        "oil painting with heavy brushstrokes",
        "minimalist vector illustration",
        "photorealistic macro photography",
    ]
    moods = [
        "golden hour warmth",
        "moody neon glow",
        "soft morning fog",
        "dramatic chiaroscuro lighting",
        "ethereal pastel dream",
        "vibrant pop art colors",
    ]
    prompts = []
    for _ in range(count):
        prompts.append(
            f"{random.choice(styles)} of {random.choice(subjects)}, {random.choice(moods)}"
        )
    return prompts


def load_image_as_base64(path: str) -> tuple:
    """Load an image file and return (base64_data, mime_type)."""
    p = Path(path).expanduser()
    if not p.exists():
        raise FileNotFoundError(f"Image not found: {p}")
    ext = p.suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    mime_type = mime_map.get(ext, "image/png")
    data = base64.b64encode(p.read_bytes()).decode("utf-8")
    return data, mime_type


# ---------------------------------------------------------------------------
# Gemini Native Engine
# ---------------------------------------------------------------------------

def gemini_generate(api_key: str, prompt: str, model: str) -> bytes:
    """Generate an image using Gemini native generateContent."""
    url = f"{API_BASE}/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        method="POST",
        headers={"Content-Type": "application/json"},
        data=body,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error ({e.code}): {err[:500]}") from e

    # Extract image from response
    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError(f"No image in response: {json.dumps(result)[:400]}")


def gemini_edit(api_key: str, prompt: str, image_path: str, model: str) -> bytes:
    """Edit an image using Gemini native generateContent with inline image."""
    img_data, mime_type = load_image_as_base64(image_path)
    url = f"{API_BASE}/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": img_data}},
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        method="POST",
        headers={"Content-Type": "application/json"},
        data=body,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error ({e.code}): {err[:500]}") from e

    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError(f"No image in edit response: {json.dumps(result)[:400]}")


# ---------------------------------------------------------------------------
# Imagen Engine
# ---------------------------------------------------------------------------

def imagen_generate(api_key: str, prompt: str, model: str, aspect: str) -> bytes:
    """Generate an image using Imagen 3 via OpenAI-compatible endpoint."""
    url = f"{API_BASE}/openai/images/generations"
    payload = {
        "model": model,
        "prompt": prompt,
        "response_format": "b64_json",
        "n": 1,
    }
    if aspect and aspect != "1:1":
        # Map aspect ratio to size for Imagen
        aspect_map = {
            "16:9": "1536x864",
            "9:16": "864x1536",
            "4:3": "1280x960",
            "3:4": "960x1280",
        }
        if aspect in aspect_map:
            payload["size"] = aspect_map[aspect]

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=body,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Imagen API error ({e.code}): {err[:500]}") from e

    data = result.get("data", [{}])
    if data and data[0].get("b64_json"):
        return base64.b64decode(data[0]["b64_json"])
    raise RuntimeError(f"No image in Imagen response: {json.dumps(result)[:400]}")


# ---------------------------------------------------------------------------
# Gallery
# ---------------------------------------------------------------------------

def write_gallery(out_dir: Path, items: list, engine: str) -> None:
    thumbs = "\n".join(
        [
            f'<figure>\n'
            f'  <a href="{it["file"]}"><img src="{it["file"]}" loading="lazy" /></a>\n'
            f'  <figcaption>{it["prompt"]}</figcaption>\n'
            f'</figure>'
            for it in items
        ]
    )
    html = f"""<!doctype html>
<meta charset="utf-8" />
<title>gemini-image-gen ({engine})</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 24px; font: 14px/1.4 ui-sans-serif, system-ui; background: #0b0f14; color: #e8edf2; }}
  h1 {{ font-size: 18px; margin: 0 0 4px; }}
  .meta {{ color: #7a8a99; margin-bottom: 16px; font-size: 13px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }}
  figure {{ margin: 0; padding: 12px; border: 1px solid #1e2a36; border-radius: 14px; background: #0f1620; transition: border-color .2s; }}
  figure:hover {{ border-color: #3b82f6; }}
  img {{ width: 100%; height: auto; border-radius: 10px; display: block; }}
  figcaption {{ margin-top: 10px; color: #b7c2cc; font-size: 13px; line-height: 1.4; }}
  a {{ color: inherit; text-decoration: none; }}
  .footer {{ margin-top: 24px; color: #4a5568; font-size: 12px; }}
</style>
<h1>gemini-image-gen</h1>
<p class="meta">Engine: <strong>{engine}</strong> &middot; {len(items)} images &middot; {dt.datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
<div class="grid">
{thumbs}
</div>
<p class="footer">Generated with <a href="https://github.com/IISweetHeartII/gemini-image-gen" style="color:#3b82f6">gemini-image-gen</a> by @IISweetHeartII</p>
"""
    (out_dir / "index.html").write_text(html, encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Generate and edit images via Google Gemini API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # 4 random images (Gemini native)
  %(prog)s --prompt "a cat in space" --count 8
  %(prog)s --engine imagen --aspect 16:9
  %(prog)s --edit photo.png --prompt "make it watercolor style"
""",
    )
    ap.add_argument("--prompt", help="Text prompt. Omit for random creative prompts.")
    ap.add_argument("--count", type=int, default=4, help="Number of images (default: 4).")
    ap.add_argument("--engine", choices=["gemini", "imagen"], default="gemini",
                    help="Engine: gemini (native, supports edit) or imagen (Imagen 3).")
    ap.add_argument("--model", default="",
                    help="Model override. Default: gemini-2.5-flash-image or imagen-3.0-generate-002.")
    ap.add_argument("--edit", metavar="IMAGE", default="",
                    help="Path to input image for editing (Gemini engine only).")
    ap.add_argument("--aspect", default="1:1",
                    help="Aspect ratio for Imagen: 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1).")
    ap.add_argument("--out-dir", default="", help="Output directory.")
    ap.add_argument("--style", choices=sorted(STYLE_PRESETS.keys()),
                    help="Style preset to prepend to prompt.")
    ap.add_argument("--styles", action="store_true",
                    help="List available style presets and exit.")
    args = ap.parse_args()

    if args.styles:
        print("Available styles:")
        for key in sorted(STYLE_PRESETS.keys()):
            print(f"- {key}: {STYLE_PRESETS[key]}")
        return 0

    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY not set.", file=sys.stderr)
        print("Get a free key at https://aistudio.google.com/apikey", file=sys.stderr)
        return 2

    if args.edit and args.engine != "gemini":
        print("Error: --edit is only supported with --engine gemini", file=sys.stderr)
        return 2

    model = args.model or (GEMINI_DEFAULT_MODEL if args.engine == "gemini" else IMAGEN_DEFAULT_MODEL)
    out_dir = Path(args.out_dir).expanduser() if args.out_dir else default_out_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    count = args.count
    if args.edit:
        prompts = [args.prompt or "enhance this image"]
        count = 1
    else:
        prompts = [args.prompt] * count if args.prompt else pick_prompts(count)

    if args.style:
        prompts = [f"{STYLE_PRESETS[args.style]}. {prompt}" for prompt in prompts]

    print(f"Engine: {args.engine} ({model})")
    print(f"Output: {out_dir.as_posix()}\n")

    items = []
    for idx, prompt in enumerate(prompts, start=1):
        print(f"[{idx}/{len(prompts)}] {prompt}")
        try:
            if args.edit:
                img_bytes = gemini_edit(api_key, prompt, args.edit, model)
            elif args.engine == "gemini":
                img_bytes = gemini_generate(api_key, prompt, model)
            else:
                img_bytes = imagen_generate(api_key, prompt, model, args.aspect)
        except RuntimeError as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            continue

        filename = f"{idx:03d}-{slugify(prompt)}.png"
        filepath = out_dir / filename
        filepath.write_bytes(img_bytes)
        items.append({"prompt": prompt, "file": filename})
        print(f"  -> {filename} ({len(img_bytes) // 1024}KB)")

    if not items:
        print("\nNo images generated.", file=sys.stderr)
        return 1

    (out_dir / "prompts.json").write_text(
        json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    write_gallery(out_dir, items, args.engine)
    print(f"\nDone! {len(items)} images generated.")
    print(f"Gallery: {(out_dir / 'index.html').as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
