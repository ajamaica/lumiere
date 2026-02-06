#!/usr/bin/env python3
"""OpenClaw Arbiter — Permission auditor for installed agent skills.

Analyzes installed skills to report what system resources each one
accesses: binaries, environment variables, file I/O, network calls,
subprocess execution, and more.

Free version: Alert (detect + report).
Pro version: Subvert, Quarantine, Defend.
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Permission categories and detection patterns
# ---------------------------------------------------------------------------

# Patterns to detect in Python scripts
PYTHON_PATTERNS = {
    "network": [
        (re.compile(r"\burllib\b"), "urllib import"),
        (re.compile(r"\brequests\b"), "requests library"),
        (re.compile(r"\bhttpx\b"), "httpx library"),
        (re.compile(r"\baiohttp\b"), "aiohttp library"),
        (re.compile(r"\bsocket\b"), "socket module"),
        (re.compile(r"\bhttp\.client\b"), "http.client module"),
        (re.compile(r"\bftplib\b"), "FTP library"),
        (re.compile(r"\bsmtplib\b"), "SMTP library"),
        (re.compile(r"https?://"), "hardcoded URL"),
    ],
    "subprocess": [
        (re.compile(r"\bsubprocess\b"), "subprocess module"),
        (re.compile(r"\bos\.system\b"), "os.system call"),
        (re.compile(r"\bos\.popen\b"), "os.popen call"),
        (re.compile(r"\bos\.exec"), "os.exec* call"),
        (re.compile(r"\bshutil\.which\b"), "binary lookup"),
        (re.compile(r"\bPopen\b"), "Popen constructor"),
    ],
    "file_write": [
        (re.compile(r"""open\s*\([^)]*['"][wa]"""), "file write/append"),
        (re.compile(r"\bshutil\.copy"), "file copy"),
        (re.compile(r"\bshutil\.move\b"), "file move"),
        (re.compile(r"\bos\.rename\b"), "file rename"),
        (re.compile(r"\bos\.remove\b"), "file delete"),
        (re.compile(r"\bos\.unlink\b"), "file unlink"),
        (re.compile(r"\bos\.rmdir\b"), "directory remove"),
        (re.compile(r"\bshutil\.rmtree\b"), "recursive delete"),
        (re.compile(r"\bos\.makedirs\b"), "directory creation"),
        (re.compile(r"\bPath\b[^;]*\.write_"), "pathlib write"),
        (re.compile(r"\bPath\b[^;]*\.mkdir\b"), "pathlib mkdir"),
        (re.compile(r"\bPath\b[^;]*\.unlink\b"), "pathlib unlink"),
    ],
    "file_read": [
        (re.compile(r"""open\s*\([^)]*['"]r"""), "file read"),
        (re.compile(r"\bPath\b[^;]*\.read_"), "pathlib read"),
        (re.compile(r"\bos\.walk\b"), "directory walk"),
        (re.compile(r"\bos\.listdir\b"), "directory listing"),
        (re.compile(r"\bglob\b"), "glob pattern"),
    ],
    "environment": [
        (re.compile(r"\bos\.environ\b"), "env var access"),
        (re.compile(r"\bos\.getenv\b"), "env var read"),
        (re.compile(r"\bos\.putenv\b"), "env var write"),
    ],
    "crypto": [
        (re.compile(r"\bhashlib\b"), "hash computation"),
        (re.compile(r"\bhmac\b"), "HMAC operations"),
        (re.compile(r"\bssl\b"), "SSL/TLS"),
        (re.compile(r"\bcryptography\b"), "cryptography library"),
    ],
    "serialization": [
        (re.compile(r"\bpickle\b"), "pickle (unsafe deserialization)"),
        (re.compile(r"\byaml\.load\b"), "YAML load (potentially unsafe)"),
        (re.compile(r"\beval\b\s*\("), "eval() call"),
        (re.compile(r"\bexec\b\s*\("), "exec() call"),
        (re.compile(r"\b__import__\b"), "dynamic import"),
        (re.compile(r"\bcompile\b\s*\("), "compile() call"),
    ],
}

# Patterns to detect in shell scripts
SHELL_PATTERNS = {
    "network": [
        (re.compile(r"\bcurl\b"), "curl command"),
        (re.compile(r"\bwget\b"), "wget command"),
        (re.compile(r"\bnc\b"), "netcat"),
        (re.compile(r"\bssh\b"), "SSH connection"),
        (re.compile(r"\bscp\b"), "SCP transfer"),
    ],
    "subprocess": [
        (re.compile(r"\beval\b"), "eval command"),
        (re.compile(r"\bsource\b"), "source command"),
        (re.compile(r"\$\("), "command substitution"),
    ],
    "file_write": [
        (re.compile(r">\s*[^&]"), "file redirect"),
        (re.compile(r"\brm\s"), "file delete"),
        (re.compile(r"\bmkdir\b"), "directory creation"),
        (re.compile(r"\bchmod\b"), "permission change"),
        (re.compile(r"\bchown\b"), "ownership change"),
    ],
}

# Risk levels
RISK_LEVELS = {
    "serialization": "CRITICAL",
    "subprocess": "HIGH",
    "network": "HIGH",
    "file_write": "MEDIUM",
    "environment": "MEDIUM",
    "crypto": "LOW",
    "file_read": "LOW",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots",
}

SELF_SKILL_DIRS = {"openclaw-arbiter", "openclaw-arbiter-pro"}


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


def parse_skill_metadata(skill_md_path):
    """Parse SKILL.md YAML frontmatter for metadata."""
    info = {"name": "", "description": "", "requires_bins": [], "requires_env": [], "os": []}
    try:
        content = skill_md_path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return info

    # Extract frontmatter
    if not content.startswith("---"):
        return info
    end = content.find("---", 3)
    if end == -1:
        return info
    frontmatter = content[3:end].strip()

    for line in frontmatter.split("\n"):
        line = line.strip()
        if line.startswith("name:"):
            info["name"] = line[5:].strip().strip('"').strip("'")
        elif line.startswith("description:"):
            info["description"] = line[12:].strip().strip('"').strip("'")
        elif line.startswith("metadata:"):
            meta_str = line[9:].strip()
            try:
                import json
                meta = json.loads(meta_str)
                oc = meta.get("openclaw", {})
                req = oc.get("requires", {})
                info["requires_bins"] = req.get("bins", [])
                info["requires_env"] = req.get("env", [])
                info["os"] = oc.get("os", [])
            except (json.JSONDecodeError, AttributeError):
                pass
    return info


def find_skills(workspace):
    """Find all installed skills."""
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
        skill_md = entry / "SKILL.md"
        if skill_md.exists():
            skills.append(entry)
    return skills


def scan_script(filepath, workspace):
    """Scan a script file for permission usage patterns."""
    permissions = {}
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return permissions

    lines = content.split("\n")
    is_python = filepath.suffix == ".py"
    is_shell = filepath.suffix in (".sh", ".bash", ".zsh") or (
        lines and lines[0].startswith("#!") and ("sh" in lines[0] or "bash" in lines[0])
    )

    patterns = {}
    if is_python:
        patterns = PYTHON_PATTERNS
    elif is_shell:
        patterns = SHELL_PATTERNS

    for category, pats in patterns.items():
        for pattern, desc in pats:
            for line_idx, line in enumerate(lines, 1):
                # Skip comments
                stripped = line.strip()
                if is_python and stripped.startswith("#"):
                    continue
                if is_shell and stripped.startswith("#") and not stripped.startswith("#!"):
                    continue

                if pattern.search(line):
                    if category not in permissions:
                        permissions[category] = []
                    permissions[category].append({
                        "file": str(filepath.relative_to(workspace)),
                        "line": line_idx,
                        "detail": desc,
                        "snippet": stripped[:80],
                    })

    return permissions


def audit_skill(skill_dir, workspace):
    """Full audit of a single skill."""
    skill_md = skill_dir / "SKILL.md"
    meta = parse_skill_metadata(skill_md)

    all_permissions = {}

    # Scan all script files in the skill
    for root, dirs, filenames in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            fpath = Path(root) / fname
            if fpath.suffix in (".py", ".sh", ".bash", ".zsh", ".js", ".ts"):
                perms = scan_script(fpath, workspace)
                for cat, findings in perms.items():
                    if cat not in all_permissions:
                        all_permissions[cat] = []
                    all_permissions[cat].extend(findings)

    return {
        "name": meta["name"] or skill_dir.name,
        "description": meta["description"],
        "requires_bins": meta["requires_bins"],
        "requires_env": meta["requires_env"],
        "os": meta["os"],
        "permissions": all_permissions,
    }


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_audit(workspace, skill_name=None):
    """Audit permissions for all or a specific skill."""
    print("=" * 60)
    print("OPENCLAW ARBITER — PERMISSION AUDIT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    skills = find_skills(workspace)
    if not skills:
        print("No skills found.")
        return 0

    if skill_name:
        skills = [s for s in skills if s.name == skill_name]
        if not skills:
            print(f"Skill not found: {skill_name}")
            return 1

    total_high = 0
    total_critical = 0

    for skill_dir in skills:
        result = audit_skill(skill_dir, workspace)
        print("-" * 40)
        print(f"SKILL: {result['name']}")
        print("-" * 40)

        if result["description"]:
            print(f"  Description: {result['description'][:80]}")
        if result["requires_bins"]:
            print(f"  Requires: {', '.join(result['requires_bins'])}")
        if result["requires_env"]:
            print(f"  Env vars: {', '.join(result['requires_env'])}")
        print()

        if not result["permissions"]:
            print("  [CLEAN] No elevated permissions detected.")
            print()
            continue

        for category, findings in sorted(result["permissions"].items()):
            risk = RISK_LEVELS.get(category, "UNKNOWN")
            if risk == "CRITICAL":
                total_critical += len(findings)
            elif risk == "HIGH":
                total_high += len(findings)

            print(f"  [{risk}] {category.upper()} ({len(findings)} occurrence(s))")
            for f in findings[:5]:  # Show first 5
                print(f"    Line {f['line']}: {f['detail']}")
                print(f"      {f['snippet']}")
            if len(findings) > 5:
                print(f"    ... and {len(findings) - 5} more")
            print()

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Skills audited: {len(skills)}")
    print(f"  Critical findings: {total_critical}")
    print(f"  High-risk findings: {total_high}")
    print()

    if total_critical > 0:
        print("ACTION REQUIRED: Skills with critical permissions detected.")
        print()
        print("Upgrade to openclaw-arbiter-pro for automated countermeasures:")
        print("  revoke, quarantine, enforce")
        return 2
    elif total_high > 0:
        print("REVIEW NEEDED: Skills with elevated permissions detected.")
        print()
        print("Upgrade to openclaw-arbiter-pro for automated countermeasures:")
        print("  revoke, quarantine, enforce")
        return 1
    else:
        print("[CLEAN] All skills within normal permission bounds.")
        return 0


def cmd_report(workspace, skill_name=None):
    """Generate a compact permission matrix."""
    print("=" * 60)
    print("OPENCLAW ARBITER — PERMISSION MATRIX")
    print("=" * 60)
    print()

    skills = find_skills(workspace)
    if skill_name:
        skills = [s for s in skills if s.name == skill_name]

    if not skills:
        print("No skills found.")
        return 0

    categories = ["network", "subprocess", "file_write", "file_read",
                   "environment", "crypto", "serialization"]

    # Header
    header = f"{'Skill':<30}"
    for cat in categories:
        header += f" {cat[:6]:>6}"
    print(header)
    print("-" * len(header))

    for skill_dir in skills:
        result = audit_skill(skill_dir, workspace)
        row = f"{result['name']:<30}"
        for cat in categories:
            count = len(result["permissions"].get(cat, []))
            if count > 0:
                row += f" {count:>6}"
            else:
                row += f" {'—':>6}"
        print(row)

    print()
    print("Legend: Numbers = occurrences found. — = none detected.")
    print()
    return 0


def cmd_status(workspace):
    """Quick summary."""
    skills = find_skills(workspace)
    risky = 0
    for skill_dir in skills:
        result = audit_skill(skill_dir, workspace)
        for cat in result["permissions"]:
            if RISK_LEVELS.get(cat) in ("CRITICAL", "HIGH"):
                risky += 1
                break

    if risky > 0:
        print(f"[WARNING] {risky} of {len(skills)} skill(s) have elevated permissions")
        return 1
    else:
        print(f"[CLEAN] {len(skills)} skill(s) audited, all within normal bounds")
        return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Arbiter — Permission auditor")
    parser.add_argument("command", choices=["audit", "report", "status"],
                        help="Command to run")
    parser.add_argument("skill", nargs="?", help="Specific skill to audit")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    if args.command == "audit":
        sys.exit(cmd_audit(workspace, args.skill))
    elif args.command == "report":
        sys.exit(cmd_report(workspace, args.skill))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))


if __name__ == "__main__":
    main()
