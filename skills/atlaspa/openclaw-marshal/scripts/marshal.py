#!/usr/bin/env python3
"""OpenClaw Marshal — Compliance and policy enforcement for agent workspaces.

Define security policies, audit workspace compliance, check skills against
policy rules, and generate audit-ready compliance reports.

Free version: Alert (audit + report).
Pro version: Active enforcement, blocking, auto-remediation.

Usage:
    marshal.py audit    [--workspace PATH]
    marshal.py policy   [--init] [--show] [--workspace PATH]
    marshal.py check    <skill> [--workspace PATH]
    marshal.py report   [--workspace PATH]
    marshal.py status   [--workspace PATH]
"""

import argparse
import io
import json
import os
import re
import sys
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

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

POLICY_FILE = ".marshal-policy.json"
POLICY_VERSION = 1

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots",
}

SELF_SKILL_DIRS = {"openclaw-marshal", "openclaw-marshal-pro"}

SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"
SEVERITY_INFO = "INFO"

# Dangerous command patterns to scan for in skill scripts
DANGEROUS_COMMAND_PATTERNS = [
    (re.compile(r"curl\s.*\|\s*(?:ba)?sh"), "pipe-to-shell execution"),
    (re.compile(r"wget\s.*-O\s*-\s*\|\s*sh"), "pipe-to-shell execution"),
    (re.compile(r"rm\s+-rf\s+/(?:\s|$)"), "recursive root deletion"),
    (re.compile(r"chmod\s+777\b"), "world-writable permissions"),
    (re.compile(r"\beval\b\s*\("), "eval() call"),
    (re.compile(r"\bexec\b\s*\("), "exec() call"),
    (re.compile(r"\bpickle\.load"), "unsafe deserialization"),
    (re.compile(r"\b__import__\b"), "dynamic import"),
    (re.compile(r"\bos\.system\b"), "os.system call"),
    (re.compile(r"\bsubprocess\.call\b.*shell\s*=\s*True"), "shell=True subprocess"),
    (re.compile(r"\bcompile\b\s*\("), "compile() call"),
]

# Network domain extraction patterns
URL_PATTERN = re.compile(r"https?://([a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,})")
DOMAIN_REF_PATTERN = re.compile(
    r"""(?:['"])([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+\.[a-zA-Z]{2,})(?:['"])"""
)

# Debug/verbose patterns that should be off in production
DEBUG_PATTERNS = [
    (re.compile(r"""(?:DEBUG|debug)\s*[=:]\s*(?:True|true|1|['"]true['"])"""), "debug mode enabled"),
    (re.compile(r"""(?:VERBOSE|verbose)\s*[=:]\s*(?:True|true|1|['"]true['"])"""), "verbose mode enabled"),
    (re.compile(r"\blogging\.DEBUG\b"), "debug-level logging configured"),
    (re.compile(r"\bprint\s*\(\s*f?['\"](?:DEBUG|TRACE)"), "debug print statement"),
]

# ---------------------------------------------------------------------------
# Default policy template
# ---------------------------------------------------------------------------

DEFAULT_POLICY = {
    "version": POLICY_VERSION,
    "name": "default",
    "rules": {
        "commands": {
            "allow": ["git", "python3", "node", "npm", "pip"],
            "block": ["curl|bash", "wget -O-|sh", "rm -rf /", "chmod 777"],
            "review": ["sudo", "docker", "ssh"],
        },
        "network": {
            "allow_domains": ["github.com", "pypi.org", "npmjs.com"],
            "block_domains": ["pastebin.com", "transfer.sh", "ngrok.io"],
            "block_patterns": ["*.tk", "*.ml", "*.ga"],
        },
        "data_handling": {
            "pii_scan": True,
            "secret_scan": True,
            "log_retention_days": 90,
        },
        "workspace": {
            "require_gitignore": True,
            "require_audit_trail": True,
            "require_skill_signing": True,
            "max_skill_risk_score": 50,
        },
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_workspace(ws_arg):
    """Determine workspace path from args, env, or defaults."""
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


def policy_path(workspace: Path) -> Path:
    return workspace / POLICY_FILE


def load_policy(workspace: Path) -> dict | None:
    """Load the workspace policy file, returning None if absent."""
    pp = policy_path(workspace)
    if not pp.exists():
        return None
    try:
        with open(pp, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"WARNING: Failed to load policy: {e}", file=sys.stderr)
        return None


def save_policy(workspace: Path, policy: dict):
    pp = policy_path(workspace)
    with open(pp, "w", encoding="utf-8") as f:
        json.dump(policy, f, indent=2)


def find_skills(workspace: Path) -> list[Path]:
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
        if entry.name in SKIP_DIRS:
            continue
        if entry.name.startswith("."):
            continue
        skill_md = entry / "SKILL.md"
        if skill_md.exists():
            skills.append(entry)
    return skills


def parse_skill_metadata(skill_md_path: Path) -> dict:
    """Parse SKILL.md YAML frontmatter for metadata."""
    info = {"name": "", "description": "", "requires_bins": [], "os": []}
    try:
        content = skill_md_path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return info
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
                meta = json.loads(meta_str)
                oc = meta.get("openclaw", {})
                req = oc.get("requires", {})
                info["requires_bins"] = req.get("bins", [])
                info["os"] = oc.get("os", [])
            except (json.JSONDecodeError, AttributeError):
                pass
    return info


def read_file_text(path: Path) -> str | None:
    """Read file as text, returning None if binary."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except (UnicodeDecodeError, ValueError, OSError):
        return None


def collect_skill_scripts(skill_dir: Path) -> list[Path]:
    """Collect all script files within a skill directory."""
    scripts = []
    for root, dirs, filenames in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            fpath = Path(root) / fname
            if fpath.suffix in (".py", ".sh", ".bash", ".zsh", ".js", ".ts"):
                scripts.append(fpath)
    return scripts


def domain_matches_pattern(domain: str, pattern: str) -> bool:
    """Check if a domain matches a glob-style pattern (e.g., *.tk)."""
    if pattern.startswith("*."):
        suffix = pattern[1:]  # e.g., .tk
        return domain.endswith(suffix)
    return domain == pattern


# ---------------------------------------------------------------------------
# Compliance checks
# ---------------------------------------------------------------------------

def check_command_safety(skill_dir: Path, policy: dict) -> list[dict]:
    """Scan skill scripts for dangerous command patterns."""
    findings = []
    rules = policy.get("rules", {}).get("commands", {})
    block_patterns = rules.get("block", [])
    review_patterns = rules.get("review", [])

    scripts = collect_skill_scripts(skill_dir)
    for script in scripts:
        text = read_file_text(script)
        if text is None:
            continue
        lines = text.split("\n")
        rel = str(script.relative_to(skill_dir.parent.parent))

        # Check built-in dangerous patterns
        for pattern, desc in DANGEROUS_COMMAND_PATTERNS:
            for line_idx, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if pattern.search(line):
                    findings.append({
                        "rule": "commands.block",
                        "severity": SEVERITY_CRITICAL,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Dangerous pattern: {desc}",
                        "snippet": stripped[:80],
                    })

        # Check policy block patterns
        for bp in block_patterns:
            bp_re = re.compile(re.escape(bp))
            for line_idx, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if bp_re.search(line):
                    findings.append({
                        "rule": "commands.block",
                        "severity": SEVERITY_HIGH,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Blocked command pattern: {bp}",
                        "snippet": stripped[:80],
                    })

        # Check review-required patterns
        for rp in review_patterns:
            rp_re = re.compile(r"\b" + re.escape(rp) + r"\b")
            for line_idx, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if rp_re.search(line):
                    findings.append({
                        "rule": "commands.review",
                        "severity": SEVERITY_MEDIUM,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Requires review: {rp}",
                        "snippet": stripped[:80],
                    })

    return findings


def check_network_policy(skill_dir: Path, policy: dict) -> list[dict]:
    """Check skill code against network domain allow/blocklists."""
    findings = []
    rules = policy.get("rules", {}).get("network", {})
    allow_domains = set(rules.get("allow_domains", []))
    block_domains = set(rules.get("block_domains", []))
    block_patterns = rules.get("block_patterns", [])

    scripts = collect_skill_scripts(skill_dir)
    for script in scripts:
        text = read_file_text(script)
        if text is None:
            continue
        lines = text.split("\n")
        rel = str(script.relative_to(skill_dir.parent.parent))

        for line_idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue

            # Extract domains from URLs
            domains = set()
            for m in URL_PATTERN.finditer(line):
                domains.add(m.group(1).lower())
            for m in DOMAIN_REF_PATTERN.finditer(line):
                domains.add(m.group(1).lower())

            for domain in domains:
                # Check block list
                if domain in block_domains:
                    findings.append({
                        "rule": "network.block_domains",
                        "severity": SEVERITY_CRITICAL,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Blocked domain: {domain}",
                        "snippet": stripped[:80],
                    })
                    continue

                # Check block patterns
                blocked = False
                for bp in block_patterns:
                    if domain_matches_pattern(domain, bp):
                        findings.append({
                            "rule": "network.block_patterns",
                            "severity": SEVERITY_HIGH,
                            "file": rel,
                            "line": line_idx,
                            "description": f"Domain matches blocked pattern '{bp}': {domain}",
                            "snippet": stripped[:80],
                        })
                        blocked = True
                        break

                if blocked:
                    continue

                # Check if domain is outside allow list (informational)
                if allow_domains and domain not in allow_domains:
                    findings.append({
                        "rule": "network.allow_domains",
                        "severity": SEVERITY_INFO,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Domain not on allow list: {domain}",
                        "snippet": stripped[:80],
                    })

    return findings


def check_data_handling(workspace: Path, policy: dict) -> list[dict]:
    """Verify PII/secret scanning tools are configured."""
    findings = []
    rules = policy.get("rules", {}).get("data_handling", {})
    skills_dir = workspace / "skills"

    if rules.get("secret_scan", False):
        sentry_installed = (
            (skills_dir / "openclaw-sentry").is_dir()
            or (skills_dir / "openclaw-sentry-pro").is_dir()
        )
        if not sentry_installed:
            findings.append({
                "rule": "data_handling.secret_scan",
                "severity": SEVERITY_HIGH,
                "file": POLICY_FILE,
                "line": 0,
                "description": "Secret scanning required but openclaw-sentry is not installed",
                "snippet": "",
            })

    if rules.get("pii_scan", False):
        # PII scanning requires sentry or a dedicated PII scanner
        sentry_installed = (
            (skills_dir / "openclaw-sentry").is_dir()
            or (skills_dir / "openclaw-sentry-pro").is_dir()
        )
        if not sentry_installed:
            findings.append({
                "rule": "data_handling.pii_scan",
                "severity": SEVERITY_MEDIUM,
                "file": POLICY_FILE,
                "line": 0,
                "description": "PII scanning required but no scanner (openclaw-sentry) is installed",
                "snippet": "",
            })

    return findings


def check_workspace_hygiene(workspace: Path, policy: dict) -> list[dict]:
    """Verify workspace configuration compliance."""
    findings = []
    rules = policy.get("rules", {}).get("workspace", {})

    # Check .gitignore
    if rules.get("require_gitignore", False):
        gitignore = workspace / ".gitignore"
        if not gitignore.exists():
            findings.append({
                "rule": "workspace.require_gitignore",
                "severity": SEVERITY_MEDIUM,
                "file": ".gitignore",
                "line": 0,
                "description": "No .gitignore found — secrets and temp files may be committed",
                "snippet": "",
            })
        else:
            try:
                content = gitignore.read_text(encoding="utf-8", errors="ignore")
                required = [".env", "*.pem", "*.key"]
                missing = [p for p in required if p not in content]
                if missing:
                    findings.append({
                        "rule": "workspace.require_gitignore",
                        "severity": SEVERITY_LOW,
                        "file": ".gitignore",
                        "line": 0,
                        "description": f".gitignore missing recommended patterns: {', '.join(missing)}",
                        "snippet": "",
                    })
            except (OSError, PermissionError):
                pass

    # Check audit trail (ledger)
    if rules.get("require_audit_trail", False):
        skills_dir = workspace / "skills"
        ledger_installed = (
            (skills_dir / "openclaw-ledger").is_dir()
            or (skills_dir / "openclaw-ledger-pro").is_dir()
        )
        ledger_dir = workspace / ".ledger"
        has_ledger_data = ledger_dir.is_dir() and any(ledger_dir.iterdir()) if ledger_dir.is_dir() else False

        if not ledger_installed:
            findings.append({
                "rule": "workspace.require_audit_trail",
                "severity": SEVERITY_HIGH,
                "file": "",
                "line": 0,
                "description": "Audit trail required but openclaw-ledger is not installed",
                "snippet": "",
            })
        elif not has_ledger_data:
            findings.append({
                "rule": "workspace.require_audit_trail",
                "severity": SEVERITY_MEDIUM,
                "file": "",
                "line": 0,
                "description": "Ledger installed but not initialized — run 'ledger init'",
                "snippet": "",
            })

    # Check skill signing (signet)
    if rules.get("require_skill_signing", False):
        skills_dir = workspace / "skills"
        signet_installed = (
            (skills_dir / "openclaw-signet").is_dir()
            or (skills_dir / "openclaw-signet-pro").is_dir()
        )
        signet_manifest = workspace / ".signet" / "trust.json"
        has_signet_data = signet_manifest.is_file()

        if not signet_installed:
            findings.append({
                "rule": "workspace.require_skill_signing",
                "severity": SEVERITY_HIGH,
                "file": "",
                "line": 0,
                "description": "Skill signing required but openclaw-signet is not installed",
                "snippet": "",
            })
        elif not has_signet_data:
            findings.append({
                "rule": "workspace.require_skill_signing",
                "severity": SEVERITY_MEDIUM,
                "file": "",
                "line": 0,
                "description": "Signet installed but no trust manifest — run 'signet sign'",
                "snippet": "",
            })

    return findings


def check_configuration_security(skill_dir: Path) -> list[dict]:
    """Check for debug modes and verbose logging left on."""
    findings = []
    scripts = collect_skill_scripts(skill_dir)

    for script in scripts:
        text = read_file_text(script)
        if text is None:
            continue
        lines = text.split("\n")
        rel = str(script.relative_to(skill_dir.parent.parent))

        for pattern, desc in DEBUG_PATTERNS:
            for line_idx, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue
                if pattern.search(line):
                    findings.append({
                        "rule": "config.security",
                        "severity": SEVERITY_LOW,
                        "file": rel,
                        "line": line_idx,
                        "description": f"Configuration issue: {desc}",
                        "snippet": stripped[:80],
                    })

    return findings


def compute_compliance_score(findings: list[dict]) -> int:
    """Compute a 0-100 compliance score based on findings."""
    if not findings:
        return 100

    # Deductions by severity
    deductions = {
        SEVERITY_CRITICAL: 25,
        SEVERITY_HIGH: 15,
        SEVERITY_MEDIUM: 8,
        SEVERITY_LOW: 3,
        SEVERITY_INFO: 1,
    }
    total_deduction = 0
    for f in findings:
        total_deduction += deductions.get(f["severity"], 1)

    score = max(0, 100 - total_deduction)
    return score


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_policy(workspace: Path, init: bool, show: bool):
    """Manage security policies."""
    if init:
        pp = policy_path(workspace)
        if pp.exists():
            print(f"Policy already exists: {pp}")
            print("Delete it first to reinitialize, or edit it directly.")
            return 1
        save_policy(workspace, DEFAULT_POLICY)
        print(f"Default policy created: {pp}")
        print(f"Policy name: {DEFAULT_POLICY['name']}")
        print(f"Version: {DEFAULT_POLICY['version']}")
        print()
        print("Edit the policy to customize rules for your workspace.")
        print("Run 'marshal audit' to check compliance against this policy.")
        return 0

    if show:
        policy = load_policy(workspace)
        if policy is None:
            print("No policy found. Run 'marshal policy --init' to create one.")
            return 1
        print(json.dumps(policy, indent=2))
        return 0

    # Default: show summary
    policy = load_policy(workspace)
    if policy is None:
        print("No policy loaded.")
        print("Run 'marshal policy --init' to create a default policy.")
        return 1
    print(f"Policy: {policy.get('name', 'unnamed')}")
    print(f"Version: {policy.get('version', '?')}")
    rules = policy.get("rules", {})
    print(f"Command rules: {len(rules.get('commands', {}).get('allow', []))} allowed, "
          f"{len(rules.get('commands', {}).get('block', []))} blocked, "
          f"{len(rules.get('commands', {}).get('review', []))} review-required")
    print(f"Network rules: {len(rules.get('network', {}).get('allow_domains', []))} allowed, "
          f"{len(rules.get('network', {}).get('block_domains', []))} blocked domains")
    print(f"Data handling: PII scan={'on' if rules.get('data_handling', {}).get('pii_scan') else 'off'}, "
          f"Secret scan={'on' if rules.get('data_handling', {}).get('secret_scan') else 'off'}")
    print(f"Workspace: gitignore={'required' if rules.get('workspace', {}).get('require_gitignore') else 'optional'}, "
          f"audit trail={'required' if rules.get('workspace', {}).get('require_audit_trail') else 'optional'}, "
          f"signing={'required' if rules.get('workspace', {}).get('require_skill_signing') else 'optional'}")
    return 0


def cmd_audit(workspace: Path) -> int:
    """Full compliance audit against the active policy."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Run 'marshal policy --init' first.")
        return 1

    print("=" * 60)
    print("OPENCLAW MARSHAL — COMPLIANCE AUDIT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Policy: {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print(f"Timestamp: {now_iso()}")
    print()

    all_findings = []
    skills = find_skills(workspace)

    # Per-skill checks
    print(f"Auditing {len(skills)} installed skill(s)...")
    print()

    for skill_dir in skills:
        meta = parse_skill_metadata(skill_dir / "SKILL.md")
        skill_name = meta["name"] or skill_dir.name

        skill_findings = []
        skill_findings.extend(check_command_safety(skill_dir, policy))
        skill_findings.extend(check_network_policy(skill_dir, policy))
        skill_findings.extend(check_configuration_security(skill_dir))

        if skill_findings:
            print(f"  [{skill_name}] {len(skill_findings)} finding(s)")
        else:
            print(f"  [{skill_name}] COMPLIANT")

        all_findings.extend(skill_findings)

    print()

    # Workspace-level checks
    print("Workspace compliance checks...")
    ws_findings = []
    ws_findings.extend(check_data_handling(workspace, policy))
    ws_findings.extend(check_workspace_hygiene(workspace, policy))
    all_findings.extend(ws_findings)

    if ws_findings:
        for f in ws_findings:
            print(f"  [{f['severity']:8s}] {f['rule']}: {f['description']}")
    else:
        print("  All workspace requirements met.")

    print()

    # Score
    score = compute_compliance_score(all_findings)
    print("=" * 60)
    print(f"COMPLIANCE SCORE: {score}%")
    print("=" * 60)

    critical_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)
    high_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_HIGH)
    medium_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_MEDIUM)
    low_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_LOW)
    info_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_INFO)

    if all_findings:
        print(f"  CRITICAL: {critical_count}")
        print(f"  HIGH:     {high_count}")
        print(f"  MEDIUM:   {medium_count}")
        print(f"  LOW:      {low_count}")
        print(f"  INFO:     {info_count}")
    else:
        print("  No violations detected. Full compliance achieved.")

    print()

    # Recommendations
    if all_findings:
        print("RECOMMENDATIONS:")
        if critical_count:
            print("  - CRITICAL: Immediately address blocked command/network violations")
        if high_count:
            print("  - HIGH: Install missing security tools (sentry, ledger, signet)")
        if medium_count:
            print("  - MEDIUM: Review flagged commands and workspace configuration")
        if low_count:
            print("  - LOW: Disable debug modes and add .gitignore patterns")
        if info_count:
            print("  - INFO: Review unlisted domains for policy inclusion")
        print()
        print("Upgrade to openclaw-marshal-pro for active enforcement:")
        print("  hook-based blocking, auto-remediation, heartbeat integration")

    print("=" * 60)

    if critical_count > 0:
        return 2
    elif high_count > 0 or medium_count > 0:
        return 1
    return 0


def cmd_check(workspace: Path, skill_name: str) -> int:
    """Check a specific skill against the policy."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Run 'marshal policy --init' first.")
        return 1

    skills_dir = workspace / "skills"
    skill_dir = skills_dir / skill_name
    if not skill_dir.is_dir():
        print(f"Skill not found: {skill_name}")
        return 1

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        print(f"No SKILL.md in {skill_name} — not a valid skill")
        return 1

    meta = parse_skill_metadata(skill_md)
    display_name = meta["name"] or skill_name

    print("=" * 60)
    print(f"POLICY CHECK: {display_name}")
    print("=" * 60)
    print(f"Policy: {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print()

    all_findings = []
    all_findings.extend(check_command_safety(skill_dir, policy))
    all_findings.extend(check_network_policy(skill_dir, policy))
    all_findings.extend(check_configuration_security(skill_dir))

    if not all_findings:
        print("RESULT: PASS")
        print()
        print("All policy rules satisfied. No violations detected.")
        print("=" * 60)
        return 0

    # Group by rule
    by_rule: dict[str, list[dict]] = {}
    for f in all_findings:
        by_rule.setdefault(f["rule"], []).append(f)

    for rule, findings in sorted(by_rule.items()):
        severity = max(findings, key=lambda x: {
            SEVERITY_CRITICAL: 4, SEVERITY_HIGH: 3, SEVERITY_MEDIUM: 2,
            SEVERITY_LOW: 1, SEVERITY_INFO: 0,
        }.get(x["severity"], 0))["severity"]

        print(f"  FAIL  [{severity:8s}] {rule}")
        for f in findings[:5]:
            loc = f"{f['file']}:{f['line']}" if f["line"] else f["file"]
            print(f"        {loc} — {f['description']}")
        if len(findings) > 5:
            print(f"        ... and {len(findings) - 5} more")
        print()

    score = compute_compliance_score(all_findings)
    print(f"RESULT: FAIL (score: {score}%)")
    print("=" * 60)

    critical_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)
    return 2 if critical_count > 0 else 1


def cmd_report(workspace: Path) -> int:
    """Generate a formatted compliance report."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Run 'marshal policy --init' first.")
        return 1

    all_findings = []
    skills = find_skills(workspace)

    # Collect all findings
    skill_results = {}
    for skill_dir in skills:
        meta = parse_skill_metadata(skill_dir / "SKILL.md")
        name = meta["name"] or skill_dir.name
        sf = []
        sf.extend(check_command_safety(skill_dir, policy))
        sf.extend(check_network_policy(skill_dir, policy))
        sf.extend(check_configuration_security(skill_dir))
        skill_results[name] = sf
        all_findings.extend(sf)

    ws_findings = []
    ws_findings.extend(check_data_handling(workspace, policy))
    ws_findings.extend(check_workspace_hygiene(workspace, policy))
    all_findings.extend(ws_findings)

    score = compute_compliance_score(all_findings)

    # --- Formatted report ---
    print("=" * 70)
    print("COMPLIANCE REPORT")
    print("OpenClaw Marshal — Workspace Policy Audit")
    print("=" * 70)
    print()
    print(f"  Workspace:  {workspace}")
    print(f"  Policy:     {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print(f"  Generated:  {now_iso()}")
    print(f"  Skills:     {len(skills)} installed")
    print()

    # Summary
    print("-" * 70)
    print("SUMMARY")
    print("-" * 70)
    critical_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)
    high_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_HIGH)
    medium_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_MEDIUM)
    low_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_LOW)
    info_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_INFO)

    print()
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    elif score >= 40:
        grade = "D"
    else:
        grade = "F"

    print(f"  Compliance Score:  {score}% (Grade: {grade})")
    print(f"  Total Findings:    {len(all_findings)}")
    print(f"    Critical:        {critical_count}")
    print(f"    High:            {high_count}")
    print(f"    Medium:          {medium_count}")
    print(f"    Low:             {low_count}")
    print(f"    Informational:   {info_count}")
    print()

    # Violations table
    if all_findings:
        print("-" * 70)
        print("VIOLATIONS")
        print("-" * 70)
        print()
        print(f"  {'Severity':<10} {'Rule':<30} {'File':<20} Description")
        print(f"  {'--------':<10} {'----':<30} {'----':<20} -----------")

        severity_order = {
            SEVERITY_CRITICAL: 0, SEVERITY_HIGH: 1,
            SEVERITY_MEDIUM: 2, SEVERITY_LOW: 3, SEVERITY_INFO: 4,
        }
        for f in sorted(all_findings, key=lambda x: severity_order.get(x["severity"], 5)):
            sev = f["severity"]
            rule = f["rule"][:28]
            fpath = f["file"][:18] if f["file"] else "-"
            desc = f["description"][:50]
            print(f"  {sev:<10} {rule:<30} {fpath:<20} {desc}")

        print()

    # Per-skill breakdown
    print("-" * 70)
    print("SKILL COMPLIANCE")
    print("-" * 70)
    print()
    for name, findings in sorted(skill_results.items()):
        skill_score = compute_compliance_score(findings)
        status = "PASS" if not findings else "FAIL"
        print(f"  {name:<30} {status:<6} {skill_score:>3}% ({len(findings)} finding(s))")
    print()

    # Workspace checks
    print("-" * 70)
    print("WORKSPACE CHECKS")
    print("-" * 70)
    print()
    ws_checks = {
        "gitignore": "present",
        "audit_trail": "configured",
        "skill_signing": "configured",
        "secret_scan": "configured",
        "pii_scan": "configured",
    }
    for f in ws_findings:
        rule_key = f["rule"].split(".")[-1] if "." in f["rule"] else f["rule"]
        ws_checks[rule_key] = f"MISSING ({f['severity']})"

    for check, status in ws_checks.items():
        icon = "PASS" if "MISSING" not in status else "FAIL"
        print(f"  {icon:<6} {check:<25} {status}")
    print()

    # Recommendations
    print("-" * 70)
    print("RECOMMENDATIONS")
    print("-" * 70)
    print()
    rec_num = 1
    if critical_count:
        print(f"  {rec_num}. [CRITICAL] Remove or remediate blocked command/network patterns immediately.")
        rec_num += 1
    if high_count:
        print(f"  {rec_num}. [HIGH] Install required security tools: check sentry, ledger, and signet.")
        rec_num += 1
    if medium_count:
        print(f"  {rec_num}. [MEDIUM] Review flagged commands requiring approval. Update policy if intended.")
        rec_num += 1
    if low_count:
        print(f"  {rec_num}. [LOW] Disable debug/verbose modes. Update .gitignore patterns.")
        rec_num += 1
    if info_count:
        print(f"  {rec_num}. [INFO] Review unlisted network domains. Add to allow list if legitimate.")
        rec_num += 1
    if not all_findings:
        print("  No recommendations. All policy rules are satisfied.")
    print()

    print("=" * 70)
    print("END OF REPORT")
    print("=" * 70)

    if critical_count > 0:
        return 2
    elif high_count > 0 or medium_count > 0:
        return 1
    return 0


def cmd_status(workspace: Path) -> int:
    """Quick compliance summary."""
    policy = load_policy(workspace)
    if policy is None:
        print("STATUS: NO POLICY — Run 'marshal policy --init' to create one")
        return 1

    all_findings = []
    skills = find_skills(workspace)

    for skill_dir in skills:
        all_findings.extend(check_command_safety(skill_dir, policy))
        all_findings.extend(check_network_policy(skill_dir, policy))
        all_findings.extend(check_configuration_security(skill_dir))

    all_findings.extend(check_data_handling(workspace, policy))
    all_findings.extend(check_workspace_hygiene(workspace, policy))

    score = compute_compliance_score(all_findings)
    critical_count = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)

    policy_name = policy.get("name", "unnamed")

    if not all_findings:
        print(f"STATUS: COMPLIANT — score {score}%, policy '{policy_name}', "
              f"{len(skills)} skill(s) checked")
        return 0
    elif critical_count > 0:
        print(f"STATUS: NON-COMPLIANT — score {score}%, {critical_count} critical, "
              f"{len(all_findings)} total finding(s)")
        return 2
    else:
        print(f"STATUS: REVIEW NEEDED — score {score}%, {len(all_findings)} finding(s), "
              f"policy '{policy_name}'")
        return 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Marshal — Compliance and policy enforcement"
    )
    parser.add_argument(
        "command",
        choices=["audit", "policy", "check", "report", "status"],
        help="Command to run",
    )
    parser.add_argument("skill", nargs="?", help="Skill name (for 'check' command)")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    parser.add_argument("--init", action="store_true", help="Initialize default policy")
    parser.add_argument("--show", action="store_true", help="Show current policy")
    args = parser.parse_args()

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}", file=sys.stderr)
        sys.exit(1)

    if args.command == "policy":
        sys.exit(cmd_policy(workspace, args.init, args.show))

    elif args.command == "audit":
        sys.exit(cmd_audit(workspace))

    elif args.command == "check":
        if not args.skill:
            print("Usage: marshal.py check <skill> [--workspace PATH]")
            sys.exit(1)
        sys.exit(cmd_check(workspace, args.skill))

    elif args.command == "report":
        sys.exit(cmd_report(workspace))

    elif args.command == "status":
        sys.exit(cmd_status(workspace))

    elif args.command in ("enforce", "block", "remediate", "heartbeat", "template"):
        print(f"'{args.command}' is a Pro feature.")
        print("Upgrade to openclaw-marshal-pro for active enforcement:")
        print("  enforce, block, remediate, heartbeat, template")
        sys.exit(1)

    else:
        print(f"Unknown command: {args.command}")
        print("Commands: audit, policy, check, report, status")
        sys.exit(1)


if __name__ == "__main__":
    main()
