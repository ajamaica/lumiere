#!/usr/bin/env python3
"""OpenClaw Marshal Pro — Full compliance and policy enforcement suite.

Everything in openclaw-marshal (free) PLUS active enforcement: auto-quarantine
non-compliant skills, generate runtime hooks, apply compliance templates, and
run full automated protection sweeps.

Free = alert.  Pro = subvert + quarantine + defend.

Usage:
    marshal.py audit       [--workspace PATH]
    marshal.py policy      [--init] [--show] [--workspace PATH]
    marshal.py check       <skill> [--workspace PATH]
    marshal.py report      [--workspace PATH]
    marshal.py status      [--workspace PATH]
    marshal.py enforce     [--workspace PATH]
    marshal.py quarantine  <skill> [--workspace PATH]
    marshal.py unquarantine <skill> [--workspace PATH]
    marshal.py hooks       [--workspace PATH]
    marshal.py templates   [--list] [--apply <name>] [--workspace PATH]
    marshal.py protect     [--workspace PATH]
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
QUARANTINE_PREFIX = ".quarantined-"

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

SEVERITY_RANK = {
    SEVERITY_CRITICAL: 4,
    SEVERITY_HIGH: 3,
    SEVERITY_MEDIUM: 2,
    SEVERITY_LOW: 1,
    SEVERITY_INFO: 0,
}

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

# PII patterns for hook generation
PII_PATTERNS = [
    r"\b\d{3}-\d{2}-\d{4}\b",                          # SSN
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # email
    r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b",       # credit card
    r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",  # phone
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
# Compliance templates (Pro)
# ---------------------------------------------------------------------------

COMPLIANCE_TEMPLATES = {
    "general": {
        "version": POLICY_VERSION,
        "name": "general",
        "description": "Balanced compliance policy suitable for most workspaces.",
        "rules": {
            "commands": {
                "allow": ["git", "python3", "node", "npm", "pip", "cargo", "go"],
                "block": ["curl|bash", "wget -O-|sh", "rm -rf /", "chmod 777"],
                "review": ["sudo", "docker", "ssh"],
            },
            "network": {
                "allow_domains": ["github.com", "pypi.org", "npmjs.com", "crates.io", "pkg.go.dev"],
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
                "require_skill_signing": False,
                "max_skill_risk_score": 50,
            },
        },
    },
    "enterprise": {
        "version": POLICY_VERSION,
        "name": "enterprise",
        "description": "Strict enterprise compliance. Requires all security tools installed.",
        "rules": {
            "commands": {
                "allow": ["git", "python3", "node"],
                "block": [
                    "curl|bash", "wget -O-|sh", "rm -rf /", "chmod 777",
                    "pip install", "npm install",
                ],
                "review": ["sudo", "docker", "ssh", "pip", "npm", "cargo"],
            },
            "network": {
                "allow_domains": ["github.com"],
                "block_domains": [
                    "pastebin.com", "transfer.sh", "ngrok.io",
                    "hastebin.com", "ghostbin.com", "0x0.st",
                ],
                "block_patterns": ["*.tk", "*.ml", "*.ga", "*.cf", "*.gq"],
            },
            "data_handling": {
                "pii_scan": True,
                "secret_scan": True,
                "log_retention_days": 365,
            },
            "workspace": {
                "require_gitignore": True,
                "require_audit_trail": True,
                "require_skill_signing": True,
                "max_skill_risk_score": 30,
            },
        },
    },
    "minimal": {
        "version": POLICY_VERSION,
        "name": "minimal",
        "description": "Lightweight policy covering critical security checks only.",
        "rules": {
            "commands": {
                "allow": [],
                "block": ["curl|bash", "wget -O-|sh", "rm -rf /", "chmod 777"],
                "review": [],
            },
            "network": {
                "allow_domains": [],
                "block_domains": ["pastebin.com", "transfer.sh", "ngrok.io"],
                "block_patterns": ["*.tk", "*.ml", "*.ga"],
            },
            "data_handling": {
                "pii_scan": False,
                "secret_scan": True,
                "log_retention_days": 30,
            },
            "workspace": {
                "require_gitignore": True,
                "require_audit_trail": False,
                "require_skill_signing": False,
                "max_skill_risk_score": 75,
            },
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
    """Find all installed skill directories (excludes quarantined)."""
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


def find_quarantined_skills(workspace: Path) -> list[Path]:
    """Find all quarantined skill directories."""
    skills_dir = workspace / "skills"
    if not skills_dir.exists():
        return []
    quarantined = []
    for entry in sorted(skills_dir.iterdir()):
        if not entry.is_dir():
            continue
        if entry.name.startswith(QUARANTINE_PREFIX):
            quarantined.append(entry)
    return quarantined


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


def severity_counts(findings: list[dict]) -> dict:
    """Return a dict of severity -> count."""
    counts = {
        SEVERITY_CRITICAL: 0,
        SEVERITY_HIGH: 0,
        SEVERITY_MEDIUM: 0,
        SEVERITY_LOW: 0,
        SEVERITY_INFO: 0,
    }
    for f in findings:
        sev = f.get("severity", SEVERITY_INFO)
        if sev in counts:
            counts[sev] += 1
    return counts


def generate_fix_recommendation(finding: dict) -> str:
    """Generate a human-readable fix recommendation for a finding."""
    rule = finding.get("rule", "")
    desc = finding.get("description", "")
    sev = finding.get("severity", SEVERITY_INFO)

    if "pipe-to-shell" in desc:
        return "Download the file first, verify its integrity, then execute separately."
    if "recursive root deletion" in desc:
        return "Use targeted paths instead of 'rm -rf /'. Scope deletion to specific directories."
    if "world-writable permissions" in desc:
        return "Use restrictive permissions (e.g., chmod 755 or chmod 644)."
    if "eval() call" in desc or "exec() call" in desc:
        return "Replace eval/exec with explicit function calls or safe alternatives."
    if "unsafe deserialization" in desc:
        return "Use json.loads() or a safe serialization format instead of pickle."
    if "dynamic import" in desc:
        return "Use explicit import statements instead of __import__."
    if "os.system" in desc:
        return "Use subprocess.run() with a list of arguments (no shell=True)."
    if "shell=True" in desc:
        return "Pass command as a list to subprocess and remove shell=True."
    if "compile() call" in desc:
        return "Avoid dynamic code compilation. Use static function definitions."
    if "Blocked domain" in desc:
        return "Remove references to blocked domains or request a policy exception."
    if "blocked pattern" in desc.lower():
        return "Remove references to suspicious TLD domains or add to allow list if legitimate."
    if "not on allow list" in desc:
        return "Add the domain to the policy allow list if it is a legitimate dependency."
    if "Blocked command pattern" in desc:
        return "Remove the blocked command pattern or replace with an approved alternative."
    if "Requires review" in desc:
        return "Document the use case and get approval for the review-required command."
    if "debug mode" in desc.lower() or "verbose mode" in desc.lower():
        return "Disable debug/verbose modes before deploying to production."
    if "debug print" in desc.lower() or "debug-level" in desc.lower():
        return "Remove debug print statements and set logging to INFO or WARNING level."
    if "secret_scan" in rule:
        return "Install openclaw-sentry or openclaw-sentry-pro for secret scanning."
    if "pii_scan" in rule:
        return "Install openclaw-sentry for PII scanning capabilities."
    if "gitignore" in rule:
        return "Create a .gitignore with patterns for .env, *.pem, and *.key."
    if "audit_trail" in rule:
        return "Install openclaw-ledger and run 'ledger init' to enable audit trails."
    if "skill_signing" in rule:
        return "Install openclaw-signet and run 'signet sign' to enable skill signing."

    if sev == SEVERITY_CRITICAL:
        return "Immediately investigate and remediate this critical violation."
    if sev == SEVERITY_HIGH:
        return "Address this high-severity finding before next deployment."
    return "Review and address this finding when feasible."


# ---------------------------------------------------------------------------
# Free commands (audit, policy, check, report, status)
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
    print("OPENCLAW MARSHAL PRO — COMPLIANCE AUDIT")
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

    # Quarantined skills
    quarantined = find_quarantined_skills(workspace)
    if quarantined:
        print()
        print(f"Quarantined skills ({len(quarantined)}):")
        for q in quarantined:
            original_name = q.name[len(QUARANTINE_PREFIX):]
            print(f"  [QUARANTINED] {original_name}")

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
    counts = severity_counts(all_findings)

    print("=" * 60)
    print(f"COMPLIANCE SCORE: {score}%")
    print("=" * 60)

    if all_findings:
        print(f"  CRITICAL: {counts[SEVERITY_CRITICAL]}")
        print(f"  HIGH:     {counts[SEVERITY_HIGH]}")
        print(f"  MEDIUM:   {counts[SEVERITY_MEDIUM]}")
        print(f"  LOW:      {counts[SEVERITY_LOW]}")
        print(f"  INFO:     {counts[SEVERITY_INFO]}")
    else:
        print("  No violations detected. Full compliance achieved.")

    print()

    if all_findings:
        print("RECOMMENDATIONS:")
        if counts[SEVERITY_CRITICAL]:
            print("  - CRITICAL: Immediately address blocked command/network violations")
            print("    TIP: Run 'marshal enforce' to auto-quarantine critical violations")
        if counts[SEVERITY_HIGH]:
            print("  - HIGH: Install missing security tools (sentry, ledger, signet)")
        if counts[SEVERITY_MEDIUM]:
            print("  - MEDIUM: Review flagged commands and workspace configuration")
        if counts[SEVERITY_LOW]:
            print("  - LOW: Disable debug modes and add .gitignore patterns")
        if counts[SEVERITY_INFO]:
            print("  - INFO: Review unlisted domains for policy inclusion")
        print()
        print("Pro commands available: enforce, quarantine, hooks, templates, protect")

    print("=" * 60)

    if counts[SEVERITY_CRITICAL] > 0:
        return 2
    elif counts[SEVERITY_HIGH] > 0 or counts[SEVERITY_MEDIUM] > 0:
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
        severity = max(findings, key=lambda x: SEVERITY_RANK.get(x["severity"], 0))["severity"]

        print(f"  FAIL  [{severity:8s}] {rule}")
        for f in findings[:5]:
            loc = f"{f['file']}:{f['line']}" if f["line"] else f["file"]
            print(f"        {loc} — {f['description']}")
            rec = generate_fix_recommendation(f)
            print(f"        FIX: {rec}")
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
    counts = severity_counts(all_findings)

    # --- Formatted report ---
    print("=" * 70)
    print("COMPLIANCE REPORT")
    print("OpenClaw Marshal Pro — Workspace Policy Audit")
    print("=" * 70)
    print()
    print(f"  Workspace:  {workspace}")
    print(f"  Policy:     {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print(f"  Generated:  {now_iso()}")
    print(f"  Skills:     {len(skills)} installed")

    quarantined = find_quarantined_skills(workspace)
    if quarantined:
        print(f"  Quarantined: {len(quarantined)}")
    print()

    # Summary
    print("-" * 70)
    print("SUMMARY")
    print("-" * 70)
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
    print(f"    Critical:        {counts[SEVERITY_CRITICAL]}")
    print(f"    High:            {counts[SEVERITY_HIGH]}")
    print(f"    Medium:          {counts[SEVERITY_MEDIUM]}")
    print(f"    Low:             {counts[SEVERITY_LOW]}")
    print(f"    Informational:   {counts[SEVERITY_INFO]}")
    print()

    # Violations table
    if all_findings:
        print("-" * 70)
        print("VIOLATIONS")
        print("-" * 70)
        print()
        print(f"  {'Severity':<10} {'Rule':<30} {'File':<20} Description")
        print(f"  {'--------':<10} {'----':<30} {'----':<20} -----------")

        for f in sorted(all_findings, key=lambda x: SEVERITY_RANK.get(x["severity"], 0), reverse=True):
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

    # Quarantined skills
    if quarantined:
        print()
        for q in quarantined:
            original_name = q.name[len(QUARANTINE_PREFIX):]
            print(f"  {original_name:<30} QUAR   --- (quarantined)")
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

    # Recommendations with fix suggestions (Pro)
    print("-" * 70)
    print("RECOMMENDATIONS")
    print("-" * 70)
    print()
    rec_num = 1
    if counts[SEVERITY_CRITICAL]:
        print(f"  {rec_num}. [CRITICAL] Remove or remediate blocked command/network patterns immediately.")
        print(f"     ACTION: Run 'marshal enforce' to auto-quarantine critical violations.")
        rec_num += 1
    if counts[SEVERITY_HIGH]:
        print(f"  {rec_num}. [HIGH] Install required security tools: check sentry, ledger, and signet.")
        rec_num += 1
    if counts[SEVERITY_MEDIUM]:
        print(f"  {rec_num}. [MEDIUM] Review flagged commands requiring approval. Update policy if intended.")
        rec_num += 1
    if counts[SEVERITY_LOW]:
        print(f"  {rec_num}. [LOW] Disable debug/verbose modes. Update .gitignore patterns.")
        rec_num += 1
    if counts[SEVERITY_INFO]:
        print(f"  {rec_num}. [INFO] Review unlisted network domains. Add to allow list if legitimate.")
        rec_num += 1
    if not all_findings:
        print("  No recommendations. All policy rules are satisfied.")
    print()

    print("=" * 70)
    print("END OF REPORT")
    print("=" * 70)

    if counts[SEVERITY_CRITICAL] > 0:
        return 2
    elif counts[SEVERITY_HIGH] > 0 or counts[SEVERITY_MEDIUM] > 0:
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
    counts = severity_counts(all_findings)
    policy_name = policy.get("name", "unnamed")

    quarantined = find_quarantined_skills(workspace)
    quar_str = f", {len(quarantined)} quarantined" if quarantined else ""

    if not all_findings:
        print(f"STATUS: COMPLIANT — score {score}%, policy '{policy_name}', "
              f"{len(skills)} skill(s) checked{quar_str}")
        return 0
    elif counts[SEVERITY_CRITICAL] > 0:
        print(f"STATUS: NON-COMPLIANT — score {score}%, {counts[SEVERITY_CRITICAL]} critical, "
              f"{len(all_findings)} total finding(s){quar_str}")
        return 2
    else:
        print(f"STATUS: REVIEW NEEDED — score {score}%, {len(all_findings)} finding(s), "
              f"policy '{policy_name}'{quar_str}")
        return 1


# ---------------------------------------------------------------------------
# Pro commands (enforce, quarantine, unquarantine, hooks, templates, protect)
# ---------------------------------------------------------------------------

def cmd_enforce(workspace: Path) -> int:
    """Active policy enforcement: scan all skills, quarantine critical violators."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Run 'marshal policy --init' first.")
        return 1

    print("=" * 60)
    print("OPENCLAW MARSHAL PRO — ENFORCE")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Policy: {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print(f"Timestamp: {now_iso()}")
    print()

    skills = find_skills(workspace)
    skills_dir = workspace / "skills"

    quarantined_count = 0
    review_count = 0
    compliant_count = 0
    enforcement_log = []

    for skill_dir in skills:
        meta = parse_skill_metadata(skill_dir / "SKILL.md")
        skill_name = meta["name"] or skill_dir.name

        skill_findings = []
        skill_findings.extend(check_command_safety(skill_dir, policy))
        skill_findings.extend(check_network_policy(skill_dir, policy))
        skill_findings.extend(check_configuration_security(skill_dir))

        if not skill_findings:
            print(f"  [PASS] {skill_name} — compliant")
            compliant_count += 1
            continue

        counts = severity_counts(skill_findings)

        # Auto-quarantine on CRITICAL violations
        if counts[SEVERITY_CRITICAL] > 0:
            quarantine_dest = skills_dir / f"{QUARANTINE_PREFIX}{skill_dir.name}"
            try:
                skill_dir.rename(quarantine_dest)
                print(f"  [QUARANTINED] {skill_name} — {counts[SEVERITY_CRITICAL]} critical violation(s)")
                for f in skill_findings:
                    if f["severity"] == SEVERITY_CRITICAL:
                        print(f"    {f['description']}")
                        print(f"    FIX: {generate_fix_recommendation(f)}")
                quarantined_count += 1
                enforcement_log.append({
                    "action": "quarantine",
                    "skill": skill_name,
                    "reason": f"{counts[SEVERITY_CRITICAL]} critical violation(s)",
                    "timestamp": now_iso(),
                })
            except OSError as e:
                print(f"  [ERROR] Failed to quarantine {skill_name}: {e}")
                enforcement_log.append({
                    "action": "quarantine_failed",
                    "skill": skill_name,
                    "error": str(e),
                    "timestamp": now_iso(),
                })
        else:
            # MEDIUM and below: generate recommendations only
            print(f"  [REVIEW] {skill_name} — {len(skill_findings)} finding(s)")
            review_count += 1
            for f in skill_findings:
                if f["severity"] in (SEVERITY_HIGH, SEVERITY_MEDIUM):
                    rec = generate_fix_recommendation(f)
                    print(f"    [{f['severity']:8s}] {f['description']}")
                    print(f"    FIX: {rec}")

    print()
    print("-" * 60)
    print("ENFORCEMENT SUMMARY")
    print("-" * 60)
    print(f"  Compliant:    {compliant_count}")
    print(f"  Quarantined:  {quarantined_count}")
    print(f"  Review needed: {review_count}")
    print()

    # Save enforcement log
    log_dir = workspace / ".marshal"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enforcement.log.json"

    existing_log = []
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing_log = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_log = []

    existing_log.extend(enforcement_log)
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(existing_log, f, indent=2)

    if enforcement_log:
        print(f"Enforcement log saved: {log_file}")

    print("=" * 60)

    if quarantined_count > 0:
        return 2
    elif review_count > 0:
        return 1
    return 0


def cmd_quarantine(workspace: Path, skill_name: str) -> int:
    """Quarantine a non-compliant skill by prefixing its directory."""
    skills_dir = workspace / "skills"
    skill_dir = skills_dir / skill_name

    if not skill_dir.is_dir():
        # Check if already quarantined
        quarantined_dir = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"
        if quarantined_dir.is_dir():
            print(f"Skill '{skill_name}' is already quarantined.")
            return 1
        print(f"Skill not found: {skill_name}")
        return 1

    quarantine_dest = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"
    if quarantine_dest.exists():
        print(f"Quarantine destination already exists: {quarantine_dest.name}")
        return 1

    try:
        skill_dir.rename(quarantine_dest)
    except OSError as e:
        print(f"Failed to quarantine '{skill_name}': {e}")
        return 1

    print(f"Quarantined: {skill_name}")
    print(f"  Renamed: {skill_dir.name} -> {quarantine_dest.name}")
    print(f"  The skill is now invisible to all agent tools.")
    print()
    print(f"To restore: marshal unquarantine {skill_name}")

    # Log the action
    log_dir = workspace / ".marshal"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enforcement.log.json"

    existing_log = []
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing_log = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_log = []

    existing_log.append({
        "action": "quarantine",
        "skill": skill_name,
        "reason": "manual quarantine",
        "timestamp": now_iso(),
    })
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(existing_log, f, indent=2)

    return 0


def cmd_unquarantine(workspace: Path, skill_name: str) -> int:
    """Restore a quarantined skill."""
    skills_dir = workspace / "skills"
    quarantined_dir = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"

    if not quarantined_dir.is_dir():
        # Check if it is not quarantined
        active_dir = skills_dir / skill_name
        if active_dir.is_dir():
            print(f"Skill '{skill_name}' is not quarantined — it is active.")
            return 1
        print(f"Quarantined skill not found: {skill_name}")
        return 1

    restore_dest = skills_dir / skill_name
    if restore_dest.exists():
        print(f"Cannot restore: '{skill_name}' already exists as an active skill.")
        return 1

    try:
        quarantined_dir.rename(restore_dest)
    except OSError as e:
        print(f"Failed to restore '{skill_name}': {e}")
        return 1

    print(f"Restored: {skill_name}")
    print(f"  Renamed: {quarantined_dir.name} -> {restore_dest.name}")
    print(f"  The skill is now active and visible to agent tools.")
    print()
    print("Run 'marshal check' to verify compliance before use.")

    # Log the action
    log_dir = workspace / ".marshal"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enforcement.log.json"

    existing_log = []
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing_log = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_log = []

    existing_log.append({
        "action": "unquarantine",
        "skill": skill_name,
        "reason": "manual restore",
        "timestamp": now_iso(),
    })
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(existing_log, f, indent=2)

    return 0


def cmd_hooks(workspace: Path) -> int:
    """Generate Claude Code hook configurations for runtime policy enforcement."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Run 'marshal policy --init' first.")
        return 1

    rules = policy.get("rules", {})
    commands_rules = rules.get("commands", {})
    blocked_cmds = commands_rules.get("block", [])
    review_cmds = commands_rules.get("review", [])
    data_rules = rules.get("data_handling", {})

    print("=" * 60)
    print("OPENCLAW MARSHAL PRO — HOOK GENERATOR")
    print("=" * 60)
    print(f"Policy: {policy.get('name', 'unnamed')}")
    print()

    # Build Bash command blocklist pattern
    bash_deny_patterns = []
    for bp in blocked_cmds:
        bash_deny_patterns.append(bp)
    for rp in review_cmds:
        bash_deny_patterns.append(rp)
    # Add built-in dangerous patterns
    bash_deny_patterns.extend([
        "curl*|*sh", "wget*|*sh", "rm -rf /",
        "chmod 777", "eval(", "pickle.load",
    ])

    # Build PII regex pattern for Write hook
    pii_regex_parts = PII_PATTERNS if data_rules.get("pii_scan", False) else []

    hooks_config = {
        "hooks": {
            "PreToolUse": [
                {
                    "matcher": "Bash",
                    "hooks": [
                        {
                            "type": "command",
                            "command": _build_bash_hook_command(bash_deny_patterns),
                            "timeout": 5,
                        }
                    ],
                },
            ],
        }
    }

    # Add Write hook if PII scanning is enabled
    if pii_regex_parts:
        hooks_config["hooks"]["PreToolUse"].append({
            "matcher": "Write",
            "hooks": [
                {
                    "type": "command",
                    "command": _build_write_hook_command(pii_regex_parts),
                    "timeout": 5,
                }
            ],
        })

    print("Generated hook configuration for .claude/settings.json:")
    print()
    print(json.dumps(hooks_config, indent=2))
    print()
    print("-" * 60)
    print("INSTRUCTIONS")
    print("-" * 60)
    print()
    print("1. Copy the JSON above into your .claude/settings.json file.")
    print("2. Merge with existing hooks if present.")
    print("3. The Bash hook blocks commands matching policy blocklist/review patterns.")
    if pii_regex_parts:
        print("4. The Write hook checks output content for PII patterns (SSN, email, CC, phone).")
    print()
    print("These hooks run BEFORE tool execution and can reject disallowed actions.")
    print("=" * 60)

    return 0


def _build_bash_hook_command(deny_patterns: list[str]) -> str:
    """Build a shell one-liner that checks Bash tool input against deny patterns."""
    # The hook receives the tool input as JSON on stdin.
    # We build a Python one-liner that checks the command field.
    escaped = json.dumps(deny_patterns)
    return (
        f"python3 -c \""
        f"import sys,json,re; "
        f"data=json.load(sys.stdin); "
        f"cmd=data.get('command',''); "
        f"patterns={escaped}; "
        f"matches=[p for p in patterns if p.replace('*','') in cmd]; "
        f"sys.exit(2) if matches else sys.exit(0)"
        f"\""
    )


def _build_write_hook_command(pii_patterns: list[str]) -> str:
    """Build a shell one-liner that checks Write tool input for PII patterns."""
    escaped = json.dumps(pii_patterns)
    return (
        f"python3 -c \""
        f"import sys,json,re; "
        f"data=json.load(sys.stdin); "
        f"content=data.get('content',''); "
        f"patterns={escaped}; "
        f"matches=[p for p in patterns if re.search(p,content)]; "
        f"sys.exit(2) if matches else sys.exit(0)"
        f"\""
    )


def cmd_templates(workspace: Path, list_templates: bool, apply_name: str | None) -> int:
    """Manage pre-built compliance templates."""
    if list_templates or apply_name is None:
        # List available templates
        print("=" * 60)
        print("OPENCLAW MARSHAL PRO — COMPLIANCE TEMPLATES")
        print("=" * 60)
        print()
        print(f"  {'Name':<15} Description")
        print(f"  {'----':<15} -----------")
        for name, tmpl in sorted(COMPLIANCE_TEMPLATES.items()):
            desc = tmpl.get("description", "")
            print(f"  {name:<15} {desc}")
        print()
        print("Apply a template:")
        print("  marshal templates --apply <name>")
        print()

        # Show current policy for comparison
        policy = load_policy(workspace)
        if policy:
            print(f"Current policy: {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
        else:
            print("No policy loaded. Applying a template will create one.")

        print("=" * 60)
        return 0

    # Apply a template
    if apply_name not in COMPLIANCE_TEMPLATES:
        print(f"Unknown template: {apply_name}")
        print(f"Available: {', '.join(sorted(COMPLIANCE_TEMPLATES.keys()))}")
        return 1

    template = COMPLIANCE_TEMPLATES[apply_name]
    pp = policy_path(workspace)

    if pp.exists():
        # Back up existing policy
        backup_name = f".marshal-policy.backup.{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.json"
        backup_path = workspace / backup_name
        try:
            shutil.copy2(pp, backup_path)
            print(f"Existing policy backed up: {backup_name}")
        except OSError as e:
            print(f"WARNING: Could not back up existing policy: {e}")

    # Write the template (strip the description field — it is not part of policy)
    policy_data = {k: v for k, v in template.items() if k != "description"}
    save_policy(workspace, policy_data)

    print(f"Applied template: {apply_name}")
    print(f"  {template.get('description', '')}")
    print(f"  Policy file: {pp}")
    print()
    print("Run 'marshal audit' to check compliance against the new policy.")

    # Log the action
    log_dir = workspace / ".marshal"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enforcement.log.json"

    existing_log = []
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing_log = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing_log = []

    existing_log.append({
        "action": "template_applied",
        "template": apply_name,
        "timestamp": now_iso(),
    })
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(existing_log, f, indent=2)

    return 0


def cmd_protect(workspace: Path) -> int:
    """Full automated protection sweep: audit, enforce, quarantine, report."""
    policy = load_policy(workspace)
    if policy is None:
        print("No policy found. Initializing default policy...")
        save_policy(workspace, DEFAULT_POLICY)
        policy = DEFAULT_POLICY
        print(f"Default policy created: {policy_path(workspace)}")
        print()

    print("=" * 60)
    print("OPENCLAW MARSHAL PRO — PROTECT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Policy: {policy.get('name', 'unnamed')} (v{policy.get('version', '?')})")
    print(f"Timestamp: {now_iso()}")
    print()

    # Step 1: Audit all skills
    print("[1/4] Auditing all skills...")
    skills = find_skills(workspace)
    skills_dir = workspace / "skills"
    all_findings = []
    skill_findings_map = {}

    for skill_dir in skills:
        meta = parse_skill_metadata(skill_dir / "SKILL.md")
        skill_name = meta["name"] or skill_dir.name

        sf = []
        sf.extend(check_command_safety(skill_dir, policy))
        sf.extend(check_network_policy(skill_dir, policy))
        sf.extend(check_configuration_security(skill_dir))

        skill_findings_map[skill_dir] = (skill_name, sf)
        all_findings.extend(sf)

    print(f"  Audited {len(skills)} skill(s), {len(all_findings)} finding(s)")
    print()

    # Step 2: Enforce — quarantine critical violators
    print("[2/4] Enforcing policy...")
    quarantined_count = 0
    enforcement_log = []

    for skill_dir, (skill_name, sf) in skill_findings_map.items():
        counts = severity_counts(sf)
        if counts[SEVERITY_CRITICAL] > 0:
            quarantine_dest = skills_dir / f"{QUARANTINE_PREFIX}{skill_dir.name}"
            try:
                skill_dir.rename(quarantine_dest)
                print(f"  [QUARANTINED] {skill_name} — {counts[SEVERITY_CRITICAL]} critical violation(s)")
                quarantined_count += 1
                enforcement_log.append({
                    "action": "quarantine",
                    "skill": skill_name,
                    "reason": f"{counts[SEVERITY_CRITICAL]} critical violation(s)",
                    "timestamp": now_iso(),
                })
            except OSError as e:
                print(f"  [ERROR] Failed to quarantine {skill_name}: {e}")

    if quarantined_count == 0:
        print("  No critical violations — no skills quarantined")
    print()

    # Step 3: Workspace checks
    print("[3/4] Checking workspace compliance...")
    ws_findings = []
    ws_findings.extend(check_data_handling(workspace, policy))
    ws_findings.extend(check_workspace_hygiene(workspace, policy))
    all_findings.extend(ws_findings)

    if ws_findings:
        for f in ws_findings:
            print(f"  [{f['severity']:8s}] {f['description']}")
    else:
        print("  All workspace requirements met")
    print()

    # Step 4: Summary report
    print("[4/4] Generating summary...")
    score = compute_compliance_score(all_findings)
    counts = severity_counts(all_findings)

    print()
    print("=" * 60)
    print("PROTECTION SUMMARY")
    print("=" * 60)
    print(f"  Compliance Score: {score}%")
    print(f"  Skills audited:   {len(skills)}")
    print(f"  Skills quarantined: {quarantined_count}")
    print(f"  Total findings:   {len(all_findings)}")
    print(f"    Critical: {counts[SEVERITY_CRITICAL]}  High: {counts[SEVERITY_HIGH]}  "
          f"Medium: {counts[SEVERITY_MEDIUM]}  Low: {counts[SEVERITY_LOW]}  "
          f"Info: {counts[SEVERITY_INFO]}")
    print()

    if counts[SEVERITY_CRITICAL] == 0 and quarantined_count == 0:
        print("  Workspace is protected. No critical threats detected.")
    else:
        print(f"  {quarantined_count} skill(s) quarantined due to critical violations.")
        if counts[SEVERITY_HIGH] > 0 or counts[SEVERITY_MEDIUM] > 0:
            print(f"  {counts[SEVERITY_HIGH] + counts[SEVERITY_MEDIUM]} non-critical finding(s) require review.")
        print()
        print("  Run 'marshal report' for full details.")
        print("  Run 'marshal unquarantine <skill>' after investigation.")

    print("=" * 60)

    # Save enforcement log
    if enforcement_log:
        log_dir = workspace / ".marshal"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "enforcement.log.json"

        existing_log = []
        if log_file.exists():
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    existing_log = json.load(f)
            except (json.JSONDecodeError, OSError):
                existing_log = []

        existing_log.extend(enforcement_log)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(existing_log, f, indent=2)

    if quarantined_count > 0:
        return 2
    elif counts[SEVERITY_HIGH] > 0 or counts[SEVERITY_MEDIUM] > 0:
        return 1
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Marshal Pro — Full compliance and policy enforcement suite"
    )
    parser.add_argument(
        "command",
        choices=[
            "audit", "policy", "check", "report", "status",
            "enforce", "quarantine", "unquarantine",
            "hooks", "templates", "protect",
        ],
        help="Command to run",
    )
    parser.add_argument("skill", nargs="?", help="Skill name (for check/quarantine/unquarantine)")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    parser.add_argument("--init", action="store_true", help="Initialize default policy")
    parser.add_argument("--show", action="store_true", help="Show current policy")
    parser.add_argument("--list", dest="list_templates", action="store_true", help="List available templates")
    parser.add_argument("--apply", dest="apply_name", help="Apply a compliance template")
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

    elif args.command == "enforce":
        sys.exit(cmd_enforce(workspace))

    elif args.command == "quarantine":
        if not args.skill:
            print("Usage: marshal.py quarantine <skill> [--workspace PATH]")
            sys.exit(1)
        sys.exit(cmd_quarantine(workspace, args.skill))

    elif args.command == "unquarantine":
        if not args.skill:
            print("Usage: marshal.py unquarantine <skill> [--workspace PATH]")
            sys.exit(1)
        sys.exit(cmd_unquarantine(workspace, args.skill))

    elif args.command == "hooks":
        sys.exit(cmd_hooks(workspace))

    elif args.command == "templates":
        sys.exit(cmd_templates(workspace, args.list_templates, args.apply_name))

    elif args.command == "protect":
        sys.exit(cmd_protect(workspace))

    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
