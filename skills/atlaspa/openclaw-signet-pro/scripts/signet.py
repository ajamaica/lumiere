#!/usr/bin/env python3
"""OpenClaw Signet Pro — Full cryptographic skill verification suite.

SHA-256 skill signing and tamper detection, plus automatic rejection of
unsigned skills, quarantine of tampered ones, trusted snapshots, and
restoration. Everything in openclaw-signet (free) plus automated
countermeasures.

Philosophy: alert -> subvert -> quarantine -> defend.
  Free = alert.  Pro = subvert + quarantine + defend.
"""

import argparse
import hashlib
import io
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows Unicode stdout fix
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace"
    )

SIGNET_DIR = ".signet"
MANIFEST_FILE = "manifest.json"
QUARANTINE_PREFIX = ".quarantined-"
QUARANTINE_DIR = ".quarantine/signet"
SNAPSHOTS_DIR = "snapshots"
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots", ".ledger", SIGNET_DIR,
}
SELF_SKILL_DIRS = {"openclaw-signet", "openclaw-signet-pro"}
SEP = "=" * 60
THIN = "-" * 40


def now_iso():
    return datetime.now(timezone.utc).isoformat()


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


def signet_dir(ws):
    d = ws / SIGNET_DIR
    d.mkdir(exist_ok=True)
    return d


def manifest_path(ws):
    return signet_dir(ws) / MANIFEST_FILE


def quarantine_base(ws):
    d = ws / QUARANTINE_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


def snapshots_base(ws):
    d = signet_dir(ws) / SNAPSHOTS_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


def file_hash(filepath):
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return None


def skill_hash(skill_dir):
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


def find_skills(ws):
    skills_dir = ws / "skills"
    if not skills_dir.exists():
        return []
    return [e for e in sorted(skills_dir.iterdir())
            if e.is_dir() and e.name not in SELF_SKILL_DIRS
            and not e.name.startswith(QUARANTINE_PREFIX)
            and (e / "SKILL.md").exists()]


def find_quarantined(ws):
    skills_dir = ws / "skills"
    if not skills_dir.exists():
        return []
    return [e for e in sorted(skills_dir.iterdir())
            if e.is_dir() and e.name.startswith(QUARANTINE_PREFIX)]


def load_manifest(ws):
    mp = manifest_path(ws)
    if not mp.exists():
        return None
    try:
        with open(mp, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def save_manifest(ws, manifest):
    mp = manifest_path(ws)
    with open(mp, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def diff_files(trusted_files, current_files):
    all_paths = set(list(trusted_files.keys()) + list(current_files.keys()))
    modified, added, removed = [], [], []
    for fp in sorted(all_paths):
        old, new = trusted_files.get(fp), current_files.get(fp)
        if old and new and old != new:
            modified.append(fp)
        elif new and not old:
            added.append(fp)
        elif old and not new:
            removed.append(fp)
    return modified, added, removed


def banner(title, ws, extra=None):
    print(SEP)
    print(f"OPENCLAW SIGNET PRO \u2014 {title}")
    print(SEP)
    print(f"Workspace: {ws}")
    print(f"Timestamp: {now_iso()}")
    if extra:
        for k, v in extra.items():
            print(f"{k}: {v}")
    print()


def short(h):
    return f"{h[:16]}..."


# ---------------------------------------------------------------------------
# Free Commands
# ---------------------------------------------------------------------------

def cmd_sign(ws, skill_name=None):
    banner("SIGN SKILLS", ws)
    skills = find_skills(ws)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]
        if not skills:
            print(f"Skill not found: {skill_name}")
            return 1

    manifest = load_manifest(ws) or {"version": 1, "created": now_iso(), "skills": {}}
    for sd in skills:
        composite, files = skill_hash(sd)
        manifest["skills"][sd.name] = {
            "composite_hash": composite, "files": files,
            "signed_at": now_iso(), "file_count": len(files),
        }
        print(f"  [SIGNED] {sd.name}  {short(composite)}  ({len(files)} files)")
    manifest["updated"] = now_iso()
    save_manifest(ws, manifest)
    print(f"\nManifest saved. Skills signed: {len(skills)}")
    return 0


def cmd_verify(ws, skill_name=None):
    banner("VERIFY SKILLS", ws)
    manifest = load_manifest(ws)
    if not manifest:
        print("No trust manifest found. Run 'sign' first.")
        return 1, [], [], []

    skills = find_skills(ws)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]

    tampered, unsigned, clean = [], [], []
    for sd in skills:
        name = sd.name
        trusted = manifest.get("skills", {}).get(name)
        if not trusted:
            unsigned.append(name)
            print(f"  [UNSIGNED] {name}")
            continue
        composite, files = skill_hash(sd)
        if composite == trusted["composite_hash"]:
            clean.append(name)
            print(f"  [VERIFIED] {name}  {short(composite)}")
            continue
        tampered.append(name)
        trusted_files = trusted.get("files", {})
        modified, added, removed = diff_files(trusted_files, files)
        print(f"  [TAMPERED] {name}")
        print(f"             Expected: {short(trusted['composite_hash'])}")
        print(f"             Got:      {short(composite)}")
        for fp in modified:
            print(f"             MODIFIED: {fp}")
        for fp in added:
            print(f"             ADDED:    {fp}")
        for fp in removed:
            print(f"             REMOVED:  {fp}")

    # Check for removed skills
    for name in manifest.get("skills", {}):
        if not any(s.name == name for s in skills) and name not in SELF_SKILL_DIRS:
            tampered.append(name)
            print(f"  [MISSING]  {name}  (signed skill no longer installed)")

    print(f"\n{THIN}\n  Verified: {len(clean)}  Tampered: {len(tampered)}  Unsigned: {len(unsigned)}\n")
    if tampered:
        print("ACTION REQUIRED: Use 'quarantine', 'restore', or 'protect'.")
        return 2, tampered, unsigned, clean
    elif unsigned:
        print("REVIEW NEEDED: Run 'sign' to add or 'reject' to remove.")
        return 1, tampered, unsigned, clean
    print("[VERIFIED] All skills match their trusted signatures.")
    return 0, tampered, unsigned, clean


def cmd_list(ws):
    manifest = load_manifest(ws)
    if not manifest:
        print("No trust manifest found. Run 'sign' first.")
        return 1
    banner("TRUST MANIFEST", ws)
    skills = manifest.get("skills", {})
    for name, info in sorted(skills.items()):
        print(f"  {name}  {short(info['composite_hash'])}  {info['file_count']} files  signed {info['signed_at']}")
    quarantined = find_quarantined(ws)
    if quarantined:
        print(f"\n{THIN}\nQUARANTINED:")
        for q in quarantined:
            print(f"  [Q] {q.name[len(QUARANTINE_PREFIX):]}")
    print(f"\nTotal signed: {len(skills)}")
    return 0


def cmd_status(ws):
    manifest = load_manifest(ws)
    if not manifest:
        print("[UNINITIALIZED] No trust manifest")
        return 1
    skills = find_skills(ws)
    tampered = unsigned = 0
    for sd in skills:
        trusted = manifest.get("skills", {}).get(sd.name)
        if not trusted:
            unsigned += 1; continue
        composite, _ = skill_hash(sd)
        if composite != trusted["composite_hash"]:
            tampered += 1
    q_count = len(find_quarantined(ws))
    parts = []
    if tampered:
        parts.append(f"{tampered} tampered")
    if unsigned:
        parts.append(f"{unsigned} unsigned")
    if q_count:
        parts.append(f"{q_count} quarantined")
    if tampered:
        print(f"[TAMPERED] {', '.join(parts)} ({len(skills)} total)")
        return 2
    elif parts:
        print(f"[WARNING] {', '.join(parts)} ({len(skills)} total)")
        return 1
    print(f"[VERIFIED] All {len(skills)} skill(s) match signatures")
    return 0


# ---------------------------------------------------------------------------
# Pro Commands
# ---------------------------------------------------------------------------

def cmd_reject(ws, skill_name=None):
    banner("REJECT UNSIGNED SKILLS", ws)
    manifest = load_manifest(ws)
    signed = set(manifest.get("skills", {}).keys()) if manifest else set()
    skills = find_skills(ws)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]
        if not skills:
            print(f"Skill not found: {skill_name}")
            return 1

    rejected, skipped = [], []
    for sd in skills:
        name = sd.name
        if name in signed:
            skipped.append(name); continue
        q_base = quarantine_base(ws)
        dest = q_base / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(sd), str(dest))
        save_json(q_base / f"{name}-rejected.json", {
            "skill": name, "reason": "unsigned",
            "rejected_at": now_iso(), "original_path": str(sd), "action": "reject",
        })
        rejected.append(name)
        print(f"  [REJECTED] {name} -> {dest}")

    print()
    if rejected:
        print(f"Rejected: {len(rejected)} unsigned skill(s)")
    else:
        print("No unsigned skills to reject.")
    if skipped:
        print(f"Skipped (signed): {len(skipped)}")
    return 0


def _collect_evidence(ws, skill_name, skill_dir, reason="manual_quarantine"):
    """Build evidence dict for a skill being quarantined."""
    evidence = {"skill": skill_name, "quarantined_at": now_iso(), "reason": reason}
    manifest = load_manifest(ws)
    if manifest:
        trusted = manifest.get("skills", {}).get(skill_name)
        if trusted:
            composite, files = skill_hash(skill_dir)
            trusted_files = trusted.get("files", {})
            modified, added, removed = diff_files(trusted_files, files)
            evidence.update({
                "expected_hash": trusted["composite_hash"], "actual_hash": composite,
                "hash_match": composite == trusted["composite_hash"],
                "modified_files": modified, "added_files": added, "removed_files": removed,
                "file_level_changes": {
                    fp: {"expected": trusted_files.get(fp, "?"), "actual": files.get(fp, "?")}
                    for fp in modified
                },
            })
        else:
            evidence["note"] = "Skill was not in trust manifest"
    return evidence


def cmd_quarantine(ws, skill_name):
    banner("QUARANTINE SKILL", ws)
    skills_dir = ws / "skills"
    skill_dir = skills_dir / skill_name

    if not skill_dir.is_dir():
        qdir = skills_dir / (QUARANTINE_PREFIX + skill_name)
        if qdir.is_dir():
            print(f"Skill '{skill_name}' is already quarantined.")
            return 0
        print(f"Skill not found: {skill_name}")
        for d in sorted(skills_dir.iterdir()) if skills_dir.is_dir() else []:
            if d.is_dir() and d.name not in SELF_SKILL_DIRS:
                tag = "[Q] " if d.name.startswith(QUARANTINE_PREFIX) else "    "
                dn = d.name.removeprefix(QUARANTINE_PREFIX) if d.name.startswith(QUARANTINE_PREFIX) else d.name
                print(f"  {tag}{dn}")
        return 1

    evidence = _collect_evidence(ws, skill_name, skill_dir)
    q_base = quarantine_base(ws)
    evidence_path = q_base / f"{skill_name}-evidence.json"
    save_json(evidence_path, evidence)

    quarantined_dir = skills_dir / (QUARANTINE_PREFIX + skill_name)
    skill_dir.rename(quarantined_dir)

    print(f"  [QUARANTINED] {skill_name}")
    print(f"    Renamed -> skills/{QUARANTINE_PREFIX}{skill_name}/")
    print(f"    Evidence: {evidence_path}")
    for key, label in [("modified_files", "Modified"), ("added_files", "Added"), ("removed_files", "Removed")]:
        items = evidence.get(key, [])
        if items:
            print(f"    {label}: {len(items)}")
            for fp in items:
                print(f"      - {fp}")
    print(f"\nAgent will not load this skill. To restore: 'unquarantine {skill_name}'")
    return 0


def cmd_unquarantine(ws, skill_name):
    banner("UNQUARANTINE SKILL", ws)
    skills_dir = ws / "skills"
    qdir = skills_dir / (QUARANTINE_PREFIX + skill_name)
    if not qdir.is_dir():
        print(f"No quarantined skill found: {skill_name}")
        for q in find_quarantined(ws):
            print(f"  [Q] {q.name[len(QUARANTINE_PREFIX):]}")
        return 1
    restored = skills_dir / skill_name
    if restored.is_dir():
        print(f"Cannot unquarantine: skills/{skill_name}/ already exists")
        return 1
    qdir.rename(restored)
    print(f"  [UNQUARANTINED] {skill_name}")
    print(f"\nWARNING: Re-sign this skill before trusting it.")
    print(f"  Run: signet.py sign {skill_name}")
    return 0


def cmd_snapshot(ws, skill_name):
    banner("SNAPSHOT SKILL", ws)
    skill_dir = ws / "skills" / skill_name
    if not skill_dir.is_dir():
        print(f"Skill not found: {skill_name}")
        return 1
    manifest = load_manifest(ws)
    if not manifest:
        print("No trust manifest. Run 'sign' first.")
        return 1
    trusted = manifest.get("skills", {}).get(skill_name)
    if not trusted:
        print(f"Skill '{skill_name}' is not signed. Sign it first.")
        return 1
    composite, files = skill_hash(skill_dir)
    if composite != trusted["composite_hash"]:
        print(f"Skill '{skill_name}' is TAMPERED. Cannot snapshot.")
        print(f"  Expected: {short(trusted['composite_hash'])}  Got: {short(composite)}")
        return 2

    snap_dir = snapshots_base(ws) / skill_name
    if snap_dir.exists():
        shutil.rmtree(snap_dir)
    shutil.copytree(str(skill_dir), str(snap_dir))
    save_json(snapshots_base(ws) / f"{skill_name}.json", {
        "skill": skill_name, "composite_hash": composite, "files": files,
        "file_count": len(files), "snapshot_at": now_iso(),
        "signed_at": trusted.get("signed_at", "unknown"),
    })
    print(f"  [SNAPSHOT] {skill_name}  {short(composite)}  ({len(files)} files)")
    print(f"  Location: {snap_dir}")
    print("\nTrusted snapshot created. Use 'restore' to recover from this state.")
    return 0


def cmd_restore(ws, skill_name):
    banner("RESTORE SKILL", ws)
    snap_dir = snapshots_base(ws) / skill_name
    meta_path = snapshots_base(ws) / f"{skill_name}.json"
    if not snap_dir.is_dir():
        print(f"No snapshot found for: {skill_name}")
        return 1

    snap_meta = None
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                snap_meta = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    snap_composite, snap_files = skill_hash(snap_dir)
    if snap_meta:
        expected = snap_meta.get("composite_hash")
        if expected and snap_composite != expected:
            print(f"SNAPSHOT CORRUPTED! Expected: {short(expected)}  Got: {short(snap_composite)}")
            return 2
        print(f"  Snapshot verified: {short(snap_composite)}")
    else:
        print("  WARNING: No snapshot metadata. Restoring unverified.")

    skill_dir = ws / "skills" / skill_name
    if skill_dir.exists():
        shutil.rmtree(skill_dir)
    shutil.copytree(str(snap_dir), str(skill_dir))

    restored_composite, restored_files = skill_hash(skill_dir)
    match = restored_composite == snap_composite
    print(f"  [RESTORED] {skill_name}  {short(restored_composite)}  ({len(restored_files)} files)")
    if not match:
        print(f"  WARNING: hash mismatch after copy")

    manifest = load_manifest(ws)
    if manifest and snap_meta:
        manifest["skills"][skill_name] = {
            "composite_hash": restored_composite, "files": restored_files,
            "signed_at": snap_meta.get("signed_at", now_iso()),
            "file_count": len(restored_files),
        }
        manifest["updated"] = now_iso()
        save_manifest(ws, manifest)
        print("  Manifest updated.")
    print("\nSkill restored from trusted snapshot.")
    return 0


def cmd_protect(ws, reject_unsigned=False):
    banner("PROTECTION SWEEP", ws, {"Reject unsigned": "yes" if reject_unsigned else "no"})
    manifest = load_manifest(ws)
    if not manifest:
        print("No trust manifest. Run 'sign' first, then 'protect' each session.")
        return 1

    skills = find_skills(ws)
    tampered_list, unsigned_list, clean_list = [], [], []
    actions = []

    # Phase 1: Classify
    print("PHASE 1: Verification")
    print(THIN)
    for sd in skills:
        name = sd.name
        trusted = manifest.get("skills", {}).get(name)
        if not trusted:
            unsigned_list.append(sd)
            print(f"  [UNSIGNED]  {name}")
            continue
        composite, files = skill_hash(sd)
        if composite == trusted["composite_hash"]:
            clean_list.append(sd)
            print(f"  [VERIFIED]  {name}")
        else:
            tampered_list.append((sd, composite, files, trusted))
            print(f"  [TAMPERED]  {name}")
    print()

    # Phase 2: Quarantine tampered
    if tampered_list:
        print("PHASE 2: Quarantine Tampered")
        print(THIN)
        for sd, composite, files, trusted in tampered_list:
            name = sd.name
            trusted_files = trusted.get("files", {})
            modified, added, removed = diff_files(trusted_files, files)
            q_base = quarantine_base(ws)
            save_json(q_base / f"{name}-evidence.json", {
                "skill": name, "quarantined_at": now_iso(),
                "reason": "protect_sweep_tampered",
                "expected_hash": trusted["composite_hash"], "actual_hash": composite,
                "modified_files": modified, "added_files": added, "removed_files": removed,
                "file_level_changes": {
                    fp: {"expected": trusted_files.get(fp, "?"), "actual": files.get(fp, "?")}
                    for fp in modified
                },
            })
            qdir = ws / "skills" / (QUARANTINE_PREFIX + name)
            if qdir.exists():
                shutil.rmtree(qdir)
            sd.rename(qdir)
            parts = []
            if modified: parts.append(f"{len(modified)} modified")
            if added: parts.append(f"{len(added)} added")
            if removed: parts.append(f"{len(removed)} removed")
            summary = ", ".join(parts) or "hash mismatch"
            actions.append(f"QUARANTINED: {name} ({summary})")
            print(f"  [QUARANTINE] {name}  ({summary})")
        print()

    # Phase 3: Reject unsigned (if flag set)
    if unsigned_list and reject_unsigned:
        print("PHASE 3: Reject Unsigned")
        print(THIN)
        for sd in unsigned_list:
            name = sd.name
            q_base = quarantine_base(ws)
            dest = q_base / name
            if dest.exists():
                shutil.rmtree(dest)
            shutil.move(str(sd), str(dest))
            save_json(q_base / f"{name}-rejected.json", {
                "skill": name, "reason": "protect_sweep_unsigned",
                "rejected_at": now_iso(), "original_path": str(sd), "action": "reject",
            })
            actions.append(f"REJECTED: {name} (unsigned)")
            print(f"  [REJECT] {name}")
        unsigned_list.clear()
        print()
    elif unsigned_list:
        print("PHASE 3: Unsigned (not rejected)")
        print(THIN)
        for sd in unsigned_list:
            print(f"  [SKIPPED] {sd.name} (use --reject-unsigned)")
        print()

    # Phase 4: Snapshot clean
    if clean_list:
        print("PHASE 4: Snapshot Verified")
        print(THIN)
        for sd in clean_list:
            name = sd.name
            composite, files = skill_hash(sd)
            trusted = manifest.get("skills", {}).get(name)
            snap_dir = snapshots_base(ws) / name
            if snap_dir.exists():
                shutil.rmtree(snap_dir)
            shutil.copytree(str(sd), str(snap_dir))
            save_json(snapshots_base(ws) / f"{name}.json", {
                "skill": name, "composite_hash": composite, "files": files,
                "file_count": len(files), "snapshot_at": now_iso(),
                "signed_at": trusted.get("signed_at", "unknown") if trusted else "unknown",
            })
            actions.append(f"SNAPSHOT: {name}")
            print(f"  [SNAPSHOT] {name}")
        print()

    # Summary
    print(SEP)
    print("PROTECTION SWEEP COMPLETE")
    print(SEP)
    print(f"  Verified: {len(clean_list)}  Quarantined: {len(tampered_list)}  "
          f"Unsigned: {len(unsigned_list)}  Snapshots: {len(clean_list)}")
    if actions:
        print(f"\nACTIONS TAKEN: {len(actions)}")
        for a in actions:
            print(f"  - {a}")
    if tampered_list:
        print("\nNEXT STEPS: Investigate quarantined skills. Use 'restore' or re-sign.")
    if unsigned_list:
        print("\nUNSIGNED REMAIN: 'sign <skill>', 'reject', or --reject-unsigned")
    if not tampered_list and not unsigned_list:
        print("\nAll skills verified and snapshotted. Workspace is clean.")
        return 0
    return 2 if tampered_list else 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Signet Pro — Full cryptographic skill verification suite"
    )
    parser.add_argument(
        "command",
        choices=["sign", "verify", "list", "status",
                 "reject", "quarantine", "unquarantine",
                 "snapshot", "restore", "protect"],
        help="Command to run",
    )
    parser.add_argument("skill", nargs="?", help="Specific skill name")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    parser.add_argument("--reject-unsigned", action="store_true", default=False,
                        help="(protect only) Also reject unsigned skills")
    args = parser.parse_args()

    ws = resolve_workspace(args.workspace)
    if not ws.exists():
        print(f"Workspace not found: {ws}")
        sys.exit(1)

    skill_required = {"quarantine", "unquarantine", "snapshot", "restore"}
    if args.command in skill_required and not args.skill:
        print(f"Usage: signet.py {args.command} <skill> [--workspace PATH]")
        sys.exit(1)

    if args.command == "sign":
        sys.exit(cmd_sign(ws, args.skill))
    elif args.command == "verify":
        code, _, _, _ = cmd_verify(ws, args.skill)
        sys.exit(code)
    elif args.command == "list":
        sys.exit(cmd_list(ws))
    elif args.command == "status":
        sys.exit(cmd_status(ws))
    elif args.command == "reject":
        sys.exit(cmd_reject(ws, args.skill))
    elif args.command == "quarantine":
        sys.exit(cmd_quarantine(ws, args.skill))
    elif args.command == "unquarantine":
        sys.exit(cmd_unquarantine(ws, args.skill))
    elif args.command == "snapshot":
        sys.exit(cmd_snapshot(ws, args.skill))
    elif args.command == "restore":
        sys.exit(cmd_restore(ws, args.skill))
    elif args.command == "protect":
        sys.exit(cmd_protect(ws, reject_unsigned=args.reject_unsigned))


if __name__ == "__main__":
    main()
