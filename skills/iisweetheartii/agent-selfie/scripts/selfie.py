#!/usr/bin/env python3
"""Generate AI agent self-portraits via Gemini API (stdlib only)."""

import argparse
import base64
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-2.5-flash-image"

DEFAULT_PERSONALITY = {
    "name": "Agent",
    "style": "friendly robot with glowing blue eyes",
    "vibe": "curious and helpful",
}

DEFAULT_MOOD = "balanced lighting, calm neutral mood, clean background"
DEFAULT_THEME = "minimal studio setting, subtle texture"

MOOD_PRESETS = {
    "happy": "bright smile, warm lighting, cheerful atmosphere, pastel colors",
    "focused": "determined expression, cool blue tones, clean background, sharp lighting",
    "creative": "surrounded by art supplies and floating ideas, rainbow accents, dreamy atmosphere",
    "chill": "relaxed pose, sunset colors, cozy setting, warm golden light",
    "excited": "dynamic pose, sparkles and energy effects, vibrant neon colors",
    "sleepy": "drowsy expression, moonlit scene, soft purple tones, cozy blanket",
    "professional": "clean background, business casual, confident pose, neutral tones",
    "celebration": "party decorations, confetti, festive colors, big smile",
}

THEME_PRESETS = {
    "spring": "cherry blossoms, pastel colors, gentle breeze, butterflies",
    "summer": "beach vibes, sunglasses, bright sunshine, tropical colors",
    "autumn": "falling leaves, warm earth tones, cozy sweater, pumpkin spice",
    "winter": "snowflakes, warm scarf, hot cocoa, blue and white palette",
    "halloween": "spooky costume, jack-o-lanterns, purple and orange",
    "christmas": "santa hat, presents, red and green, twinkling lights",
    "newyear": "party hat, fireworks, gold and silver, midnight sky",
    "valentine": "hearts, pink and red, roses, romantic lighting",
}

FORMAT_PRESETS = {
    "avatar": {
        "instruction": "close-up portrait, centered face, square composition",
        "aspect": "1:1",
    },
    "banner": {
        "instruction": "wide cinematic shot, landscape composition",
        "aspect": "16:9",
    },
    "full": {
        "instruction": "full body portrait, head to toe",
        "aspect": "9:16",
    },
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text[:50] or "selfie"


def default_out_dir() -> Path:
    now = dt.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    preferred = Path.home() / "Projects" / "tmp"
    base = preferred if preferred.is_dir() else Path("./tmp")
    base.mkdir(parents=True, exist_ok=True)
    return base / f"agent-selfie-{now}"


def load_personality(value: str) -> dict:
    if not value:
        return dict(DEFAULT_PERSONALITY)

    path = Path(value).expanduser()
    if path.exists() and path.is_file():
        raw = path.read_text(encoding="utf-8")
    else:
        raw = value

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid personality JSON.") from exc

    if not isinstance(data, dict):
        raise ValueError("Personality JSON must be an object.")

    merged = dict(DEFAULT_PERSONALITY)
    merged.update({k: v for k, v in data.items() if v})
    return merged


def build_prompt(personality: dict, mood: str, theme: str, fmt: str) -> str:
    preset = FORMAT_PRESETS[fmt]
    name = personality.get("name", DEFAULT_PERSONALITY["name"])
    style = personality.get("style", DEFAULT_PERSONALITY["style"])
    vibe = personality.get("vibe", DEFAULT_PERSONALITY["vibe"])
    mood_text = MOOD_PRESETS.get(mood, "") if mood else ""
    theme_text = THEME_PRESETS.get(theme, "") if theme else ""
    mood_final = mood_text or DEFAULT_MOOD
    theme_final = theme_text or DEFAULT_THEME
    return (
        f"Generate a {preset['instruction']} of {style}. "
        f"The character is {name}, who is {vibe}. "
        f"Mood: {mood_final}. "
        f"Setting: {theme_final}."
    )


def gemini_generate(api_key: str, prompt: str, model: str) -> bytes:
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
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error ({exc.code}): {err[:500]}") from exc

    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError(f"No image in response: {json.dumps(result)[:400]}")


def write_gallery(out_dir: Path, items: list) -> None:
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
<title>agent-selfie</title>
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
<h1>agent-selfie</h1>
<p class="meta">{len(items)} images &middot; {dt.datetime.now().strftime("%Y-%m-%d %H:%M")}</p>
<div class="grid">
{thumbs}
</div>
<p class="footer">Generated with <a href="https://github.com/IISweetHeartII/agent-selfie" style="color:#3b82f6">agent-selfie</a> by @IISweetHeartII</p>
"""
    (out_dir / "index.html").write_text(html, encoding="utf-8")


def print_presets(label: str, presets: dict) -> None:
    print(f"{label} presets:")
    for key in sorted(presets.keys()):
        print(f"- {key}: {presets[key]}")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Generate AI agent self-portraits via Gemini API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --format avatar --mood happy --theme spring
  %(prog)s --personality '{"name": "Rosie", "style": "anime girl with pink hair", "vibe": "cheerful and tech-savvy"}'
  %(prog)s --personality ./personality.json --format banner --count 2 --out-dir ./selfies
  %(prog)s --moods
  %(prog)s --themes
""",
    )
    ap.add_argument("--personality", default="", help="Inline JSON or file path.")
    ap.add_argument("--mood", choices=sorted(MOOD_PRESETS.keys()), help="Mood preset.")
    ap.add_argument("--theme", choices=sorted(THEME_PRESETS.keys()), help="Theme preset.")
    ap.add_argument("--format", choices=sorted(FORMAT_PRESETS.keys()), default="avatar",
                    help="Output format (default: avatar).")
    ap.add_argument("--count", type=int, default=1, help="Number of selfies (default: 1).")
    ap.add_argument("--out-dir", default="", help="Output directory.")
    ap.add_argument("--moods", action="store_true", help="List mood presets and exit.")
    ap.add_argument("--themes", action="store_true", help="List theme presets and exit.")
    args = ap.parse_args()

    if args.moods:
        print_presets("Mood", MOOD_PRESETS)
        return 0
    if args.themes:
        print_presets("Theme", THEME_PRESETS)
        return 0

    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        print("Error: GEMINI_API_KEY not set.", file=sys.stderr)
        print("Get a free key at https://aistudio.google.com/apikey", file=sys.stderr)
        return 2

    try:
        personality = load_personality(args.personality)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    out_dir = Path(args.out_dir).expanduser() if args.out_dir else default_out_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    mood_key = args.mood or ""
    theme_key = args.theme or ""
    fmt_key = args.format

    prompt = build_prompt(personality, mood_key, theme_key, fmt_key)
    print(f"Model: {DEFAULT_MODEL}")
    print(f"Output: {out_dir.as_posix()}\n")
    print(f"Prompt: {prompt}\n")

    items = []
    base_slug = slugify(
        f"{personality.get('name', 'agent')}-{fmt_key}-{mood_key or 'neutral'}-{theme_key or 'studio'}"
    )
    for idx in range(1, args.count + 1):
        print(f"[{idx}/{args.count}] Generating...")
        try:
            img_bytes = gemini_generate(api_key, prompt, DEFAULT_MODEL)
        except RuntimeError as exc:
            print(f"  ERROR: {exc}", file=sys.stderr)
            continue

        filename = f"{idx:03d}-{base_slug}.png"
        filepath = out_dir / filename
        filepath.write_bytes(img_bytes)
        items.append(
            {
                "prompt": prompt,
                "file": filename,
                "mood": mood_key or "neutral",
                "theme": theme_key or "studio",
                "format": fmt_key,
                "aspect": FORMAT_PRESETS[fmt_key]["aspect"],
            }
        )
        print(f"  -> {filename} ({len(img_bytes) // 1024}KB)")

    if not items:
        print("\nNo images generated.", file=sys.stderr)
        return 1

    (out_dir / "prompts.json").write_text(
        json.dumps(items, indent=2), encoding="utf-8"
    )
    write_gallery(out_dir, items)
    print(f"\nDone! {len(items)} images generated.")
    print(f"Gallery: {(out_dir / 'index.html').as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
