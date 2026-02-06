#!/usr/bin/env python3
import argparse
import json
import os
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BASE_URL = "https://api.aimlapi.com/v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run AIMLAPI chat completions")
    parser.add_argument("--model", required=True, help="Model reference")
    parser.add_argument("--system", default=None, help="System message")
    parser.add_argument("--user", required=True, help="User message")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="AIMLAPI base URL")
    parser.add_argument("--extra-json", default=None, help="Extra JSON to merge into the payload")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds")
    parser.add_argument("--output", default=None, help="Write full JSON response to file")
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


def main() -> None:
    args = parse_args()
    api_key = os.getenv("AIMLAPI_API_KEY")
    if not api_key:
        raise SystemExit("Missing AIMLAPI_API_KEY")

    messages: list[dict[str, str]] = []
    if args.system:
        messages.append({"role": "system", "content": args.system})
    messages.append({"role": "user", "content": args.user})

    extra = load_extra(args.extra_json)
    payload = {
        "model": args.model,
        "messages": messages,
        **extra,
    }

    url = f"{args.base_url.rstrip('/')}/chat/completions"
    response = request_json(url, payload, api_key, args.timeout)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(response, handle, indent=2)
        print(f"Saved JSON response to {args.output}")
        return

    choices = response.get("choices", [])
    if choices:
        content = choices[0].get("message", {}).get("content")
        if content:
            print(content)
            return

    print(json.dumps(response, indent=2))


if __name__ == "__main__":
    main()
