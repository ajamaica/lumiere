#!/usr/bin/env python3
"""OpenClaw Vault — Credential Lifecycle Protection

Audits credential exposure, detects misconfigured permissions, inventories
all secrets, and identifies stale credentials needing rotation.

Usage:
    vault.py audit     [--workspace PATH]
    vault.py exposure  [--workspace PATH]
    vault.py inventory [--workspace PATH]
    vault.py status    [--workspace PATH]

Free version: detect and alert.
Pro version: auto-fix, rotation reminders, access policies, secure injection.
"""

import argparse
import io
import os
import re
import stat
import sys
import time
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

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots",
}

SELF_SKILL_DIRS = {"openclaw-vault", "openclaw-vault-pro"}

STALE_THRESHOLD_DAYS = 90

# Credential file names
CREDENTIAL_FILES = {
    ".env", ".env.local", ".env.production", ".env.staging", ".env.development",
    ".env.test", ".env.ci",
    "credentials.json", "service-account.json", "secrets.json",
    ".npmrc", ".pypirc", ".netrc", ".pgpass", ".my.cnf",
    "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
    "htpasswd", ".htpasswd",
}

CREDENTIAL_EXTENSIONS = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".crt"}

# Config file extensions to scan for hardcoded credentials
CONFIG_EXTENSIONS = {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties"}

# Log file extensions
LOG_EXTENSIONS = {".log", ".out"}

# Shell history files
SHELL_HISTORY_FILES = {
    ".bash_history", ".zsh_history", ".python_history",
    ".node_repl_history", ".psql_history", ".mysql_history",
    ".irb_history", ".lesshst",
}

# Docker files that commonly embed secrets
DOCKER_FILES = {"Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerenv"}

# Patterns for detecting credentials in various contexts
CREDENTIAL_PATTERNS = [
    # Key=value patterns in configs
    ("API Key", re.compile(
        r"""(?:api[_-]?key|apikey)\s*[=:]\s*["']?([A-Za-z0-9\-_]{16,})["']?""",
        re.IGNORECASE)),
    ("Secret Key", re.compile(
        r"""(?:secret[_-]?key|secret)\s*[=:]\s*["']?([A-Za-z0-9\-_/+=]{16,})["']?""",
        re.IGNORECASE)),
    ("Password", re.compile(
        r"""(?:password|passwd|pwd)\s*[=:]\s*["']?([^"'\s\n]{6,})["']?""",
        re.IGNORECASE)),
    ("Token", re.compile(
        r"""(?:token|auth_token|access_token)\s*[=:]\s*["']?([A-Za-z0-9\-_.]{16,})["']?""",
        re.IGNORECASE)),
    ("Database URL", re.compile(
        r"""(?:postgres|mysql|mongodb|redis|amqp)(?:ql)?://[^\s"']{10,}""",
        re.IGNORECASE)),
    ("Connection String", re.compile(
        r"""(?:connection_string|connstr|dsn|database_url)\s*[=:]\s*["']?([^"'\n]{20,})["']?""",
        re.IGNORECASE)),
    ("Private Key Header", re.compile(
        r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
]

# Patterns for credentials in shell history
HISTORY_CREDENTIAL_PATTERNS = [
    ("CLI Password Flag", re.compile(
        r"""(?:-p\s*|--password[= ])["']?([^"'\s]{4,})["']?""")),
    ("CLI Token Flag", re.compile(
        r"""(?:--token[= ]|--api-key[= ])["']?([A-Za-z0-9\-_]{8,})["']?""")),
    ("Export Secret", re.compile(
        r"""export\s+(?:\w*(?:KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL)\w*)\s*=\s*["']?([^"'\s]+)["']?""",
        re.IGNORECASE)),
    ("Curl Auth Header", re.compile(
        r"""curl\s+.*(?:-H|--header)\s+["']?Authorization:\s*Bearer\s+([A-Za-z0-9\-_.]+)""",
        re.IGNORECASE)),
    ("Inline URL Credentials", re.compile(
        r"""(?:https?|ftp)://[^:]+:([^@\s]+)@""")),
]

# Patterns for credentials in URL query parameters (code files)
URL_CREDENTIAL_PATTERNS = [
    ("URL Query API Key", re.compile(
        r"""[?&](?:api[_-]?key|apikey|token|access_token|secret)=([A-Za-z0-9\-_]{8,})""",
        re.IGNORECASE)),
]

# Patterns for credentials in git config
GIT_CONFIG_CREDENTIAL_PATTERNS = [
    ("Git Credential in URL", re.compile(
        r"""url\s*=\s*https?://([^:]+):([^@]+)@""")),
    ("Git Helper Plaintext", re.compile(
        r"""helper\s*=\s*store""")),
]

# Docker credential patterns
DOCKER_CREDENTIAL_PATTERNS = [
    ("Docker ENV Secret", re.compile(
        r"""ENV\s+(?:\w*(?:KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL)\w*)\s*[= ](.+)""",
        re.IGNORECASE)),
    ("Docker ARG Secret", re.compile(
        r"""ARG\s+(?:\w*(?:KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL)\w*)\s*=\s*(.+)""",
        re.IGNORECASE)),
]

# Credential type classification for inventory
CREDENTIAL_TYPE_MAP = {
    ".env": "Environment Variables",
    "credentials.json": "API Credentials",
    "service-account.json": "Service Account",
    "secrets.json": "Application Secrets",
    ".npmrc": "NPM Auth Token",
    ".pypirc": "PyPI Auth Token",
    ".netrc": "Network Credentials",
    ".pgpass": "PostgreSQL Password",
    ".my.cnf": "MySQL Credentials",
    "htpasswd": "HTTP Auth",
    ".htpasswd": "HTTP Auth",
    ".pem": "Certificate/Key",
    ".key": "Private Key",
    ".p12": "PKCS12 Certificate",
    ".pfx": "PKCS12 Certificate",
    ".jks": "Java Keystore",
    ".keystore": "Keystore",
    ".crt": "Certificate",
    "id_rsa": "SSH Key (RSA)",
    "id_ed25519": "SSH Key (Ed25519)",
    "id_ecdsa": "SSH Key (ECDSA)",
    "id_dsa": "SSH Key (DSA)",
}


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

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


def is_binary(path):
    """Check if a file is binary."""
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        return b"\x00" in chunk
    except (OSError, PermissionError):
        return True


def read_text_safe(path):
    """Read file as text, returning None on failure."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except (OSError, PermissionError):
        return None


def file_age_days(path):
    """Return age of a file in days based on last modification."""
    try:
        mtime = path.stat().st_mtime
        age_seconds = time.time() - mtime
        return age_seconds / 86400
    except (OSError, PermissionError):
        return -1


def is_world_readable(path):
    """Check if a file is world-readable (Unix) or has overly open permissions."""
    if sys.platform == "win32":
        # On Windows, check if the file is in a potentially public directory
        # True permission checks require win32api; we approximate
        return False
    try:
        mode = path.stat().st_mode
        return bool(mode & stat.S_IROTH)
    except (OSError, PermissionError):
        return False


def is_group_readable(path):
    """Check if a file is group-readable (Unix)."""
    if sys.platform == "win32":
        return False
    try:
        mode = path.stat().st_mode
        return bool(mode & stat.S_IRGRP)
    except (OSError, PermissionError):
        return False


def collect_files(workspace, extensions=None, names=None):
    """Walk workspace collecting files, respecting skip directories."""
    files = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS
                   and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            include = False
            if names and fname in names:
                include = True
            if extensions and fpath.suffix.lower() in extensions:
                include = True
            if names is None and extensions is None:
                include = True
            if include:
                files.append(fpath)
    return files


def mask_value(text):
    """Mask a credential value for safe display."""
    if len(text) > 12:
        return text[:5] + "..." + text[-3:]
    if len(text) > 6:
        return text[:3] + "..."
    return "***"


def now_iso():
    """Return current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def classify_credential(path):
    """Classify a credential file by type."""
    name = path.name
    suffix = path.suffix.lower()
    if name in CREDENTIAL_TYPE_MAP:
        return CREDENTIAL_TYPE_MAP[name]
    if suffix in CREDENTIAL_TYPE_MAP:
        return CREDENTIAL_TYPE_MAP[suffix]
    if name.startswith(".env"):
        return "Environment Variables"
    return "Unknown"


# ---------------------------------------------------------------------------
# Audit checks
# ---------------------------------------------------------------------------

def check_env_permissions(workspace):
    """Check .env files for overly permissive permissions."""
    findings = []
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in filenames:
            if fname.startswith(".env"):
                fpath = Path(root) / fname
                rel = fpath.relative_to(workspace)
                if is_world_readable(fpath):
                    findings.append({
                        "type": "permission", "severity": "CRITICAL",
                        "file": str(rel),
                        "detail": f".env file is world-readable (permissions too open)",
                    })
                elif is_group_readable(fpath):
                    findings.append({
                        "type": "permission", "severity": "WARNING",
                        "file": str(rel),
                        "detail": f".env file is group-readable (consider restricting to owner-only)",
                    })
                # Check if non-empty
                content = read_text_safe(fpath)
                if content:
                    var_count = len([l for l in content.strip().split("\n")
                                     if l.strip() and not l.strip().startswith("#")])
                    if var_count > 0:
                        findings.append({
                            "type": "env_file", "severity": "INFO",
                            "file": str(rel),
                            "detail": f".env file with {var_count} variable(s) present",
                        })
    return findings


def check_shell_history(workspace):
    """Check shell history files for leaked credentials."""
    findings = []
    home = Path.home()
    history_files = []

    # Check home directory for history files
    for hname in SHELL_HISTORY_FILES:
        hpath = home / hname
        if hpath.is_file():
            history_files.append(hpath)

    # Also check workspace itself
    for hname in SHELL_HISTORY_FILES:
        hpath = workspace / hname
        if hpath.is_file():
            history_files.append(hpath)

    for hpath in history_files:
        content = read_text_safe(hpath)
        if not content:
            continue
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in HISTORY_CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    # Determine display path
                    try:
                        rel = hpath.relative_to(workspace)
                        display = str(rel)
                    except ValueError:
                        display = f"~/{hpath.name}"
                    findings.append({
                        "type": "history", "severity": "WARNING",
                        "file": display,
                        "line": line_idx,
                        "detail": f"{pattern_name}: credential visible in shell history",
                        "match": mask_value(match.group(1) if match.lastindex else match.group(0)),
                    })
    return findings


def check_git_config(workspace):
    """Check git config files for embedded credentials."""
    findings = []
    config_paths = []

    # Workspace-level git config
    ws_gitconfig = workspace / ".git" / "config"
    if ws_gitconfig.is_file():
        config_paths.append(ws_gitconfig)

    # Global git config
    global_gitconfig = Path.home() / ".gitconfig"
    if global_gitconfig.is_file():
        config_paths.append(global_gitconfig)

    for gpath in config_paths:
        content = read_text_safe(gpath)
        if not content:
            continue
        try:
            rel = gpath.relative_to(workspace)
            display = str(rel)
        except ValueError:
            display = f"~/{gpath.name}"

        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in GIT_CONFIG_CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    severity = "CRITICAL" if "URL" in pattern_name else "WARNING"
                    findings.append({
                        "type": "git_config", "severity": severity,
                        "file": display,
                        "line": line_idx,
                        "detail": f"{pattern_name}: credentials in git configuration",
                    })
    return findings


def check_config_credentials(workspace):
    """Scan config files (JSON, YAML, TOML, INI) for hardcoded credentials."""
    findings = []
    config_files = collect_files(workspace, extensions=CONFIG_EXTENSIONS)

    for fpath in config_files:
        if is_binary(fpath):
            continue
        content = read_text_safe(fpath)
        if not content:
            continue
        rel = fpath.relative_to(workspace)
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    matched = match.group(1) if match.lastindex else match.group(0)
                    # Skip placeholder values
                    if matched.lower() in (
                        "your_api_key_here", "your_secret_here", "changeme",
                        "xxxxxxxxxxxx", "placeholder", "todo", "fixme",
                        "your-api-key", "your-secret-key", "none", "null",
                        "example", "test", "dummy",
                    ):
                        continue
                    # Skip very short matches that are likely not real credentials
                    if len(matched) < 8:
                        continue
                    findings.append({
                        "type": "config_credential", "severity": "CRITICAL",
                        "file": str(rel),
                        "line": line_idx,
                        "detail": f"{pattern_name} in config file",
                        "match": mask_value(matched),
                    })
    return findings


def check_log_credentials(workspace):
    """Check log files for leaked credentials."""
    findings = []
    log_files = collect_files(workspace, extensions=LOG_EXTENSIONS)

    for fpath in log_files:
        if is_binary(fpath):
            continue
        content = read_text_safe(fpath)
        if not content:
            continue
        rel = fpath.relative_to(workspace)
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    matched = match.group(1) if match.lastindex else match.group(0)
                    if len(matched) < 8:
                        continue
                    findings.append({
                        "type": "log_credential", "severity": "WARNING",
                        "file": str(rel),
                        "line": line_idx,
                        "detail": f"{pattern_name} found in log file",
                        "match": mask_value(matched),
                    })
    return findings


def check_gitignore_coverage(workspace):
    """Check if .env and credential files are properly gitignored."""
    findings = []
    gitignore = workspace / ".gitignore"

    if not gitignore.exists():
        # Only flag if there are actually .env or credential files present
        env_files = collect_files(workspace, names={n for n in CREDENTIAL_FILES if n.startswith(".env")})
        if env_files:
            findings.append({
                "type": "gitignore", "severity": "WARNING",
                "file": ".gitignore",
                "detail": "No .gitignore found — .env and credential files may be committed to git",
            })
        return findings

    content = read_text_safe(gitignore)
    if not content:
        return findings

    important_patterns = [".env", "*.pem", "*.key", "credentials.json", "secrets.json", "*.p12", "*.pfx"]
    missing = [p for p in important_patterns if p not in content]
    if missing:
        findings.append({
            "type": "gitignore", "severity": "INFO",
            "file": ".gitignore",
            "detail": f"Missing gitignore patterns for credential files: {', '.join(missing)}",
        })
    return findings


def check_stale_credentials(workspace):
    """Detect credential files older than the staleness threshold."""
    findings = []
    cred_files = collect_files(
        workspace,
        names=CREDENTIAL_FILES,
        extensions=CREDENTIAL_EXTENSIONS,
    )

    for fpath in cred_files:
        age = file_age_days(fpath)
        if age < 0:
            continue
        rel = fpath.relative_to(workspace)
        if age > STALE_THRESHOLD_DAYS:
            findings.append({
                "type": "stale", "severity": "WARNING",
                "file": str(rel),
                "detail": f"Credential file is {int(age)} days old (threshold: {STALE_THRESHOLD_DAYS} days) — consider rotation",
            })
    return findings


# ---------------------------------------------------------------------------
# Exposure checks
# ---------------------------------------------------------------------------

def check_public_directory_exposure(workspace):
    """Check for credential files in publicly accessible directories."""
    findings = []
    public_dirs = {"public", "static", "www", "html", "dist", "build", "out", "assets"}

    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts

        in_public = any(p.lower() in public_dirs for p in parts)
        if not in_public:
            continue

        for fname in filenames:
            fpath = Path(root) / fname
            if fname in CREDENTIAL_FILES or fpath.suffix.lower() in CREDENTIAL_EXTENSIONS:
                rel = fpath.relative_to(workspace)
                findings.append({
                    "type": "public_exposure", "severity": "CRITICAL",
                    "file": str(rel),
                    "detail": f"Credential file in publicly accessible directory: {'/'.join(parts)}",
                })
    return findings


def check_git_credential_history(workspace):
    """Check if credentials have been committed to git history."""
    findings = []
    git_dir = workspace / ".git"
    if not git_dir.is_dir():
        return findings

    # Check if any credential files are tracked by git
    # We look for credential files that exist and might be tracked
    cred_files = collect_files(
        workspace,
        names=CREDENTIAL_FILES,
        extensions=CREDENTIAL_EXTENSIONS,
    )
    for fpath in cred_files:
        rel = fpath.relative_to(workspace)
        # If a credential file exists alongside a .git directory, flag it
        # (actual git log checking would need subprocess, but we can flag the risk)
        findings.append({
            "type": "git_exposure", "severity": "WARNING",
            "file": str(rel),
            "detail": "Credential file exists in a git repository — verify it is gitignored and not in commit history",
        })
    return findings


def check_docker_credentials(workspace):
    """Check Docker/container configs for embedded secrets."""
    findings = []
    docker_files = collect_files(workspace, names=DOCKER_FILES)

    for fpath in docker_files:
        if is_binary(fpath):
            continue
        content = read_text_safe(fpath)
        if not content:
            continue
        rel = fpath.relative_to(workspace)
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in DOCKER_CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    matched = match.group(1).strip() if match.lastindex else match.group(0).strip()
                    # Skip variable references like $VAR or ${VAR}
                    if matched.startswith("$") or matched.startswith("${"):
                        continue
                    findings.append({
                        "type": "docker_credential", "severity": "CRITICAL",
                        "file": str(rel),
                        "line": line_idx,
                        "detail": f"{pattern_name}: hardcoded secret in container config",
                        "match": mask_value(matched),
                    })
    return findings


def check_shell_aliases(workspace):
    """Check shell RC files for aliases or functions containing credentials."""
    findings = []
    home = Path.home()
    rc_files = [
        home / ".bashrc", home / ".zshrc", home / ".profile",
        home / ".bash_profile", home / ".zprofile",
    ]

    for rcpath in rc_files:
        if not rcpath.is_file():
            continue
        content = read_text_safe(rcpath)
        if not content:
            continue
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            # Check for aliases or exports with credential-like values
            for pattern_name, pattern in HISTORY_CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    findings.append({
                        "type": "shell_rc", "severity": "WARNING",
                        "file": f"~/{rcpath.name}",
                        "line": line_idx,
                        "detail": f"{pattern_name}: credential in shell config (visible to all shell sessions)",
                    })
    return findings


def check_url_credentials_in_code(workspace):
    """Check for credentials passed in URL query parameters in code files."""
    findings = []
    code_extensions = {".py", ".js", ".ts", ".rb", ".go", ".java", ".sh", ".bash",
                       ".ps1", ".php", ".rs", ".c", ".cpp", ".cs"}
    code_files = collect_files(workspace, extensions=code_extensions)

    for fpath in code_files:
        if is_binary(fpath):
            continue
        content = read_text_safe(fpath)
        if not content:
            continue
        rel = fpath.relative_to(workspace)
        lines = content.split("\n")
        for line_idx, line in enumerate(lines, 1):
            for pattern_name, pattern in URL_CREDENTIAL_PATTERNS:
                for match in pattern.finditer(line):
                    matched = match.group(1) if match.lastindex else match.group(0)
                    # Skip test/example values
                    if matched.lower() in ("test", "example", "dummy", "xxx"):
                        continue
                    findings.append({
                        "type": "url_credential", "severity": "WARNING",
                        "file": str(rel),
                        "line": line_idx,
                        "detail": f"{pattern_name}: credential in URL query parameter (visible in logs, browser history)",
                        "match": mask_value(matched),
                    })
    return findings


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

def build_inventory(workspace):
    """Build a structured inventory of all credential files."""
    inventory = []
    cred_files = collect_files(
        workspace,
        names=CREDENTIAL_FILES,
        extensions=CREDENTIAL_EXTENSIONS,
    )

    # Also find any .env* files that might not be in the standard set
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if fname.startswith(".env") and fpath not in cred_files:
                cred_files.append(fpath)

    for fpath in cred_files:
        rel = fpath.relative_to(workspace)
        age = file_age_days(fpath)
        cred_type = classify_credential(fpath)
        try:
            size = fpath.stat().st_size
            mtime = datetime.fromtimestamp(
                fpath.stat().st_mtime, tz=timezone.utc
            ).strftime("%Y-%m-%d")
        except (OSError, PermissionError):
            size = 0
            mtime = "unknown"

        stale = age > STALE_THRESHOLD_DAYS if age >= 0 else False

        inventory.append({
            "file": str(rel),
            "type": cred_type,
            "size": size,
            "modified": mtime,
            "age_days": int(age) if age >= 0 else -1,
            "stale": stale,
            "world_readable": is_world_readable(fpath),
        })

    return inventory


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_audit(workspace):
    """Full credential exposure audit."""
    print("=" * 60)
    print("OPENCLAW VAULT — CREDENTIAL AUDIT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    all_findings = []
    all_findings.extend(check_env_permissions(workspace))
    all_findings.extend(check_shell_history(workspace))
    all_findings.extend(check_git_config(workspace))
    all_findings.extend(check_config_credentials(workspace))
    all_findings.extend(check_log_credentials(workspace))
    all_findings.extend(check_gitignore_coverage(workspace))
    all_findings.extend(check_stale_credentials(workspace))

    return _report("AUDIT", all_findings)


def cmd_exposure(workspace):
    """Check for credential exposure vectors."""
    print("=" * 60)
    print("OPENCLAW VAULT — EXPOSURE CHECK")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    all_findings = []
    all_findings.extend(check_env_permissions(workspace))
    all_findings.extend(check_public_directory_exposure(workspace))
    all_findings.extend(check_git_credential_history(workspace))
    all_findings.extend(check_docker_credentials(workspace))
    all_findings.extend(check_shell_aliases(workspace))
    all_findings.extend(check_url_credentials_in_code(workspace))

    return _report("EXPOSURE", all_findings)


def cmd_inventory(workspace):
    """Build and display credential inventory."""
    print("=" * 60)
    print("OPENCLAW VAULT — CREDENTIAL INVENTORY")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    inventory = build_inventory(workspace)

    if not inventory:
        print("No credential files found in workspace.")
        return 0

    # Table header
    print(f"{'File':<40} {'Type':<24} {'Modified':<12} {'Age':<8} {'Status'}")
    print("-" * 100)

    stale_count = 0
    exposed_count = 0
    for item in sorted(inventory, key=lambda x: x["file"]):
        status_parts = []
        if item["stale"]:
            status_parts.append("STALE")
            stale_count += 1
        if item["world_readable"]:
            status_parts.append("EXPOSED")
            exposed_count += 1
        if not status_parts:
            status_parts.append("OK")

        age_str = f"{item['age_days']}d" if item["age_days"] >= 0 else "?"
        status_str = ", ".join(status_parts)

        file_display = item["file"]
        if len(file_display) > 38:
            file_display = "..." + file_display[-35:]

        print(f"  {file_display:<38} {item['type']:<24} {item['modified']:<12} {age_str:<8} {status_str}")

    print("-" * 100)
    print(f"Total: {len(inventory)} credential file(s)")
    if stale_count:
        print(f"  Stale (>{STALE_THRESHOLD_DAYS} days): {stale_count}")
    if exposed_count:
        print(f"  Exposed (world-readable): {exposed_count}")
    print()

    if stale_count or exposed_count:
        print("Upgrade to openclaw-vault-pro for automated credential rotation")
        print("reminders and permission auto-fix.")
        return 1
    return 0


def cmd_status(workspace):
    """Quick summary: credential count, exposure count, staleness warnings."""
    inventory = build_inventory(workspace)
    cred_count = len(inventory)
    stale_count = sum(1 for i in inventory if i["stale"])
    exposed_count = sum(1 for i in inventory if i["world_readable"])

    # Quick exposure scan
    exposure_findings = []
    exposure_findings.extend(check_env_permissions(workspace))
    exposure_findings.extend(check_config_credentials(workspace))

    critical_count = sum(1 for f in exposure_findings if f["severity"] == "CRITICAL")
    warning_count = sum(1 for f in exposure_findings if f["severity"] == "WARNING")

    parts = []
    parts.append(f"{cred_count} credential file(s)")

    if critical_count > 0:
        parts.append(f"{critical_count} CRITICAL exposure(s)")
    if warning_count > 0:
        parts.append(f"{warning_count} warning(s)")
    if stale_count > 0:
        parts.append(f"{stale_count} stale (>{STALE_THRESHOLD_DAYS}d)")
    if exposed_count > 0:
        parts.append(f"{exposed_count} world-readable")

    if critical_count > 0:
        print(f"[CRITICAL] {' | '.join(parts)}")
        return 2
    elif warning_count > 0 or stale_count > 0 or exposed_count > 0:
        print(f"[WARNING] {' | '.join(parts)}")
        return 1
    elif cred_count > 0:
        print(f"[OK] {' | '.join(parts)}")
        return 0
    else:
        print("[OK] No credential files detected")
        return 0


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _report(report_type, findings):
    """Format and print findings, return exit code."""
    critical = [f for f in findings if f["severity"] == "CRITICAL"]
    warnings = [f for f in findings if f["severity"] == "WARNING"]
    infos = [f for f in findings if f["severity"] == "INFO"]

    print("-" * 40)
    print("RESULTS")
    print("-" * 40)

    if not findings:
        print(f"[CLEAN] No credential issues detected.")
        print("=" * 60)
        return 0

    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    for finding in sorted(findings, key=lambda f: severity_order.get(f["severity"], 3)):
        sev = finding["severity"]
        loc = finding["file"]
        if "line" in finding and finding["line"]:
            loc = f"{finding['file']}:{finding['line']}"

        print(f"  [{sev}] {loc}")
        print(f"          {finding['detail']}")
        if "match" in finding and finding["match"]:
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
        print("ACTION REQUIRED: Credential exposure detected.")
        print("Review flagged items and remediate immediately.")
        print()
        print("Upgrade to openclaw-vault-pro for automated remediation:")
        print("  auto-fix permissions, rotation reminders, secure injection")
    elif warnings:
        print("REVIEW NEEDED: Potential credential lifecycle issues detected.")

    print("=" * 60)

    if critical:
        return 2
    elif warnings:
        return 1
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="OpenClaw Vault — Credential lifecycle protection"
    )
    parser.add_argument(
        "command",
        choices=["audit", "exposure", "inventory", "status"],
        nargs="?",
        default=None,
        help="Command to run",
    )
    parser.add_argument("--workspace", "-w", help="Workspace path")
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}", file=sys.stderr)
        sys.exit(1)

    if args.command == "audit":
        sys.exit(cmd_audit(workspace))
    elif args.command == "exposure":
        sys.exit(cmd_exposure(workspace))
    elif args.command == "inventory":
        sys.exit(cmd_inventory(workspace))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))
    elif args.command in ("fix-permissions", "rotate", "policy", "inject", "auto-remediate"):
        print(f"'{args.command}' is a Pro feature.")
        print("Upgrade to openclaw-vault-pro for:")
        print("  fix-permissions, rotate, policy, inject, auto-remediate")
        sys.exit(1)


if __name__ == "__main__":
    main()
