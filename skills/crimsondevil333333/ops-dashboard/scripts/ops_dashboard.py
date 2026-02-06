#!/usr/bin/env python3
"""Report workspace health metrics for operational checks."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path
from typing import Iterable, List, Tuple


def format_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} PB"


def get_disk_usage(path: Path) -> Tuple[str, str, str]:
    usage = shutil.disk_usage(path)
    total = format_bytes(usage.total)
    used = format_bytes(usage.used)
    free = format_bytes(usage.free)
    return total, used, free


def get_git_status(workspace: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(workspace), "status", "-sb"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return "Not a git repository."


def get_recent_commits(workspace: Path, count: int = 3) -> List[str]:
    try:
        result = subprocess.run(
            ["git", "-C", str(workspace), "log", "-n", str(count), "--oneline"],
            capture_output=True,
            text=True,
            check=True,
        )
        return [line for line in result.stdout.strip().splitlines() if line]
    except subprocess.CalledProcessError:
        return ["No git history available."]


def get_top_directories(workspace: Path, top: int = 3) -> List[Tuple[str, str]]:
    entries: List[Tuple[str, int]] = []
    for entry in workspace.iterdir():
        if not entry.is_dir():
            continue
        size = 0
        for root, _, files in os.walk(entry):
            for name in files:
                try:
                    size += os.path.getsize(Path(root) / name)
                except OSError:
                    continue
        entries.append((entry.name, size))
    entries.sort(key=lambda item: -item[1])
    return [(name, format_bytes(size)) for name, size in entries[:top]]


def print_summary(workspace: Path) -> None:
    total, used, free = get_disk_usage(workspace)
    print("Disk usage:")
    print(f"  Total: {total}")
    print(f"  Used:  {used}")
    print(f"  Free:  {free}")
    print()

    print("Git status:")
    print(f"  {get_git_status(workspace)}")
    print()

    print("Recent commits:")
    for commit in get_recent_commits(workspace):
        print(f"  {commit}")
    print()

    top_dirs = get_top_directories(workspace)
    if top_dirs:
        print("Top directories by size:")
        for name, size in top_dirs:
            print(f"  {name}: {size}")
    else:
        print("No directories found to size.")


def print_resources(workspace: Path) -> None:
    load_avg = os.getloadavg() if hasattr(os, "getloadavg") else (0.0, 0.0, 0.0)
    print("Load averages (1m, 5m, 15m):")
    print("  " + ", ".join(f"{value:.2f}" for value in load_avg))
    print()

    total, used, free = get_disk_usage(workspace)
    print("Disk usage:")
    print(f"  Total: {total}")
    print(f"  Used:  {used}")
    print(f"  Free:  {free}")
    print()

    print("Recent commits:")
    for commit in get_recent_commits(workspace):
        print(f"  {commit}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Ops Dashboard: workspace health signals.")
    parser.add_argument("--workspace", default=".", help="Workspace root to analyze.")
    parser.add_argument(
        "--show",
        choices=["summary", "resources"],
        default="summary",
        help="Which snapshot to print.",
    )

    args = parser.parse_args()
    workspace = Path(args.workspace).expanduser().resolve()
    if args.show == "summary":
        print_summary(workspace)
    else:
        print_resources(workspace)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
