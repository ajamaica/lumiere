#!/usr/bin/env python3
"""OpenClaw Security Suite — Unified orchestrator for all 11 security skills.

Installs, configures, scans, and monitors the complete OpenClaw security stack
from a single entry point. Aggregates results into a unified dashboard.

No external dependencies. Python standard library only.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Skill registry — maps skill name to its CLI interface
# ---------------------------------------------------------------------------

SKILLS = {
    "openclaw-warden": {
        "script": "scripts/integrity.py",
        "domain": "Workspace integrity",
        "ws_before": False,  # --workspace goes after command
        "status_cmd": ["status"],
        "scan_cmd": ["full"],
        "setup_cmd": ["baseline"],
        "protect_cmd": ["protect"],
    },
    "openclaw-sentry": {
        "script": "scripts/sentry.py",
        "domain": "Secret scanning",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["scan"],
        "setup_cmd": None,
        "protect_cmd": ["defend"],
    },
    "openclaw-arbiter": {
        "script": "scripts/arbiter.py",
        "domain": "Permission auditing",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["audit"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
    "openclaw-egress": {
        "script": "scripts/egress.py",
        "domain": "Network DLP",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["scan"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
    "openclaw-ledger": {
        "script": "scripts/ledger.py",
        "domain": "Audit trail",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["verify"],
        "setup_cmd": ["init"],
        "protect_cmd": ["protect"],
    },
    "openclaw-signet": {
        "script": "scripts/signet.py",
        "domain": "Skill signing",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["verify"],
        "setup_cmd": ["sign"],
        "protect_cmd": ["protect"],
    },
    "openclaw-sentinel": {
        "script": "scripts/sentinel.py",
        "domain": "Supply chain",
        "ws_before": True,  # subparser: --workspace before command
        "status_cmd": ["status"],
        "scan_cmd": ["scan"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
    "openclaw-vault": {
        "script": "scripts/vault.py",
        "domain": "Credential lifecycle",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["audit"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
    "openclaw-bastion": {
        "script": "scripts/bastion.py",
        "domain": "Injection defense",
        "ws_before": True,  # subparser: --workspace before command
        "status_cmd": ["status"],
        "scan_cmd": ["scan"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
    "openclaw-marshal": {
        "script": "scripts/marshal.py",
        "domain": "Compliance",
        "ws_before": False,
        "status_cmd": ["status"],
        "scan_cmd": ["audit"],
        "setup_cmd": ["policy", "--init"],
        "protect_cmd": ["protect"],
    },
    "openclaw-triage": {
        "script": "scripts/triage.py",
        "domain": "Incident response",
        "ws_before": True,  # subparser: --workspace before command
        "status_cmd": ["status"],
        "scan_cmd": ["investigate"],
        "setup_cmd": None,
        "protect_cmd": ["protect"],
    },
}

# Ordered for logical scan sequence
SCAN_ORDER = [
    "openclaw-sentinel",   # supply chain first (are skills safe?)
    "openclaw-signet",     # signing verification (have skills been tampered?)
    "openclaw-warden",     # workspace integrity (have workspace files changed?)
    "openclaw-bastion",    # injection scanning (are there injections?)
    "openclaw-sentry",     # secret scanning (are secrets exposed?)
    "openclaw-vault",      # credential lifecycle (are creds safe?)
    "openclaw-arbiter",    # permission audit (do skills have excess perms?)
    "openclaw-egress",     # network DLP (are there exfil risks?)
    "openclaw-marshal",    # compliance (does everything meet policy?)
    "openclaw-ledger",     # audit trail integrity (is the log intact?)
    "openclaw-triage",     # incident response (any active incidents?)
]

SELF_SKILL_NAME = "openclaw-security"


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


def find_python():
    """Find the python3 executable. Prefer the current interpreter."""
    return sys.executable


def skills_dir(workspace):
    return workspace / "skills"


def installed_skills(workspace):
    """Return dict of installed security skill names -> their directories."""
    sd = skills_dir(workspace)
    found = {}
    if not sd.exists():
        return found
    for name in SKILLS:
        skill_dir = sd / name
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
            found[name] = skill_dir
        # also check for -pro variant
        pro_name = name + "-pro"
        pro_dir = sd / pro_name
        if pro_dir.is_dir() and (pro_dir / "SKILL.md").exists():
            found[pro_name] = pro_dir
    return found


def run_skill(python, skill_dir, script_rel, args, workspace,
              ws_before=False, capture=True):
    """Run a skill's script with the given arguments.

    ws_before: if True, --workspace goes before the command args (subparser tools).
               if False, --workspace goes after the command args.
    """
    script = skill_dir / script_rel
    if not script.exists():
        return None, f"Script not found: {script}", 1

    ws_args = ["--workspace", str(workspace)]
    if ws_before:
        cmd = [python, str(script)] + ws_args + args
    else:
        cmd = [python, str(script)] + args + ws_args

    try:
        result = subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            timeout=60,
            cwd=str(workspace),
        )
        stdout = result.stdout if capture else ""
        stderr = result.stderr if capture else ""
        return stdout, stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "TIMEOUT (60s)", 1
    except Exception as e:
        return "", str(e), 1


def severity_label(code):
    if code == 0:
        return "OK"
    elif code == 1:
        return "REVIEW"
    else:
        return "CRITICAL"


def severity_icon(code):
    if code == 0:
        return "[OK]"
    elif code == 1:
        return "[!!]"
    else:
        return "[XX]"


def print_header(title):
    print()
    print("=" * 64)
    print(f"  OPENCLAW SECURITY SUITE — {title}")
    print("=" * 64)
    print(f"  Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()


def print_section(title):
    print()
    print(f"  --- {title} ---")
    print()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_install(workspace):
    """Install all 11 free security skills from ClawHub."""
    print_header("INSTALL")

    clawhub = shutil.which("clawhub")
    if not clawhub:
        print("  ERROR: clawhub CLI not found. Install it first:")
        print("    npm install -g clawhub")
        return 1

    sd = skills_dir(workspace)
    installed = 0
    skipped = 0
    failed = 0

    for name in SCAN_ORDER:
        skill_dir = sd / name
        if skill_dir.exists() and (skill_dir / "SKILL.md").exists():
            print(f"  [SKIP] {name:<30} (already installed)")
            skipped += 1
            continue

        print(f"  [....] {name:<30} installing...", end="", flush=True)
        try:
            result = subprocess.run(
                [clawhub, "install", name, "--workdir", str(workspace)],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                print(f"\r  [ OK ] {name:<30} installed")
                installed += 1
            else:
                err = result.stderr.strip().split("\n")[-1] if result.stderr else "unknown error"
                print(f"\r  [FAIL] {name:<30} {err}")
                failed += 1
        except Exception as e:
            print(f"\r  [FAIL] {name:<30} {e}")
            failed += 1

    print()
    print(f"  Installed: {installed}  Skipped: {skipped}  Failed: {failed}")

    if installed > 0:
        print()
        print("  Run 'setup' next to initialize all tools:")
        print(f"    python3 security.py setup --workspace {workspace}")

    return 0 if failed == 0 else 1


def cmd_list(workspace):
    """List installed security skills."""
    print_header("INSTALLED TOOLS")

    found = installed_skills(workspace)
    if not found:
        print("  No security skills installed.")
        print()
        print("  Run 'install' to set up the full suite:")
        print(f"    python3 security.py install --workspace {workspace}")
        return 1

    free_count = 0
    pro_count = 0

    for name in SCAN_ORDER:
        info = SKILLS[name]
        has_free = name in found
        has_pro = (name + "-pro") in found

        status_parts = []
        if has_free:
            status_parts.append("free")
            free_count += 1
        if has_pro:
            status_parts.append("pro")
            pro_count += 1

        if status_parts:
            tier = " + ".join(status_parts)
            print(f"  [*] {name:<30} {info['domain']:<24} ({tier})")
        else:
            print(f"  [ ] {name:<30} {info['domain']:<24} (not installed)")

    print()
    print(f"  Free: {free_count}/11  Pro: {pro_count}/11")
    return 0


def cmd_status(workspace):
    """Unified dashboard — run status on all installed tools."""
    print_header("DASHBOARD")

    found = installed_skills(workspace)
    if not found:
        print("  No security skills installed. Run 'install' first.")
        return 1

    python = find_python()
    results = {}
    worst = 0

    for name in SCAN_ORDER:
        info = SKILLS[name]
        # prefer pro variant if installed
        pro_name = name + "-pro"
        if pro_name in found:
            active_name = pro_name
            active_dir = found[pro_name]
        elif name in found:
            active_name = name
            active_dir = found[name]
        else:
            print(f"  [--] {info['domain']:<24} {name:<30} not installed")
            continue

        stdout, stderr, code = run_skill(
            python, active_dir, info["script"],
            info["status_cmd"], workspace,
            ws_before=info["ws_before"],
        )

        # Extract the most useful status line from output
        # Some tools write to stderr, so check both
        # Skip separator/header lines (all =, -, or empty)
        status_line = ""
        output = stdout or stderr or ""
        if output:
            lines = [l.strip() for l in output.strip().split("\n") if l.strip()]
            # Filter out separator lines
            useful = [l for l in lines
                      if not all(c in "=-~" for c in l) and len(l) > 2]
            # Prefer lines with status keywords
            for kw in ["[OK]", "[CLEAN]", "[VERIFIED]", "[WARNING]",
                       "[TAMPERED]", "[CRITICAL]", "[INFO]", "STATUS:",
                       "[ACTIVE]", "[UNINITIALIZED]", "skill(s)", "finding"]:
                for l in useful:
                    if kw in l:
                        status_line = l
                        break
                if status_line:
                    break
            if not status_line and useful:
                status_line = useful[-1]

        icon = severity_icon(code)
        tier = "PRO" if active_name.endswith("-pro") else "   "
        print(f"  {icon} {info['domain']:<24} {tier}  {status_line}")

        results[name] = {"code": code, "output": stdout, "tier": tier.strip()}
        worst = max(worst, code)

    # Summary
    ok = sum(1 for r in results.values() if r["code"] == 0)
    review = sum(1 for r in results.values() if r["code"] == 1)
    critical = sum(1 for r in results.values() if r["code"] >= 2)
    total = len(results)

    print()
    print("-" * 48)
    print(f"  HEALTH: {ok}/{total} clean", end="")
    if review:
        print(f"  |  {review} review", end="")
    if critical:
        print(f"  |  {critical} CRITICAL", end="")
    print()

    if worst == 0:
        print("  [OK] Workspace security posture: CLEAN")
    elif worst == 1:
        print("  [!!] Workspace security posture: REVIEW NEEDED")
    else:
        print("  [XX] Workspace security posture: ACTION REQUIRED")

    return worst


def cmd_scan(workspace):
    """Full security scan — runs every scanner in logical order."""
    print_header("FULL SECURITY SCAN")

    found = installed_skills(workspace)
    if not found:
        print("  No security skills installed. Run 'install' first.")
        return 1

    python = find_python()
    results = {}
    worst = 0

    for name in SCAN_ORDER:
        info = SKILLS[name]
        pro_name = name + "-pro"
        if pro_name in found:
            active_name = pro_name
            active_dir = found[pro_name]
        elif name in found:
            active_name = name
            active_dir = found[name]
        else:
            continue

        short = info["domain"]
        print(f"  Scanning: {short}...", flush=True)

        stdout, stderr, code = run_skill(
            python, active_dir, info["script"],
            info["scan_cmd"], workspace,
            ws_before=info["ws_before"],
        )

        icon = severity_icon(code)
        print(f"  {icon} {short:<24} {severity_label(code)}")

        # Show findings summary (capped at 5 lines per tool)
        if code > 0 and stdout:
            shown = 0
            total_findings = 0
            for line in stdout.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("=") or line.startswith("-" * 10):
                    continue
                if any(kw in line.upper() for kw in [
                    "WARNING", "CRITICAL", "TAMPERED", "FOUND", "DETECTED",
                    "VIOLATION", "EXPOSED", "MODIFIED", "INJECTION", "THREAT",
                    "SECRET", "RISK", "FAIL", "UNSIGNED", "MISSING",
                ]):
                    total_findings += 1
                    if shown < 5:
                        print(f"           {line[:80]}")
                        shown += 1
            if total_findings > 5:
                print(f"           ... and {total_findings - 5} more finding(s)")

        results[name] = code
        worst = max(worst, code)
        print()

    # Aggregate report
    print("=" * 64)
    print("  SCAN SUMMARY")
    print("=" * 64)

    ok = sum(1 for c in results.values() if c == 0)
    review = sum(1 for c in results.values() if c == 1)
    critical = sum(1 for c in results.values() if c >= 2)
    total = len(results)

    print(f"  Tools run:  {total}")
    print(f"  Clean:      {ok}")
    print(f"  Review:     {review}")
    print(f"  Critical:   {critical}")
    print()

    if worst == 0:
        print("  RESULT: ALL CLEAR")
    elif worst == 1:
        print("  RESULT: REVIEW NEEDED — run individual tools for details")
    else:
        print("  RESULT: ACTION REQUIRED — critical findings detected")
        print()
        print("  Upgrade to Pro for automated countermeasures:")
        print("  https://github.com/sponsors/AtlasPA")

    return worst


def cmd_setup(workspace):
    """Initialize all tools that need setup."""
    print_header("FIRST-TIME SETUP")

    found = installed_skills(workspace)
    if not found:
        print("  No security skills installed. Run 'install' first.")
        return 1

    python = find_python()
    setup_count = 0
    skip_count = 0
    fail_count = 0

    for name in SCAN_ORDER:
        info = SKILLS[name]
        if info["setup_cmd"] is None:
            continue

        pro_name = name + "-pro"
        if pro_name in found:
            active_dir = found[pro_name]
        elif name in found:
            active_dir = found[name]
        else:
            continue

        short = info["domain"]
        cmd_label = " ".join(info["setup_cmd"])
        print(f"  [{cmd_label:<16}] {short}...", end="", flush=True)

        stdout, stderr, code = run_skill(
            python, active_dir, info["script"],
            info["setup_cmd"], workspace,
            ws_before=info["ws_before"],
        )

        if code == 0:
            print(f"  OK")
            setup_count += 1
        else:
            # Some tools return non-zero if already initialized
            if "already" in (stdout + stderr).lower():
                print(f"  (already done)")
                skip_count += 1
            else:
                print(f"  FAILED")
                if stderr:
                    for line in stderr.strip().split("\n")[:3]:
                        print(f"           {line.strip()[:80]}")
                fail_count += 1

    print()
    print(f"  Initialized: {setup_count}  Skipped: {skip_count}  Failed: {fail_count}")

    if fail_count == 0:
        print()
        print("  Setup complete. Run 'status' to verify:")
        print(f"    python3 security.py status --workspace {workspace}")

    return 0 if fail_count == 0 else 1


def cmd_update(workspace):
    """Update all installed security skills via ClawHub."""
    print_header("UPDATE")

    clawhub = shutil.which("clawhub")
    if not clawhub:
        print("  ERROR: clawhub CLI not found.")
        return 1

    found = installed_skills(workspace)
    if not found:
        print("  No security skills installed.")
        return 1

    updated = 0
    for name in sorted(found.keys()):
        print(f"  Updating {name}...", end="", flush=True)
        try:
            result = subprocess.run(
                [clawhub, "update", name, "--workdir", str(workspace)],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                if "already" in result.stdout.lower() or "up to date" in result.stdout.lower():
                    print("  (up to date)")
                else:
                    print("  updated")
                    updated += 1
            else:
                print(f"  (skipped: {result.stderr.strip().split(chr(10))[-1][:60]})")
        except Exception as e:
            print(f"  error: {e}")

    print()
    print(f"  Updated: {updated}")
    return 0


def cmd_protect(workspace):
    """Run automated countermeasures across all installed Pro tools."""
    print_header("PROTECT (PRO)")

    found = installed_skills(workspace)
    python = find_python()

    pro_tools = {n: d for n, d in found.items() if n.endswith("-pro")}
    if not pro_tools:
        print("  No Pro tools installed.")
        print()
        print("  Upgrade to Pro for automated countermeasures:")
        print("  https://github.com/sponsors/AtlasPA")
        return 1

    worst = 0
    for pro_name, pro_dir in sorted(pro_tools.items()):
        base_name = pro_name.replace("-pro", "")
        if base_name not in SKILLS:
            continue

        info = SKILLS[base_name]
        if info["protect_cmd"] is None:
            continue

        short = info["domain"]
        print(f"  Protecting: {short}...", flush=True)

        stdout, stderr, code = run_skill(
            python, pro_dir, info["script"],
            info["protect_cmd"], workspace,
            ws_before=info["ws_before"],
        )

        icon = severity_icon(code)
        print(f"  {icon} {short:<24} {severity_label(code)}")
        worst = max(worst, code)

    print()
    if worst == 0:
        print("  [OK] All countermeasures applied successfully.")
    else:
        print("  [!!] Some countermeasures reported issues. Check individual tool output.")

    return worst


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Security Suite — Unified orchestrator"
    )
    parser.add_argument(
        "command",
        choices=["install", "list", "status", "scan", "setup", "update", "protect"],
        help="Command to run",
    )
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    commands = {
        "install": cmd_install,
        "list": cmd_list,
        "status": cmd_status,
        "scan": cmd_scan,
        "setup": cmd_setup,
        "update": cmd_update,
        "protect": cmd_protect,
    }

    sys.exit(commands[args.command](workspace))


if __name__ == "__main__":
    main()
