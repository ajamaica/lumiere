#!/usr/bin/env python3
"""OpenClaw Signet — Cryptographic skill verification for agent workspaces.

Generates SHA-256 content hashes for installed skills and verifies them
against a trust manifest. Detects tampered files, added files, and
removed files within skill directories.

Free version: Alert (verify + report).
Pro version: Subvert, Quarantine, Defend.
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

SIGNET_DIR = ".signet"
MANIFEST_FILE = "manifest.json"

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots", ".ledger", SIGNET_DIR,
}

SELF_SKILL_DIRS = {"openclaw-signet", "openclaw-signet-pro"}


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


def signet_dir(workspace):
    d = workspace / SIGNET_DIR
    d.mkdir(exist_ok=True)
    return d


def manifest_path(workspace):
    return signet_dir(workspace) / MANIFEST_FILE


def file_hash(filepath):
    """SHA-256 of file contents."""
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return None


def skill_hash(skill_dir):
    """Compute a composite hash of all files in a skill directory."""
    h = hashlib.sha256()
    file_hashes = {}

    for root, dirs, filenames in os.walk(skill_dir):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for fname in sorted(filenames):
            fpath = Path(root) / fname
            rel = str(fpath.relative_to(skill_dir))
            fh = file_hash(fpath)
            if fh:
                file_hashes[rel] = fh
                h.update(f"{rel}:{fh}".encode("utf-8"))

    return h.hexdigest(), file_hashes


def find_skills(workspace):
    """Find all installed skill directories."""
    skills_dir = workspace / "skills"
    if not skills_dir.exists():
        return []
    skills = []
    for entry in sorted(skills_dir.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name in SELF_SKILL_DIRS:
            continue
        if entry.name.startswith(".quarantine"):
            continue
        if (entry / "SKILL.md").exists():
            skills.append(entry)
    return skills


def load_manifest(workspace):
    """Load existing trust manifest."""
    mp = manifest_path(workspace)
    if not mp.exists():
        return None
    try:
        with open(mp, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def save_manifest(workspace, manifest):
    """Save trust manifest."""
    mp = manifest_path(workspace)
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_sign(workspace, skill_name=None):
    """Generate/update trust manifest for installed skills."""
    print("=" * 60)
    print("OPENCLAW SIGNET — SIGN SKILLS")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    skills = find_skills(workspace)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]
        if not skills:
            print(f"Skill not found: {skill_name}")
            return 1

    manifest = load_manifest(workspace) or {
        "version": 1,
        "created": datetime.now(timezone.utc).isoformat(),
        "skills": {},
    }

    for skill_dir in skills:
        composite, files = skill_hash(skill_dir)
        manifest["skills"][skill_dir.name] = {
            "composite_hash": composite,
            "files": files,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "file_count": len(files),
        }
        print(f"  [SIGNED] {skill_dir.name}")
        print(f"           Hash: {composite[:16]}...")
        print(f"           Files: {len(files)}")

    manifest["updated"] = datetime.now(timezone.utc).isoformat()
    save_manifest(workspace, manifest)

    print()
    print(f"Manifest saved: {manifest_path(workspace)}")
    print(f"Skills signed: {len(skills)}")
    return 0


def cmd_verify(workspace, skill_name=None):
    """Verify installed skills against trust manifest."""
    print("=" * 60)
    print("OPENCLAW SIGNET — VERIFY SKILLS")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    manifest = load_manifest(workspace)
    if not manifest:
        print("No trust manifest found. Run 'sign' first.")
        return 1

    skills = find_skills(workspace)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]

    tampered = []
    unsigned = []
    clean = []

    for skill_dir in skills:
        name = skill_dir.name
        trusted = manifest.get("skills", {}).get(name)

        if not trusted:
            unsigned.append(name)
            print(f"  [UNSIGNED] {name}")
            print(f"             Not in trust manifest")
            print()
            continue

        composite, files = skill_hash(skill_dir)

        if composite == trusted["composite_hash"]:
            clean.append(name)
            print(f"  [VERIFIED] {name}")
            print(f"             Hash: {composite[:16]}...")
            print()
            continue

        # Hash mismatch — find which files changed
        tampered.append(name)
        trusted_files = trusted.get("files", {})
        print(f"  [TAMPERED] {name}")
        print(f"             Expected: {trusted['composite_hash'][:16]}...")
        print(f"             Got:      {composite[:16]}...")

        # Detail what changed
        all_paths = set(list(trusted_files.keys()) + list(files.keys()))
        for fpath in sorted(all_paths):
            old_h = trusted_files.get(fpath)
            new_h = files.get(fpath)
            if old_h and new_h and old_h != new_h:
                print(f"             MODIFIED: {fpath}")
            elif new_h and not old_h:
                print(f"             ADDED:    {fpath}")
            elif old_h and not new_h:
                print(f"             REMOVED:  {fpath}")
        print()

    # Check for removed skills
    for name in manifest.get("skills", {}):
        if not any(s.name == name for s in skills):
            if name not in SELF_SKILL_DIRS:
                tampered.append(name)
                print(f"  [MISSING] {name}")
                print(f"            Signed skill no longer installed")
                print()

    # Summary
    print("-" * 40)
    print("SUMMARY")
    print("-" * 40)
    print(f"  Verified: {len(clean)}")
    print(f"  Tampered: {len(tampered)}")
    print(f"  Unsigned: {len(unsigned)}")
    print()

    if tampered:
        print("ACTION REQUIRED: Skill tampering detected.")
        print()
        print("Upgrade to openclaw-signet-pro for automated countermeasures:")
        print("  reject, quarantine, restore")
        return 2
    elif unsigned:
        print("REVIEW NEEDED: Unsigned skills detected.")
        print("Run 'sign' to add them to the trust manifest.")
        return 1
    else:
        print("[VERIFIED] All skills match their trusted signatures.")
        return 0


def cmd_list(workspace):
    """List all signed skills and their status."""
    manifest = load_manifest(workspace)
    if not manifest:
        print("No trust manifest found. Run 'sign' first.")
        return 1

    print("=" * 60)
    print("OPENCLAW SIGNET — TRUST MANIFEST")
    print("=" * 60)
    print(f"Created: {manifest.get('created', 'unknown')}")
    print(f"Updated: {manifest.get('updated', 'unknown')}")
    print()

    skills = manifest.get("skills", {})
    if not skills:
        print("No skills in manifest.")
        return 0

    for name, info in sorted(skills.items()):
        print(f"  {name}")
        print(f"    Hash: {info['composite_hash'][:16]}...")
        print(f"    Files: {info['file_count']}")
        print(f"    Signed: {info['signed_at']}")
        print()

    print(f"Total: {len(skills)} skill(s)")
    return 0


def cmd_status(workspace):
    """Quick verification status."""
    manifest = load_manifest(workspace)
    if not manifest:
        print("[UNINITIALIZED] No trust manifest")
        return 1

    skills = find_skills(workspace)
    tampered = 0
    unsigned = 0

    for skill_dir in skills:
        name = skill_dir.name
        trusted = manifest.get("skills", {}).get(name)
        if not trusted:
            unsigned += 1
            continue
        composite, _ = skill_hash(skill_dir)
        if composite != trusted["composite_hash"]:
            tampered += 1

    if tampered > 0:
        print(f"[TAMPERED] {tampered} skill(s) modified since signing")
        return 2
    elif unsigned > 0:
        print(f"[WARNING] {unsigned} unsigned skill(s), {len(skills) - unsigned} verified")
        return 1
    else:
        print(f"[VERIFIED] All {len(skills)} skill(s) match signatures")
        return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Signet — Skill verification")
    parser.add_argument("command", choices=["sign", "verify", "list", "status"],
                        help="Command to run")
    parser.add_argument("skill", nargs="?", help="Specific skill to sign/verify")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    if args.command == "sign":
        sys.exit(cmd_sign(workspace, args.skill))
    elif args.command == "verify":
        sys.exit(cmd_verify(workspace, args.skill))
    elif args.command == "list":
        sys.exit(cmd_list(workspace))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))


if __name__ == "__main__":
    main()
