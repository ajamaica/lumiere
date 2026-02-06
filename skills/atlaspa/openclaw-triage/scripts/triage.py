#!/usr/bin/env python3
"""
OpenClaw Triage — Incident Response & Forensics for Agent Workspaces

When a compromise is suspected, triage collects evidence from all available
security tools (warden, ledger, signet, sentinel), builds a unified timeline,
assesses the blast radius, and guides recovery.

Usage:
    triage.py investigate  [--workspace PATH]
    triage.py timeline     [--hours N] [--workspace PATH]
    triage.py scope        [--workspace PATH]
    triage.py evidence     [--output DIR] [--workspace PATH]
    triage.py status       [--workspace PATH]

For automated containment, remediation playbooks, and evidence export,
see openclaw-triage-pro.
"""

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Windows Unicode stdout fix
# ---------------------------------------------------------------------------
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace"
    )

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TRIAGE_DIR = ".triage"
TRIAGE_STATE_FILE = "state.json"

SKIP_DIRS = {
    ".git", ".svn", ".hg", "__pycache__", "node_modules",
    ".triage", ".integrity", ".ledger", ".signet", ".sentinel",
    ".venv", "venv", ".env",
}

SELF_SKILL_DIRS = {"openclaw-triage", "openclaw-triage-pro"}

CRITICAL_WORKSPACE_FILES = {
    "SOUL.md", "AGENTS.md", "IDENTITY.md", "USER.md",
    "TOOLS.md", "HEARTBEAT.md",
}

MEMORY_FILE_PATTERNS = {"MEMORY.md", "memory/"}
CONFIG_EXTENSIONS = {".json", ".yaml", ".yml", ".toml"}
SKILL_MARKER = "SKILL.md"

# Cross-reference data paths from other OpenClaw tools
WARDEN_MANIFEST = ".integrity/manifest.json"
LEDGER_CHAIN = ".ledger/chain.jsonl"
SIGNET_MANIFEST = ".signet/manifest.json"
SENTINEL_THREATS = ".sentinel/threats.json"

# Patterns that suggest credential exposure
CREDENTIAL_PATTERNS = [
    r"(?i)(?:api[_-]?key|secret[_-]?key|password|token|auth)\s*[:=]\s*\S+",
    r"(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*",
    r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}",
    r"sk-[A-Za-z0-9]{32,}",
    r"AKIA[0-9A-Z]{16}",
]

# Patterns suggesting data exfiltration
EXFIL_URL_PATTERNS = [
    r"https?://[^\s\"'`>\)]+\?[^\s\"'`>\)]*(?:data|payload|exfil|dump|leak)",
    r"https?://[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}[:/]",
    r"https?://[^\s\"'`>\)]*\.ngrok\.",
    r"https?://[^\s\"'`>\)]*webhook\.site",
    r"https?://[^\s\"'`>\)]*requestbin",
    r"https?://[^\s\"'`>\)]*pipedream",
]

# Severity levels
SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"

SEVERITY_RANK = {
    SEVERITY_CRITICAL: 4,
    SEVERITY_HIGH: 3,
    SEVERITY_MEDIUM: 2,
    SEVERITY_LOW: 1,
}

# Default working hours (24-hour format)
DEFAULT_WORK_HOURS_START = 7
DEFAULT_WORK_HOURS_END = 22

# Threshold for burst detection (files modified in a window)
BURST_THRESHOLD_FILES = 5
BURST_WINDOW_MINUTES = 5

# Large file threshold in bytes (1 MB)
LARGE_FILE_THRESHOLD = 1_048_576


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def sha256_file(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return "ERROR_READING_FILE"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ts_to_dt(timestamp: float) -> datetime:
    """Convert a POSIX timestamp to timezone-aware UTC datetime."""
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def dt_to_iso(dt: datetime) -> str:
    return dt.isoformat()


def resolve_workspace(ns) -> Path:
    """Determine workspace path from argparse namespace, env, or defaults."""
    ws = getattr(ns, "workspace", None)

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


def triage_dir(workspace: Path) -> Path:
    return workspace / TRIAGE_DIR


def state_path(workspace: Path) -> Path:
    return triage_dir(workspace) / TRIAGE_STATE_FILE


def load_state(workspace: Path) -> dict | None:
    sp = state_path(workspace)
    if not sp.exists():
        return None
    try:
        with open(sp, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def save_state(workspace: Path, state: dict):
    td = triage_dir(workspace)
    td.mkdir(parents=True, exist_ok=True)
    sp = td / TRIAGE_STATE_FILE
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def read_json_safe(path: Path) -> dict | list | None:
    """Safely read a JSON file, returning None on any error."""
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return None


def read_jsonl_safe(path: Path) -> list[dict]:
    """Safely read a JSONL file, returning list of parsed objects."""
    if not path.is_file():
        return []
    entries = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        entries.append({"_raw": line, "_parse_error": True})
    except (OSError, UnicodeDecodeError):
        pass
    return entries


def read_file_text(path: Path) -> str | None:
    """Read file as text, returning None if binary or unreadable."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (UnicodeDecodeError, ValueError, OSError):
        return None


# ---------------------------------------------------------------------------
# Workspace file collection
# ---------------------------------------------------------------------------

def collect_all_files(workspace: Path) -> list[dict]:
    """
    Walk the workspace and collect metadata for every file.
    Returns a list of dicts with: rel_path, abs_path, size, mtime, mtime_dt, hash.
    """
    files = []
    for root, dirs, filenames in os.walk(workspace):
        # Prune skipped directories
        dirs[:] = [
            d for d in dirs
            if d not in SKIP_DIRS
            and not (
                Path(root).relative_to(workspace).parts[:1] == ("skills",)
                and d in SELF_SKILL_DIRS
            )
        ]
        for fname in filenames:
            abspath = Path(root) / fname
            try:
                rel = abspath.relative_to(workspace).as_posix()
            except ValueError:
                continue
            try:
                stat = abspath.stat()
            except OSError:
                continue
            files.append({
                "rel_path": rel,
                "abs_path": abspath,
                "size": stat.st_size,
                "mtime": stat.st_mtime,
                "mtime_dt": ts_to_dt(stat.st_mtime),
                "hash": None,  # computed lazily
            })
    return files


def classify_path(rel_path: str) -> str:
    """Classify a file path into a risk category."""
    name = Path(rel_path).name

    if name in CRITICAL_WORKSPACE_FILES:
        return "critical"
    if rel_path == "MEMORY.md" or rel_path.startswith("memory/"):
        return "memory"
    if rel_path.startswith("skills/"):
        return "skill"
    if Path(rel_path).suffix in CONFIG_EXTENSIONS and "/" not in rel_path:
        return "config"
    if rel_path.startswith("."):
        return "dotfile"
    return "other"


def compute_hash(entry: dict) -> str:
    """Compute and cache the SHA-256 hash for a file entry."""
    if entry["hash"] is None:
        entry["hash"] = sha256_file(entry["abs_path"])
    return entry["hash"]


# ---------------------------------------------------------------------------
# Cross-reference: other OpenClaw tools
# ---------------------------------------------------------------------------

def check_warden(workspace: Path) -> list[dict]:
    """Check warden manifest for baseline deviations."""
    findings = []
    data = read_json_safe(workspace / WARDEN_MANIFEST)
    if data is None:
        findings.append({
            "source": "warden",
            "severity": SEVERITY_LOW,
            "detail": "No warden baseline found (.integrity/manifest.json missing)",
        })
        return findings

    baseline_files = data.get("files", {})
    for rel, info in baseline_files.items():
        abspath = workspace / rel
        if not abspath.is_file():
            findings.append({
                "source": "warden",
                "severity": SEVERITY_HIGH,
                "detail": f"Baseline file missing: {rel}",
            })
            continue
        current_hash = sha256_file(abspath)
        if current_hash != info.get("sha256", ""):
            cat = info.get("category", "unknown")
            sev = SEVERITY_HIGH if cat == "critical" else SEVERITY_MEDIUM
            findings.append({
                "source": "warden",
                "severity": sev,
                "detail": f"File modified since baseline: {rel} (category: {cat})",
            })

    findings.append({
        "source": "warden",
        "severity": SEVERITY_LOW,
        "detail": f"Warden baseline present: {len(baseline_files)} files tracked",
    })
    return findings


def check_ledger(workspace: Path) -> list[dict]:
    """Check ledger chain for breaks or suspicious entries."""
    findings = []
    entries = read_jsonl_safe(workspace / LEDGER_CHAIN)
    if not entries:
        findings.append({
            "source": "ledger",
            "severity": SEVERITY_LOW,
            "detail": "No ledger chain found (.ledger/chain.jsonl missing or empty)",
        })
        return findings

    # Check for parse errors (possible tampering)
    parse_errors = [e for e in entries if e.get("_parse_error")]
    if parse_errors:
        findings.append({
            "source": "ledger",
            "severity": SEVERITY_HIGH,
            "detail": f"Ledger chain contains {len(parse_errors)} unparseable entries (possible tampering)",
        })

    # Check for chain integrity (sequential hashes if present)
    prev_hash = None
    breaks = 0
    for entry in entries:
        if entry.get("_parse_error"):
            breaks += 1
            prev_hash = None
            continue
        entry_prev = entry.get("prev_hash") or entry.get("previous_hash")
        if prev_hash is not None and entry_prev is not None:
            if entry_prev != prev_hash:
                breaks += 1
        current_hash = entry.get("hash") or entry.get("entry_hash")
        if current_hash:
            prev_hash = current_hash
        else:
            prev_hash = None

    if breaks > 0:
        findings.append({
            "source": "ledger",
            "severity": SEVERITY_CRITICAL,
            "detail": f"Ledger chain has {breaks} break(s) — possible tampering or data loss",
        })

    findings.append({
        "source": "ledger",
        "severity": SEVERITY_LOW,
        "detail": f"Ledger chain present: {len(entries)} entries",
    })
    return findings


def check_signet(workspace: Path) -> list[dict]:
    """Check signet manifest for tampered skills."""
    findings = []
    data = read_json_safe(workspace / SIGNET_MANIFEST)
    if data is None:
        findings.append({
            "source": "signet",
            "severity": SEVERITY_LOW,
            "detail": "No signet manifest found (.signet/manifest.json missing)",
        })
        return findings

    skills = data.get("skills", data.get("signatures", {}))
    if isinstance(skills, dict):
        tampered = []
        for skill_name, info in skills.items():
            expected_hash = info.get("hash") or info.get("sha256")
            skill_path = info.get("path")
            if expected_hash and skill_path:
                abspath = workspace / skill_path
                if abspath.is_file():
                    actual = sha256_file(abspath)
                    if actual != expected_hash:
                        tampered.append(skill_name)
                elif abspath.is_dir():
                    # Directory-level check — just note it
                    pass

        if tampered:
            findings.append({
                "source": "signet",
                "severity": SEVERITY_CRITICAL,
                "detail": f"Tampered skill signatures detected: {', '.join(tampered)}",
            })

    findings.append({
        "source": "signet",
        "severity": SEVERITY_LOW,
        "detail": f"Signet manifest present: {len(skills) if isinstance(skills, dict) else 0} skill(s) tracked",
    })
    return findings


def check_sentinel(workspace: Path) -> list[dict]:
    """Check sentinel threat database for known threats."""
    findings = []
    data = read_json_safe(workspace / SENTINEL_THREATS)
    if data is None:
        findings.append({
            "source": "sentinel",
            "severity": SEVERITY_LOW,
            "detail": "No sentinel threat data found (.sentinel/threats.json missing)",
        })
        return findings

    threats = data.get("threats", data.get("findings", []))
    if isinstance(threats, list) and threats:
        critical_threats = [t for t in threats if t.get("severity", "").upper() in ("CRITICAL", "HIGH")]
        if critical_threats:
            findings.append({
                "source": "sentinel",
                "severity": SEVERITY_HIGH,
                "detail": f"Sentinel reports {len(critical_threats)} high/critical threat(s) in workspace",
            })
        findings.append({
            "source": "sentinel",
            "severity": SEVERITY_MEDIUM if threats else SEVERITY_LOW,
            "detail": f"Sentinel threat DB present: {len(threats)} finding(s)",
        })
    else:
        findings.append({
            "source": "sentinel",
            "severity": SEVERITY_LOW,
            "detail": "Sentinel threat DB present but empty",
        })
    return findings


# ---------------------------------------------------------------------------
# Investigation engine
# ---------------------------------------------------------------------------

def check_recently_modified_critical(files: list[dict], hours: int = 24) -> list[dict]:
    """Find critical files modified within the given timeframe."""
    findings = []
    cutoff = now_utc() - timedelta(hours=hours)
    for entry in files:
        cat = classify_path(entry["rel_path"])
        if cat == "critical" and entry["mtime_dt"] > cutoff:
            findings.append({
                "source": "investigate",
                "severity": SEVERITY_HIGH,
                "detail": f"Critical file recently modified: {entry['rel_path']} "
                          f"(at {dt_to_iso(entry['mtime_dt'])})",
            })
    return findings


def check_new_or_modified_skills(files: list[dict], hours: int = 24) -> list[dict]:
    """Find skill files created or modified recently."""
    findings = []
    cutoff = now_utc() - timedelta(hours=hours)
    for entry in files:
        if entry["rel_path"].startswith("skills/") and entry["mtime_dt"] > cutoff:
            findings.append({
                "source": "investigate",
                "severity": SEVERITY_MEDIUM,
                "detail": f"Skill file recently modified: {entry['rel_path']} "
                          f"(at {dt_to_iso(entry['mtime_dt'])})",
            })
    return findings


def check_outside_work_hours(files: list[dict], start: int = DEFAULT_WORK_HOURS_START,
                             end: int = DEFAULT_WORK_HOURS_END, hours: int = 72) -> list[dict]:
    """Find files modified outside normal working hours."""
    findings = []
    cutoff = now_utc() - timedelta(hours=hours)
    for entry in files:
        if entry["mtime_dt"] < cutoff:
            continue
        local_hour = entry["mtime_dt"].astimezone().hour
        if local_hour < start or local_hour >= end:
            cat = classify_path(entry["rel_path"])
            if cat in ("critical", "skill", "config"):
                findings.append({
                    "source": "investigate",
                    "severity": SEVERITY_MEDIUM,
                    "detail": f"File modified outside work hours ({local_hour:02d}:xx): "
                              f"{entry['rel_path']}",
                })
    return findings


def check_large_files(files: list[dict], hours: int = 48) -> list[dict]:
    """Find large files that appeared recently."""
    findings = []
    cutoff = now_utc() - timedelta(hours=hours)
    for entry in files:
        if entry["size"] > LARGE_FILE_THRESHOLD and entry["mtime_dt"] > cutoff:
            size_mb = entry["size"] / (1024 * 1024)
            findings.append({
                "source": "investigate",
                "severity": SEVERITY_MEDIUM,
                "detail": f"Large file appeared recently ({size_mb:.1f} MB): {entry['rel_path']}",
            })
    return findings


def check_hidden_files(files: list[dict]) -> list[dict]:
    """Find hidden files or directories (dot-prefixed) outside known dirs."""
    findings = []
    known_dot_dirs = {".integrity", ".ledger", ".signet", ".sentinel", ".triage",
                      ".git", ".svn", ".hg", ".vscode", ".idea", ".claude"}
    for entry in files:
        parts = Path(entry["rel_path"]).parts
        for part in parts:
            if part.startswith(".") and part not in known_dot_dirs:
                findings.append({
                    "source": "investigate",
                    "severity": SEVERITY_LOW,
                    "detail": f"Hidden file/directory: {entry['rel_path']}",
                })
                break
    return findings


def calculate_severity(findings: list[dict]) -> str:
    """Calculate overall incident severity from findings."""
    if not findings:
        return SEVERITY_LOW

    max_rank = 0
    critical_count = 0
    high_count = 0

    for f in findings:
        rank = SEVERITY_RANK.get(f.get("severity", SEVERITY_LOW), 0)
        if rank > max_rank:
            max_rank = rank
        if f["severity"] == SEVERITY_CRITICAL:
            critical_count += 1
        elif f["severity"] == SEVERITY_HIGH:
            high_count += 1

    # Escalate based on volume of findings
    if critical_count > 0:
        return SEVERITY_CRITICAL
    if high_count >= 3:
        return SEVERITY_CRITICAL
    if high_count > 0:
        return SEVERITY_HIGH
    if len(findings) > 10:
        return SEVERITY_HIGH
    if len(findings) > 5:
        return SEVERITY_MEDIUM
    return SEVERITY_LOW


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_investigate(workspace: Path):
    """Full incident investigation."""
    print("=" * 60)
    print("INCIDENT INVESTIGATION REPORT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    # Collect workspace state
    print("[1/5] Collecting workspace file inventory...")
    files = collect_all_files(workspace)
    print(f"      Found {len(files)} files")
    print()

    all_findings = []

    # Check for signs of compromise
    print("[2/5] Checking for signs of compromise...")
    all_findings.extend(check_recently_modified_critical(files))
    all_findings.extend(check_new_or_modified_skills(files))
    all_findings.extend(check_outside_work_hours(files))
    all_findings.extend(check_large_files(files))
    all_findings.extend(check_hidden_files(files))
    local_count = len(all_findings)
    print(f"      Local checks: {local_count} finding(s)")
    print()

    # Cross-reference with other OpenClaw tools
    print("[3/5] Cross-referencing with OpenClaw security tools...")
    warden_findings = check_warden(workspace)
    ledger_findings = check_ledger(workspace)
    signet_findings = check_signet(workspace)
    sentinel_findings = check_sentinel(workspace)

    # Only include non-LOW findings from cross-references in the main findings
    for f in warden_findings + ledger_findings + signet_findings + sentinel_findings:
        if f["severity"] != SEVERITY_LOW:
            all_findings.append(f)

    # Show cross-ref status
    for source, flist in [("warden", warden_findings), ("ledger", ledger_findings),
                          ("signet", signet_findings), ("sentinel", sentinel_findings)]:
        status_items = [f for f in flist if f["severity"] == SEVERITY_LOW]
        alert_items = [f for f in flist if f["severity"] != SEVERITY_LOW]
        status_msg = status_items[0]["detail"] if status_items else "N/A"
        print(f"      {source:10s}: {status_msg}")
        if alert_items:
            for a in alert_items:
                print(f"                   [{a['severity']:8s}] {a['detail']}")
    print()

    # Build timeline summary
    print("[4/5] Building event timeline...")
    recent_files = sorted(
        [f for f in files if f["mtime_dt"] > now_utc() - timedelta(hours=24)],
        key=lambda x: x["mtime"],
        reverse=True,
    )
    print(f"      {len(recent_files)} files modified in last 24 hours")
    if recent_files:
        print(f"      Most recent: {recent_files[0]['rel_path']} "
              f"({dt_to_iso(recent_files[0]['mtime_dt'])})")
    print()

    # Calculate severity
    print("[5/5] Calculating incident severity...")
    severity = calculate_severity(all_findings)
    print()

    # Final report
    actionable = [f for f in all_findings if f["severity"] != SEVERITY_LOW]
    print("-" * 60)
    print(f"INCIDENT SEVERITY: {severity}")
    print(f"TOTAL FINDINGS:    {len(all_findings)} ({len(actionable)} actionable)")
    print("-" * 60)

    if actionable:
        print()
        print("ACTIONABLE FINDINGS:")
        for i, f in enumerate(actionable, 1):
            print(f"  {i:2d}. [{f['severity']:8s}] [{f['source']:12s}] {f['detail']}")

    if not actionable:
        print()
        print("No actionable findings. Workspace appears clean.")

    print()
    print("=" * 60)

    if severity == SEVERITY_CRITICAL:
        print("RECOMMENDATION: Immediate incident response required.")
        print("  - Do NOT load workspace files into any agent until verified")
        print("  - Run 'evidence' to preserve forensic data before remediation")
        print("  - Run 'scope' to assess the blast radius")
    elif severity == SEVERITY_HIGH:
        print("RECOMMENDATION: Investigation warranted.")
        print("  - Review all flagged files manually")
        print("  - Run 'timeline' for a detailed event chronology")
        print("  - Run 'scope' to check for credential exposure")
    elif severity == SEVERITY_MEDIUM:
        print("RECOMMENDATION: Review flagged items.")
        print("  - Check modified files for legitimacy")
        print("  - Run 'timeline' to understand the sequence of events")
    else:
        print("RECOMMENDATION: No immediate action required.")
        print("  - Consider running periodic checks")

    print("=" * 60)

    # Update triage state
    state = load_state(workspace) or {}
    state["last_investigation"] = now_iso()
    state["last_severity"] = severity
    state["last_finding_count"] = len(all_findings)
    state["last_actionable_count"] = len(actionable)
    save_state(workspace, state)

    # Exit code based on severity
    if severity == SEVERITY_CRITICAL:
        sys.exit(2)
    elif severity in (SEVERITY_HIGH, SEVERITY_MEDIUM):
        sys.exit(1)
    else:
        sys.exit(0)


def cmd_timeline(workspace: Path, hours: int = 24):
    """Build a chronological timeline of file modifications."""
    print("=" * 60)
    print("EVENT TIMELINE")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Window:    Last {hours} hours")
    print(f"Generated: {now_iso()}")
    print()

    files = collect_all_files(workspace)
    cutoff = now_utc() - timedelta(hours=hours)
    recent = [f for f in files if f["mtime_dt"] > cutoff]
    recent.sort(key=lambda x: x["mtime"])

    if not recent:
        print("No file modifications found in the specified timeframe.")
        print("=" * 60)
        sys.exit(0)

    # Group by hour
    hourly_groups: dict[str, list[dict]] = {}
    for entry in recent:
        hour_key = entry["mtime_dt"].strftime("%Y-%m-%d %H:00 UTC")
        hourly_groups.setdefault(hour_key, []).append(entry)

    # Detect bursts (many files in a short window)
    bursts = []
    for i, entry in enumerate(recent):
        window_end = entry["mtime_dt"] + timedelta(minutes=BURST_WINDOW_MINUTES)
        burst_files = [e for e in recent[i:] if e["mtime_dt"] <= window_end]
        if len(burst_files) >= BURST_THRESHOLD_FILES:
            bursts.append({
                "start": entry["mtime_dt"],
                "end": burst_files[-1]["mtime_dt"],
                "count": len(burst_files),
                "files": [e["rel_path"] for e in burst_files],
            })

    # De-duplicate overlapping bursts
    unique_bursts = []
    seen_starts = set()
    for b in bursts:
        key = b["start"].isoformat()
        if key not in seen_starts:
            unique_bursts.append(b)
            seen_starts.add(key)

    # Print timeline
    print(f"TOTAL: {len(recent)} files modified in {len(hourly_groups)} hour(s)")
    print()

    for hour_key in sorted(hourly_groups.keys()):
        group = hourly_groups[hour_key]
        print(f"--- {hour_key} ({len(group)} files) ---")
        for entry in group:
            cat = classify_path(entry["rel_path"])
            ts = entry["mtime_dt"].strftime("%H:%M:%S")
            marker = ""
            if cat == "critical":
                marker = " [CRITICAL FILE]"
            elif cat == "skill":
                marker = " [SKILL]"
            print(f"  {ts}  {entry['rel_path']}{marker}")
        print()

    # Cross-reference with ledger if available
    ledger_entries = read_jsonl_safe(workspace / LEDGER_CHAIN)
    if ledger_entries:
        recent_ledger = []
        for le in ledger_entries:
            ts_str = le.get("timestamp") or le.get("time") or le.get("created")
            if ts_str:
                try:
                    le_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    if le_dt > cutoff:
                        recent_ledger.append({"time": le_dt, "entry": le})
                except (ValueError, TypeError):
                    pass

        if recent_ledger:
            print("-" * 40)
            print("LEDGER ENTRIES IN TIMEFRAME:")
            print("-" * 40)
            for item in sorted(recent_ledger, key=lambda x: x["time"]):
                action = item["entry"].get("action", item["entry"].get("type", "unknown"))
                detail = item["entry"].get("detail", item["entry"].get("message", ""))
                print(f"  {dt_to_iso(item['time'])}  {action}: {detail}")
            print()

    # Burst analysis
    if unique_bursts:
        print("-" * 40)
        print("SUSPICIOUS BURST ACTIVITY:")
        print("-" * 40)
        for b in unique_bursts:
            print(f"  {dt_to_iso(b['start'])} - {dt_to_iso(b['end'])}")
            print(f"  {b['count']} files modified in {BURST_WINDOW_MINUTES} min window:")
            # Show affected directories
            dirs_affected = set()
            for fp in b["files"]:
                parts = Path(fp).parts
                if len(parts) > 1:
                    dirs_affected.add(parts[0])
                else:
                    dirs_affected.add("(root)")
            print(f"  Directories: {', '.join(sorted(dirs_affected))}")
            print()

    # Summary
    print("=" * 60)
    dirs_summary = {}
    for entry in recent:
        parts = Path(entry["rel_path"]).parts
        top = parts[0] if len(parts) > 1 else "(root)"
        dirs_summary[top] = dirs_summary.get(top, 0) + 1

    print("DIRECTORY BREAKDOWN:")
    for d, count in sorted(dirs_summary.items(), key=lambda x: -x[1]):
        print(f"  {d:30s} {count} file(s)")
    print("=" * 60)


def cmd_scope(workspace: Path):
    """Assess the blast radius of a potential compromise."""
    print("=" * 60)
    print("BLAST RADIUS ASSESSMENT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    files = collect_all_files(workspace)

    # Categorize all files by risk
    categories: dict[str, list[dict]] = {
        "critical": [],
        "memory": [],
        "skill": [],
        "config": [],
        "dotfile": [],
        "other": [],
    }
    for entry in files:
        cat = classify_path(entry["rel_path"])
        categories[cat].append(entry)

    print("FILE INVENTORY BY RISK CATEGORY:")
    print("-" * 40)
    for cat in ["critical", "memory", "skill", "config", "dotfile", "other"]:
        items = categories[cat]
        print(f"  {cat:12s}: {len(items)} file(s)")
    print()

    # Check for credential exposure in recently modified files
    print("CREDENTIAL EXPOSURE CHECK:")
    print("-" * 40)
    credential_hits = []
    recent_cutoff = now_utc() - timedelta(hours=48)
    for entry in files:
        if entry["mtime_dt"] < recent_cutoff:
            continue
        text = read_file_text(entry["abs_path"])
        if text is None:
            continue
        for pattern in CREDENTIAL_PATTERNS:
            matches = re.findall(pattern, text)
            if matches:
                credential_hits.append({
                    "file": entry["rel_path"],
                    "pattern_count": len(matches),
                    "category": classify_path(entry["rel_path"]),
                })
                break

    if credential_hits:
        print(f"  WARNING: Potential credential patterns found in {len(credential_hits)} file(s):")
        for hit in credential_hits:
            print(f"    - {hit['file']} ({hit['pattern_count']} pattern(s), category: {hit['category']})")
    else:
        print("  No credential patterns detected in recently modified files.")
    print()

    # Check for exfiltration URLs
    print("DATA EXFILTRATION CHECK:")
    print("-" * 40)
    exfil_hits = []
    for entry in files:
        if entry["mtime_dt"] < recent_cutoff:
            continue
        text = read_file_text(entry["abs_path"])
        if text is None:
            continue
        for pattern in EXFIL_URL_PATTERNS:
            matches = re.findall(pattern, text)
            if matches:
                exfil_hits.append({
                    "file": entry["rel_path"],
                    "urls": matches[:5],  # limit to first 5
                })
                break

    if exfil_hits:
        print(f"  WARNING: Suspicious outbound URLs found in {len(exfil_hits)} file(s):")
        for hit in exfil_hits:
            print(f"    - {hit['file']}:")
            for url in hit["urls"]:
                print(f"        {url[:80]}")
    else:
        print("  No suspicious outbound URLs detected in recently modified files.")
    print()

    # Estimate scope
    print("SCOPE ESTIMATION:")
    print("-" * 40)
    recently_modified = [f for f in files if f["mtime_dt"] > recent_cutoff]
    modified_dirs = set()
    modified_skills = set()
    modified_critical = False

    for entry in recently_modified:
        parts = Path(entry["rel_path"]).parts
        if len(parts) > 1:
            modified_dirs.add(parts[0])
        cat = classify_path(entry["rel_path"])
        if cat == "critical":
            modified_critical = True
        if cat == "skill" and len(parts) >= 2:
            modified_skills.add(parts[1])

    if modified_critical or len(modified_skills) > 2 or credential_hits or exfil_hits:
        scope = "SYSTEMIC"
        scope_detail = "Workspace-level compromise suspected"
    elif len(modified_skills) > 0:
        scope = "SPREADING"
        scope_detail = f"Multiple skills affected ({len(modified_skills)})"
    elif recently_modified:
        scope = "CONTAINED"
        scope_detail = "Changes limited to a small area"
    else:
        scope = "NONE"
        scope_detail = "No recent modifications detected"

    print(f"  Scope level:      {scope}")
    print(f"  Assessment:       {scope_detail}")
    print(f"  Files modified:   {len(recently_modified)} (last 48h)")
    print(f"  Directories:      {len(modified_dirs)}")
    print(f"  Skills affected:  {len(modified_skills)}")
    if modified_skills:
        print(f"  Skill names:      {', '.join(sorted(modified_skills))}")
    print(f"  Critical files:   {'YES' if modified_critical else 'No'}")
    print(f"  Credential risk:  {'YES' if credential_hits else 'No'}")
    print(f"  Exfil indicators: {'YES' if exfil_hits else 'No'}")
    print()

    print("=" * 60)
    if scope == "SYSTEMIC":
        print("RECOMMENDATION: Full workspace remediation needed.")
        print("  - Preserve evidence with 'evidence' command first")
        print("  - Consider restoring workspace from a known-good backup")
        print("  - Rotate any exposed credentials immediately")
    elif scope == "SPREADING":
        print("RECOMMENDATION: Targeted skill remediation needed.")
        print("  - Investigate affected skills individually")
        print("  - Check if modified skills have been invoked since compromise")
    elif scope == "CONTAINED":
        print("RECOMMENDATION: Review modifications and update baselines.")
    else:
        print("RECOMMENDATION: No immediate action required.")
    print("=" * 60)


def cmd_evidence(workspace: Path, output_dir: str | None = None):
    """Collect and preserve forensic evidence."""
    timestamp = now_utc().strftime("%Y%m%d-%H%M%S")

    if output_dir:
        evidence_dir = Path(output_dir)
    else:
        evidence_dir = triage_dir(workspace) / f"evidence-{timestamp}"

    evidence_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("EVIDENCE COLLECTION")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Output:    {evidence_dir}")
    print(f"Timestamp: {now_iso()}")
    print()

    # 1. Snapshot workspace file state
    print("[1/3] Snapshotting workspace file state...")
    files = collect_all_files(workspace)
    snapshot = []
    for entry in files:
        compute_hash(entry)
        snapshot.append({
            "path": entry["rel_path"],
            "size": entry["size"],
            "mtime": dt_to_iso(entry["mtime_dt"]),
            "sha256": entry["hash"],
            "category": classify_path(entry["rel_path"]),
        })

    snapshot_path = evidence_dir / "workspace-snapshot.json"
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump({
            "collected_at": now_iso(),
            "workspace": str(workspace),
            "file_count": len(snapshot),
            "files": snapshot,
        }, f, indent=2)
    print(f"      Saved {len(snapshot)} file records to workspace-snapshot.json")

    # 2. Copy security tool data
    print("[2/3] Collecting security tool data...")
    security_dirs = {
        ".integrity": "warden",
        ".ledger": "ledger",
        ".signet": "signet",
        ".sentinel": "sentinel",
    }
    for src_name, tool_name in security_dirs.items():
        src_path = workspace / src_name
        if src_path.is_dir():
            dst_path = evidence_dir / f"tool-{tool_name}"
            try:
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                file_count = sum(1 for _ in dst_path.rglob("*") if _.is_file())
                print(f"      {tool_name:10s}: Copied ({file_count} file(s))")
            except (OSError, shutil.Error) as e:
                print(f"      {tool_name:10s}: Copy failed ({e})")
        else:
            print(f"      {tool_name:10s}: Not present")

    # Also copy triage state if it exists
    existing_state = load_state(workspace)
    if existing_state:
        state_dst = evidence_dir / "triage-state.json"
        with open(state_dst, "w", encoding="utf-8") as f:
            json.dump(existing_state, f, indent=2)
        print(f"      {'triage':10s}: Previous state preserved")

    # 3. Generate summary report
    print("[3/3] Generating evidence summary...")
    summary_lines = [
        "EVIDENCE COLLECTION SUMMARY",
        "=" * 40,
        f"Collected:  {now_iso()}",
        f"Workspace:  {workspace}",
        f"Files:      {len(snapshot)}",
        "",
        "Security tool data collected:",
    ]
    for src_name, tool_name in security_dirs.items():
        present = (workspace / src_name).is_dir()
        summary_lines.append(f"  {tool_name}: {'Yes' if present else 'No'}")

    summary_lines.append("")
    summary_lines.append("File category breakdown:")
    cat_counts: dict[str, int] = {}
    for s in snapshot:
        cat_counts[s["category"]] = cat_counts.get(s["category"], 0) + 1
    for cat, count in sorted(cat_counts.items()):
        summary_lines.append(f"  {cat}: {count}")

    summary_path = evidence_dir / "summary.txt"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("\n".join(summary_lines) + "\n")

    print()
    print("=" * 60)
    print(f"Evidence preserved in: {evidence_dir}")
    print(f"Files collected:")
    print(f"  - workspace-snapshot.json  (file hashes and metadata)")
    for src_name, tool_name in security_dirs.items():
        if (workspace / src_name).is_dir():
            print(f"  - tool-{tool_name}/           ({tool_name} data)")
    print(f"  - summary.txt              (collection summary)")
    print()
    print("IMPORTANT: This evidence should be preserved before any")
    print("remediation actions that may alter or destroy forensic data.")
    print("=" * 60)

    # Update triage state
    state = load_state(workspace) or {}
    state["last_evidence_collection"] = now_iso()
    state["last_evidence_dir"] = str(evidence_dir)
    save_state(workspace, state)


def cmd_status(workspace: Path):
    """Quick summary of triage state."""
    state = load_state(workspace)

    print("=" * 60)
    print("TRIAGE STATUS")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print()

    if state is None:
        print("STATUS: NO DATA")
        print("  No triage investigations have been run yet.")
        print("  Run 'investigate' to perform initial assessment.")
        print("=" * 60)
        sys.exit(0)

    last_inv = state.get("last_investigation", "never")
    severity = state.get("last_severity", "UNKNOWN")
    findings = state.get("last_finding_count", 0)
    actionable = state.get("last_actionable_count", 0)
    evidence_time = state.get("last_evidence_collection")
    evidence_dir = state.get("last_evidence_dir")

    print(f"Last investigation:   {last_inv}")
    print(f"Threat level:         {severity}")
    print(f"Total findings:       {findings} ({actionable} actionable)")
    print(f"Evidence collected:   {'Yes' if evidence_time else 'No'}")
    if evidence_time:
        print(f"  Collection time:    {evidence_time}")
        if evidence_dir:
            exists = Path(evidence_dir).is_dir()
            print(f"  Evidence path:      {evidence_dir} ({'exists' if exists else 'MISSING'})")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="triage.py",
        description="OpenClaw Triage — Incident Response & Forensics",
    )
    sub = parser.add_subparsers(dest="command")

    # investigate
    p_inv = sub.add_parser("investigate", help="Full incident investigation")
    p_inv.add_argument("--workspace", type=str, default=None)

    # timeline
    p_tl = sub.add_parser("timeline", help="Build chronological event timeline")
    p_tl.add_argument("--hours", type=int, default=24, help="Hours to look back (default: 24)")
    p_tl.add_argument("--workspace", type=str, default=None)

    # scope
    p_sc = sub.add_parser("scope", help="Assess blast radius of compromise")
    p_sc.add_argument("--workspace", type=str, default=None)

    # evidence
    p_ev = sub.add_parser("evidence", help="Collect forensic evidence")
    p_ev.add_argument("--output", type=str, default=None, help="Output directory")
    p_ev.add_argument("--workspace", type=str, default=None)

    # status
    p_st = sub.add_parser("status", help="Quick triage status summary")
    p_st.add_argument("--workspace", type=str, default=None)

    # Pro command stubs
    for cmd_name in ("contain", "remediate", "export", "harden", "playbook"):
        p_pro = sub.add_parser(cmd_name, help=f"[PRO] {cmd_name.title()} (requires openclaw-triage-pro)")
        p_pro.add_argument("--workspace", type=str, default=None)

    return parser


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    # Pro command stubs
    pro_commands = {"contain", "remediate", "export", "harden", "playbook"}
    if args.command in pro_commands:
        print(f"'{args.command}' is a Pro feature.")
        print("Upgrade to openclaw-triage-pro for:")
        print("  - Automated containment (quarantine affected skills)")
        print("  - Remediation playbooks")
        print("  - Evidence chain-of-custody and export")
        print("  - Post-incident hardening recommendations")
        print("  - Integration with all OpenClaw security tools")
        sys.exit(1)

    workspace = resolve_workspace(args)

    if args.command == "investigate":
        cmd_investigate(workspace)
    elif args.command == "timeline":
        cmd_timeline(workspace, hours=args.hours)
    elif args.command == "scope":
        cmd_scope(workspace)
    elif args.command == "evidence":
        cmd_evidence(workspace, output_dir=args.output)
    elif args.command == "status":
        cmd_status(workspace)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
