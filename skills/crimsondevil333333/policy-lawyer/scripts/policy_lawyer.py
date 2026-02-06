#!/usr/bin/env python3
"""Search or list workspace policy sections."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Tuple


def load_policies(path: Path) -> Dict[str, str]:
    sections: Dict[str, List[str]] = {}
    current: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("## "):
            current = stripped[3:].strip()
            sections[current] = []
        elif stripped.startswith("# ") or not stripped:
            continue
        elif current:
            sections[current].append(stripped)
    return {topic: "\n".join(body).strip() for topic, body in sections.items()}


def list_topics(policies: Dict[str, str]) -> None:
    if not policies:
        print("No policy sections found.")
        return
    print("Available policy topics:")
    for topic in sorted(policies):
        print(f"  {topic}")


def show_topic(policies: Dict[str, str], target: str) -> None:
    normalized = target.lower()
    matches = [name for name in policies if name.lower() == normalized]
    if not matches:
        matches = [name for name in policies if normalized in name.lower()]
    if not matches:
        print(f"No policy section matches '{target}'.")
        return
    for name in matches:
        print(f"## {name}")
        print(policies[name])
        print()


def search_keyword(policies: Dict[str, str], keyword: str) -> None:
    normalized = keyword.lower()
    hits: List[Tuple[str, str]] = []
    for topic, body in policies.items():
        snippet = ""
        for line in body.splitlines():
            if normalized in line.lower():
                snippet += line + "\n"
        if snippet:
            hits.append((topic, snippet.strip()))
    if not hits:
        print(f"No results for keyword '{keyword}'.")
        return
    for topic, snippet in hits:
        print(f"## {topic}")
        print(snippet)
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Policy Lawyer: recall workspace policies instantly.")
    parser.add_argument(
        "--policy-file",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "references" / "policies.md",
        help="Path to the policy reference document.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list-topics", action="store_true", help="List every named policy section.")
    group.add_argument("--topic", help="Show the section matching this topic name.")
    group.add_argument("--keyword", help="Search for a keyword inside every policy section.")

    args = parser.parse_args()
    policies = load_policies(args.policy_file)

    if args.list_topics:
        list_topics(policies)
    elif args.topic:
        show_topic(policies, args.topic)
    elif args.keyword:
        search_keyword(policies, args.keyword)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
