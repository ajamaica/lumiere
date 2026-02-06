#!/usr/bin/env python3
"""Generate a quick digest of the key workspace identity documents."""
from __future__ import annotations

import argparse
from pathlib import Path
import textwrap

DEFAULT_FILES = ["SOUL.md", "USER.md", "AGENTS.md", "TOOLS.md"]


def load_snippet(path: Path, lines: int, brief: bool) -> str:
    text = path.read_text(encoding="utf-8").strip().splitlines()
    cleaned = [line.strip() for line in text if line.strip()]
    if not cleaned:
        return "(empty document)"
    if brief:
        return cleaned[0]
    snippet = cleaned[:lines]
    return "\n".join(snippet)


def summarize_files(workspace: Path, files: list[str], lines: int, brief: bool) -> None:
    workspace = workspace.expanduser().resolve()
    for name in files:
        path = workspace / name
        print(f"--- {name} ---")
        if not path.exists():
            print("File not found in this workspace.\n")
            continue
        snippet = load_snippet(path, lines, brief)
        print(textwrap.indent(snippet, "  "))
        print()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Context onboarding glimpses the key workspace documents for quick orientation."
    )
    parser.add_argument(
        "--workspace",
        default=".",
        help="Workspace root containing SOUL.md, USER.md, etc.",
    )
    parser.add_argument(
        "--files",
        nargs="+",
        default=DEFAULT_FILES,
        help="List of files to summarize (defaults to the core identity docs).",
    )
    parser.add_argument(
        "--lines",
        type=int,
        default=3,
        help="How many non-empty lines to show per document.",
    )
    parser.add_argument(
        "--brief",
        action="store_true",
        help="Show only the first meaningful line from each file.",
    )

    args = parser.parse_args()
    summarize_files(Path(args.workspace), args.files, args.lines, args.brief)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
