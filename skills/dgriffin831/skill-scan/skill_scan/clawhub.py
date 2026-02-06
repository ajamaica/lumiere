"""ClawHub integration — pull skills from ClawHub registry for scanning."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path


def search_skills(query: str, limit: int = 20) -> list[dict]:
    """Search ClawHub for skills."""
    try:
        output = subprocess.check_output(
            ["clawhub", "search", query, "--json"],
            text=True,
            timeout=30,
            stderr=subprocess.DEVNULL,
        )
        return json.loads(output)
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        pass

    # Try without --json flag
    try:
        output = subprocess.check_output(
            ["clawhub", "search", query],
            text=True,
            timeout=30,
            stderr=subprocess.DEVNULL,
        )
        return _parse_clawhub_text_output(output)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []


def download_skill_for_scan(slug: str) -> dict:
    """Install a skill to a temp directory for scanning.

    Returns dict with 'path' and 'cleanup' callable.
    """
    temp_dir = tempfile.mkdtemp(prefix="skillguard-")
    try:
        subprocess.check_output(
            ["clawhub", "install", slug, "--target", temp_dir],
            text=True,
            timeout=60,
            stderr=subprocess.DEVNULL,
        )
        return {
            "path": temp_dir,
            "cleanup": lambda: shutil.rmtree(temp_dir, ignore_errors=True),
        }
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"Failed to download skill {slug}: {exc}") from exc


def get_skill_info(slug: str) -> str | None:
    """Get skill info from ClawHub."""
    try:
        return subprocess.check_output(
            ["clawhub", "info", slug],
            text=True,
            timeout=15,
            stderr=subprocess.DEVNULL,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def _parse_clawhub_text_output(text: str) -> list[dict]:
    """Basic parser for clawhub CLI text output."""
    skills: list[dict] = []
    for line in text.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 1)
        if parts:
            skills.append({"slug": parts[0], "raw": line})
    return skills
