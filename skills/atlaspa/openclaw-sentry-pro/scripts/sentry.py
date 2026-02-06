#!/usr/bin/env python3
"""OpenClaw Sentry Pro — Secret scanning suite with countermeasures.

Scans workspace files, configs, memory, and skill scripts for leaked
secrets: API keys, tokens, passwords, private keys, and credentials.

Philosophy: alert -> subvert -> quarantine -> defend
Free version: Alert (detect + report).
Pro version: Subvert (redact) + Quarantine + Defend.

Usage:
    sentry.py scan           [--workspace PATH]
    sentry.py check <file>   [--workspace PATH]
    sentry.py status         [--workspace PATH]
    sentry.py redact [file]  [--workspace PATH]
    sentry.py quarantine <file> [--workspace PATH]
    sentry.py unquarantine <file> [--workspace PATH]
    sentry.py defend         [--workspace PATH]
    sentry.py protect        [--workspace PATH]
"""

import argparse
import io
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure stdout can handle Unicode on Windows (cp1252 etc.)
# ---------------------------------------------------------------------------

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace"
    )

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

QUARANTINE_DIR = ".quarantine"
QUARANTINE_SENTRY_DIR = "sentry"

# Default .gitignore patterns for secret defense
GITIGNORE_SECRET_PATTERNS = [
    "# Secrets and credentials (managed by openclaw-sentry-pro)",
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "*.jks",
    "*.keystore",
    "credentials.json",
    "service-account.json",
    "secrets.json",
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".pgpass",
    ".my.cnf",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "id_dsa",
    ".sentry-policy.json",
]

# Threshold for quarantine: files with this many or more findings are
# considered high-density and auto-quarantined by `protect`.
HIGH_DENSITY_THRESHOLD = 3


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def resolve_workspace(ws_arg):
    """Determine workspace path from arg, env, or defaults."""
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
    """Return True if file appears to be binary."""
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        return b"\x00" in chunk
    except (OSError, PermissionError):
        return True


def in_code_block(lines, line_idx):
    """Check if a line is inside a fenced markdown code block."""
    fence_count = 0
    for i in range(line_idx):
        if lines[i].strip().startswith("```"):
            fence_count += 1
    return fence_count % 2 == 1


def mask_secret(text):
    """Mask a secret value for display."""
    if len(text) > 12:
        return text[:6] + "..." + text[-4:]
    return text[:3] + "..."


def redact_secret(text):
    """Produce a redacted replacement for a matched secret."""
    # Preserve recognizable prefix if present
    prefixes = [
        "sk-ant-", "sk_live_", "pk_live_", "sk-", "ghp_", "gho_",
        "ghs_", "ghr_", "github_pat_", "xox", "AKIA", "AIza",
        "eyJ",
    ]
    for prefix in prefixes:
        if text.startswith(prefix):
            return prefix + "***REDACTED***"
    if len(text) > 8:
        return text[:4] + "***REDACTED***"
    return "***REDACTED***"


def collect_files(workspace):
    """Walk workspace and return list of non-binary file Paths."""
    files = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [
            d for d in dirs
            if d not in SKIP_DIRS and not d.startswith(".quarantine")
        ]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if not is_binary(fpath):
                files.append(fpath)
    return files


def quarantine_base(workspace):
    """Return the quarantine directory path for sentry."""
    return workspace / QUARANTINE_DIR / QUARANTINE_SENTRY_DIR


# ---------------------------------------------------------------------------
# Scanning (ALERT phase) — same as free version
# ---------------------------------------------------------------------------

def scan_file(filepath, workspace):
    """Scan a single file for secrets. Returns list of finding dicts."""
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
    """Scan for .env files with content."""
    findings = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            if fname.startswith(".env"):
                fpath = Path(root) / fname
                rel = fpath.relative_to(workspace)
                try:
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                    line_count = len([
                        l for l in content.strip().split("\n")
                        if l.strip() and not l.strip().startswith("#")
                    ])
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
    """Check .gitignore for missing secret patterns."""
    findings = []
    gitignore = workspace / ".gitignore"
    if not gitignore.exists():
        findings.append({
            "file": ".gitignore", "line": 0,
            "type": "Missing .gitignore", "severity": "WARNING",
            "detail": "No .gitignore -- secrets may be accidentally committed",
            "match": "",
        })
        return findings
    try:
        content = gitignore.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings
    missing = [
        p for p in [".env", "*.pem", "*.key", "credentials.json", "secrets.json"]
        if p not in content
    ]
    if missing:
        findings.append({
            "file": ".gitignore", "line": 0,
            "type": "Incomplete .gitignore", "severity": "INFO",
            "detail": f"Missing patterns: {', '.join(missing)}",
            "match": "",
        })
    return findings


def _report(findings):
    """Print findings report, return exit code."""
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
        loc = (
            f"{finding['file']}:{finding['line']}"
            if finding["line"] else finding["file"]
        )
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
        return 2
    elif warnings:
        print("REVIEW NEEDED: Potential secret exposure detected.")
        return 1
    return 0


# ---------------------------------------------------------------------------
# Free commands
# ---------------------------------------------------------------------------

def cmd_scan(workspace):
    """Full workspace secret scan."""
    print("=" * 60)
    print("OPENCLAW SENTRY PRO -- SECRET SCAN")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
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
    """Check a single file for secrets."""
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
    """Quick one-line workspace secret status."""
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

    # Also report quarantine status
    qdir = quarantine_base(workspace)
    quarantined = 0
    if qdir.is_dir():
        quarantined = len([
            d for d in qdir.iterdir()
            if d.is_dir() or d.suffix != ".json"
        ])

    # Check policy status
    policy = workspace / ".sentry-policy.json"
    has_policy = policy.exists()

    parts = []
    if critical > 0:
        parts.append(f"{critical} secret(s) exposed")
        code = 2
    elif total > 0:
        parts.append(f"{total} finding(s) need review")
        code = 1
    else:
        parts.append("no secrets detected")
        code = 0

    if quarantined:
        parts.append(f"{quarantined} file(s) quarantined")
    if has_policy:
        parts.append("policy active")

    severity = "[CRITICAL]" if critical else "[WARNING]" if total else "[CLEAN]"
    print(f"{severity} {'; '.join(parts)}")
    return code


# ---------------------------------------------------------------------------
# Pro commands: SUBVERT (redact)
# ---------------------------------------------------------------------------

def _redact_file(filepath, workspace):
    """Redact secrets in a single file. Returns (num_redacted, findings)."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return 0, []

    findings = []
    lines = content.split("\n")
    new_lines = []
    total_redacted = 0

    for line_idx, line in enumerate(lines):
        new_line = line
        # Skip redaction inside code blocks in markdown files
        if filepath.suffix in (".md", ".markdown") and in_code_block(lines, line_idx):
            new_lines.append(new_line)
            continue

        for pattern_name, pattern in SECRET_PATTERNS:
            matches = list(pattern.finditer(new_line))
            if not matches:
                continue
            # Replace from right to left to preserve positions
            for match in reversed(matches):
                original = match.group(0)
                replacement = redact_secret(original)
                start, end = match.start(), match.end()
                new_line = new_line[:start] + replacement + new_line[end:]
                total_redacted += 1
                findings.append({
                    "file": str(filepath.relative_to(workspace)),
                    "line": line_idx + 1,
                    "type": pattern_name,
                    "original_masked": mask_secret(original),
                    "action": "redacted",
                })

        new_lines.append(new_line)

    if total_redacted > 0:
        # Create .bak backup before modifying
        bak = filepath.with_suffix(filepath.suffix + ".bak")
        shutil.copy2(filepath, bak)

        # Write redacted content
        filepath.write_text("\n".join(new_lines), encoding="utf-8")

    return total_redacted, findings


def cmd_redact(workspace, filepath=None):
    """Redact secrets in files, replacing them with masked versions.

    Creates .bak backup before modifying each file.
    If no file specified, redact all files in workspace.
    """
    print("=" * 60)
    print("OPENCLAW SENTRY PRO -- REDACT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    if filepath:
        fpath = workspace / filepath
        if not fpath.exists():
            print(f"File not found: {filepath}")
            return 1
        if is_binary(fpath):
            print(f"Skipping binary file: {filepath}")
            return 0
        count, findings = _redact_file(fpath, workspace)
        if count == 0:
            print(f"[CLEAN] No secrets to redact in {filepath}")
            return 0
        print(f"Redacted {count} secret(s) in {filepath}")
        print(f"  Backup saved: {filepath}{fpath.suffix}.bak")
        for f in findings:
            print(f"  Line {f['line']}: {f['type']} ({f['original_masked']})")
        return 0

    # Redact all files
    files = collect_files(workspace)
    total_redacted = 0
    files_modified = 0
    all_findings = []

    print(f"Scanning {len(files)} files for redaction...")
    print()

    for fpath in files:
        count, findings = _redact_file(fpath, workspace)
        if count > 0:
            rel = fpath.relative_to(workspace)
            files_modified += 1
            total_redacted += count
            all_findings.extend(findings)
            print(f"  [REDACTED] {rel} -- {count} secret(s), backup at {rel}.bak")

    print()
    if total_redacted == 0:
        print("[CLEAN] No secrets to redact.")
        return 0

    print("-" * 40)
    print(f"REDACTION SUMMARY")
    print("-" * 40)
    print(f"  Files modified: {files_modified}")
    print(f"  Secrets redacted: {total_redacted}")
    print(f"  Backups created: {files_modified}")
    print()
    print("All original files backed up with .bak extension.")
    print("IMPORTANT: Rotate any exposed credentials immediately.")
    return 0


# ---------------------------------------------------------------------------
# Pro commands: QUARANTINE
# ---------------------------------------------------------------------------

def cmd_quarantine(workspace, filepath):
    """Move a file containing secrets to quarantine with metadata."""
    fpath = workspace / filepath
    if not fpath.exists():
        print(f"File not found: {filepath}")
        return 1

    # Scan the file first
    findings = []
    if not is_binary(fpath):
        findings = scan_file(fpath, workspace)

    # Create quarantine directory
    qdir = quarantine_base(workspace)
    qdir.mkdir(parents=True, exist_ok=True)

    # Determine quarantine destination (preserve relative structure)
    rel = Path(filepath)
    dest = qdir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Create metadata
    metadata = {
        "original_path": str(filepath),
        "quarantined_at": now_iso(),
        "reason": "Contains secrets" if findings else "Manual quarantine",
        "findings_count": len(findings),
        "findings": [
            {
                "type": f["type"],
                "severity": f["severity"],
                "line": f["line"],
                "detail": f["detail"],
            }
            for f in findings
        ],
    }

    # Move file to quarantine
    shutil.move(str(fpath), str(dest))

    # Write metadata JSON alongside the quarantined file
    meta_path = dest.with_suffix(dest.suffix + ".meta.json")
    meta_path.write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )

    print(f"Quarantined: {filepath}")
    print(f"  Moved to: {dest.relative_to(workspace)}")
    print(f"  Metadata: {meta_path.relative_to(workspace)}")
    if findings:
        critical = sum(1 for f in findings if f["severity"] == "CRITICAL")
        warnings = sum(1 for f in findings if f["severity"] == "WARNING")
        print(f"  Findings: {critical} critical, {warnings} warnings")
    print()
    print(f"To restore: sentry.py unquarantine {filepath}")
    return 0


def cmd_unquarantine(workspace, filepath):
    """Restore a quarantined file to its original location."""
    qdir = quarantine_base(workspace)
    rel = Path(filepath)
    quarantined = qdir / rel

    if not quarantined.exists():
        print(f"No quarantined file found: {filepath}")
        # List quarantined files
        if qdir.is_dir():
            files = []
            for root, dirs, filenames in os.walk(qdir):
                for fname in filenames:
                    if not fname.endswith(".meta.json"):
                        f = Path(root) / fname
                        files.append(f.relative_to(qdir))
            if files:
                print("Quarantined files:")
                for f in sorted(files):
                    print(f"  {f}")
            else:
                print("No files in quarantine.")
        return 1

    # Check if original location is free
    dest = workspace / filepath
    if dest.exists():
        print(f"Cannot restore: {filepath} already exists in workspace.")
        print(f"Remove or rename it first, then retry.")
        return 1

    # Restore
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(quarantined), str(dest))

    # Remove metadata if it exists
    meta_path = quarantined.with_suffix(quarantined.suffix + ".meta.json")
    if meta_path.exists():
        meta_path.unlink()

    # Clean up empty quarantine directories
    _cleanup_empty_dirs(qdir)

    print(f"Unquarantined: {filepath}")
    print(f"  Restored to: {filepath}")
    print()
    print("WARNING: Re-scan this file before trusting its contents.")
    return 0


def _cleanup_empty_dirs(directory):
    """Remove empty directories inside the given directory."""
    for root, dirs, files in os.walk(directory, topdown=False):
        for d in dirs:
            dpath = Path(root) / d
            try:
                if not any(dpath.iterdir()):
                    dpath.rmdir()
            except OSError:
                pass
    # Remove the directory itself if empty
    try:
        if directory.is_dir() and not any(directory.iterdir()):
            directory.rmdir()
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Pro commands: DEFEND
# ---------------------------------------------------------------------------

def cmd_defend(workspace):
    """Auto-generate/update .gitignore and create sentry policy."""
    print("=" * 60)
    print("OPENCLAW SENTRY PRO -- DEFEND")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    actions = []

    # ---- Update .gitignore ----
    gitignore = workspace / ".gitignore"
    if gitignore.exists():
        try:
            content = gitignore.read_text(encoding="utf-8", errors="ignore")
        except (OSError, PermissionError):
            content = ""
    else:
        content = ""

    existing_lines = set(content.strip().split("\n")) if content.strip() else set()
    new_patterns = []
    for pattern in GITIGNORE_SECRET_PATTERNS:
        if pattern not in existing_lines and pattern not in content:
            new_patterns.append(pattern)

    if new_patterns:
        # Append sentry section
        if content and not content.endswith("\n"):
            content += "\n"
        if content and not content.endswith("\n\n"):
            content += "\n"
        content += "\n".join(new_patterns) + "\n"
        gitignore.write_text(content, encoding="utf-8")
        real_patterns = [p for p in new_patterns if not p.startswith("#")]
        actions.append(f"Updated .gitignore with {len(real_patterns)} secret pattern(s)")
        print(f"[DEFEND] .gitignore updated:")
        for p in new_patterns:
            if not p.startswith("#"):
                print(f"  + {p}")
    else:
        print("[OK] .gitignore already has all secret patterns.")

    print()

    # ---- Create/update sentry policy ----
    policy_path = workspace / ".sentry-policy.json"
    policy = {
        "version": 1,
        "updated": now_iso(),
        "description": "Secret scanning policy enforced by openclaw-sentry-pro",
        "enforce_gitignore": True,
        "auto_redact": True,
        "auto_quarantine_threshold": HIGH_DENSITY_THRESHOLD,
        "monitored_patterns": [
            {"name": name, "enabled": True}
            for name, _ in SECRET_PATTERNS
        ],
        "high_risk_files": sorted(HIGH_RISK_FILES),
        "high_risk_extensions": sorted(HIGH_RISK_EXTENSIONS),
        "gitignore_patterns": [
            p for p in GITIGNORE_SECRET_PATTERNS if not p.startswith("#")
        ],
    }

    if policy_path.exists():
        try:
            old = json.loads(policy_path.read_text(encoding="utf-8"))
            if old.get("version") == policy["version"]:
                # Preserve user customizations: check for disabled patterns
                old_patterns = {
                    p["name"]: p.get("enabled", True)
                    for p in old.get("monitored_patterns", [])
                }
                for p in policy["monitored_patterns"]:
                    if p["name"] in old_patterns:
                        p["enabled"] = old_patterns[p["name"]]
        except (json.JSONDecodeError, OSError):
            pass

    policy_path.write_text(
        json.dumps(policy, indent=2), encoding="utf-8"
    )
    actions.append("Updated .sentry-policy.json")
    print(f"[DEFEND] Policy written: .sentry-policy.json")
    print(f"  Patterns enforced: {len(policy['monitored_patterns'])}")
    print(f"  Auto-redact: {policy['auto_redact']}")
    print(f"  Quarantine threshold: {policy['auto_quarantine_threshold']} findings/file")

    print()
    print("-" * 40)
    print("DEFENSE SUMMARY")
    print("-" * 40)
    for a in actions:
        print(f"  - {a}")
    print()
    print("Defense layers active. Run 'protect' for a full automated sweep.")
    return 0


# ---------------------------------------------------------------------------
# Pro commands: PROTECT (full automated sweep)
# ---------------------------------------------------------------------------

def cmd_protect(workspace):
    """Full automated sweep: scan, redact, quarantine, defend.

    Steps:
    1. Scan all files for secrets.
    2. Auto-redact secrets in non-critical files (files that are not
       .env or high-risk files that should be quarantined instead).
    3. Quarantine files with high-density secrets (>= threshold).
    4. Update .gitignore with secret patterns.
    5. Report all actions taken.
    """
    print("=" * 60)
    print("OPENCLAW SENTRY PRO -- PROTECT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    actions = []

    # --- Phase 1: Scan ---
    print("[1/4] Scanning for secrets...")
    all_findings = []
    all_findings.extend(scan_env_files(workspace))

    files = collect_files(workspace)
    print(f"  Scanning {len(files)} files...")

    file_findings = {}  # rel_path -> list of findings
    for fpath in files:
        findings = scan_file(fpath, workspace)
        if findings:
            rel = str(fpath.relative_to(workspace))
            file_findings[rel] = findings
            all_findings.extend(findings)

    critical_count = sum(1 for f in all_findings if f["severity"] == "CRITICAL")
    warning_count = sum(1 for f in all_findings if f["severity"] == "WARNING")
    print(f"  Found {critical_count} critical, {warning_count} warnings across {len(file_findings)} file(s)")
    print()

    if not all_findings:
        print("[CLEAN] No secrets detected.")
        # Still run defend to ensure .gitignore is up to date
        print()
        print("[4/4] Updating defenses...")
        _defend_quiet(workspace, actions)
        _print_protect_summary(actions)
        return 0

    # --- Phase 2: Redact non-critical files ---
    print("[2/4] Redacting secrets...")
    redacted_count = 0
    for rel, findings in file_findings.items():
        fpath = workspace / rel
        if not fpath.exists():
            continue

        # Count critical findings (actual secret matches, not just warnings)
        crit = [f for f in findings if f["severity"] == "CRITICAL"]

        # Skip high-risk files that should be quarantined, not redacted
        fname = fpath.name
        if fname in HIGH_RISK_FILES or fpath.suffix in HIGH_RISK_EXTENSIONS:
            continue

        # Skip files above quarantine threshold -- they'll be quarantined
        if len(crit) >= HIGH_DENSITY_THRESHOLD:
            continue

        # Redact
        if crit:
            count, _ = _redact_file(fpath, workspace)
            if count > 0:
                redacted_count += count
                actions.append(f"Redacted {count} secret(s) in {rel}")
                print(f"  [REDACT] {rel} -- {count} secret(s)")

    if redacted_count == 0:
        print("  No files needed redaction.")
    print()

    # --- Phase 3: Quarantine high-density and high-risk files ---
    print("[3/4] Quarantining high-risk files...")
    quarantined_count = 0
    for rel, findings in file_findings.items():
        fpath = workspace / rel
        if not fpath.exists():
            continue

        fname = fpath.name
        crit = [f for f in findings if f["severity"] == "CRITICAL"]
        should_quarantine = False
        reason = ""

        # High-risk files with any content (e.g., .env files)
        if fname in HIGH_RISK_FILES and crit:
            should_quarantine = True
            reason = f"High-risk file with {len(crit)} secret(s)"

        # Key material files
        if fpath.suffix in HIGH_RISK_EXTENSIONS:
            should_quarantine = True
            reason = f"Key material file ({fpath.suffix})"

        # High-density secret files
        if len(crit) >= HIGH_DENSITY_THRESHOLD:
            should_quarantine = True
            reason = f"High-density: {len(crit)} secrets (threshold: {HIGH_DENSITY_THRESHOLD})"

        if should_quarantine:
            # Quarantine the file
            qdir = quarantine_base(workspace)
            qdir.mkdir(parents=True, exist_ok=True)
            dest = qdir / rel
            dest.parent.mkdir(parents=True, exist_ok=True)

            # Metadata
            metadata = {
                "original_path": rel,
                "quarantined_at": now_iso(),
                "reason": reason,
                "auto_quarantined": True,
                "findings_count": len(findings),
                "findings": [
                    {
                        "type": f["type"],
                        "severity": f["severity"],
                        "line": f["line"],
                        "detail": f["detail"],
                    }
                    for f in findings
                ],
            }

            try:
                shutil.move(str(fpath), str(dest))
                meta_path = dest.with_suffix(dest.suffix + ".meta.json")
                meta_path.write_text(
                    json.dumps(metadata, indent=2), encoding="utf-8"
                )
                quarantined_count += 1
                actions.append(f"Quarantined {rel} ({reason})")
                print(f"  [QUARANTINE] {rel} -- {reason}")
            except (OSError, PermissionError) as e:
                print(f"  [FAILED] Could not quarantine {rel}: {e}")

    if quarantined_count == 0:
        print("  No files needed quarantine.")
    print()

    # --- Phase 4: Defend ---
    print("[4/4] Updating defenses...")
    _defend_quiet(workspace, actions)

    # --- Summary ---
    _print_protect_summary(actions)

    # Return appropriate exit code
    if critical_count > 0:
        return 2
    elif warning_count > 0:
        return 1
    return 0


def _defend_quiet(workspace, actions):
    """Run defend logic without full banner output."""
    # Update .gitignore
    gitignore = workspace / ".gitignore"
    if gitignore.exists():
        try:
            content = gitignore.read_text(encoding="utf-8", errors="ignore")
        except (OSError, PermissionError):
            content = ""
    else:
        content = ""

    new_patterns = []
    for pattern in GITIGNORE_SECRET_PATTERNS:
        if pattern not in content:
            new_patterns.append(pattern)

    if new_patterns:
        if content and not content.endswith("\n"):
            content += "\n"
        if content and not content.endswith("\n\n"):
            content += "\n"
        content += "\n".join(new_patterns) + "\n"
        gitignore.write_text(content, encoding="utf-8")
        real_patterns = [p for p in new_patterns if not p.startswith("#")]
        actions.append(f"Updated .gitignore with {len(real_patterns)} pattern(s)")
        print(f"  [DEFEND] .gitignore updated with {len(real_patterns)} pattern(s)")
    else:
        print(f"  [OK] .gitignore already complete.")

    # Update policy
    policy_path = workspace / ".sentry-policy.json"
    policy = {
        "version": 1,
        "updated": now_iso(),
        "description": "Secret scanning policy enforced by openclaw-sentry-pro",
        "enforce_gitignore": True,
        "auto_redact": True,
        "auto_quarantine_threshold": HIGH_DENSITY_THRESHOLD,
        "monitored_patterns": [
            {"name": name, "enabled": True}
            for name, _ in SECRET_PATTERNS
        ],
        "high_risk_files": sorted(HIGH_RISK_FILES),
        "high_risk_extensions": sorted(HIGH_RISK_EXTENSIONS),
    }

    if policy_path.exists():
        try:
            old = json.loads(policy_path.read_text(encoding="utf-8"))
            old_patterns = {
                p["name"]: p.get("enabled", True)
                for p in old.get("monitored_patterns", [])
            }
            for p in policy["monitored_patterns"]:
                if p["name"] in old_patterns:
                    p["enabled"] = old_patterns[p["name"]]
        except (json.JSONDecodeError, OSError):
            pass

    policy_path.write_text(
        json.dumps(policy, indent=2), encoding="utf-8"
    )
    actions.append("Updated .sentry-policy.json")
    print(f"  [DEFEND] Policy updated")


def _print_protect_summary(actions):
    """Print protection sweep summary."""
    print()
    print("-" * 40)
    print("PROTECTION SUMMARY")
    print("-" * 40)
    if actions:
        for a in actions:
            print(f"  - {a}")
    else:
        print("  No actions taken. Workspace is clean.")
    print()
    print("NEXT STEPS:")
    print("  - Rotate any credentials that were exposed")
    print("  - Review quarantined files before restoring")
    print("  - Run 'status' for a quick health check")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Sentry Pro -- Secret scanning suite with countermeasures"
    )
    parser.add_argument(
        "command",
        choices=["scan", "check", "status", "redact", "quarantine",
                 "unquarantine", "defend", "protect"],
        help="Command to run",
    )
    parser.add_argument(
        "file", nargs="?",
        help="File path (for check, redact, quarantine, unquarantine)",
    )
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

    elif args.command == "redact":
        sys.exit(cmd_redact(workspace, args.file))

    elif args.command == "quarantine":
        if not args.file:
            print("Usage: sentry.py quarantine <file>")
            sys.exit(1)
        sys.exit(cmd_quarantine(workspace, args.file))

    elif args.command == "unquarantine":
        if not args.file:
            print("Usage: sentry.py unquarantine <file>")
            sys.exit(1)
        sys.exit(cmd_unquarantine(workspace, args.file))

    elif args.command == "defend":
        sys.exit(cmd_defend(workspace))

    elif args.command == "protect":
        sys.exit(cmd_protect(workspace))


if __name__ == "__main__":
    main()
