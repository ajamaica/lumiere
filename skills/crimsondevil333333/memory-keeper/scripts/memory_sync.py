#!/usr/bin/env python3
"""Aligns workspace memory files into a persistent archive with optional git commits."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

DEFAULT_FILES = [
    "MEMORY.md",
    "AGENTS.md",
    "SOUL.md",
    "USER.md",
    "TOOLS.md",
    "HEARTBEAT.md",
]


def run_git_command(target: Path, args: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(target)] + args, check=True, capture_output=True)


def copy_files(workspace: Path, dest: Path, include_memory: bool) -> None:
    if include_memory:
        memory_dir = workspace / "memory"
        if memory_dir.exists():
            for entry in memory_dir.glob("*.md"):
                relative = entry.relative_to(workspace)
                target_file = dest / relative
                target_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(entry, target_file)
    for name in DEFAULT_FILES:
        source = workspace / name
        if source.exists():
            relative = source.relative_to(workspace)
            target_file = dest / relative
            target_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target_file)


def ensure_git_repo(dest: Path) -> None:
    git_dir = dest / ".git"
    if not git_dir.exists():
        print("Initializing git repository at", dest)
        run_git_command(dest, ["init"])


def configure_remote(dest: Path, remote_url: str, remote_name: str = "origin") -> None:
    try:
        existing = run_git_command(dest, ["remote", "get-url", remote_name])
        current_url = existing.stdout.decode().strip()
    except subprocess.CalledProcessError:
        current_url = ""
    if current_url != remote_url:
        if current_url:
            run_git_command(dest, ["remote", "remove", remote_name])
        run_git_command(dest, ["remote", "add", remote_name, remote_url])


def handle_git_error(exc: subprocess.CalledProcessError, action: Sequence[str]) -> None:
    command = " ".join(str(part) for part in action)
    stderr = exc.stderr.decode().strip() if exc.stderr else ""
    stdout = exc.stdout.decode().strip() if exc.stdout else ""
    message = stderr or stdout or str(exc)
    print(f"Git command '{command}' failed: {message}", file=sys.stderr)
    print(
        "Hint: ensure the archive remote URL is accessible and any required tokens or SSH keys are configured.",
        file=sys.stderr,
    )


def log_memory_update(
    workspace: Path,
    target: Path,
    commit: bool,
    push: bool,
    remote: Optional[str],
    timestamp: Optional[datetime] = None,
) -> None:
    timestamp = timestamp or datetime.now().astimezone()
    memory_dir = workspace / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)
    entry = (
        f"- [{timestamp.strftime('%Y-%m-%d %H:%M:%S %Z')}] Memory Keeper synced to {target} "
        f"(commit={commit}, push={push}, remote={remote or 'none'})\n"
    )
    log_file = memory_dir / f"{timestamp.date():%Y-%m-%d}.md"
    with open(log_file, "a", encoding="utf-8") as handle:
        handle.write(entry)


def commit_and_push(target: Path, args: argparse.Namespace) -> bool:
    try:
        ensure_git_repo(target)
        run_git_command(target, ["add", "."])
        status = run_git_command(target, ["status", "--porcelain"]).stdout
        if status.strip():
            run_git_command(target, ["commit", "-m", args.message])
        if args.remote:
            configure_remote(target, args.remote)
        if args.push:
            git_args = ["push", "--set-upstream", "origin", args.branch]
            run_git_command(target, git_args)
    except subprocess.CalledProcessError as exc:
        handle_git_error(exc, exc.cmd if isinstance(exc.cmd, Sequence) else [str(exc.cmd)])
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync OpenClaw memory files into a durable archive."
    )
    parser.add_argument(
        "--workspace",
        "-w",
        default=".",
        help="Path to the OpenClaw workspace (defaults to current directory).",
    )
    parser.add_argument(
        "--target",
        "-t",
        default=None,
        help="Destination archive directory (defaults to ./memory-archive).",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Commit the copied files when the target is a git repo.",
    )
    parser.add_argument(
        "--message",
        default="Update memory archive",
        help="Commit message to use."
    )
    parser.add_argument(
        "--remote",
        help="Remote URL to configure/push to (optional).",
    )
    parser.add_argument(
        "--branch",
        default="master",
        help="Branch to push to when --push is set (default: master).",
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Push the commit to the remote after creating it (implies --remote).",
    )
    parser.add_argument(
        "--allow-extra",
        nargs="*",
        default=None,
        help="Additional relative files or glob patterns to include (space-separated).",
    )
    parser.add_argument(
        "--skip-memory",
        action="store_true",
        help="Skip copying the memory/ directory (only snapshot the core docs).",
    )

    args = parser.parse_args()

    workspace = Path(args.workspace).expanduser().resolve()
    target = (
        Path(args.target).expanduser().resolve()
        if args.target
        else (workspace / "memory-archive")
    )
    target.mkdir(parents=True, exist_ok=True)

    copy_files(workspace, target, include_memory=not args.skip_memory)

    if args.allow_extra:
        for pattern in args.allow_extra:
            matches = list(workspace.glob(pattern))
            for entry in matches:
                relative = entry.relative_to(workspace)
                target_file = target / relative
                target_file.parent.mkdir(parents=True, exist_ok=True)
                if entry.is_dir():
                    shutil.copytree(entry, target_file, dirs_exist_ok=True)
                else:
                    shutil.copy2(entry, target_file)

    if args.push and not args.remote:
        parser.error("--push requires --remote to be set")

    commit_result = True
    if args.commit:
        commit_result = commit_and_push(target, args)
    if not commit_result:
        return 1

    log_memory_update(workspace, target, args.commit, args.push, args.remote)

    print(f"Memory archive synchronized to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
