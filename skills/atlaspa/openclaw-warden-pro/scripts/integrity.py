#!/usr/bin/env python3
"""
OpenClaw Warden Pro — Workspace Integrity Verification
Detects unauthorized modifications and prompt injection patterns
in agent workspace files. Includes countermeasures: snapshot restore,
skill quarantine, and git rollback.

Usage:
    integrity.py baseline   [--workspace PATH]
    integrity.py verify     [--workspace PATH]
    integrity.py scan       [--workspace PATH]
    integrity.py full       [--workspace PATH]
    integrity.py status     [--workspace PATH]
    integrity.py accept FILE [--workspace PATH]
    integrity.py restore FILE [--workspace PATH]
    integrity.py quarantine SKILL [--workspace PATH]
    integrity.py unquarantine SKILL [--workspace PATH]
    integrity.py rollback FILE [--workspace PATH]
    integrity.py protect    [--workspace PATH]
"""

import hashlib
import io
import json
import os
import re
import sys
import difflib
from datetime import datetime, timezone
from pathlib import Path

# Ensure stdout can handle Unicode on Windows (cp1252 etc.)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace"
    )

MANIFEST_VERSION = 1
INTEGRITY_DIR = ".integrity"
MANIFEST_FILE = "manifest.json"
SNAPSHOTS_DIR = "snapshots"
QUARANTINE_PREFIX = ".quarantined-"

# ---------------------------------------------------------------------------
# File categories and their default severity on unexpected change
# ---------------------------------------------------------------------------

CRITICAL_FILES = {
    "SOUL.md", "AGENTS.md", "IDENTITY.md", "USER.md",
    "TOOLS.md", "HEARTBEAT.md",
}

MEMORY_PATTERNS = ["memory/*.md", "MEMORY.md"]
CONFIG_PATTERNS = ["*.json"]
SKILL_PATTERNS = ["skills/*/SKILL.md"]

SEVERITY_WARNING = "WARNING"
SEVERITY_INFO = "INFO"
SEVERITY_CRITICAL = "CRITICAL"

# ---------------------------------------------------------------------------
# Injection detection patterns
# ---------------------------------------------------------------------------

INSTRUCTION_OVERRIDE_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?previous\s+instructions",
    r"(?i)disregard\s+(all\s+)?(above|previous|prior)",
    r"(?i)forget\s+(all\s+)?your\s+instructions",
    r"(?i)you\s+are\s+now\s+(?!(?:ready|going|able))",
    r"(?i)new\s+system\s+prompt",
    r"(?i)override\s+(all\s+)?(previous|safety|existing)\s+(instructions|rules|guidelines)",
    r"(?i)act\s+as\s+if\s+you\s+(have\s+)?no\s+(restrictions|rules|guidelines|limits)",
    r"(?i)from\s+now\s+on[,\s]+you\s+(will|must|should)",
    r"(?i)entering\s+(a\s+)?(new|special|developer|admin)\s+mode",
    r"(?i)execute\s+the\s+following\s+(commands?|instructions?|code)\s*(:|without)",
]

SYSTEM_PROMPT_MARKERS = [
    r"<\s*system\s*>",
    r"\[\s*SYSTEM\s*\]",
    r"<<\s*SYS\s*>>",
    r"<\s*\|im_start\|>\s*system",
    r"\[INST\]",
    r"###\s*(?:System|Assistant|Human)\s*:",
]

HTML_INJECTION_PATTERNS = [
    r"<\s*script[\s>]",
    r"<\s*iframe[\s>]",
    r"<\s*object[\s>]",
    r"<\s*embed[\s>]",
    r"<\s*link\s[^>]*rel\s*=\s*[\"']?import",
    r"style\s*=\s*[\"'][^\"']*display\s*:\s*none",
    r"<\s*div[^>]*hidden",
    r"<\s*img\s[^>]*onerror\s*=",
]

EXFIL_IMAGE_PATTERN = (
    r"!\[[^\]]*\]\(\s*https?://[^)]*"
    r"(?:[?&][a-zA-Z0-9_]+=(?:[A-Za-z0-9+/]{20,}={0,2}|[0-9a-fA-F]{20,}))"
)

BASE64_BLOB_PATTERN = r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{60,}={0,2}(?![A-Za-z0-9+/])"

UNICODE_TRICKS = [
    "\u200b",  # zero-width space
    "\u200c",  # zero-width non-joiner
    "\u200d",  # zero-width joiner
    "\u2060",  # word joiner
    "\u2062",  # invisible times
    "\u2063",  # invisible separator
    "\ufeff",  # zero-width no-break space / BOM
    "\u202a",  # LTR embedding
    "\u202b",  # RTL embedding
    "\u202c",  # pop directional formatting
    "\u202d",  # LTR override
    "\u202e",  # RTL override
    "\u2066",  # LTR isolate
    "\u2067",  # RTL isolate
    "\u2068",  # first strong isolate
    "\u2069",  # pop directional isolate
    "\u00ad",  # soft hyphen (invisible in many renders)
]

SHELL_INJECTION_PATTERNS = [
    r"\$\([^)]+\)",           # $(command) subshell execution
]

# Inline backtick references (like `SOUL.md` or `python3 cmd`) are normal
# markdown formatting, not shell injection. Only flag multi-line backtick
# blocks that aren't fenced code blocks — but those are already handled
# by the code-block check. So we skip backtick patterns entirely to avoid
# false positives on standard markdown inline code.


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_workspace(args: list[str]) -> Path:
    """Determine workspace path from args, env, or defaults."""
    ws = None
    for i, arg in enumerate(args):
        if arg == "--workspace" and i + 1 < len(args):
            ws = args[i + 1]
            break

    if ws is None:
        ws = os.environ.get("OPENCLAW_WORKSPACE")

    if ws is None:
        cwd = Path.cwd()
        if (cwd / "AGENTS.md").exists():
            ws = str(cwd)

    if ws is None:
        ws = str(Path.home() / ".openclaw" / "workspace")

    p = Path(ws)
    if not p.is_dir():
        print(f"ERROR: Workspace not found: {p}", file=sys.stderr)
        sys.exit(1)
    return p


def manifest_path(workspace: Path) -> Path:
    return workspace / INTEGRITY_DIR / MANIFEST_FILE


def load_manifest(workspace: Path) -> dict | None:
    mp = manifest_path(workspace)
    if not mp.exists():
        return None
    with open(mp, "r", encoding="utf-8") as f:
        return json.load(f)


def save_manifest(workspace: Path, manifest: dict):
    mp = manifest_path(workspace)
    mp.parent.mkdir(parents=True, exist_ok=True)
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def classify_file(rel_path: str) -> tuple[str, str]:
    """Return (category, severity_on_change) for a relative path."""
    name = Path(rel_path).name

    if name in CRITICAL_FILES:
        return "critical", SEVERITY_WARNING

    if rel_path == "MEMORY.md" or rel_path.startswith("memory/"):
        if rel_path.endswith(".md"):
            return "memory", SEVERITY_INFO

    if rel_path.startswith("skills/") and name == "SKILL.md":
        return "skills", SEVERITY_WARNING

    if not "/" in rel_path and rel_path.endswith(".json"):
        return "config", SEVERITY_WARNING

    return "other", SEVERITY_INFO


def collect_monitored_files(workspace: Path) -> dict[str, Path]:
    """Collect all files that should be monitored, returning {rel_path: abs_path}."""
    files = {}

    # Critical files in workspace root
    for name in CRITICAL_FILES:
        p = workspace / name
        if p.is_file():
            files[name] = p

    # MEMORY.md
    p = workspace / "MEMORY.md"
    if p.is_file():
        files["MEMORY.md"] = p

    # memory/*.md
    mem_dir = workspace / "memory"
    if mem_dir.is_dir():
        for f in mem_dir.iterdir():
            if f.is_file() and f.suffix == ".md":
                rel = f.relative_to(workspace).as_posix()
                files[rel] = f

    # *.json in root (but not in .integrity/)
    for f in workspace.iterdir():
        if f.is_file() and f.suffix == ".json":
            files[f.name] = f

    # skills/*/SKILL.md
    skills_dir = workspace / "skills"
    if skills_dir.is_dir():
        for skill in skills_dir.iterdir():
            if skill.is_dir():
                sm = skill / "SKILL.md"
                if sm.is_file():
                    rel = sm.relative_to(workspace).as_posix()
                    files[rel] = sm

    return files


def read_file_text(path: Path) -> str | None:
    """Read file as text, returning None if binary."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (UnicodeDecodeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def snapshot_dir(workspace: Path) -> Path:
    return workspace / INTEGRITY_DIR / SNAPSHOTS_DIR


def save_snapshot(workspace: Path, rel: str, abspath: Path):
    """Store a copy of a file for later restoration."""
    dest = snapshot_dir(workspace) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(abspath, dest)


def get_snapshot_path(workspace: Path, rel: str) -> Path | None:
    """Get the snapshot path for a file, or None if no snapshot exists."""
    p = snapshot_dir(workspace) / rel
    return p if p.is_file() else None


def cmd_baseline(workspace: Path):
    """Establish or reset the integrity baseline."""
    files = collect_monitored_files(workspace)

    if not files:
        print("No monitored files found in workspace.")
        return

    manifest = {
        "version": MANIFEST_VERSION,
        "created": now_iso(),
        "updated": now_iso(),
        "workspace": str(workspace),
        "files": {},
    }

    snapshotted = 0
    for rel, abspath in sorted(files.items()):
        cat, _ = classify_file(rel)
        stat = abspath.stat()
        manifest["files"][rel] = {
            "sha256": sha256_file(abspath),
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(
                stat.st_mtime, tz=timezone.utc
            ).isoformat(),
            "category": cat,
        }
        # Snapshot critical and config files for restoration
        if cat in ("critical", "config", "skills"):
            save_snapshot(workspace, rel, abspath)
            snapshotted += 1

    save_manifest(workspace, manifest)
    print(f"Baseline established: {len(manifest['files'])} files tracked, {snapshotted} snapshotted")
    for rel in sorted(manifest["files"]):
        cat = manifest["files"][rel]["category"]
        has_snap = "S" if get_snapshot_path(workspace, rel) else " "
        print(f"  [{cat:8s}] [{has_snap}] {rel}")


def cmd_verify(workspace: Path) -> list[dict]:
    """Verify workspace files against baseline. Returns list of findings."""
    manifest = load_manifest(workspace)
    if manifest is None:
        print("No baseline found. Run 'baseline' first.")
        sys.exit(1)

    findings = []
    current_files = collect_monitored_files(workspace)
    baseline_files = manifest.get("files", {})

    # Check for modified and deleted files
    for rel, info in sorted(baseline_files.items()):
        if rel in current_files:
            abspath = current_files[rel]
            current_hash = sha256_file(abspath)
            if current_hash != info["sha256"]:
                cat, severity = classify_file(rel)
                # Generate diff
                diff_lines = []
                old_text = None
                new_text = read_file_text(abspath)
                # We don't have the old content, but we can show the hash mismatch
                finding = {
                    "type": "modified",
                    "file": rel,
                    "category": cat,
                    "severity": severity,
                    "old_hash": info["sha256"][:16] + "...",
                    "new_hash": current_hash[:16] + "...",
                    "old_size": info["size"],
                    "new_size": abspath.stat().st_size,
                }
                findings.append(finding)
        else:
            cat, severity = classify_file(rel)
            findings.append({
                "type": "deleted",
                "file": rel,
                "category": cat,
                "severity": SEVERITY_WARNING if cat == "critical" else severity,
            })

    # Check for new untracked files
    for rel in sorted(current_files):
        if rel not in baseline_files:
            cat, _ = classify_file(rel)
            findings.append({
                "type": "new",
                "file": rel,
                "category": cat,
                "severity": SEVERITY_INFO,
            })

    return findings


def _is_inside_code_block(text: str, match_start: int) -> bool:
    """Check if a match position is inside a fenced code block."""
    lines = text[:match_start].split("\n")
    fence_count = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            fence_count += 1
    return fence_count % 2 == 1


def scan_file_for_injections(path: Path, rel_path: str) -> list[dict]:
    """Scan a single file for prompt injection patterns."""
    text = read_file_text(path)
    if text is None:
        return []

    findings = []

    def add_finding(pattern_type: str, detail: str, line_num: int, severity: str = SEVERITY_CRITICAL):
        findings.append({
            "type": "injection",
            "file": rel_path,
            "pattern_type": pattern_type,
            "detail": detail,
            "line": line_num,
            "severity": severity,
        })

    def line_number_at(pos: int) -> int:
        return text[:pos].count("\n") + 1

    # Instruction override patterns
    for pattern in INSTRUCTION_OVERRIDE_PATTERNS:
        for m in re.finditer(pattern, text):
            if not _is_inside_code_block(text, m.start()):
                ln = line_number_at(m.start())
                add_finding(
                    "instruction_override",
                    f"Instruction override pattern: '{m.group()[:80]}'",
                    ln,
                )

    # System prompt markers
    for pattern in SYSTEM_PROMPT_MARKERS:
        for m in re.finditer(pattern, text):
            if not _is_inside_code_block(text, m.start()):
                ln = line_number_at(m.start())
                add_finding(
                    "system_prompt_marker",
                    f"System prompt marker: '{m.group()[:60]}'",
                    ln,
                )

    # HTML injection
    for pattern in HTML_INJECTION_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if not _is_inside_code_block(text, m.start()):
                ln = line_number_at(m.start())
                add_finding(
                    "html_injection",
                    f"HTML injection: '{m.group()[:60]}'",
                    ln,
                )

    # Markdown image exfiltration
    for m in re.finditer(EXFIL_IMAGE_PATTERN, text):
        if not _is_inside_code_block(text, m.start()):
            ln = line_number_at(m.start())
            add_finding(
                "exfil_image",
                f"Suspicious image URL with encoded data: '{m.group()[:80]}'",
                ln,
            )

    # Base64 blobs outside code blocks
    for m in re.finditer(BASE64_BLOB_PATTERN, text):
        if not _is_inside_code_block(text, m.start()):
            blob = m.group()
            # Skip if it looks like a normal hash (exactly 64 hex chars = sha256)
            if len(blob) <= 64 and re.fullmatch(r"[0-9a-fA-F]+", blob):
                continue
            # Skip short blobs that might be normal encoded values
            if len(blob) < 80:
                continue
            ln = line_number_at(m.start())
            add_finding(
                "base64_payload",
                f"Large base64 blob ({len(blob)} chars): '{blob[:40]}...'",
                ln,
                SEVERITY_WARNING,
            )

    # Unicode tricks
    for char in UNICODE_TRICKS:
        idx = text.find(char)
        while idx != -1:
            ln = line_number_at(idx)
            add_finding(
                "unicode_trick",
                f"Hidden Unicode character U+{ord(char):04X} ({repr(char)})",
                ln,
                SEVERITY_WARNING,
            )
            idx = text.find(char, idx + 1)

    # Shell injection outside code blocks
    for pattern in SHELL_INJECTION_PATTERNS:
        for m in re.finditer(pattern, text):
            if not _is_inside_code_block(text, m.start()):
                ln = line_number_at(m.start())
                add_finding(
                    "shell_injection",
                    f"Possible shell injection: '{m.group()[:60]}'",
                    ln,
                    SEVERITY_WARNING,
                )

    return findings


def cmd_scan(workspace: Path) -> list[dict]:
    """Scan all workspace files for injection patterns."""
    files = collect_monitored_files(workspace)
    all_findings = []

    for rel, abspath in sorted(files.items()):
        # Skip our own skill files — they document injection patterns
        # and will always trigger false positives
        if rel.startswith("skills/openclaw-warden/"):
            continue
        # Skip quarantined skills — already neutralized
        if QUARANTINE_PREFIX in rel:
            continue
        findings = scan_file_for_injections(abspath, rel)
        all_findings.extend(findings)

    return all_findings


def cmd_full(workspace: Path) -> tuple[list[dict], list[dict]]:
    """Run both verify and scan."""
    verify_findings = cmd_verify(workspace)
    scan_findings = cmd_scan(workspace)
    return verify_findings, scan_findings


def cmd_status(workspace: Path):
    """Quick one-line workspace health summary."""
    manifest = load_manifest(workspace)
    if manifest is None:
        print("STATUS: NO BASELINE — Run 'baseline' to initialize")
        return

    files = collect_monitored_files(workspace)
    baseline_files = manifest.get("files", {})

    modified = 0
    deleted = 0
    new = 0

    for rel, info in baseline_files.items():
        if rel in files:
            if sha256_file(files[rel]) != info["sha256"]:
                modified += 1
        else:
            deleted += 1

    for rel in files:
        if rel not in baseline_files:
            new += 1

    total = len(baseline_files)
    updated = manifest.get("updated", "unknown")

    if modified == 0 and deleted == 0 and new == 0:
        print(f"STATUS: CLEAN — {total} files tracked, baseline from {updated}")
    else:
        parts = []
        if modified:
            parts.append(f"{modified} modified")
        if deleted:
            parts.append(f"{deleted} deleted")
        if new:
            parts.append(f"{new} new")
        print(f"STATUS: CHANGED — {', '.join(parts)} ({total} tracked, baseline from {updated})")


def cmd_accept(workspace: Path, filepath: str):
    """Accept a changed file into the baseline."""
    manifest = load_manifest(workspace)
    if manifest is None:
        print("No baseline found. Run 'baseline' first.")
        sys.exit(1)

    # Normalize the path
    rel = filepath.replace("\\", "/")
    abspath = workspace / rel

    if not abspath.is_file():
        print(f"File not found: {rel}")
        sys.exit(1)

    cat, _ = classify_file(rel)
    stat = abspath.stat()

    manifest["files"][rel] = {
        "sha256": sha256_file(abspath),
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(
            stat.st_mtime, tz=timezone.utc
        ).isoformat(),
        "category": cat,
    }
    manifest["updated"] = now_iso()

    save_manifest(workspace, manifest)
    print(f"Accepted: {rel} (category: {cat})")


# ---------------------------------------------------------------------------
# Countermeasures
# ---------------------------------------------------------------------------

def cmd_restore(workspace: Path, filepath: str):
    """Restore a file from its baseline snapshot."""
    rel = filepath.replace("\\", "/")
    snap = get_snapshot_path(workspace, rel)

    if snap is None:
        print(f"No snapshot found for: {rel}")
        print("Only critical, config, and skill files are snapshotted.")
        sys.exit(1)

    dest = workspace / rel
    import shutil
    shutil.copy2(snap, dest)
    print(f"Restored: {rel} (from baseline snapshot)")

    # Verify the restore matched the baseline hash
    manifest = load_manifest(workspace)
    if manifest and rel in manifest.get("files", {}):
        expected = manifest["files"][rel]["sha256"]
        actual = sha256_file(dest)
        if expected == actual:
            print(f"  Verified: hash matches baseline")
        else:
            print(f"  WARNING: restored file hash does not match baseline")
            print(f"    Expected: {expected[:16]}...")
            print(f"    Got:      {actual[:16]}...")


def cmd_rollback(workspace: Path, filepath: str):
    """Rollback a file to its last git-committed state."""
    import subprocess
    rel = filepath.replace("\\", "/")
    abspath = workspace / rel

    # Check if workspace is a git repo
    git_dir = workspace / ".git"
    if not git_dir.exists():
        print(f"Workspace is not a git repository. Cannot rollback.")
        print(f"Use 'restore' to restore from snapshot instead.")
        sys.exit(1)

    # Check if file is tracked by git
    result = subprocess.run(
        ["git", "ls-files", rel],
        cwd=str(workspace),
        capture_output=True, text=True,
    )
    if not result.stdout.strip():
        print(f"File is not tracked by git: {rel}")
        sys.exit(1)

    # Checkout from HEAD
    result = subprocess.run(
        ["git", "checkout", "HEAD", "--", rel],
        cwd=str(workspace),
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"Git rollback failed: {result.stderr.strip()}")
        sys.exit(1)

    print(f"Rolled back: {rel} (to last git commit)")
    print(f"  Hash: {sha256_file(abspath)[:16]}...")


def cmd_quarantine(workspace: Path, skill_name: str):
    """Quarantine a skill by renaming its directory so OpenClaw won't load it."""
    skills_dir = workspace / "skills"
    skill_dir = skills_dir / skill_name

    if not skill_dir.is_dir():
        # Check if already quarantined
        quarantined = skills_dir / (QUARANTINE_PREFIX + skill_name)
        if quarantined.is_dir():
            print(f"Skill '{skill_name}' is already quarantined.")
            return
        print(f"Skill not found: {skill_name}")
        print(f"Available skills:")
        if skills_dir.is_dir():
            for d in sorted(skills_dir.iterdir()):
                if d.is_dir():
                    prefix = "[Q] " if d.name.startswith(QUARANTINE_PREFIX) else "    "
                    name = d.name.removeprefix(QUARANTINE_PREFIX) if d.name.startswith(QUARANTINE_PREFIX) else d.name
                    print(f"  {prefix}{name}")
        sys.exit(1)

    quarantined = skills_dir / (QUARANTINE_PREFIX + skill_name)
    skill_dir.rename(quarantined)
    print(f"Quarantined: {skill_name}")
    print(f"  Moved: skills/{skill_name}/ -> skills/{QUARANTINE_PREFIX}{skill_name}/")
    print(f"  OpenClaw will not load this skill on next session.")
    print(f"  To restore: run 'unquarantine {skill_name}'")


def cmd_unquarantine(workspace: Path, skill_name: str):
    """Restore a quarantined skill."""
    skills_dir = workspace / "skills"
    quarantined = skills_dir / (QUARANTINE_PREFIX + skill_name)

    if not quarantined.is_dir():
        print(f"No quarantined skill found: {skill_name}")
        sys.exit(1)

    restored = skills_dir / skill_name
    if restored.is_dir():
        print(f"Cannot unquarantine: skills/{skill_name}/ already exists")
        sys.exit(1)

    quarantined.rename(restored)
    print(f"Unquarantined: {skill_name}")
    print(f"  Moved: skills/{QUARANTINE_PREFIX}{skill_name}/ -> skills/{skill_name}/")
    print(f"  WARNING: Re-scan this skill before use.")


def cmd_protect(workspace: Path):
    """Full scan + automatic countermeasures for critical threats.

    Actions taken:
    1. Run full integrity verification + injection scan
    2. For critical injection findings: restore from snapshot if available
    3. For modified critical files with injections: restore from snapshot
    4. For skills containing injections: quarantine the skill
    5. Report all actions taken
    """
    print("=" * 60)
    print("WORKSPACE PROTECTION SWEEP")
    print("=" * 60)
    print(f"Timestamp: {now_iso()}")
    print()

    verify_findings, scan_findings = cmd_full(workspace)
    actions_taken = []

    if not verify_findings and not scan_findings:
        print("No threats detected. Workspace is clean.")
        print("=" * 60)
        return

    # Identify files with injection findings
    injected_files = set()
    for f in scan_findings:
        if f.get("severity") == SEVERITY_CRITICAL:
            injected_files.add(f["file"])

    # Identify modified critical files
    modified_critical = set()
    for f in verify_findings:
        if f["type"] == "modified" and f["category"] == "critical":
            modified_critical.add(f["file"])

    print()
    print("-" * 40)
    print("COUNTERMEASURES")
    print("-" * 40)

    # Restore critical files that were modified and have injections
    files_to_restore = (modified_critical & injected_files) | modified_critical
    for rel in sorted(files_to_restore):
        snap = get_snapshot_path(workspace, rel)
        if snap:
            import shutil
            dest = workspace / rel
            shutil.copy2(snap, dest)
            actions_taken.append(f"RESTORED: {rel} (from baseline snapshot)")
            print(f"  [RESTORE] {rel} <- baseline snapshot")
        else:
            # Try git rollback
            git_dir = workspace / ".git"
            if git_dir.exists():
                import subprocess
                result = subprocess.run(
                    ["git", "checkout", "HEAD", "--", rel],
                    cwd=str(workspace),
                    capture_output=True, text=True,
                )
                if result.returncode == 0:
                    actions_taken.append(f"ROLLED BACK: {rel} (from git)")
                    print(f"  [ROLLBACK] {rel} <- git HEAD")
                else:
                    actions_taken.append(f"FAILED TO RESTORE: {rel}")
                    print(f"  [FAILED] {rel} — no snapshot or git history")
            else:
                actions_taken.append(f"UNRESOLVED: {rel} — no snapshot available")
                print(f"  [MANUAL] {rel} — no snapshot, review manually")

    # Quarantine skills with critical injection findings
    quarantined_skills = set()
    for rel in injected_files:
        if rel.startswith("skills/") and "/SKILL.md" in rel:
            # Extract skill name: skills/<name>/SKILL.md
            parts = rel.split("/")
            if len(parts) >= 2:
                skill_name = parts[1]
                if skill_name.startswith(QUARANTINE_PREFIX):
                    continue
                if skill_name == "openclaw-warden":
                    continue
                if skill_name not in quarantined_skills:
                    skill_dir = workspace / "skills" / skill_name
                    quarantined_dir = workspace / "skills" / (QUARANTINE_PREFIX + skill_name)
                    if skill_dir.is_dir():
                        skill_dir.rename(quarantined_dir)
                        quarantined_skills.add(skill_name)
                        actions_taken.append(f"QUARANTINED: skill '{skill_name}'")
                        print(f"  [QUARANTINE] skills/{skill_name}/")

    # Handle injected memory/other files (can't auto-restore, flag for review)
    for rel in sorted(injected_files):
        if rel.startswith("skills/"):
            continue  # Handled above
        if rel in files_to_restore:
            continue  # Already restored
        actions_taken.append(f"FLAGGED: {rel} — contains injections, manual review needed")
        print(f"  [FLAG] {rel} — injection detected, review manually")

    print()
    if actions_taken:
        print(f"ACTIONS TAKEN: {len(actions_taken)}")
        for a in actions_taken:
            print(f"  - {a}")
    else:
        print("No automatic actions taken. Review findings above.")

    print()
    print("NEXT STEPS:")
    if files_to_restore:
        print("  - Restored files should be re-verified: run 'verify'")
    if quarantined_skills:
        print("  - Quarantined skills will not load on next session")
        print("  - Investigate quarantined skills before unquarantining")
    print("  - Run 'baseline' to update baseline after review")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def format_findings(verify_findings: list[dict], scan_findings: list[dict]) -> str:
    """Format findings into a structured text report."""
    lines = []
    lines.append("=" * 60)
    lines.append("WORKSPACE INTEGRITY REPORT")
    lines.append("=" * 60)
    lines.append(f"Timestamp: {now_iso()}")
    lines.append("")

    total_issues = len(verify_findings) + len(scan_findings)
    criticals = sum(1 for f in scan_findings if f.get("severity") == SEVERITY_CRITICAL)
    warnings = sum(
        1 for f in verify_findings + scan_findings
        if f.get("severity") == SEVERITY_WARNING
    )
    infos = sum(
        1 for f in verify_findings + scan_findings
        if f.get("severity") == SEVERITY_INFO
    )

    if total_issues == 0:
        lines.append("RESULT: CLEAN")
        lines.append("No integrity violations or injection patterns detected.")
        lines.append("=" * 60)
        return "\n".join(lines)

    lines.append(f"RESULT: {total_issues} ISSUE(S) FOUND")
    if criticals:
        lines.append(f"  CRITICAL: {criticals}")
    if warnings:
        lines.append(f"  WARNING:  {warnings}")
    if infos:
        lines.append(f"  INFO:     {infos}")
    lines.append("")

    # Integrity findings
    modified = [f for f in verify_findings if f["type"] == "modified"]
    deleted = [f for f in verify_findings if f["type"] == "deleted"]
    new = [f for f in verify_findings if f["type"] == "new"]

    if modified:
        lines.append("-" * 40)
        lines.append("MODIFIED FILES")
        lines.append("-" * 40)
        for f in modified:
            lines.append(f"  [{f['severity']:8s}] {f['file']} ({f['category']})")
            lines.append(f"           Hash: {f['old_hash']} -> {f['new_hash']}")
            lines.append(f"           Size: {f['old_size']} -> {f['new_size']} bytes")
        lines.append("")

    if deleted:
        lines.append("-" * 40)
        lines.append("DELETED FILES")
        lines.append("-" * 40)
        for f in deleted:
            lines.append(f"  [{f['severity']:8s}] {f['file']} ({f['category']})")
        lines.append("")

    if new:
        lines.append("-" * 40)
        lines.append("NEW UNTRACKED FILES")
        lines.append("-" * 40)
        for f in new:
            lines.append(f"  [{f['severity']:8s}] {f['file']} ({f['category']})")
        lines.append("")

    # Injection findings
    if scan_findings:
        lines.append("-" * 40)
        lines.append("INJECTION SCAN RESULTS")
        lines.append("-" * 40)
        by_file: dict[str, list[dict]] = {}
        for f in scan_findings:
            by_file.setdefault(f["file"], []).append(f)

        for fname, findings in sorted(by_file.items()):
            lines.append(f"  {fname}:")
            for f in findings:
                lines.append(
                    f"    [{f['severity']:8s}] Line {f['line']}: "
                    f"{f['pattern_type']} — {f['detail']}"
                )
            lines.append("")

    lines.append("=" * 60)
    lines.append("RECOMMENDED ACTIONS:")

    if criticals:
        lines.append("  1. CRITICAL issues require immediate investigation.")
        lines.append("     Review flagged files for unauthorized modifications.")
        lines.append("     Do NOT load these files into the agent until verified.")

    if modified:
        lines.append("  - Review modified files. If changes are legitimate,")
        lines.append("    run 'accept <file>' to update the baseline.")

    if new:
        lines.append("  - Review new files. Run 'baseline' to include them,")
        lines.append("    or investigate why they appeared.")

    lines.append("=" * 60)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__.strip())
        sys.exit(0)

    command = args[0]
    rest = args[1:]

    if command == "baseline":
        workspace = resolve_workspace(rest)
        cmd_baseline(workspace)

    elif command == "verify":
        workspace = resolve_workspace(rest)
        findings = cmd_verify(workspace)
        report = format_findings(findings, [])
        print(report)
        if any(f["severity"] == SEVERITY_CRITICAL for f in findings):
            sys.exit(2)
        elif findings:
            sys.exit(1)

    elif command == "scan":
        workspace = resolve_workspace(rest)
        findings = cmd_scan(workspace)
        report = format_findings([], findings)
        print(report)
        if any(f["severity"] == SEVERITY_CRITICAL for f in findings):
            sys.exit(2)
        elif findings:
            sys.exit(1)

    elif command == "full":
        workspace = resolve_workspace(rest)
        verify_findings, scan_findings = cmd_full(workspace)
        report = format_findings(verify_findings, scan_findings)
        print(report)
        all_findings = verify_findings + scan_findings
        if any(f["severity"] == SEVERITY_CRITICAL for f in all_findings):
            sys.exit(2)
        elif all_findings:
            sys.exit(1)

    elif command == "status":
        workspace = resolve_workspace(rest)
        cmd_status(workspace)

    elif command == "accept":
        if not rest or rest[0].startswith("-"):
            print("Usage: integrity.py accept <file> [--workspace PATH]")
            sys.exit(1)
        filepath = rest[0]
        workspace = resolve_workspace(rest[1:])
        cmd_accept(workspace, filepath)

    elif command == "restore":
        if not rest or rest[0].startswith("-"):
            print("Usage: integrity.py restore <file> [--workspace PATH]")
            sys.exit(1)
        filepath = rest[0]
        workspace = resolve_workspace(rest[1:])
        cmd_restore(workspace, filepath)

    elif command == "rollback":
        if not rest or rest[0].startswith("-"):
            print("Usage: integrity.py rollback <file> [--workspace PATH]")
            sys.exit(1)
        filepath = rest[0]
        workspace = resolve_workspace(rest[1:])
        cmd_rollback(workspace, filepath)

    elif command == "quarantine":
        if not rest or rest[0].startswith("-"):
            print("Usage: integrity.py quarantine <skill-name> [--workspace PATH]")
            sys.exit(1)
        skill_name = rest[0]
        workspace = resolve_workspace(rest[1:])
        cmd_quarantine(workspace, skill_name)

    elif command == "unquarantine":
        if not rest or rest[0].startswith("-"):
            print("Usage: integrity.py unquarantine <skill-name> [--workspace PATH]")
            sys.exit(1)
        skill_name = rest[0]
        workspace = resolve_workspace(rest[1:])
        cmd_unquarantine(workspace, skill_name)

    elif command == "protect":
        workspace = resolve_workspace(rest)
        cmd_protect(workspace)

    else:
        print(f"Unknown command: {command}")
        print("Commands: baseline, verify, scan, full, status, accept,")
        print("          restore, rollback, quarantine, unquarantine, protect")
        sys.exit(1)


if __name__ == "__main__":
    main()
