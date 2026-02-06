#!/usr/bin/env python3
"""OpenClaw Sentry — Secret scanner for agent workspaces.

Scans workspace files, configs, memory, and skill scripts for leaked
secrets: API keys, tokens, passwords, private keys, and credentials.

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
# Secret patterns
# ---------------------------------------------------------------------------

SECRET_PATTERNS = [
    # AWS
    ("AWS Access Key", re.compile(r"(?<![A-Za-z0-9/+=])(AKIA[0-9A-Z]{16})(?![A-Za-z0-9/+=])")),
    ("AWS Secret Key", re.compile(r"""(?:aws_secret_access_key|secret_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?""", re.IGNORECASE)),

    # GitHub
    ("GitHub Token (ghp)", re.compile(r"(?<![A-Za-z0-9_])(ghp_[A-Za-z0-9]{36,})(?![A-Za-z0-9_])")),
    ("GitHub Token (gho)", re.compile(r"(?<![A-Za-z0-9_])(gho_[A-Za-z0-9]{36,})(?![A-Za-z0-9_])")),
    ("GitHub Token (ghs)", re.compile(r"(?<![A-Za-z0-9_])(ghs_[A-Za-z0-9]{36,})(?![A-Za-z0-9_])")),
    ("GitHub Token (ghr)", re.compile(r"(?<![A-Za-z0-9_])(ghr_[A-Za-z0-9]{36,})(?![A-Za-z0-9_])")),
    ("GitHub PAT", re.compile(r"(?<![A-Za-z0-9_])(github_pat_[A-Za-z0-9_]{22,})(?![A-Za-z0-9_])")),

    # Slack
    ("Slack Token", re.compile(r"(?<![A-Za-z0-9_])(xox[bporas]-[A-Za-z0-9\-]{10,})(?![A-Za-z0-9_])")),
    ("Slack Webhook", re.compile(r"(https://hooks\.slack\.com/services/T[A-Za-z0-9]+/B[A-Za-z0-9]+/[A-Za-z0-9]+)")),

    # Stripe
    ("Stripe Secret Key", re.compile(r"(?<![A-Za-z0-9_])(sk_live_[A-Za-z0-9]{20,})(?![A-Za-z0-9_])")),
    ("Stripe Publishable Key", re.compile(r"(?<![A-Za-z0-9_])(pk_live_[A-Za-z0-9]{20,})(?![A-Za-z0-9_])")),

    # OpenAI / Anthropic
    ("OpenAI API Key", re.compile(r"(?<![A-Za-z0-9_])(sk-[A-Za-z0-9]{20,})(?![A-Za-z0-9_])")),
    ("Anthropic API Key", re.compile(r"(?<![A-Za-z0-9_])(sk-ant-[A-Za-z0-9\-]{20,})(?![A-Za-z0-9_])")),

    # Google
    ("Google API Key", re.compile(r"(?<![A-Za-z0-9_])(AIza[A-Za-z0-9\-_]{35})(?![A-Za-z0-9_])")),
    ("Google OAuth Secret", re.compile(r"""client_secret["']?\s*[=:]\s*["']([A-Za-z0-9\-_]{24,})["']""", re.IGNORECASE)),

    # Azure
    ("Azure Storage Key", re.compile(r"""(?:AccountKey|account_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{86,88}==)["']?""", re.IGNORECASE)),

    # Generic
    ("Generic API Key", re.compile(r"""(?:api[_-]?key|apikey)\s*[=:]\s*["']([A-Za-z0-9\-_]{20,})["']""", re.IGNORECASE)),
    ("Generic Secret", re.compile(r"""(?:secret|SECRET)\s*[=:]\s*["']([A-Za-z0-9\-_]{20,})["']""")),
    ("Generic Password", re.compile(r"""(?:password|passwd|pwd)\s*[=:]\s*["']([^"'\s]{8,})["']""", re.IGNORECASE)),
    ("Bearer Token", re.compile(r"""(?:authorization|bearer)\s*[=:]\s*["']?Bearer\s+([A-Za-z0-9\-_.~+/]+=*)["']?""", re.IGNORECASE)),
    ("Connection String", re.compile(r"""(?:connection_string|connstr|dsn)\s*[=:]\s*["']([^"'\n]{20,})["']""", re.IGNORECASE)),

    # Private keys
    ("Private Key (PEM)", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),

    # Database URLs
    ("Database URL", re.compile(r"""(?:postgres|mysql|mongodb|redis|amqp)(?:ql)?://[^\s"']{10,}""")),

    # JWT
    ("JWT Token", re.compile(r"(?<![A-Za-z0-9_])(eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+)(?![A-Za-z0-9_])")),

    # Hex secrets
    ("Hex Secret", re.compile(r"""(?:secret|token|key|hash)\s*[=:]\s*["']([0-9a-f]{32,})["']""", re.IGNORECASE)),
]

HIGH_RISK_FILES = {
    ".env", ".env.local", ".env.production", ".env.staging", ".env.development",
    "credentials.json", "service-account.json", "secrets.json",
    ".npmrc", ".pypirc", ".netrc", ".pgpass", ".my.cnf",
    "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
}

HIGH_RISK_EXTENSIONS = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots",
}

SELF_SKILL_DIRS = {"openclaw-sentry", "openclaw-sentry-pro"}


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


def is_binary(path):
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        return b"\x00" in chunk
    except (OSError, PermissionError):
        return True


def in_code_block(lines, line_idx):
    fence_count = 0
    for i in range(line_idx):
        if lines[i].strip().startswith("```"):
            fence_count += 1
    return fence_count % 2 == 1


def mask_secret(text):
    if len(text) > 12:
        return text[:6] + "..." + text[-4:]
    return text[:3] + "..."


def collect_files(workspace):
    files = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if not is_binary(fpath):
                files.append(fpath)
    return files


# ---------------------------------------------------------------------------
# Scanning (ALERT phase)
# ---------------------------------------------------------------------------

def scan_file(filepath, workspace):
    findings = []
    rel = filepath.relative_to(workspace)
    fname = filepath.name

    if fname in HIGH_RISK_FILES:
        findings.append({
            "file": str(rel), "line": 0, "type": "High-Risk File",
            "severity": "WARNING",
            "detail": f"File '{fname}' commonly contains secrets",
            "match": "",
        })

    if filepath.suffix in HIGH_RISK_EXTENSIONS:
        findings.append({
            "file": str(rel), "line": 0, "type": "High-Risk Extension",
            "severity": "WARNING",
            "detail": f"Extension '{filepath.suffix}' typically contains key material",
            "match": "",
        })

    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings

    lines = content.split("\n")
    for line_idx, line in enumerate(lines, 1):
        if filepath.suffix in (".md", ".markdown") and in_code_block(lines, line_idx - 1):
            continue
        for pattern_name, pattern in SECRET_PATTERNS:
            for match in pattern.finditer(line):
                findings.append({
                    "file": str(rel), "line": line_idx,
                    "type": pattern_name, "severity": "CRITICAL",
                    "detail": f"Possible {pattern_name} detected",
                    "match": mask_secret(match.group(0)),
                })
    return findings


def scan_env_files(workspace):
    findings = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            if fname.startswith(".env"):
                fpath = Path(root) / fname
                rel = fpath.relative_to(workspace)
                try:
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                    line_count = len([l for l in content.strip().split("\n")
                                      if l.strip() and not l.strip().startswith("#")])
                    if line_count > 0:
                        findings.append({
                            "file": str(rel), "line": 0,
                            "type": "Environment File", "severity": "CRITICAL",
                            "detail": f".env file with {line_count} variable(s)",
                            "match": "",
                        })
                except (OSError, PermissionError):
                    pass
    return findings


def check_gitignore(workspace):
    findings = []
    gitignore = workspace / ".gitignore"
    if not gitignore.exists():
        findings.append({
            "file": ".gitignore", "line": 0,
            "type": "Missing .gitignore", "severity": "WARNING",
            "detail": "No .gitignore — secrets may be accidentally committed",
            "match": "",
        })
        return findings
    try:
        content = gitignore.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings
    missing = [p for p in [".env", "*.pem", "*.key", "credentials.json", "secrets.json"]
               if p not in content]
    if missing:
        findings.append({
            "file": ".gitignore", "line": 0,
            "type": "Incomplete .gitignore", "severity": "INFO",
            "detail": f"Missing patterns: {', '.join(missing)}",
            "match": "",
        })
    return findings


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_scan(workspace):
    print("=" * 60)
    print("OPENCLAW SENTRY — SECRET SCAN")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    all_findings = []
    all_findings.extend(scan_env_files(workspace))
    all_findings.extend(check_gitignore(workspace))

    files = collect_files(workspace)
    print(f"Scanning {len(files)} files...")
    print()

    for fpath in files:
        all_findings.extend(scan_file(fpath, workspace))

    return _report(all_findings)


def cmd_check(workspace, filepath):
    fpath = workspace / filepath
    if not fpath.exists():
        print(f"File not found: {filepath}")
        return 1
    print(f"Checking: {filepath}")
    print()
    findings = scan_file(fpath, workspace)
    if not findings:
        print("[CLEAN] No secrets detected.")
        return 0
    return _report(findings)


def cmd_status(workspace):
    files = collect_files(workspace)
    total = 0
    critical = 0
    for fpath in files:
        for f in scan_file(fpath, workspace):
            total += 1
            if f["severity"] == "CRITICAL":
                critical += 1
    for f in scan_env_files(workspace):
        total += 1
        if f["severity"] == "CRITICAL":
            critical += 1
    if critical > 0:
        print(f"[CRITICAL] {critical} secret(s) exposed across {total} finding(s)")
        return 2
    elif total > 0:
        print(f"[WARNING] {total} finding(s) need review")
        return 1
    else:
        print("[CLEAN] No secrets detected")
        return 0


def _report(findings):
    critical = [f for f in findings if f["severity"] == "CRITICAL"]
    warnings = [f for f in findings if f["severity"] == "WARNING"]
    infos = [f for f in findings if f["severity"] == "INFO"]

    print("-" * 40)
    print("RESULTS")
    print("-" * 40)

    if not findings:
        print("[CLEAN] No secrets detected.")
        return 0

    order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    for finding in sorted(findings, key=lambda f: order.get(f["severity"], 3)):
        sev = finding["severity"]
        loc = f"{finding['file']}:{finding['line']}" if finding["line"] else finding["file"]
        print(f"  [{sev}] {loc}")
        print(f"          {finding['type']}: {finding['detail']}")
        if finding["match"]:
            print(f"          Match: {finding['match']}")
        print()

    print("-" * 40)
    print("SUMMARY")
    print("-" * 40)
    print(f"  Critical: {len(critical)}")
    print(f"  Warnings: {len(warnings)}")
    print(f"  Info:     {len(infos)}")
    print(f"  Total:    {len(findings)}")
    print()

    if critical:
        print("ACTION REQUIRED: Secrets found. Remove or rotate immediately.")
        print()
        print("Upgrade to openclaw-sentry-pro for automated countermeasures:")
        print("  redact, quarantine, defend")
        return 2
    elif warnings:
        print("REVIEW NEEDED: Potential secret exposure detected.")
        return 1
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Sentry — Secret scanner")
    parser.add_argument("command", choices=["scan", "check", "status"],
                        help="Command to run")
    parser.add_argument("file", nargs="?", help="File to check (for 'check' command)")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    if args.command == "scan":
        sys.exit(cmd_scan(workspace))
    elif args.command == "check":
        if not args.file:
            print("Usage: sentry.py check <file>")
            sys.exit(1)
        sys.exit(cmd_check(workspace, args.file))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))


if __name__ == "__main__":
    main()
