#!/usr/bin/env python3
import argparse
import base64
import json
import os
import pathlib
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BASE_URL = "https://api.aimlapi.com/v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate images via AIMLAPI /images/generations")
    parser.add_argument("--prompt", required=True, help="Text prompt for the image")
    parser.add_argument("--model", default="aimlapi/openai/gpt-image-1", help="Model reference")
    parser.add_argument("--size", default="1024x1024", help="Image size")
    parser.add_argument("--count", type=int, default=1, help="Number of images")
    parser.add_argument("--out-dir", default="./out/images", help="Output directory")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="AIMLAPI base URL")
    parser.add_argument("--extra-json", default=None, help="Extra JSON to merge into the payload")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds")
    parser.add_argument("--output-format", default="png", help="File extension for b64 outputs")
    return parser.parse_args()


def load_extra(extra_json: str | None) -> dict[str, Any]:
    if not extra_json:
        return {}
    try:
        return json.loads(extra_json)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid --extra-json: {exc}") from exc


def request_json(url: str, payload: dict[str, Any], api_key: str, timeout: int) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise SystemExit(f"Request failed: {exc.code} {detail}") from exc
    return json.loads(body)


def ensure_dir(path: str) -> pathlib.Path:
    out_dir = pathlib.Path(path)
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def write_from_b64(encoded: str, path: pathlib.Path) -> None:
    path.write_bytes(base64.b64decode(encoded))


def download_url(url: str, path: pathlib.Path) -> None:
    with urllib.request.urlopen(url) as response:
        path.write_bytes(response.read())


def main() -> None:
    args = parse_args()
    api_key = os.getenv("AIMLAPI_API_KEY")
    if not api_key:
        raise SystemExit("Missing AIMLAPI_API_KEY")

    extra = load_extra(args.extra_json)
    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "n": args.count,
        "size": args.size,
        **extra,
    }

    url = f"{args.base_url.rstrip('/')}/images/generations"
    response = request_json(url, payload, api_key, args.timeout)
    data = response.get("data", [])

    out_dir = ensure_dir(args.out_dir)
    if not data:
        raise SystemExit("No images returned. Check model access and payload.")

    for index, item in enumerate(data, start=1):
        if "b64_json" in item:
            extension = args.output_format.lstrip(".")
            file_path = out_dir / f"image-{index}.{extension}"
            write_from_b64(item["b64_json"], file_path)
        elif "url" in item:
            url_value = item["url"]
            extension = pathlib.Path(url_value).suffix or f".{args.output_format}"
            file_path = out_dir / f"image-{index}{extension}"
            download_url(url_value, file_path)
        else:
            raise SystemExit(f"Unsupported response item: {item}")

    print(f"Saved {len(data)} image(s) to {out_dir}")


if __name__ == "__main__":
    main()
