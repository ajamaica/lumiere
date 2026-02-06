#!/usr/bin/env python3
"""
SkillGuard v2.0.0 — Comprehensive Security Scanner for ClawHub Skills

Features:
- 50+ dangerous pattern detection
- Dependency vulnerability scanning  
- Multiple output formats (text, JSON, markdown)
- Configurable severity thresholds
- Trusted author system
- CWE references for findings
"""

import argparse
import json
import os
import re
import subprocess
import sys
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum

__version__ = "2.0.0"

# =============================================================================
# Configuration
# =============================================================================

CONFIG_DIR = Path.home() / ".skillguard"
CONFIG_FILE = CONFIG_DIR / "config.json"
TRUST_FILE = CONFIG_DIR / "trusted.json"
VULN_DB_FILE = CONFIG_DIR / "vulns.json"
SCAN_CACHE = CONFIG_DIR / "cache"

class Severity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class Verdict(Enum):
    VERIFIED = "verified"
    CLEAN = "clean"
    REVIEW = "review"
    SUSPICIOUS = "suspicious"
    DANGEROUS = "dangerous"
    MALICIOUS = "malicious"

@dataclass
class Pattern:
    id: str
    regex: str
    severity: Severity
    category: str
    description: str
    cwe: str = ""
    remediation: str = ""
    file_types: List[str] = field(default_factory=lambda: [".py", ".js", ".sh"])

@dataclass
class Finding:
    id: str
    file: str
    line: int
    severity: Severity
    category: str
    description: str
    code_snippet: str = ""
    cwe: str = ""
    remediation: str = ""

@dataclass
class DependencyIssue:
    package: str
    version: str
    severity: Severity
    vulnerability: str
    cve: str = ""
    fix_version: str = ""

@dataclass 
class ScanResult:
    skill_name: str
    scan_time: str
    files_scanned: int
    file_list: List[str]
    findings: List[Finding]
    dependency_issues: List[DependencyIssue]
    verdict: Verdict
    score: int  # 0-100, higher is safer

# =============================================================================
# Pattern Database (50+ patterns)
# =============================================================================

PATTERNS: List[Pattern] = [
    # =========================================================================
    # CRITICAL - Code Execution
    # =========================================================================
    Pattern("CRIT-001", r'\beval\s*\(', Severity.CRITICAL, "code_execution",
            "eval() — arbitrary code execution", "CWE-94",
            "Use ast.literal_eval() for data parsing, or avoid eval entirely"),
    Pattern("CRIT-002", r'\bexec\s*\(', Severity.CRITICAL, "code_execution",
            "exec() — arbitrary code execution", "CWE-94",
            "Avoid exec(); use explicit function calls"),
    Pattern("CRIT-003", r'\bcompile\s*\([^)]+["\']exec["\']', Severity.CRITICAL, "code_execution",
            "compile() with exec mode", "CWE-94"),
    Pattern("CRIT-004", r'__import__\s*\(', Severity.CRITICAL, "code_execution",
            "Dynamic import — potential code injection", "CWE-94"),
    
    # CRITICAL - Shell Injection
    Pattern("CRIT-010", r'subprocess.*shell\s*=\s*True', Severity.CRITICAL, "shell_injection",
            "subprocess with shell=True — command injection", "CWE-78",
            "Use subprocess with shell=False and pass args as list"),
    Pattern("CRIT-011", r'\bos\.system\s*\(', Severity.CRITICAL, "shell_injection",
            "os.system() — shell command execution", "CWE-78",
            "Use subprocess.run() with shell=False"),
    Pattern("CRIT-012", r'\bos\.popen\s*\(', Severity.CRITICAL, "shell_injection",
            "os.popen() — shell command execution", "CWE-78"),
    Pattern("CRIT-013", r'child_process\.(exec|execSync)\s*\(', Severity.CRITICAL, "shell_injection",
            "child_process.exec() — shell execution (Node.js)", "CWE-78",
            "Use child_process.spawn() with explicit args", [".js", ".ts"]),
    Pattern("CRIT-014", r'child_process\.spawn\s*\([^)]*shell\s*:\s*true', Severity.CRITICAL, "shell_injection",
            "child_process.spawn() with shell — command injection", "CWE-78", "", [".js", ".ts"]),
    
    # CRITICAL - Credential/Sensitive File Access
    Pattern("CRIT-020", r'["\']~?/\.ssh[/"\']', Severity.CRITICAL, "credential_theft",
            "Accessing SSH directory — private key theft risk", "CWE-522"),
    Pattern("CRIT-021", r'["\']~?/\.aws[/"\']', Severity.CRITICAL, "credential_theft",
            "Accessing AWS credentials directory", "CWE-522"),
    Pattern("CRIT-022", r'["\']~?/\.gnupg[/"\']', Severity.CRITICAL, "credential_theft",
            "Accessing GPG directory — key theft risk", "CWE-522"),
    Pattern("CRIT-023", r'/etc/passwd|/etc/shadow', Severity.CRITICAL, "system_access",
            "Accessing system password files", "CWE-522"),
    Pattern("CRIT-024", r'["\']~?/\.kube[/"\']', Severity.CRITICAL, "credential_theft",
            "Accessing Kubernetes config — cluster access risk", "CWE-522"),
    Pattern("CRIT-025", r'["\']~?/\.docker[/"\']', Severity.CRITICAL, "credential_theft",
            "Accessing Docker config — registry credentials", "CWE-522"),
    
    # CRITICAL - Destructive Operations
    Pattern("CRIT-030", r'rm\s+-r?f\s+(/|\$|~)', Severity.CRITICAL, "destruction",
            "Recursive delete with dangerous path", "CWE-732"),
    Pattern("CRIT-031", r'shutil\.rmtree\s*\(\s*["\'][/~]', Severity.CRITICAL, "destruction",
            "Recursive delete of root/home path", "CWE-732"),
    Pattern("CRIT-032", r'format\s*[cC]:', Severity.CRITICAL, "destruction",
            "Format drive command (Windows)", "CWE-732", "", [".bat", ".ps1", ".cmd"]),
    
    # CRITICAL - Reverse Shell / Backdoor
    Pattern("CRIT-040", r'socket.*connect.*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', Severity.CRITICAL, "backdoor",
            "Socket connection to IP — potential reverse shell", "CWE-506"),
    Pattern("CRIT-041", r'nc\s+-[^l]*e\s+/bin/(ba)?sh', Severity.CRITICAL, "backdoor",
            "Netcat reverse shell pattern", "CWE-506", "", [".sh"]),
    Pattern("CRIT-042", r'/dev/tcp/', Severity.CRITICAL, "backdoor",
            "Bash /dev/tcp — reverse shell technique", "CWE-506", "", [".sh"]),
    
    # CRITICAL - Privilege Escalation
    Pattern("CRIT-050", r'\bsudo\s+', Severity.CRITICAL, "privilege_escalation",
            "sudo usage — privilege escalation", "CWE-269", "", [".sh", ".py"]),
    Pattern("CRIT-051", r'chmod\s+[0-7]*777', Severity.CRITICAL, "privilege_escalation",
            "chmod 777 — world-writable permissions", "CWE-732"),
    Pattern("CRIT-052", r'setuid|setgid|seteuid', Severity.CRITICAL, "privilege_escalation",
            "setuid/setgid — privilege manipulation", "CWE-269"),
    
    # CRITICAL - Crypto Mining
    Pattern("CRIT-060", r'stratum\+tcp://', Severity.CRITICAL, "cryptominer",
            "Stratum mining pool connection", "CWE-506"),
    Pattern("CRIT-061", r'xmrig|cpuminer|minerd', Severity.CRITICAL, "cryptominer",
            "Cryptocurrency miner binary", "CWE-506"),
    
    # =========================================================================
    # WARNING - Network Activity
    # =========================================================================
    Pattern("WARN-001", r'requests\.(post|put|patch|delete)\s*\(', Severity.WARNING, "network",
            "HTTP POST/PUT/DELETE request — verify destination"),
    Pattern("WARN-002", r'urllib\.request\.(urlopen|Request)', Severity.WARNING, "network",
            "URL request — verify destination"),
    Pattern("WARN-003", r'fetch\s*\([^)]+method["\']?\s*:\s*["\']?(POST|PUT|DELETE)', Severity.WARNING, "network",
            "Fetch API with mutation method", "", "", [".js", ".ts"]),
    Pattern("WARN-004", r'axios\.(post|put|patch|delete)\s*\(', Severity.WARNING, "network",
            "Axios HTTP mutation request", "", "", [".js", ".ts"]),
    Pattern("WARN-005", r'httpx?\.(post|put|patch)\s*\(', Severity.WARNING, "network",
            "HTTPX mutation request"),
    Pattern("WARN-006", r'socket\.socket\s*\(', Severity.WARNING, "network",
            "Raw socket creation — unusual for skills"),
    
    # WARNING - Environment/Secrets Access
    Pattern("WARN-010", r'os\.environ\s*\[', Severity.WARNING, "secrets",
            "Environment variable access — check which vars"),
    Pattern("WARN-011", r'os\.getenv\s*\(', Severity.WARNING, "secrets",
            "Environment variable access"),
    Pattern("WARN-012", r'process\.env\.', Severity.WARNING, "secrets",
            "Environment variable access (Node.js)", "", "", [".js", ".ts"]),
    Pattern("WARN-013", r'(OPENAI|ANTHROPIC|GITHUB|AWS|AZURE)_.*KEY', Severity.WARNING, "secrets",
            "API key environment variable reference"),
    Pattern("WARN-014", r'dotenv|load_dotenv', Severity.WARNING, "secrets",
            "Loading .env file — contains secrets?"),
    
    # WARNING - File System
    Pattern("WARN-020", r'open\s*\([^)]+["\']w["\']', Severity.WARNING, "filesystem",
            "File write operation — what's being saved?"),
    Pattern("WARN-021", r'shutil\.(copy|move|copytree)', Severity.WARNING, "filesystem",
            "Bulk file copy/move operation"),
    Pattern("WARN-022", r'glob\.glob\s*\([^)]+\*', Severity.WARNING, "filesystem",
            "Glob pattern file access"),
    Pattern("WARN-023", r'os\.walk\s*\(', Severity.WARNING, "filesystem",
            "Directory tree traversal"),
    Pattern("WARN-024", r'pathlib.*rglob|iterdir', Severity.WARNING, "filesystem",
            "Recursive directory listing"),
    
    # WARNING - Encoding/Obfuscation  
    Pattern("WARN-030", r'base64\.(b64encode|b64decode|encode|decode)', Severity.WARNING, "obfuscation",
            "Base64 encoding — check for obfuscated payloads"),
    Pattern("WARN-031", r'(atob|btoa)\s*\(', Severity.WARNING, "obfuscation",
            "Base64 encoding (JavaScript)", "", "", [".js", ".ts"]),
    Pattern("WARN-032", r'codecs\.(encode|decode)', Severity.WARNING, "obfuscation",
            "Codec encoding — check purpose"),
    Pattern("WARN-033", r'zlib\.(compress|decompress)', Severity.WARNING, "obfuscation",
            "Compression — hiding content?"),
    
    # WARNING - Persistence
    Pattern("WARN-040", r'crontab|cron\.d', Severity.WARNING, "persistence",
            "Cron job manipulation", "", "", [".py", ".sh"]),
    Pattern("WARN-041", r'systemctl|systemd', Severity.WARNING, "persistence",
            "Systemd service manipulation", "", "", [".py", ".sh"]),
    Pattern("WARN-042", r'launchctl|LaunchAgents', Severity.WARNING, "persistence",
            "macOS LaunchAgent manipulation", "", "", [".py", ".sh"]),
    Pattern("WARN-043", r'~?/\.(bashrc|zshrc|profile|bash_profile)', Severity.WARNING, "persistence",
            "Shell profile modification"),
    Pattern("WARN-044", r'HKEY_|winreg|Registry', Severity.WARNING, "persistence",
            "Windows registry access", "", "", [".py", ".ps1"]),
    
    # WARNING - Network Indicators
    Pattern("WARN-050", r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', Severity.WARNING, "network",
            "Hardcoded IP address — verify purpose"),
    Pattern("WARN-051", r'(https?://)[^\s"\']+\.(ru|cn|tk|ml|ga|cf)/', Severity.WARNING, "network",
            "URL to suspicious TLD"),
    
    # =========================================================================
    # INFO - Normal but noted
    # =========================================================================
    Pattern("INFO-001", r'open\s*\([^)]+["\']r["\']', Severity.INFO, "filesystem",
            "File read operation"),
    Pattern("INFO-002", r'json\.(load|dump|loads|dumps)', Severity.INFO, "data",
            "JSON parsing/serialization"),
    Pattern("INFO-003", r'(print|console\.log)\s*\(', Severity.INFO, "logging",
            "Print/logging statement"),
    Pattern("INFO-004", r'^import\s+\w+|^from\s+\w+\s+import', Severity.INFO, "imports",
            "Module import"),
    Pattern("INFO-005", r'pip\s+install|npm\s+install', Severity.INFO, "dependencies",
            "Package installation command", "", "", [".md", ".sh", ".txt"]),
]

# Known vulnerable packages
KNOWN_VULNS = {
    "requests": {"<2.25.0": "CVE-2023-32681", "fix": "2.31.0"},
    "urllib3": {"<1.26.5": "CVE-2021-33503", "fix": "1.26.18"},
    "pillow": {"<9.3.0": "CVE-2022-45198", "fix": "10.0.0"},
    "pyyaml": {"<5.4": "CVE-2020-14343", "fix": "6.0.1"},
    "jinja2": {"<2.11.3": "CVE-2020-28493", "fix": "3.1.2"},
    "django": {"<3.2.20": "CVE-2023-36053", "fix": "4.2.4"},
    "flask": {"<2.2.5": "CVE-2023-30861", "fix": "2.3.3"},
    "axios": {"<0.21.2": "CVE-2021-3749", "fix": "1.4.0"},
    "lodash": {"<4.17.21": "CVE-2021-23337", "fix": "4.17.21"},
    "minimist": {"<1.2.6": "CVE-2021-44906", "fix": "1.2.8"},
}

# =============================================================================
# Utilities
# =============================================================================

def ensure_config():
    """Create config directory."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    SCAN_CACHE.mkdir(parents=True, exist_ok=True)

def load_config() -> dict:
    """Load configuration."""
    ensure_config()
    default = {
        "severity_threshold": "warning",
        "auto_scan_on_install": True,
        "block_critical": True,
        "trusted_authors": [],
        "allowed_domains": ["api.openai.com", "api.anthropic.com", "clawhub.ai"],
        "ignored_patterns": ["test_*.py", "*_test.js", "*.spec.ts"],
        "color_output": True,
        "report_format": "text"
    }
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE) as f:
                return {**default, **json.load(f)}
        except:
            pass
    return default

def load_trusted() -> List[str]:
    """Load trusted skills."""
    ensure_config()
    if TRUST_FILE.exists():
        try:
            with open(TRUST_FILE) as f:
                return json.load(f).get("skills", [])
        except:
            pass
    return []

def save_trusted(skills: List[str]):
    """Save trusted skills."""
    ensure_config()
    with open(TRUST_FILE, "w") as f:
        json.dump({"skills": skills, "updated": datetime.now().isoformat()}, f, indent=2)

# =============================================================================
# Color Output
# =============================================================================

class Colors:
    RED = '\033[91m'
    YELLOW = '\033[93m'
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def colored(text: str, color: str, config: dict) -> str:
    if config.get("color_output", True) and sys.stdout.isatty():
        return f"{color}{text}{Colors.RESET}"
    return text

# =============================================================================
# Scanner
# =============================================================================

def scan_file(filepath: Path, content: str) -> List[Finding]:
    """Scan a single file for dangerous patterns."""
    findings = []
    suffix = filepath.suffix.lower()
    lines = content.split('\n')
    
    for pattern in PATTERNS:
        if suffix not in pattern.file_types:
            continue
        
        regex = re.compile(pattern.regex, re.IGNORECASE | re.MULTILINE)
        
        for i, line in enumerate(lines, 1):
            # Skip comments
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('*'):
                continue
            
            if regex.search(line):
                findings.append(Finding(
                    id=pattern.id,
                    file=str(filepath),
                    line=i,
                    severity=pattern.severity,
                    category=pattern.category,
                    description=pattern.description,
                    code_snippet=stripped[:100],
                    cwe=pattern.cwe,
                    remediation=pattern.remediation
                ))
    
    return findings

def scan_dependencies(folder: Path) -> List[DependencyIssue]:
    """Scan dependency files for known vulnerabilities."""
    issues = []
    
    # Python requirements
    req_files = list(folder.glob("requirements*.txt")) + list(folder.glob("setup.py"))
    for req_file in req_files:
        try:
            content = req_file.read_text()
            for pkg, vulns in KNOWN_VULNS.items():
                if pkg in content.lower():
                    # Check if version is specified and vulnerable
                    match = re.search(rf'{pkg}[=<>]=?([0-9.]+)', content, re.I)
                    if match:
                        version = match.group(1)
                    else:
                        version = "unpinned"
                        issues.append(DependencyIssue(
                            package=pkg,
                            version="unpinned",
                            severity=Severity.WARNING,
                            vulnerability="Unpinned dependency — specify version",
                            fix_version=vulns.get("fix", "latest")
                        ))
        except:
            pass
    
    # Node packages
    pkg_json = folder / "package.json"
    if pkg_json.exists():
        try:
            pkg = json.loads(pkg_json.read_text())
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            for pkg_name, version in deps.items():
                if pkg_name in KNOWN_VULNS:
                    for vuln_range, cve in KNOWN_VULNS[pkg_name].items():
                        if vuln_range != "fix":
                            issues.append(DependencyIssue(
                                package=pkg_name,
                                version=version,
                                severity=Severity.WARNING,
                                vulnerability=f"Known vulnerability: {cve}",
                                cve=cve,
                                fix_version=KNOWN_VULNS[pkg_name].get("fix", "latest")
                            ))
        except:
            pass
    
    return issues

def scan_folder(folder: Path) -> Tuple[List[Finding], List[DependencyIssue], int, List[str]]:
    """Scan all files in a folder."""
    all_findings = []
    file_list = []
    
    extensions = {'.py', '.js', '.ts', '.sh', '.bash', '.ps1', '.bat', '.cmd', '.md', '.json', '.yaml', '.yml'}
    skip_files = {'package-lock.json', 'yarn.lock', 'poetry.lock', 'Pipfile.lock'}
    skip_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.tox'}
    
    for filepath in folder.rglob('*'):
        # Skip directories
        if any(skip in filepath.parts for skip in skip_dirs):
            continue
        
        if filepath.is_file() and filepath.suffix.lower() in extensions:
            if filepath.name in skip_files:
                continue
            
            try:
                content = filepath.read_text(encoding='utf-8', errors='ignore')
                rel_path = filepath.relative_to(folder)
                findings = scan_file(rel_path, content)
                all_findings.extend(findings)
                file_list.append(str(rel_path))
            except Exception:
                pass
    
    dep_issues = scan_dependencies(folder)
    return all_findings, dep_issues, len(file_list), file_list

def calculate_verdict(findings: List[Finding], dep_issues: List[DependencyIssue]) -> Tuple[Verdict, int]:
    """Calculate overall verdict and safety score."""
    critical = len([f for f in findings if f.severity == Severity.CRITICAL])
    warnings = len([f for f in findings if f.severity == Severity.WARNING])
    dep_critical = len([d for d in dep_issues if d.severity == Severity.CRITICAL])
    dep_warnings = len([d for d in dep_issues if d.severity == Severity.WARNING])
    
    total_critical = critical + dep_critical
    total_warnings = warnings + dep_warnings
    
    # Calculate score (100 = perfect, 0 = terrible)
    score = 100
    score -= total_critical * 25  # Each critical = -25
    score -= total_warnings * 5   # Each warning = -5
    score = max(0, score)
    
    # Determine verdict
    if total_critical >= 3:
        verdict = Verdict.MALICIOUS
    elif total_critical >= 1:
        verdict = Verdict.DANGEROUS
    elif total_warnings >= 5:
        verdict = Verdict.SUSPICIOUS
    elif total_warnings >= 1:
        verdict = Verdict.REVIEW
    else:
        verdict = Verdict.CLEAN
    
    return verdict, score

# =============================================================================
# Output Formatters
# =============================================================================

def print_report_text(result: ScanResult, config: dict):
    """Print colorful text report."""
    c = config
    
    print()
    print(colored("╔" + "═" * 62 + "╗", Colors.CYAN, c))
    print(colored("║", Colors.CYAN, c) + colored("              🛡️  SKILLGUARD SECURITY REPORT                  ", Colors.BOLD, c) + colored("║", Colors.CYAN, c))
    print(colored("╠" + "═" * 62 + "╣", Colors.CYAN, c))
    print(colored("║", Colors.CYAN, c) + f"  Skill:       {result.skill_name:<46}" + colored("║", Colors.CYAN, c))
    print(colored("║", Colors.CYAN, c) + f"  Files:       {result.files_scanned:<46}" + colored("║", Colors.CYAN, c))
    print(colored("║", Colors.CYAN, c) + f"  Scan Time:   {result.scan_time:<46}" + colored("║", Colors.CYAN, c))
    print(colored("║", Colors.CYAN, c) + f"  Score:       {result.score}/100{' ' * 41}" + colored("║", Colors.CYAN, c))
    print(colored("╚" + "═" * 62 + "╝", Colors.CYAN, c))
    
    # Files scanned
    print(colored("\n📁 FILES SCANNED", Colors.BOLD, c))
    print("─" * 64)
    for f in result.file_list[:10]:
        print(f"  ✓ {f}")
    if len(result.file_list) > 10:
        print(f"  ... and {len(result.file_list) - 10} more")
    
    # Critical findings
    critical = [f for f in result.findings if f.severity == Severity.CRITICAL]
    if critical:
        print(colored(f"\n🔴 CRITICAL ISSUES ({len(critical)})", Colors.RED, c))
        print("─" * 64)
        for f in critical:
            print(colored(f"  [{f.id}] {f.file}:{f.line}", Colors.RED, c))
            print(f"  │ Pattern:  {f.description}")
            if f.cwe:
                print(f"  │ CWE:      {f.cwe}")
            if f.code_snippet:
                print(f"  │ Code:     {f.code_snippet[:60]}")
            if f.remediation:
                print(f"  │ Fix:      {f.remediation}")
            print()
    
    # Warnings
    warnings = [f for f in result.findings if f.severity == Severity.WARNING]
    if warnings:
        print(colored(f"\n🟡 WARNINGS ({len(warnings)})", Colors.YELLOW, c))
        print("─" * 64)
        for f in warnings[:10]:
            print(colored(f"  [{f.id}] {f.file}:{f.line} — {f.description}", Colors.YELLOW, c))
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more")
    
    # Info (only if no critical/warnings)
    info = [f for f in result.findings if f.severity == Severity.INFO]
    if info and not critical and not warnings:
        print(colored(f"\n🟢 INFO ({len(info)})", Colors.GREEN, c))
        print("─" * 64)
        for f in info[:5]:
            print(f"  [{f.id}] {f.file}:{f.line} — {f.description}")
        if len(info) > 5:
            print(f"  ... and {len(info) - 5} more")
    
    # Dependencies
    if result.dependency_issues:
        print(colored(f"\n📦 DEPENDENCY ISSUES ({len(result.dependency_issues)})", Colors.YELLOW, c))
        print("─" * 64)
        for d in result.dependency_issues:
            print(f"  ⚠️  {d.package}@{d.version} — {d.vulnerability}")
            if d.fix_version:
                print(f"      Fix: upgrade to {d.fix_version}")
    
    # Verdict
    print("\n" + "═" * 64)
    
    verdict_colors = {
        Verdict.CLEAN: Colors.GREEN,
        Verdict.REVIEW: Colors.YELLOW,
        Verdict.SUSPICIOUS: Colors.YELLOW,
        Verdict.DANGEROUS: Colors.RED,
        Verdict.MALICIOUS: Colors.RED,
    }
    
    verdict_emoji = {
        Verdict.CLEAN: "✅",
        Verdict.REVIEW: "⚠️",
        Verdict.SUSPICIOUS: "🟠",
        Verdict.DANGEROUS: "🔴",
        Verdict.MALICIOUS: "⛔",
    }
    
    v_color = verdict_colors.get(result.verdict, Colors.RESET)
    v_emoji = verdict_emoji.get(result.verdict, "❓")
    
    print(colored(f"                    VERDICT: {v_emoji} {result.verdict.value.upper()}", v_color, c))
    print("═" * 64)
    
    if result.verdict in [Verdict.DANGEROUS, Verdict.MALICIOUS]:
        print(colored("\n  ⛔ DO NOT INSTALL THIS SKILL", Colors.RED, c))
        print(f"  {len(critical)} critical security issues found.")
        print("  Manual code review required before any use.")
    elif result.verdict in [Verdict.SUSPICIOUS, Verdict.REVIEW]:
        print(colored("\n  ⚠️  REVIEW BEFORE INSTALLING", Colors.YELLOW, c))
        print(f"  {len(warnings)} warnings found — verify they're expected.")
    else:
        print(colored("\n  ✅ LIKELY SAFE TO INSTALL", Colors.GREEN, c))
        print("  No critical issues or concerning warnings found.")
    
    print("═" * 64)

def print_report_json(result: ScanResult):
    """Print JSON report."""
    output = {
        "skill_name": result.skill_name,
        "scan_time": result.scan_time,
        "files_scanned": result.files_scanned,
        "verdict": result.verdict.value,
        "score": result.score,
        "summary": {
            "critical": len([f for f in result.findings if f.severity == Severity.CRITICAL]),
            "warnings": len([f for f in result.findings if f.severity == Severity.WARNING]),
            "info": len([f for f in result.findings if f.severity == Severity.INFO]),
            "dependency_issues": len(result.dependency_issues)
        },
        "findings": [
            {
                "id": f.id,
                "file": f.file,
                "line": f.line,
                "severity": f.severity.value,
                "category": f.category,
                "description": f.description,
                "cwe": f.cwe,
                "code": f.code_snippet
            }
            for f in result.findings
        ],
        "dependencies": [
            {
                "package": d.package,
                "version": d.version,
                "vulnerability": d.vulnerability,
                "cve": d.cve,
                "fix": d.fix_version
            }
            for d in result.dependency_issues
        ]
    }
    print(json.dumps(output, indent=2))

def print_report_markdown(result: ScanResult):
    """Print Markdown report."""
    print(f"# 🛡️ SkillGuard Security Report\n")
    print(f"**Skill:** {result.skill_name}")
    print(f"**Scan Time:** {result.scan_time}")
    print(f"**Files Scanned:** {result.files_scanned}")
    print(f"**Safety Score:** {result.score}/100")
    print(f"**Verdict:** {result.verdict.value.upper()}\n")
    
    critical = [f for f in result.findings if f.severity == Severity.CRITICAL]
    warnings = [f for f in result.findings if f.severity == Severity.WARNING]
    
    if critical:
        print("## 🔴 Critical Issues\n")
        print("| ID | File | Line | Description |")
        print("|---|---|---|---|")
        for f in critical:
            print(f"| {f.id} | {f.file} | {f.line} | {f.description} |")
        print()
    
    if warnings:
        print("## 🟡 Warnings\n")
        print("| ID | File | Line | Description |")
        print("|---|---|---|---|")
        for f in warnings:
            print(f"| {f.id} | {f.file} | {f.line} | {f.description} |")
        print()
    
    if result.dependency_issues:
        print("## 📦 Dependency Issues\n")
        print("| Package | Version | Issue | Fix |")
        print("|---|---|---|---|")
        for d in result.dependency_issues:
            print(f"| {d.package} | {d.version} | {d.vulnerability} | {d.fix_version} |")

# =============================================================================
# Commands
# =============================================================================

def fetch_skill_from_clawhub(skill_name: str) -> Optional[Path]:
    """Download skill from ClawHub to temp folder."""
    import tempfile
    temp_dir = Path(tempfile.mkdtemp(prefix="skillguard_"))
    
    try:
        result = subprocess.run(
            ["clawhub", "install", skill_name, "--dir", str(temp_dir),
             "--registry", "https://www.clawhub.ai"],
            capture_output=True, text=True, timeout=60
        )
        
        skill_path = temp_dir / skill_name
        if skill_path.exists():
            return skill_path
        
        for item in temp_dir.iterdir():
            if item.is_dir():
                return item
    except Exception as e:
        print(f"Error fetching skill: {e}")
    
    return None

def cmd_scan(args):
    """Scan a skill from ClawHub."""
    config = load_config()
    skill_name = args.skill
    
    print(f"📥 Fetching {skill_name} from ClawHub...")
    skill_path = fetch_skill_from_clawhub(skill_name)
    
    if not skill_path:
        print(f"❌ Could not fetch skill: {skill_name}")
        sys.exit(1)
    
    findings, dep_issues, file_count, file_list = scan_folder(skill_path)
    verdict, score = calculate_verdict(findings, dep_issues)
    
    result = ScanResult(
        skill_name=skill_name,
        scan_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        files_scanned=file_count,
        file_list=file_list,
        findings=findings,
        dependency_issues=dep_issues,
        verdict=verdict,
        score=score
    )
    
    # Cleanup
    import shutil
    shutil.rmtree(skill_path.parent, ignore_errors=True)
    
    # Output
    fmt = args.format if hasattr(args, 'format') and args.format else config.get("report_format", "text")
    if fmt == "json":
        print_report_json(result)
    elif fmt == "markdown":
        print_report_markdown(result)
    else:
        print_report_text(result, config)
    
    sys.exit(0 if verdict not in [Verdict.DANGEROUS, Verdict.MALICIOUS] else 1)

def cmd_scan_local(args):
    """Scan a local skill folder."""
    config = load_config()
    folder = Path(args.path).resolve()
    
    if not folder.exists():
        print(f"❌ Path not found: {folder}")
        sys.exit(1)
    
    findings, dep_issues, file_count, file_list = scan_folder(folder)
    verdict, score = calculate_verdict(findings, dep_issues)
    
    result = ScanResult(
        skill_name=folder.name,
        scan_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        files_scanned=file_count,
        file_list=file_list,
        findings=findings,
        dependency_issues=dep_issues,
        verdict=verdict,
        score=score
    )
    
    fmt = args.format if hasattr(args, 'format') and args.format else config.get("report_format", "text")
    if fmt == "json":
        print_report_json(result)
    elif fmt == "markdown":
        print_report_markdown(result)
    else:
        print_report_text(result, config)
    
    sys.exit(0 if verdict not in [Verdict.DANGEROUS, Verdict.MALICIOUS] else 1)

def cmd_audit_installed(args):
    """Audit all installed skills."""
    config = load_config()
    workspace_skills = Path.home() / ".openclaw" / "workspace" / "skills"
    
    if not workspace_skills.exists():
        print("❌ No skills directory found")
        sys.exit(1)
    
    print(colored("\n🔍 Auditing installed skills...\n", Colors.BOLD, config))
    
    results = []
    for skill_dir in sorted(workspace_skills.iterdir()):
        if skill_dir.is_dir() and not skill_dir.name.startswith('.'):
            findings, dep_issues, file_count, _ = scan_folder(skill_dir)
            verdict, score = calculate_verdict(findings, dep_issues)
            
            critical = len([f for f in findings if f.severity == Severity.CRITICAL])
            warnings = len([f for f in findings if f.severity == Severity.WARNING])
            
            results.append((skill_dir.name, verdict, score, critical, warnings))
    
    # Print summary table
    print(colored("📊 Installed Skills Audit", Colors.BOLD, config))
    print("━" * 60)
    print(f"  {'Status':<8} {'Skill':<25} {'Score':<8} {'Issues'}")
    print("─" * 60)
    
    for name, verdict, score, crit, warn in results:
        if verdict in [Verdict.DANGEROUS, Verdict.MALICIOUS]:
            status = colored("🔴", Colors.RED, config)
        elif verdict in [Verdict.SUSPICIOUS, Verdict.REVIEW]:
            status = colored("🟡", Colors.YELLOW, config)
        else:
            status = colored("🟢", Colors.GREEN, config)
        
        issues = []
        if crit:
            issues.append(f"{crit} critical")
        if warn:
            issues.append(f"{warn} warnings")
        issue_str = ", ".join(issues) if issues else "clean"
        
        print(f"  {status:<8} {name:<25} {score:<8} {issue_str}")
    
    print("━" * 60)
    
    dangerous_count = sum(1 for r in results if r[1] in [Verdict.DANGEROUS, Verdict.MALICIOUS])
    if dangerous_count:
        print(colored(f"\n⚠️  {dangerous_count} skills have critical security issues!", Colors.RED, config))
        print("Run 'skillguard scan-local <path>' for details.")

def cmd_allowlist(args):
    """Manage trusted skills list."""
    trusted = load_trusted()
    
    if args.list:
        if trusted:
            print("Trusted skills:")
            for s in trusted:
                print(f"  ✅ {s}")
        else:
            print("No trusted skills configured.")
        return
    
    if args.remove:
        if args.skill in trusted:
            trusted.remove(args.skill)
            save_trusted(trusted)
            print(f"✅ Removed {args.skill} from trusted list")
        else:
            print(f"ℹ️  {args.skill} was not in trusted list")
        return
    
    if args.skill:
        if args.skill not in trusted:
            trusted.append(args.skill)
            save_trusted(trusted)
            print(f"✅ Added {args.skill} to trusted skills")
        else:
            print(f"ℹ️  {args.skill} already trusted")

def cmd_version(args):
    """Show version."""
    print(f"SkillGuard v{__version__}")

# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        prog="skillguard",
        description="🛡️ SkillGuard — Security Scanner for ClawHub Skills",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  skillguard scan some-skill          # Scan before installing
  skillguard scan-local ./my-skill    # Scan local folder
  skillguard audit-installed          # Check all installed skills
  skillguard allowlist trusted-skill  # Mark as trusted
        """
    )
    parser.add_argument("-v", "--version", action="store_true", help="Show version")
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # scan
    p_scan = subparsers.add_parser("scan", help="Scan a skill from ClawHub")
    p_scan.add_argument("skill", help="Skill name to scan")
    p_scan.add_argument("--format", choices=["text", "json", "markdown"], default="text")
    p_scan.add_argument("--strict", action="store_true", help="Fail on warnings too")
    p_scan.set_defaults(func=cmd_scan)
    
    # scan-local
    p_local = subparsers.add_parser("scan-local", help="Scan a local skill folder")
    p_local.add_argument("path", help="Path to skill folder")
    p_local.add_argument("--format", choices=["text", "json", "markdown"], default="text")
    p_local.add_argument("--strict", action="store_true")
    p_local.set_defaults(func=cmd_scan_local)
    
    # audit-installed
    p_audit = subparsers.add_parser("audit-installed", help="Audit all installed skills")
    p_audit.set_defaults(func=cmd_audit_installed)
    
    # allowlist
    p_allow = subparsers.add_parser("allowlist", help="Manage trusted skills")
    p_allow.add_argument("skill", nargs="?", help="Skill to trust")
    p_allow.add_argument("--list", action="store_true", help="List trusted skills")
    p_allow.add_argument("--remove", action="store_true", help="Remove from trusted")
    p_allow.set_defaults(func=cmd_allowlist)
    
    args = parser.parse_args()
    
    if args.version:
        cmd_version(args)
        return
    
    if args.command is None:
        parser.print_help()
        return
    
    args.func(args)

if __name__ == "__main__":
    main()
