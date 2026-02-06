#!/usr/bin/env python3
"""
OpenClaw Media Gen - AIsa API Client

Image:
  - Gemini GenerateContent: POST https://api.aisa.one/v1/models/{model}:generateContent

Video:
  - Wan 2.6 async task:
      POST https://api.aisa.one/apis/v1/services/aigc/video-generation/video-synthesis
      GET  https://api.aisa.one/apis/v1/services/aigc/tasks?task_id=...
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


GEMINI_BASE_URL = "https://api.aisa.one/v1"
VIDEO_BASE_URL = "https://api.aisa.one/apis/v1"


def _get_api_key(explicit: Optional[str] = None) -> str:
    api_key = explicit or os.environ.get("AISA_API_KEY")
    if not api_key:
        raise ValueError("AISA_API_KEY is required (env or --api-key).")
    return api_key


def _http_request_json(
    *,
    method: str,
    url: str,
    api_key: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
    timeout_s: int = 60,
    user_agent: str = "OpenClaw-Media-Gen/1.0",
) -> Dict[str, Any]:
    all_headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "User-Agent": user_agent,
    }
    if headers:
        all_headers.update(headers)

    data: Optional[bytes] = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        all_headers.setdefault("Content-Type", "application/json")
    elif method.upper() in {"POST", "PUT", "PATCH"}:
        data = b"{}"
        all_headers.setdefault("Content-Type", "application/json")

    req = urllib.request.Request(url, data=data, headers=all_headers, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"success": False, "error": {"code": str(e.code), "message": raw}}
    except urllib.error.URLError as e:
        return {"success": False, "error": {"code": "NETWORK_ERROR", "message": str(getattr(e, "reason", e))}}


def _safe_filename(ext: str) -> str:
    ts = time.strftime("%Y%m%d-%H%M%S")
    return f"media-gen-{ts}.{ext.lstrip('.')}"


def _download_to_file(url: str, out_path: str, timeout_s: int = 300) -> Dict[str, Any]:
    """
    Download a (possibly signed) URL to local file.
    Designed for OSS signed URLs returned by video generation tasks.
    """
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "OpenClaw-Media-Gen/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp, open(out_path, "wb") as f:
            total = 0
            while True:
                chunk = resp.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
        return {"success": True, "saved_to": out_path, "bytes": total}
    except Exception as e:
        return {"success": False, "error": str(e), "url": url, "saved_to": out_path}


def _extract_gemini_inline_images(resp: Dict[str, Any]) -> List[Tuple[str, bytes]]:
    """
    Returns a list of (mime_type, bytes) from Gemini candidates parts.
    Tries to be tolerant to schema variations.
    """
    out: List[Tuple[str, bytes]] = []
    candidates = resp.get("candidates") or []
    for cand in candidates:
        parts = cand.get("parts") or cand.get("content", {}).get("parts") or []
        for part in parts:
            if not isinstance(part, dict):
                continue
            inline = part.get("inline_data") or part.get("inlineData")
            if not inline or not isinstance(inline, dict):
                continue
            mime = inline.get("mime_type") or inline.get("mimeType") or "application/octet-stream"
            data_b64 = inline.get("data")
            if not data_b64 or not isinstance(data_b64, str):
                continue
            try:
                out.append((mime, base64.b64decode(data_b64)))
            except Exception:
                continue
    return out


def _extract_gemini_text(resp: Dict[str, Any]) -> str:
    candidates = resp.get("candidates") or []
    texts: List[str] = []
    for cand in candidates:
        parts = cand.get("parts") or cand.get("content", {}).get("parts") or []
        for part in parts:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                texts.append(part["text"])
    return "\n".join(texts).strip()


def gemini_generate_image(*, api_key: str, model: str, prompt: str) -> Dict[str, Any]:
    # In practice on AIsa, the working path is:
    #   POST /v1/models/<model>:generateContent
    # e.g. /v1/models/gemini-3-pro-image-preview:generateContent
    # We'll accept both "models/xxx" and "xxx" and normalize to "xxx".
    model_id = model[len("models/") :] if model.startswith("models/") else model

    url = f"{GEMINI_BASE_URL}/models/{urllib.parse.quote(model_id, safe='')}:generateContent"
    body = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]},
        ]
    }
    return _http_request_json(method="POST", url=url, api_key=api_key, body=body, timeout_s=90)


def video_create_task(
    *,
    api_key: str,
    model: str,
    prompt: str,
    img_url: str,
    negative_prompt: Optional[str],
    resolution: str,
    duration: int,
    shot_type: str,
    watermark: bool,
    seed: Optional[int],
) -> Dict[str, Any]:
    url = f"{VIDEO_BASE_URL}/services/aigc/video-generation/video-synthesis"
    headers = {"X-DashScope-Async": "enable"}
    body: Dict[str, Any] = {
        "model": model,
        "input": {
            "prompt": prompt,
            "img_url": img_url,
        },
        "parameters": {
            "resolution": resolution,
            "duration": duration,
            "shot_type": shot_type,
            "watermark": watermark,
        },
    }
    if negative_prompt:
        body["input"]["negative_prompt"] = negative_prompt
    if seed is not None:
        body["parameters"]["seed"] = seed
    return _http_request_json(method="POST", url=url, api_key=api_key, headers=headers, body=body, timeout_s=90)


def video_task_status(*, api_key: str, task_id: str) -> Dict[str, Any]:
    url = f"{VIDEO_BASE_URL}/services/aigc/tasks?{urllib.parse.urlencode({'task_id': task_id})}"
    return _http_request_json(method="GET", url=url, api_key=api_key, timeout_s=60)


def _print_json(obj: Any) -> None:
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def cmd_image(args: argparse.Namespace) -> int:
    api_key = _get_api_key(args.api_key)
    resp = gemini_generate_image(api_key=api_key, model=args.model, prompt=args.prompt)

    images = _extract_gemini_inline_images(resp)
    if not images:
        text = _extract_gemini_text(resp)
        if text:
            _print_json({"success": False, "error": "No inline image data returned", "text": text})
        else:
            _print_json({"success": False, "error": "No inline image data returned", "raw": resp})
        return 1

    # Save first image
    mime, data = images[0]
    ext = "png"
    if "jpeg" in mime or "jpg" in mime:
        ext = "jpg"
    elif "webp" in mime:
        ext = "webp"

    out_path = args.out or _safe_filename(ext)
    with open(out_path, "wb") as f:
        f.write(data)

    _print_json(
        {
            "success": True,
            "model": args.model,
            "mime_type": mime,
            "saved_to": out_path,
            "images_returned": len(images),
        }
    )
    return 0


def cmd_video_create(args: argparse.Namespace) -> int:
    api_key = _get_api_key(args.api_key)
    resp = video_create_task(
        api_key=api_key,
        model=args.model,
        prompt=args.prompt,
        img_url=args.img_url,
        negative_prompt=args.negative_prompt,
        resolution=args.resolution,
        duration=args.duration,
        shot_type=args.shot_type,
        watermark=args.watermark,
        seed=args.seed,
    )
    _print_json(resp)
    return 0


def cmd_video_status(args: argparse.Namespace) -> int:
    api_key = _get_api_key(args.api_key)
    resp = video_task_status(api_key=api_key, task_id=args.task_id)
    _print_json(resp)
    return 0


def cmd_video_wait(args: argparse.Namespace) -> int:
    api_key = _get_api_key(args.api_key)
    start = time.time()
    while True:
        resp = video_task_status(api_key=api_key, task_id=args.task_id)
        status = (
            (resp.get("output") or {}).get("task_status")
            or (resp.get("output") or {}).get("taskStatus")
            or resp.get("task_status")
        )
        if status in {"SUCCEEDED", "FAILED", "CANCELED"}:
            if status == "SUCCEEDED" and getattr(args, "download", False):
                video_url = (resp.get("output") or {}).get("video_url") or (resp.get("output") or {}).get("videoUrl")
                if video_url:
                    out_path = args.out or _safe_filename("mp4")
                    dl = _download_to_file(video_url, out_path)
                    resp = {**resp, "download": dl}
            _print_json(resp)
            return 0 if status == "SUCCEEDED" else 1

        if time.time() - start > args.timeout:
            _print_json({"success": False, "error": "timeout", "last_response": resp})
            return 1

        time.sleep(args.poll)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="OpenClaw Media Gen - image & video generation")
    p.add_argument("--api-key", help="Override AISA_API_KEY")

    sub = p.add_subparsers(dest="command")

    img = sub.add_parser("image", help="Generate image with Gemini")
    img.add_argument("--model", default="gemini-3-pro-image-preview", help="Gemini model name")
    img.add_argument("--prompt", required=True, help="Image prompt")
    img.add_argument("--out", help="Output file path (png/jpg/webp)")
    img.set_defaults(func=cmd_image)

    vc = sub.add_parser("video-create", help="Create Wan 2.6 video generation task")
    vc.add_argument("--model", default="wan2.6-t2v", help="Video model name (e.g., wan2.6-t2v)")
    vc.add_argument("--prompt", required=True, help="Video prompt")
    vc.add_argument("--img-url", required=True, help="Reference image URL (required by API doc)")
    vc.add_argument("--negative-prompt", help="Negative prompt")
    vc.add_argument("--resolution", default="720P", help="Resolution (e.g., 720P)")
    vc.add_argument("--duration", type=int, default=5, choices=[5, 10], help="Duration seconds")
    vc.add_argument("--shot-type", default="single", choices=["single", "multi"], help="Shot type")
    vc.add_argument("--watermark", action="store_true", help="Enable watermark")
    vc.add_argument("--seed", type=int, help="Random seed")
    vc.set_defaults(func=cmd_video_create)

    vs = sub.add_parser("video-status", help="Query video task status")
    vs.add_argument("--task-id", required=True, help="Task id")
    vs.set_defaults(func=cmd_video_status)

    vw = sub.add_parser("video-wait", help="Wait until video task finishes")
    vw.add_argument("--task-id", required=True, help="Task id")
    vw.add_argument("--poll", type=int, default=10, help="Poll interval seconds")
    vw.add_argument("--timeout", type=int, default=600, help="Timeout seconds")
    vw.add_argument("--download", action="store_true", help="Download video on SUCCEEDED")
    vw.add_argument("--out", help="Output .mp4 path when using --download")
    vw.set_defaults(func=cmd_video_wait)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if not getattr(args, "command", None):
        parser.print_help()
        return 1
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

