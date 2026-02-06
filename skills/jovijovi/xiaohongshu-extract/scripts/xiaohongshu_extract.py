#!/usr/bin/env python3
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import requests


DEFAULT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class ExtractError(RuntimeError):
    pass


BLOCKER_PATTERNS = [
    (
        "login",
        re.compile(r"(login|sign\\s*in|\\u767b\\u5f55|\\u767b\\u5165|\\u8d26\\u53f7)"),
        "Page looks like a login prompt. Try a public share URL or ensure the link is public.",
    ),
    (
        "captcha",
        re.compile(
            r"(captcha|verify|validation|\\u9a8c\\u8bc1|\\u6ed1\\u52a8|\\u5b89\\u5168)"
        ),
        "Page shows a verification or anti-bot prompt. Try again later or from a trusted network.",
    ),
    (
        "access",
        re.compile(r"(access\\s*denied|forbidden|blocked|\\u8bbf\\u95ee\\u88ab\\u62d2)"),
        "Access appears blocked. The site may be rate-limiting or restricting access.",
    ),
]


def fetch_url(url: str, timeout: int) -> Tuple[str, str, int]:
    resp = requests.get(
        url,
        allow_redirects=True,
        timeout=timeout,
        headers={"User-Agent": DEFAULT_UA},
    )
    return resp.url, resp.text, resp.status_code


def detect_blocker_hint(html: str) -> Optional[str]:
    for _, pattern, hint in BLOCKER_PATTERNS:
        if pattern.search(html):
            return hint
    return None


def _brace_match_json(source: str, start_idx: int) -> str:
    brace = 0
    in_str = False
    esc = False
    end_idx = None

    for i, ch in enumerate(source[start_idx:], start=start_idx):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                brace += 1
            elif ch == "}":
                brace -= 1
                if brace == 0:
                    end_idx = i + 1
                    break

    if end_idx is None:
        raise ExtractError("Failed to locate JSON object end.")

    return source[start_idx:end_idx]


def parse_initial_state(html: str) -> Dict[str, Any]:
    marker = "window.__INITIAL_STATE__="
    idx = html.find(marker)
    if idx == -1:
        hint = detect_blocker_hint(html)
        if hint:
            raise ExtractError(f"window.__INITIAL_STATE__ not found. {hint}")
        raise ExtractError("window.__INITIAL_STATE__ not found.")

    start = idx + len(marker)
    raw = _brace_match_json(html, start)
    raw = re.sub(r"\bundefined\b", "null", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ExtractError(f"JSON parse failed: {exc}") from exc


def _pick_best_stream(streams: list) -> Dict[str, Any]:
    if not streams:
        return {}
    return max(
        streams,
        key=lambda s: (
            s.get("size") or 0,
            s.get("videoBitrate") or 0,
            s.get("weight") or 0,
        ),
    )


def parse_count(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None

    multiplier = 1
    if "\u4e07" in text:
        multiplier = 10000
        text = text.replace("\u4e07", "")
    elif "\u5343" in text:
        multiplier = 1000
        text = text.replace("\u5343", "")
    elif text.lower().endswith("k"):
        multiplier = 1000
        text = text[:-1]
    elif text.lower().endswith("w"):
        multiplier = 10000
        text = text[:-1]

    match = re.search(r"[0-9.]+", text)
    if not match:
        return None

    try:
        return int(float(match.group()) * multiplier)
    except ValueError:
        return None


def to_iso_utc(ts_ms: Optional[int]) -> Optional[str]:
    if not ts_ms:
        return None
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat()


def build_field_mapping() -> Dict[str, str]:
    return {
        "note_id": "note_id",
        "title": "title",
        "desc": "desc",
        "type": "type",
        "time": "time_ms",
        "ipLocation": "ip_location",
        "user.nickname": "user_nickname",
        "user.userId": "user_id",
        "user.avatar": "user_avatar",
        "interact.likedCount": "liked_count",
        "interact.collectedCount": "collected_count",
        "interact.commentCount": "comment_count",
        "interact.shareCount": "share_count",
        "video.media.videoId": "video_id",
        "video.media.video.duration": "video_duration",
        "video.stream.h264.masterUrl": "video_stream_url",
    }


def build_flat_record(data: Dict[str, Any]) -> Dict[str, Any]:
    user = data.get("user", {}) or {}
    interact = data.get("interact", {}) or {}
    video = data.get("video", {}) or {}

    return {
        "note_id": data.get("note_id"),
        "title": data.get("title"),
        "desc": data.get("desc"),
        "type": data.get("type"),
        "time_ms": data.get("time"),
        "time_iso_utc": to_iso_utc(data.get("time")),
        "ip_location": data.get("ip_location"),
        "user_nickname": user.get("nickname"),
        "user_id": user.get("user_id"),
        "user_avatar": user.get("avatar"),
        "liked_count": interact.get("liked_count"),
        "liked_count_num": interact.get("liked_count_num"),
        "collected_count": interact.get("collected_count"),
        "collected_count_num": interact.get("collected_count_num"),
        "comment_count": interact.get("comment_count"),
        "comment_count_num": interact.get("comment_count_num"),
        "share_count": interact.get("share_count"),
        "share_count_num": interact.get("share_count_num"),
        "video_id": video.get("video_id"),
        "video_duration": video.get("duration"),
        "video_width": video.get("width"),
        "video_height": video.get("height"),
        "video_fps": video.get("fps"),
        "video_size": video.get("size"),
        "video_format": video.get("format"),
        "video_stream_url": video.get("stream_url"),
    }


def extract_note_data(state: Dict[str, Any], hint: Optional[str] = None) -> Dict[str, Any]:
    note_map = state.get("note", {}).get("noteDetailMap", {})
    if not note_map:
        if hint:
            raise ExtractError(f"noteDetailMap not found in initial state. {hint}")
        raise ExtractError("noteDetailMap not found in initial state.")

    note_id, note_entry = next(iter(note_map.items()))
    note = (note_entry or {}).get("note", {}) or {}
    user = note.get("user", {}) or {}
    interact = note.get("interactInfo", {}) or {}
    tags = [t.get("name") for t in (note.get("tagList") or []) if t.get("name")]

    video = note.get("video", {}) or {}
    media = video.get("media", {}) or {}
    stream = (media.get("stream", {}) or {}).get("h264", []) or []
    best_stream = _pick_best_stream(stream)

    video_meta = media.get("video", {}) or {}

    data = {
        "note_id": note_id,
        "title": note.get("title"),
        "desc": note.get("desc"),
        "type": note.get("type"),
        "time": note.get("time"),
        "ip_location": note.get("ipLocation"),
        "user": {
            "nickname": user.get("nickname"),
            "user_id": user.get("userId"),
            "avatar": user.get("avatar"),
        },
        "interact": {
            "liked_count": interact.get("likedCount"),
            "liked_count_num": parse_count(interact.get("likedCount")),
            "collected_count": interact.get("collectedCount"),
            "collected_count_num": parse_count(interact.get("collectedCount")),
            "comment_count": interact.get("commentCount"),
            "comment_count_num": parse_count(interact.get("commentCount")),
            "share_count": interact.get("shareCount"),
            "share_count_num": parse_count(interact.get("shareCount")),
        },
        "tags": tags,
        "video": {
            "video_id": media.get("videoId"),
            "duration": video_meta.get("duration"),
            "width": best_stream.get("width"),
            "height": best_stream.get("height"),
            "fps": best_stream.get("fps"),
            "size": best_stream.get("size"),
            "format": best_stream.get("format"),
            "stream_url": best_stream.get("masterUrl"),
            "backup_urls": best_stream.get("backupUrls"),
        },
    }
    data["field_mapping"] = build_field_mapping()
    data["flat"] = build_flat_record(data)
    return data


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract XHS note metadata from a share or discovery URL."
    )
    parser.add_argument("url", help="XHS share or discovery URL")
    parser.add_argument("--timeout", type=int, default=20, help="Request timeout (s)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    parser.add_argument(
        "--output",
        help="Write output JSON to a file instead of stdout",
    )
    parser.add_argument(
        "--flat-only",
        action="store_true",
        help="Output only the flattened record for ingestion",
    )
    parser.add_argument(
        "--error-json",
        action="store_true",
        help="Emit errors as JSON to stdout (or --output if provided)",
    )

    args = parser.parse_args()

    final_url = None
    status_code = None

    try:
        final_url, html, status_code = fetch_url(args.url, args.timeout)
        if status_code >= 400:
            raise ExtractError(f"HTTP {status_code}")
        state = parse_initial_state(html)
        hint = detect_blocker_hint(html)
        data = extract_note_data(state, hint=hint)
        data["final_url"] = final_url
    except (ExtractError, requests.RequestException) as exc:
        if args.error_json:
            payload = {
                "error": True,
                "message": str(exc),
                "type": exc.__class__.__name__,
                "url": args.url,
            }
            if final_url:
                payload["final_url"] = final_url
            if status_code is not None:
                payload["status_code"] = status_code
            if isinstance(exc, requests.RequestException) and exc.response is not None:
                if "final_url" not in payload and exc.response.url:
                    payload["final_url"] = exc.response.url
                if "status_code" not in payload:
                    payload["status_code"] = exc.response.status_code
            out = json.dumps(
                payload,
                ensure_ascii=False,
                indent=2 if args.pretty else None,
                separators=None if args.pretty else (",", ":"),
            )
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    f.write(out + "\n")
            else:
                sys.stdout.write(out + "\n")
            return 2
        sys.stderr.write(f"Error: {exc}\n")
        return 2

    if args.flat_only:
        data = data.get("flat", {})

    out = json.dumps(
        data,
        ensure_ascii=False,
        indent=2 if args.pretty else None,
        separators=None if args.pretty else (",", ":"),
    )

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out + "\n")
    else:
        sys.stdout.write(out + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
