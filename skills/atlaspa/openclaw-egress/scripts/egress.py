#!/usr/bin/env python3
"""OpenClaw Egress — Network data loss prevention for agent workspaces.

Scans skill scripts and workspace files for outbound network calls,
data exfiltration URLs, and suspicious endpoints. Maps every external
connection a skill could make.

Free version: Alert (detect + report).
Pro version: Subvert, Quarantine, Defend.
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# URL and network patterns
# ---------------------------------------------------------------------------

URL_PATTERN = re.compile(
    r'https?://[^\s"\'<>\]\)}{,`]+', re.IGNORECASE
)

# Suspicious URL indicators
EXFIL_PATTERNS = [
    ("Base64 in URL", re.compile(r"https?://[^\s]*[?&][^=]*=(?:[A-Za-z0-9+/]{40,}={0,2})")),
    ("Hex payload in URL", re.compile(r"https?://[^\s]*[?&][^=]*=(?:[0-9a-f]{32,})", re.IGNORECASE)),
    ("IP address endpoint", re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")),
    ("Webhook/callback URL", re.compile(r"https?://[^\s]*/(?:webhook|callback|hook|notify|ping|beacon)[^\s]*", re.IGNORECASE)),
    ("Pastebin/sharing service", re.compile(r"https?://(?:pastebin\.com|hastebin\.com|paste\.ee|dpaste\.org|ix\.io|sprunge\.us|0x0\.st|transfer\.sh|file\.io)[^\s]*", re.IGNORECASE)),
    ("Request catcher", re.compile(r"https?://(?:[^\s]*\.ngrok\.|requestbin|pipedream|beeceptor|hookbin|requestcatcher)[^\s]*", re.IGNORECASE)),
    ("Dynamic DNS", re.compile(r"https?://[^\s]*\.(?:duckdns\.org|no-ip\.com|dynu\.com|freedns)[^\s]*", re.IGNORECASE)),
    ("URL shortener", re.compile(r"https?://(?:bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|v\.gd|rb\.gy|shorturl)[^\s]*", re.IGNORECASE)),
]

# Network function patterns in code
NETWORK_CODE_PATTERNS = [
    ("urllib.request", re.compile(r"\burllib\.request\.urlopen\b")),
    ("urllib.request.Request", re.compile(r"\burllib\.request\.Request\b")),
    ("requests.get/post", re.compile(r"\brequests\.(?:get|post|put|patch|delete|head)\b")),
    ("httpx call", re.compile(r"\bhttpx\.(?:get|post|put|patch|delete|head|Client|AsyncClient)\b")),
    ("aiohttp session", re.compile(r"\baiohttp\.ClientSession\b")),
    ("socket connection", re.compile(r"\bsocket\.(?:socket|create_connection|connect)\b")),
    ("http.client", re.compile(r"\bhttp\.client\.HTTP(?:S)?Connection\b")),
    ("fetch/XMLHttpRequest", re.compile(r"\bfetch\s*\(|XMLHttpRequest\b")),
    ("curl command", re.compile(r"\bcurl\s+-")),
    ("wget command", re.compile(r"\bwget\s+")),
]

# Known safe domains (won't flag these)
SAFE_DOMAINS = {
    "github.com", "raw.githubusercontent.com",
    "docs.anthropic.com", "api.anthropic.com",
    "openclaw.com", "clawhub.ai", "clawhub.com",
    "python.org", "pypi.org",
    "nodejs.org", "npmjs.com",
    "stackoverflow.com", "developer.mozilla.org",
    "wikipedia.org", "example.com",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots",
}

SELF_SKILL_DIRS = {"openclaw-egress", "openclaw-egress-pro"}


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


def is_safe_url(url):
    try:
        parsed = urlparse(url)
        domain = parsed.hostname or ""
        return any(domain == safe or domain.endswith("." + safe) for safe in SAFE_DOMAINS)
    except Exception:
        return False


def classify_url(url):
    """Classify a URL by risk level."""
    for name, pattern in EXFIL_PATTERNS:
        if pattern.search(url):
            return "CRITICAL", name

    try:
        parsed = urlparse(url)
        domain = parsed.hostname or ""

        if is_safe_url(url):
            return "SAFE", "Known safe domain"

        # Check for suspicious TLDs
        suspicious_tlds = {".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".buzz"}
        for tld in suspicious_tlds:
            if domain.endswith(tld):
                return "WARNING", f"Suspicious TLD ({tld})"

        return "INFO", "External endpoint"
    except Exception:
        return "WARNING", "Unparseable URL"


# ---------------------------------------------------------------------------
# Scanning
# ---------------------------------------------------------------------------

def scan_file_urls(filepath, workspace):
    """Extract and classify all URLs in a file."""
    findings = []
    rel = str(filepath.relative_to(workspace))

    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings

    lines = content.split("\n")
    is_md = filepath.suffix in (".md", ".markdown")

    for line_idx, line in enumerate(lines, 1):
        # In markdown, skip URLs inside code blocks
        if is_md and in_code_block(lines, line_idx - 1):
            continue

        for match in URL_PATTERN.finditer(line):
            url = match.group(0).rstrip(".,;:)")
            risk, reason = classify_url(url)

            if risk == "SAFE":
                continue

            findings.append({
                "file": rel,
                "line": line_idx,
                "url": url[:100],
                "risk": risk,
                "reason": reason,
            })

    return findings


def scan_file_network_code(filepath, workspace):
    """Detect network function calls in code files."""
    findings = []
    rel = str(filepath.relative_to(workspace))

    if filepath.suffix not in (".py", ".js", ".ts", ".sh", ".bash"):
        return findings

    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings

    lines = content.split("\n")
    for line_idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("//"):
            continue

        for name, pattern in NETWORK_CODE_PATTERNS:
            if pattern.search(line):
                findings.append({
                    "file": rel,
                    "line": line_idx,
                    "url": "",
                    "risk": "HIGH",
                    "reason": f"Network call: {name}",
                })

    return findings


def collect_files(workspace, skills_only=False):
    """Collect files to scan."""
    files = []
    search_dir = workspace / "skills" if skills_only else workspace

    for root, dirs, filenames in os.walk(search_dir):
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
# Commands
# ---------------------------------------------------------------------------

def cmd_scan(workspace, skills_only=False):
    """Full egress scan."""
    print("=" * 60)
    print("OPENCLAW EGRESS — NETWORK DLP SCAN")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    scope = "skills only" if skills_only else "full workspace"
    print(f"Scope: {scope}")
    print()

    files = collect_files(workspace, skills_only)
    print(f"Scanning {len(files)} files...")
    print()

    all_findings = []
    for fpath in files:
        all_findings.extend(scan_file_urls(fpath, workspace))
        all_findings.extend(scan_file_network_code(fpath, workspace))

    # Deduplicate by file+line+reason
    seen = set()
    deduped = []
    for f in all_findings:
        key = (f["file"], f["line"], f["reason"])
        if key not in seen:
            seen.add(key)
            deduped.append(f)
    all_findings = deduped

    critical = [f for f in all_findings if f["risk"] == "CRITICAL"]
    high = [f for f in all_findings if f["risk"] == "HIGH"]
    warnings = [f for f in all_findings if f["risk"] == "WARNING"]
    infos = [f for f in all_findings if f["risk"] == "INFO"]

    print("-" * 40)
    print("RESULTS")
    print("-" * 40)

    if not all_findings:
        print("[CLEAN] No outbound network risks detected.")
        return 0

    for finding in sorted(all_findings, key=lambda f: {"CRITICAL": 0, "HIGH": 1, "WARNING": 2, "INFO": 3}.get(f["risk"], 4)):
        risk = finding["risk"]
        loc = f"{finding['file']}:{finding['line']}"
        print(f"  [{risk}] {loc}")
        print(f"          {finding['reason']}")
        if finding["url"]:
            print(f"          URL: {finding['url']}")
        print()

    print("-" * 40)
    print("SUMMARY")
    print("-" * 40)
    print(f"  Critical: {len(critical)}")
    print(f"  High:     {len(high)}")
    print(f"  Warnings: {len(warnings)}")
    print(f"  Info:     {len(infos)}")
    print(f"  Total:    {len(all_findings)}")
    print()

    # Unique domains
    domains = set()
    for f in all_findings:
        if f["url"]:
            try:
                parsed = urlparse(f["url"])
                if parsed.hostname:
                    domains.add(parsed.hostname)
            except Exception:
                pass
    if domains:
        print("  External domains found:")
        for d in sorted(domains):
            print(f"    - {d}")
        print()

    if critical:
        print("ACTION REQUIRED: Data exfiltration risk detected.")
        print()
        print("Upgrade to openclaw-egress-pro for automated countermeasures:")
        print("  block, quarantine, allowlist")
        return 2
    elif high:
        print("REVIEW NEEDED: Network calls detected in skills.")
        print()
        print("Upgrade to openclaw-egress-pro for automated countermeasures:")
        print("  block, quarantine, allowlist")
        return 1
    return 0


def cmd_domains(workspace):
    """List all external domains found in workspace."""
    files = collect_files(workspace)
    domains = {}

    for fpath in files:
        for finding in scan_file_urls(fpath, workspace):
            if finding["url"]:
                try:
                    parsed = urlparse(finding["url"])
                    host = parsed.hostname
                    if host and not is_safe_url(finding["url"]):
                        if host not in domains:
                            domains[host] = {"count": 0, "files": set(), "risk": "INFO"}
                        domains[host]["count"] += 1
                        domains[host]["files"].add(finding["file"])
                        if finding["risk"] in ("CRITICAL", "HIGH"):
                            domains[host]["risk"] = finding["risk"]
                except Exception:
                    pass

    if not domains:
        print("[CLEAN] No external domains found.")
        return 0

    print("=" * 60)
    print("EXTERNAL DOMAINS")
    print("=" * 60)
    print()

    for domain in sorted(domains.keys()):
        info = domains[domain]
        risk = info["risk"]
        print(f"  [{risk}] {domain} ({info['count']} reference(s))")
        for f in sorted(info["files"]):
            print(f"    - {f}")
    print()
    return 0


def cmd_status(workspace):
    """Quick summary."""
    files = collect_files(workspace, skills_only=True)
    critical = 0
    high = 0
    for fpath in files:
        for f in scan_file_urls(fpath, workspace):
            if f["risk"] == "CRITICAL":
                critical += 1
            elif f["risk"] == "HIGH":
                high += 1
        for f in scan_file_network_code(fpath, workspace):
            if f["risk"] == "HIGH":
                high += 1

    if critical > 0:
        print(f"[CRITICAL] {critical} exfiltration risk(s) detected")
        return 2
    elif high > 0:
        print(f"[WARNING] {high} network call(s) detected in skills")
        return 1
    else:
        print("[CLEAN] No outbound network risks")
        return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Egress — Network DLP")
    parser.add_argument("command", choices=["scan", "domains", "status"],
                        help="Command to run")
    parser.add_argument("--skills-only", action="store_true",
                        help="Only scan skills directory")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}")
        sys.exit(1)

    if args.command == "scan":
        sys.exit(cmd_scan(workspace, args.skills_only))
    elif args.command == "domains":
        sys.exit(cmd_domains(workspace))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))


if __name__ == "__main__":
    main()
