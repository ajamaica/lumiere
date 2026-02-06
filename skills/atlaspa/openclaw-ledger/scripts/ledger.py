#!/usr/bin/env python3
"""OpenClaw Ledger — Tamper-evident audit trail for agent sessions.

Creates hash-chained logs of workspace events: file changes, skill
executions, and session activity. Each entry includes the hash of the
previous entry, making the chain tamper-evident.

Free version: Alert (log + verify chain).
Pro version: Subvert, Quarantine, Defend.
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

LEDGER_DIR = ".ledger"
CHAIN_FILE = "chain.jsonl"
SESSION_FILE = "session.json"

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots", LEDGER_DIR,
}

SELF_SKILL_DIRS = {"openclaw-ledger", "openclaw-ledger-pro"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_workspace(ws_arg):
    if ws_arg:
        return Path(ws_arg).resolve()
    env = os.environ.get("OPENCLAW_WORKSPACE")
    if env:
        return Path(env).resolve()
    cwd = Path.cwd()
    if (cwd / "AGENTS.md").exists():
        return cwd
    default = Path.home() / ".openclaw" / "workspace"
    if default.exists():
        return default
    return cwd


def ledger_dir(workspace):
    d = workspace / LEDGER_DIR
    d.mkdir(exist_ok=True)
    return d


def chain_path(workspace):
    return ledger_dir(workspace) / CHAIN_FILE


def session_path(workspace):
    return ledger_dir(workspace) / SESSION_FILE


def hash_entry(entry_json):
    """SHA-256 hash of an entry's JSON string."""
    return hashlib.sha256(entry_json.encode("utf-8")).hexdigest()


def file_hash(filepath):
    """SHA-256 of a file's contents."""
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return None


def get_last_hash(workspace):
    """Read the hash of the last entry in the chain."""
    cp = chain_path(workspace)
    if not cp.exists():
        return "0" * 64  # Genesis hash

    last_line = ""
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    last_line = line.strip()
    except (OSError, PermissionError):
        return "0" * 64

    if not last_line:
        return "0" * 64

    return hash_entry(last_line)


def append_entry(workspace, event_type, data):
    """Append a hash-chained entry to the ledger."""
    prev_hash = get_last_hash(workspace)

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prev_hash": prev_hash,
        "event": event_type,
        "data": data,
    }

    entry_json = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    entry_hash = hash_entry(entry_json)

    cp = chain_path(workspace)
    with open(cp, "a", encoding="utf-8") as f:
        f.write(entry_json + "\n")

    return entry_hash


# ---------------------------------------------------------------------------
# Snapshot workspace state
# ---------------------------------------------------------------------------

def snapshot_workspace(workspace):
    """Create a hash snapshot of all workspace files."""
    snapshot = {}
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            rel = str(fpath.relative_to(workspace))
            fh = file_hash(fpath)
            if fh:
                snapshot[rel] = {
                    "sha256": fh,
                    "size": fpath.stat().st_size,
                }
    return snapshot


def diff_snapshots(old_snap, new_snap):
    """Compare two snapshots, return changes."""
    changes = {"modified": [], "added": [], "deleted": []}

    all_files = set(list(old_snap.keys()) + list(new_snap.keys()))
    for f in sorted(all_files):
        if f in old_snap and f in new_snap:
            if old_snap[f]["sha256"] != new_snap[f]["sha256"]:
                changes["modified"].append(f)
        elif f in new_snap:
            changes["added"].append(f)
        else:
            changes["deleted"].append(f)

    return changes


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_init(workspace):
    """Initialize the ledger with a genesis entry."""
    cp = chain_path(workspace)
    if cp.exists() and cp.stat().st_size > 0:
        print("Ledger already initialized.")
        print(f"  Chain: {cp}")
        # Count entries
        count = sum(1 for line in open(cp, "r", encoding="utf-8") if line.strip())
        print(f"  Entries: {count}")
        return 0

    snap = snapshot_workspace(workspace)
    entry_hash = append_entry(workspace, "init", {
        "message": "Ledger initialized",
        "file_count": len(snap),
        "snapshot": {k: v["sha256"] for k, v in snap.items()},
    })

    # Save session state
    sp = session_path(workspace)
    with open(sp, "w", encoding="utf-8") as f:
        json.dump({"last_snapshot": snap, "init_time": datetime.now(timezone.utc).isoformat()},
                  f, indent=2)

    print("=" * 60)
    print("OPENCLAW LEDGER — INITIALIZED")
    print("=" * 60)
    print(f"  Chain: {cp}")
    print(f"  Files tracked: {len(snap)}")
    print(f"  Entry hash: {entry_hash[:16]}...")
    print()
    return 0


def cmd_record(workspace, message=""):
    """Record current workspace state as a new entry."""
    sp = session_path(workspace)
    if not sp.exists():
        print("Ledger not initialized. Run 'init' first.")
        return 1

    with open(sp, "r", encoding="utf-8") as f:
        session = json.load(f)

    old_snap = session.get("last_snapshot", {})
    new_snap = snapshot_workspace(workspace)
    changes = diff_snapshots(old_snap, new_snap)

    has_changes = any(changes[k] for k in changes)
    if not has_changes:
        print("[CLEAN] No changes since last record.")
        return 0

    entry_hash = append_entry(workspace, "record", {
        "message": message or "Workspace state recorded",
        "changes": changes,
        "snapshot": {k: v["sha256"] for k, v in new_snap.items()},
    })

    # Update session
    session["last_snapshot"] = new_snap
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)

    print("=" * 60)
    print("OPENCLAW LEDGER — RECORDED")
    print("=" * 60)
    print(f"  Modified: {len(changes['modified'])}")
    print(f"  Added:    {len(changes['added'])}")
    print(f"  Deleted:  {len(changes['deleted'])}")
    print(f"  Entry hash: {entry_hash[:16]}...")
    print()

    for f in changes["modified"]:
        print(f"  [MODIFIED] {f}")
    for f in changes["added"]:
        print(f"  [ADDED]    {f}")
    for f in changes["deleted"]:
        print(f"  [DELETED]  {f}")
    if has_changes:
        print()

    return 0


def cmd_verify(workspace):
    """Verify the integrity of the hash chain."""
    cp = chain_path(workspace)
    if not cp.exists():
        print("No ledger found. Run 'init' first.")
        return 1

    print("=" * 60)
    print("OPENCLAW LEDGER — CHAIN VERIFICATION")
    print("=" * 60)
    print()

    entries = []
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    entries.append(line.strip())
    except (OSError, PermissionError):
        print("[ERROR] Cannot read chain file.")
        return 2

    if not entries:
        print("[EMPTY] No entries in chain.")
        return 0

    expected_prev = "0" * 64  # Genesis
    broken_at = None

    for i, entry_json in enumerate(entries):
        try:
            entry = json.loads(entry_json)
        except json.JSONDecodeError:
            print(f"  [TAMPERED] Entry {i + 1}: Invalid JSON")
            broken_at = i
            break

        if entry.get("prev_hash") != expected_prev:
            print(f"  [TAMPERED] Entry {i + 1}: Hash chain broken")
            print(f"    Expected prev: {expected_prev[:16]}...")
            print(f"    Found prev:    {entry.get('prev_hash', 'missing')[:16]}...")
            broken_at = i
            break

        expected_prev = hash_entry(entry_json)

    if broken_at is not None:
        print()
        print(f"CHAIN BROKEN at entry {broken_at + 1} of {len(entries)}")
        print("The audit trail has been tampered with.")
        print()
        print("Upgrade to openclaw-ledger-pro for automated countermeasures:")
        print("  freeze, forensics, restore")
        return 2

    print(f"  Entries verified: {len(entries)}")
    print(f"  Chain status: INTACT")
    print(f"  Head hash: {expected_prev[:16]}...")

    # Show timeline
    first = json.loads(entries[0])
    last = json.loads(entries[-1])
    print(f"  First entry: {first.get('timestamp', 'unknown')}")
    print(f"  Last entry:  {last.get('timestamp', 'unknown')}")
    print()
    print("[VERIFIED] Hash chain is intact. No tampering detected.")
    return 0


def cmd_log(workspace, count=10):
    """Show recent ledger entries."""
    cp = chain_path(workspace)
    if not cp.exists():
        print("No ledger found. Run 'init' first.")
        return 1

    entries = []
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    entries.append(line.strip())
    except (OSError, PermissionError):
        print("[ERROR] Cannot read chain file.")
        return 1

    print("=" * 60)
    print(f"OPENCLAW LEDGER — LAST {min(count, len(entries))} ENTRIES")
    print("=" * 60)
    print()

    for entry_json in entries[-count:]:
        try:
            entry = json.loads(entry_json)
            ts = entry.get("timestamp", "unknown")
            event = entry.get("event", "unknown")
            data = entry.get("data", {})
            msg = data.get("message", "")
            entry_hash = hash_entry(entry_json)[:12]

            print(f"  [{entry_hash}] {ts}")
            print(f"    Event: {event}")
            if msg:
                print(f"    Message: {msg}")

            changes = data.get("changes", {})
            if changes:
                mod = len(changes.get("modified", []))
                add = len(changes.get("added", []))
                rem = len(changes.get("deleted", []))
                if mod or add or rem:
                    print(f"    Changes: {mod} modified, {add} added, {rem} deleted")
            print()
        except json.JSONDecodeError:
            print("  [CORRUPT] Unreadable entry")
            print()

    return 0


def cmd_status(workspace):
    """Quick chain status."""
    cp = chain_path(workspace)
    if not cp.exists():
        print("[UNINITIALIZED] No ledger found")
        return 1

    count = 0
    last_entry = None
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
                    last_entry = line.strip()
    except (OSError, PermissionError):
        print("[ERROR] Cannot read chain")
        return 2

    if last_entry:
        try:
            entry = json.loads(last_entry)
            ts = entry.get("timestamp", "unknown")
            print(f"[ACTIVE] {count} entries, last: {ts}")
        except json.JSONDecodeError:
            print(f"[WARNING] {count} entries, last entry corrupt")
            return 1
    else:
        print("[EMPTY] Chain initialized but no entries")

    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Ledger — Audit trail")
    parser.add_argument("command", choices=["init", "record", "verify", "log", "status"],
                        help="Command to run")
    parser.add_argument("--message", "-m", default="", help="Entry message (for 'record')")
    parser.add_argument("--count", "-n", type=int, default=10, help="Entries to show (for 'log')")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    if args.command == "init":
        sys.exit(cmd_init(workspace))
    elif args.command == "record":
        sys.exit(cmd_record(workspace, args.message))
    elif args.command == "verify":
        sys.exit(cmd_verify(workspace))
    elif args.command == "log":
        sys.exit(cmd_log(workspace, args.count))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))


if __name__ == "__main__":
    main()
