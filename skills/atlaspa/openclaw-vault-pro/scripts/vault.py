#!/usr/bin/env python3
"""OpenClaw Vault Pro — Full Credential Lifecycle Security

Everything in openclaw-vault (free) PLUS automated countermeasures:
auto-fix permissions, quarantine exposed files, rotation tracking,
git history scanning, and automated protection sweeps.

Usage:
    vault.py audit            [--workspace PATH]
    vault.py exposure         [--workspace PATH]
    vault.py inventory        [--workspace PATH]
    vault.py status           [--workspace PATH]
    vault.py fix-permissions  [--workspace PATH]
    vault.py quarantine FILE  [--workspace PATH]
    vault.py unquarantine FILE[--workspace PATH]
    vault.py rotate-check     [--workspace PATH] [--max-age DAYS]
    vault.py gitguard         [--workspace PATH]
    vault.py protect          [--workspace PATH] [--max-age DAYS]

Free version: detect and alert.
Pro version: subvert + quarantine + defend.
"""

import argparse
import io
import json
import os
import re
import shutil
import stat
import subprocess
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

# Git-tracked credential file patterns for gitguard
GIT_CREDENTIAL_GLOBS = [
    "*.env", "*.env.*", ".env", ".env.*",
    "credentials.json", "service-account.json", "secrets.json",
    "*.pem", "*.key", "*.p12", "*.pfx",
    ".npmrc", ".pypirc", ".netrc", ".pgpass", ".my.cnf",
    "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
    "htpasswd", ".htpasswd",
]


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


def quarantine_dir(workspace):
    """Return the vault quarantine directory path."""
    return workspace / ".quarantine" / "vault"


def run_git(workspace, *args):
    """Run a git command in the workspace, return (stdout, returncode)."""
    try:
        result = subprocess.run(
            ["git"] + list(args),
            cwd=str(workspace),
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout, result.returncode
    except FileNotFoundError:
        return "", -1
    except subprocess.TimeoutExpired:
        return "", -2


# ---------------------------------------------------------------------------
# Audit checks (shared with free version)
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
                        "detail": ".env file is world-readable (permissions too open)",
                    })
                elif is_group_readable(fpath):
                    findings.append({
                        "type": "permission", "severity": "WARNING",
                        "file": str(rel),
                        "detail": ".env file is group-readable (consider restricting to owner-only)",
                    })
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
    for hname in SHELL_HISTORY_FILES:
        hpath = home / hname
        if hpath.is_file():
            history_files.append(hpath)
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
    ws_gitconfig = workspace / ".git" / "config"
    if ws_gitconfig.is_file():
        config_paths.append(ws_gitconfig)
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
                    if matched.lower() in (
                        "your_api_key_here", "your_secret_here", "changeme",
                        "xxxxxxxxxxxx", "placeholder", "todo", "fixme",
                        "your-api-key", "your-secret-key", "none", "null",
                        "example", "test", "dummy",
                    ):
                        continue
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
        env_files = collect_files(workspace, names={n for n in CREDENTIAL_FILES if n.startswith(".env")})
        if env_files:
            findings.append({
                "type": "gitignore", "severity": "WARNING",
                "file": ".gitignore",
                "detail": "No .gitignore found -- .env and credential files may be committed to git",
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
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
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
                "detail": f"Credential file is {int(age)} days old (threshold: {STALE_THRESHOLD_DAYS} days) -- consider rotation",
            })
    return findings


# ---------------------------------------------------------------------------
# Exposure checks (shared with free version)
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
    cred_files = collect_files(
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
    for fpath in cred_files:
        rel = fpath.relative_to(workspace)
        findings.append({
            "type": "git_exposure", "severity": "WARNING",
            "file": str(rel),
            "detail": "Credential file exists in a git repository -- verify it is gitignored and not in commit history",
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
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
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
# Free commands
# ---------------------------------------------------------------------------

def cmd_audit(workspace):
    """Full credential exposure audit."""
    print("=" * 60)
    print("OPENCLAW VAULT PRO -- CREDENTIAL AUDIT")
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
    print("OPENCLAW VAULT PRO -- EXPOSURE CHECK")
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
    print("OPENCLAW VAULT PRO -- CREDENTIAL INVENTORY")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    inventory = build_inventory(workspace)

    if not inventory:
        print("No credential files found in workspace.")
        return 0

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
    return 1 if (stale_count or exposed_count) else 0


def cmd_status(workspace):
    """Quick summary: credential count, exposure count, staleness warnings."""
    inventory = build_inventory(workspace)
    cred_count = len(inventory)
    stale_count = sum(1 for i in inventory if i["stale"])
    exposed_count = sum(1 for i in inventory if i["world_readable"])

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
# Pro commands
# ---------------------------------------------------------------------------

def cmd_fix_permissions(workspace):
    """Auto-fix file permissions on credential files.

    Unix: chmod 600 (owner read/write only).
    Windows: icacls to restrict access to current user only.
    """
    print("=" * 60)
    print("OPENCLAW VAULT PRO -- FIX PERMISSIONS")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    cred_files = collect_files(
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
    # Also pick up any .env* files
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS
                   and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if fname.startswith(".env") and fpath not in cred_files:
                cred_files.append(fpath)

    if not cred_files:
        print("No credential files found. Nothing to fix.")
        return 0

    fixed = 0
    skipped = 0
    errors = 0

    for fpath in cred_files:
        rel = fpath.relative_to(workspace)

        if sys.platform == "win32":
            # Windows: use icacls to restrict to current user
            username = os.environ.get("USERNAME", os.environ.get("USER", ""))
            if not username:
                print(f"  [SKIP] {rel} -- cannot determine current user")
                skipped += 1
                continue
            try:
                # Remove inherited permissions and grant only current user full control
                subprocess.run(
                    ["icacls", str(fpath), "/inheritance:r",
                     "/grant:r", f"{username}:(R,W)"],
                    capture_output=True, text=True, timeout=15,
                )
                print(f"  [FIXED] {rel} -- restricted to {username} (R,W)")
                fixed += 1
            except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as exc:
                print(f"  [ERROR] {rel} -- {exc}")
                errors += 1
        else:
            # Unix: chmod 600
            try:
                current_mode = fpath.stat().st_mode
                desired = stat.S_IRUSR | stat.S_IWUSR  # 0o600
                if (current_mode & 0o777) == desired:
                    print(f"  [OK]    {rel} -- already 600")
                    skipped += 1
                    continue
                os.chmod(fpath, desired)
                print(f"  [FIXED] {rel} -- set to 600 (owner read/write only)")
                fixed += 1
            except (OSError, PermissionError) as exc:
                print(f"  [ERROR] {rel} -- {exc}")
                errors += 1

    print()
    print("-" * 40)
    print(f"Fixed: {fixed}  |  Already OK: {skipped}  |  Errors: {errors}")
    print("=" * 60)

    return 2 if errors else (0 if fixed == 0 else 0)


def cmd_quarantine(workspace, target_file):
    """Move an exposed credential file to .quarantine/vault/ with metadata."""
    print("=" * 60)
    print("OPENCLAW VAULT PRO -- QUARANTINE")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    # Resolve the target file
    target = Path(target_file)
    if not target.is_absolute():
        target = workspace / target

    if not target.is_file():
        print(f"[ERROR] File not found: {target_file}", file=sys.stderr)
        return 1

    try:
        rel = target.relative_to(workspace)
    except ValueError:
        print(f"[ERROR] File is outside workspace: {target_file}", file=sys.stderr)
        return 1

    qdir = quarantine_dir(workspace)
    qdir.mkdir(parents=True, exist_ok=True)

    # Generate a unique quarantine name (preserve extension, add timestamp)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_name = str(rel).replace(os.sep, "__").replace("/", "__")
    q_name = f"{ts}__{safe_name}"
    q_path = qdir / q_name

    # Write metadata sidecar
    metadata = {
        "original_path": str(rel),
        "original_absolute": str(target),
        "quarantined_at": now_iso(),
        "reason": "Exposed credential file quarantined by openclaw-vault-pro",
        "quarantine_file": q_name,
    }
    meta_path = qdir / f"{q_name}.meta.json"

    try:
        shutil.move(str(target), str(q_path))
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    except (OSError, PermissionError) as exc:
        print(f"[ERROR] Failed to quarantine: {exc}", file=sys.stderr)
        return 1

    print(f"  [QUARANTINED] {rel}")
    print(f"    Moved to:   .quarantine/vault/{q_name}")
    print(f"    Metadata:   .quarantine/vault/{q_name}.meta.json")
    print(f"    Reason:     Exposed credential file")
    print()
    print("Use 'unquarantine' to restore this file to its original location.")
    print("=" * 60)
    return 0


def cmd_unquarantine(workspace, target_file):
    """Restore a quarantined credential file to its original location."""
    print("=" * 60)
    print("OPENCLAW VAULT PRO -- UNQUARANTINE")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    qdir = quarantine_dir(workspace)
    if not qdir.is_dir():
        print("[ERROR] No quarantine directory found.", file=sys.stderr)
        return 1

    # Search for matching quarantined file by original path or quarantine name
    target_normalized = target_file.replace(os.sep, "__").replace("/", "__")
    found_meta = None
    found_qfile = None

    for meta_file in sorted(qdir.glob("*.meta.json"), reverse=True):
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue

        orig = meta.get("original_path", "")
        qname = meta.get("quarantine_file", "")

        # Match by original path or by quarantine file name or by partial name
        if (orig == target_file
                or qname == target_file
                or orig.replace(os.sep, "__").replace("/", "__") == target_normalized
                or target_file in orig
                or target_file in qname):
            q_candidate = qdir / qname
            if q_candidate.is_file():
                found_meta = meta
                found_qfile = q_candidate
                break

    if not found_meta or not found_qfile:
        print(f"[ERROR] No quarantined file matching '{target_file}' found.", file=sys.stderr)
        print()
        # List available quarantined files
        metas = list(qdir.glob("*.meta.json"))
        if metas:
            print("Available quarantined files:")
            for mf in sorted(metas):
                try:
                    with open(mf, "r", encoding="utf-8") as f:
                        m = json.load(f)
                    print(f"  {m.get('original_path', '?')} (quarantined {m.get('quarantined_at', '?')})")
                except (OSError, json.JSONDecodeError):
                    pass
        return 1

    original_path = workspace / found_meta["original_path"]

    # Ensure parent directory exists
    original_path.parent.mkdir(parents=True, exist_ok=True)

    if original_path.exists():
        print(f"[WARNING] Original location already has a file: {found_meta['original_path']}")
        print("  The existing file will be overwritten.")
        print()

    try:
        shutil.move(str(found_qfile), str(original_path))
        # Remove metadata file
        meta_path = qdir / f"{found_meta['quarantine_file']}.meta.json"
        if meta_path.is_file():
            meta_path.unlink()
    except (OSError, PermissionError) as exc:
        print(f"[ERROR] Failed to restore: {exc}", file=sys.stderr)
        return 1

    print(f"  [RESTORED] {found_meta['original_path']}")
    print(f"    From:     .quarantine/vault/{found_meta['quarantine_file']}")
    print(f"    To:       {found_meta['original_path']}")
    print()
    print("File restored. Consider running 'fix-permissions' to secure it.")
    print("=" * 60)
    return 0


def cmd_rotate_check(workspace, max_age_days=None):
    """Check credential file ages and generate rotation recommendations."""
    threshold = max_age_days if max_age_days is not None else STALE_THRESHOLD_DAYS

    print("=" * 60)
    print("OPENCLAW VAULT PRO -- ROTATION CHECK")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print(f"Max age threshold: {threshold} days")
    print()

    cred_files = collect_files(
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
    # Also gather .env* files
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS
                   and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if fname.startswith(".env") and fpath not in cred_files:
                cred_files.append(fpath)

    if not cred_files:
        print("No credential files found. Nothing to check.")
        return 0

    overdue = []
    approaching = []
    ok = []

    for fpath in cred_files:
        age = file_age_days(fpath)
        if age < 0:
            continue
        rel = fpath.relative_to(workspace)
        cred_type = classify_credential(fpath)
        entry = {
            "file": str(rel),
            "type": cred_type,
            "age_days": int(age),
            "threshold": threshold,
        }

        if age > threshold:
            entry["status"] = "OVERDUE"
            entry["overdue_by"] = int(age - threshold)
            overdue.append(entry)
        elif age > threshold * 0.75:
            entry["status"] = "APPROACHING"
            entry["days_remaining"] = int(threshold - age)
            approaching.append(entry)
        else:
            entry["status"] = "OK"
            entry["days_remaining"] = int(threshold - age)
            ok.append(entry)

    # Print rotation schedule
    if overdue:
        print("OVERDUE -- Rotate immediately:")
        print("-" * 40)
        for item in sorted(overdue, key=lambda x: -x["age_days"]):
            print(f"  [OVERDUE]     {item['file']}")
            print(f"                Type: {item['type']}  |  Age: {item['age_days']}d  |  Overdue by: {item['overdue_by']}d")
            print()

    if approaching:
        print("APPROACHING -- Rotate soon:")
        print("-" * 40)
        for item in sorted(approaching, key=lambda x: x["days_remaining"]):
            print(f"  [APPROACHING] {item['file']}")
            print(f"                Type: {item['type']}  |  Age: {item['age_days']}d  |  {item['days_remaining']}d remaining")
            print()

    if ok:
        print(f"OK -- Within rotation window ({threshold}d):")
        print("-" * 40)
        for item in sorted(ok, key=lambda x: -x["age_days"]):
            print(f"  [OK]          {item['file']}")
            print(f"                Type: {item['type']}  |  Age: {item['age_days']}d  |  {item['days_remaining']}d remaining")
            print()

    # Summary
    print("=" * 60)
    print("ROTATION SCHEDULE SUMMARY")
    print("-" * 40)
    print(f"  Overdue:     {len(overdue)}")
    print(f"  Approaching: {len(approaching)}")
    print(f"  OK:          {len(ok)}")
    print(f"  Total:       {len(overdue) + len(approaching) + len(ok)}")
    print("=" * 60)

    if overdue:
        return 2
    elif approaching:
        return 1
    return 0


def cmd_gitguard(workspace):
    """Scan git history for accidentally committed credentials.

    Uses git log --diff-filter=A to find credential files that were added
    (and possibly later removed) from the repository.
    """
    print("=" * 60)
    print("OPENCLAW VAULT PRO -- GIT GUARD")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print()

    git_dir = workspace / ".git"
    if not git_dir.is_dir():
        print("[INFO] Not a git repository. Git guard requires a git repo.")
        print("=" * 60)
        return 0

    # Check git is available
    stdout, rc = run_git(workspace, "rev-parse", "--is-inside-work-tree")
    if rc != 0:
        print("[ERROR] git is not available or this is not a valid git repo.", file=sys.stderr)
        return 1

    findings = []

    # Strategy 1: Find credential files that were ever added via git log
    # Use --diff-filter=A to find files that were Added at some point
    # Check each credential pattern individually
    credential_names_to_check = list(CREDENTIAL_FILES) + [
        f"*{ext}" for ext in CREDENTIAL_EXTENSIONS
    ]

    print("Scanning git history for credential files...")
    print()

    # Search for files added with credential-like names
    stdout, rc = run_git(
        workspace, "log", "--all", "--diff-filter=A",
        "--name-only", "--pretty=format:---COMMIT---%H---%ai---"
    )

    if rc != 0:
        print("[WARNING] Could not read git log. Skipping history scan.")
    else:
        current_commit = ""
        current_date = ""
        seen_files = set()

        for line in stdout.split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.startswith("---COMMIT---"):
                parts = line.split("---")
                if len(parts) >= 4:
                    current_commit = parts[2][:12]
                    current_date = parts[3].split()[0] if parts[3] else "?"
                continue

            # Check if this file matches credential patterns
            fname = Path(line).name
            fsuffix = Path(line).suffix.lower()
            is_cred = (
                fname in CREDENTIAL_FILES
                or fsuffix in CREDENTIAL_EXTENSIONS
                or fname.startswith(".env")
            )

            if is_cred and line not in seen_files:
                seen_files.add(line)
                # Check if the file still exists in the working tree
                still_exists = (workspace / line).is_file()
                # Check if it exists in HEAD
                head_stdout, head_rc = run_git(
                    workspace, "cat-file", "-e", f"HEAD:{line}"
                )
                in_head = (head_rc == 0)

                if still_exists and in_head:
                    severity = "CRITICAL"
                    detail = "Credential file is tracked in git (currently in HEAD and working tree)"
                elif not still_exists and not in_head:
                    severity = "WARNING"
                    detail = "Credential file was added then removed -- may still be in git history"
                elif in_head and not still_exists:
                    severity = "WARNING"
                    detail = "Credential file is in HEAD but missing from working tree"
                else:
                    severity = "WARNING"
                    detail = "Credential file exists in working tree but not in HEAD (check older commits)"

                findings.append({
                    "file": line,
                    "severity": severity,
                    "commit": current_commit,
                    "date": current_date,
                    "detail": detail,
                    "in_head": in_head,
                    "in_worktree": still_exists,
                })

    # Strategy 2: Check for .env in current git tracked files
    stdout, rc = run_git(workspace, "ls-files")
    if rc == 0:
        for tracked_file in stdout.strip().split("\n"):
            tracked_file = tracked_file.strip()
            if not tracked_file:
                continue
            fname = Path(tracked_file).name
            fsuffix = Path(tracked_file).suffix.lower()
            is_cred = (
                fname in CREDENTIAL_FILES
                or fsuffix in CREDENTIAL_EXTENSIONS
                or fname.startswith(".env")
            )
            if is_cred:
                already = any(f["file"] == tracked_file for f in findings)
                if not already:
                    findings.append({
                        "file": tracked_file,
                        "severity": "CRITICAL",
                        "commit": "HEAD",
                        "date": "current",
                        "detail": "Credential file is currently tracked by git",
                        "in_head": True,
                        "in_worktree": (workspace / tracked_file).is_file(),
                    })

    # Print results
    if not findings:
        print("[CLEAN] No credential files found in git history.")
        print("=" * 60)
        return 0

    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    for finding in sorted(findings, key=lambda f: severity_order.get(f["severity"], 3)):
        sev = finding["severity"]
        print(f"  [{sev}] {finding['file']}")
        print(f"          {finding['detail']}")
        print(f"          Commit: {finding['commit']}  |  Date: {finding['date']}")
        if finding.get("in_head"):
            print(f"          Still in HEAD: YES -- credential is accessible via git")
        if not finding.get("in_worktree") and not finding.get("in_head"):
            print(f"          WARNING: File removed but may persist in git reflog/history")
        print()

    critical = sum(1 for f in findings if f["severity"] == "CRITICAL")
    warnings = sum(1 for f in findings if f["severity"] == "WARNING")

    print("-" * 40)
    print("SUMMARY")
    print("-" * 40)
    print(f"  Critical: {critical}")
    print(f"  Warnings: {warnings}")
    print(f"  Total:    {len(findings)}")
    print()

    if critical:
        print("ACTION REQUIRED: Credentials found in git history.")
        print("  1. Remove tracked credential files: git rm --cached <file>")
        print("  2. Add to .gitignore")
        print("  3. Consider git filter-branch or BFG to purge from history")
        print("  4. Rotate any exposed credentials immediately")
    elif warnings:
        print("REVIEW: Credential files found in git history.")
        print("  Consider purging with BFG Repo-Cleaner if these contained real secrets.")

    print("=" * 60)
    return 2 if critical else (1 if warnings else 0)


def cmd_protect(workspace, max_age_days=None):
    """Full automated protection sweep.

    Runs all audit and exposure checks, auto-fixes permissions,
    quarantines high-risk exposed credential files, checks rotation,
    and produces a comprehensive report. Recommended for session startup.
    """
    threshold = max_age_days if max_age_days is not None else STALE_THRESHOLD_DAYS

    print("=" * 60)
    print("OPENCLAW VAULT PRO -- PROTECT")
    print("=" * 60)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {now_iso()}")
    print(f"Mode: Full automated protection sweep")
    print()

    actions_taken = []
    overall_exit = 0

    # --- Phase 1: Audit ---
    print("[1/5] Running credential audit...")
    audit_findings = []
    audit_findings.extend(check_env_permissions(workspace))
    audit_findings.extend(check_shell_history(workspace))
    audit_findings.extend(check_git_config(workspace))
    audit_findings.extend(check_config_credentials(workspace))
    audit_findings.extend(check_log_credentials(workspace))
    audit_findings.extend(check_gitignore_coverage(workspace))
    audit_findings.extend(check_stale_credentials(workspace))

    audit_critical = sum(1 for f in audit_findings if f["severity"] == "CRITICAL")
    audit_warnings = sum(1 for f in audit_findings if f["severity"] == "WARNING")
    print(f"       Found {audit_critical} critical, {audit_warnings} warnings, {len(audit_findings)} total")
    print()

    # --- Phase 2: Exposure ---
    print("[2/5] Checking exposure vectors...")
    exposure_findings = []
    exposure_findings.extend(check_public_directory_exposure(workspace))
    exposure_findings.extend(check_docker_credentials(workspace))
    exposure_findings.extend(check_shell_aliases(workspace))
    exposure_findings.extend(check_url_credentials_in_code(workspace))

    exp_critical = sum(1 for f in exposure_findings if f["severity"] == "CRITICAL")
    exp_warnings = sum(1 for f in exposure_findings if f["severity"] == "WARNING")
    print(f"       Found {exp_critical} critical, {exp_warnings} warnings, {len(exposure_findings)} total")
    print()

    # --- Phase 3: Fix permissions ---
    print("[3/5] Fixing credential file permissions...")
    cred_files = collect_files(
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
    # Also gather .env* files
    for root, dirs, filenames in os.walk(workspace):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS
                   and not d.startswith(".quarantine")]
        rel_root = Path(root).relative_to(workspace)
        parts = rel_root.parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fname in filenames:
            fpath = Path(root) / fname
            if fname.startswith(".env") and fpath not in cred_files:
                cred_files.append(fpath)

    perm_fixed = 0
    for fpath in cred_files:
        rel = fpath.relative_to(workspace)
        if sys.platform == "win32":
            username = os.environ.get("USERNAME", os.environ.get("USER", ""))
            if username:
                try:
                    subprocess.run(
                        ["icacls", str(fpath), "/inheritance:r",
                         "/grant:r", f"{username}:(R,W)"],
                        capture_output=True, text=True, timeout=15,
                    )
                    perm_fixed += 1
                except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
                    pass
        else:
            try:
                current_mode = fpath.stat().st_mode
                desired = stat.S_IRUSR | stat.S_IWUSR  # 0o600
                if (current_mode & 0o777) != desired:
                    os.chmod(fpath, desired)
                    perm_fixed += 1
            except (OSError, PermissionError):
                pass

    if perm_fixed:
        actions_taken.append(f"Fixed permissions on {perm_fixed} file(s)")
    print(f"       Fixed {perm_fixed} file(s)")
    print()

    # --- Phase 4: Quarantine high-risk exposed files ---
    print("[4/5] Quarantining high-risk exposed files...")
    quarantined = 0
    # Quarantine credential files found in public directories
    for finding in exposure_findings:
        if finding["severity"] == "CRITICAL" and finding["type"] == "public_exposure":
            target = workspace / finding["file"]
            if target.is_file():
                qdir = quarantine_dir(workspace)
                qdir.mkdir(parents=True, exist_ok=True)
                ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                safe_name = finding["file"].replace(os.sep, "__").replace("/", "__")
                q_name = f"{ts}__{safe_name}"
                q_path = qdir / q_name
                metadata = {
                    "original_path": finding["file"],
                    "original_absolute": str(target),
                    "quarantined_at": now_iso(),
                    "reason": f"Auto-quarantined: {finding['detail']}",
                    "quarantine_file": q_name,
                }
                try:
                    shutil.move(str(target), str(q_path))
                    meta_path = qdir / f"{q_name}.meta.json"
                    with open(meta_path, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=2)
                    print(f"       [QUARANTINED] {finding['file']}")
                    quarantined += 1
                except (OSError, PermissionError):
                    pass

    if quarantined:
        actions_taken.append(f"Quarantined {quarantined} high-risk file(s)")
    else:
        print("       No files needed quarantine")
    print()

    # --- Phase 5: Rotation check ---
    print("[5/5] Checking credential rotation...")
    # Re-collect since some may have been quarantined
    remaining_creds = collect_files(
        workspace, names=CREDENTIAL_FILES, extensions=CREDENTIAL_EXTENSIONS,
    )
    overdue_count = 0
    approaching_count = 0
    for fpath in remaining_creds:
        age = file_age_days(fpath)
        if age < 0:
            continue
        if age > threshold:
            overdue_count += 1
        elif age > threshold * 0.75:
            approaching_count += 1

    if overdue_count:
        actions_taken.append(f"Found {overdue_count} credential(s) overdue for rotation")
    print(f"       Overdue: {overdue_count}  |  Approaching: {approaching_count}")
    print()

    # --- Final report ---
    all_findings = audit_findings + exposure_findings
    total_critical = sum(1 for f in all_findings if f["severity"] == "CRITICAL")
    total_warnings = sum(1 for f in all_findings if f["severity"] == "WARNING")

    print("=" * 60)
    print("PROTECTION REPORT")
    print("=" * 60)

    if actions_taken:
        print()
        print("Actions taken:")
        for action in actions_taken:
            print(f"  + {action}")
        print()

    if all_findings:
        print("Remaining findings:")
        severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
        for finding in sorted(all_findings, key=lambda f: severity_order.get(f["severity"], 3)):
            # Skip findings for files we quarantined
            if any(finding.get("file", "") in a for a in actions_taken):
                continue
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
    print(f"  Audit findings:    {len(audit_findings)} ({audit_critical} critical)")
    print(f"  Exposure findings: {len(exposure_findings)} ({exp_critical} critical)")
    print(f"  Permissions fixed: {perm_fixed}")
    print(f"  Files quarantined: {quarantined}")
    print(f"  Rotation overdue:  {overdue_count}")
    print(f"  Actions taken:     {len(actions_taken)}")
    print()

    if total_critical or overdue_count:
        overall_exit = 2
        print("STATUS: CRITICAL -- Immediate action required on remaining findings")
    elif total_warnings or approaching_count:
        overall_exit = 1
        print("STATUS: WARNING -- Review remaining findings")
    else:
        print("STATUS: PROTECTED -- All credential checks passed")

    print("=" * 60)
    return overall_exit


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
        print("[CLEAN] No credential issues detected.")
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
        print("Run 'protect' for automated remediation.")
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
        description="OpenClaw Vault Pro -- Full credential lifecycle security"
    )
    parser.add_argument(
        "command",
        choices=[
            "audit", "exposure", "inventory", "status",
            "fix-permissions", "quarantine", "unquarantine",
            "rotate-check", "gitguard", "protect",
        ],
        nargs="?",
        default=None,
        help="Command to run",
    )
    parser.add_argument("target", nargs="?", default=None,
                        help="Target file (for quarantine/unquarantine)")
    parser.add_argument("--workspace", "-w", help="Workspace path")
    parser.add_argument("--max-age", type=int, default=None,
                        help="Max credential age in days (default: 90)")
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    workspace = resolve_workspace(args.workspace)
    if not workspace.exists():
        print(f"Workspace not found: {workspace}", file=sys.stderr)
        sys.exit(1)

    # Free commands
    if args.command == "audit":
        sys.exit(cmd_audit(workspace))
    elif args.command == "exposure":
        sys.exit(cmd_exposure(workspace))
    elif args.command == "inventory":
        sys.exit(cmd_inventory(workspace))
    elif args.command == "status":
        sys.exit(cmd_status(workspace))
    # Pro commands
    elif args.command == "fix-permissions":
        sys.exit(cmd_fix_permissions(workspace))
    elif args.command == "quarantine":
        if not args.target:
            print("Usage: vault.py quarantine <file>", file=sys.stderr)
            sys.exit(1)
        sys.exit(cmd_quarantine(workspace, args.target))
    elif args.command == "unquarantine":
        if not args.target:
            print("Usage: vault.py unquarantine <file>", file=sys.stderr)
            sys.exit(1)
        sys.exit(cmd_unquarantine(workspace, args.target))
    elif args.command == "rotate-check":
        sys.exit(cmd_rotate_check(workspace, args.max_age))
    elif args.command == "gitguard":
        sys.exit(cmd_gitguard(workspace))
    elif args.command == "protect":
        sys.exit(cmd_protect(workspace, args.max_age))


if __name__ == "__main__":
    main()
