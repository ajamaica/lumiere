#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""
Deterministic text metrics for Chain-of-Density summarization.
PEP 723 inline script - run with: uv run text_metrics.py <command> [args]
"""

import sys
import json


def word_count(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def char_count(text: str) -> int:
    """Count characters in text."""
    return len(text)


def byte_count(text: str) -> int:
    """Count bytes in text (UTF-8)."""
    return len(text.encode("utf-8"))


def metrics(text: str) -> dict:
    """Return all metrics as JSON."""
    return {
        "words": word_count(text),
        "chars": char_count(text),
        "bytes": byte_count(text),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: text_metrics.py <command> [text]", file=sys.stderr)
        print("Commands: words, chars, bytes, metrics", file=sys.stderr)
        print("Text can be provided as argument or via stdin", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]

    # Get text from argument or stdin
    if len(sys.argv) > 2:
        text = " ".join(sys.argv[2:])
    else:
        text = sys.stdin.read()

    if command == "words":
        print(word_count(text))
    elif command == "chars":
        print(char_count(text))
    elif command == "bytes":
        print(byte_count(text))
    elif command == "metrics":
        print(json.dumps(metrics(text)))
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
