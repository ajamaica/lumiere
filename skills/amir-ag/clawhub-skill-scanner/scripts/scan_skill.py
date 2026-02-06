#!/usr/bin/env python3
"""
Skill Security Scanner
Analyzes skill code for security risks before installation.
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Tuple
from collections import defaultdict

# =============================================================================
# PATTERN DEFINITIONS
# =============================================================================

CRITICAL_PATTERNS = {
    # Credential Access
    r'\.ssh[/\\]': 'SSH key access',
    r'\.aws[/\\]': 'AWS credentials access',
    r'\.openclaw[/\\]credentials': 'OpenClaw credentials access',
    r'(open|read|load|write).*\.clawdbot': 'ClawdBot config file access',
    r'\.clawdbot.*\.env': 'ClawdBot .env access (ClawHavoc target!)',
    r'(open|read|load).*\.env': 'Environment file read',
    r'dotenv\.load|load_dotenv': 'Dotenv loading',
    r'private[_-]?key|privatekey': 'Private key reference',
    
    # Reverse Shells (ClawHavoc attack vector!)
    r'nc\s+.*-e': 'Netcat reverse shell',
    r'bash\s+-i\s+.*\/dev\/tcp': 'Bash reverse shell',
    r'\/bin\/sh\s*\|\s*nc': 'Shell pipe to netcat',
    r'python.*socket.*subprocess': 'Python reverse shell pattern',
    r'socket\..*connect.*shell': 'Socket-based shell',
    r'pty\.spawn': 'PTY spawn (shell escape)',
    
    # Curl-Pipe-Bash (Primary ClawHavoc vector!)
    r'curl\s+.*\|\s*(ba)?sh': 'Curl pipe to shell (DANGEROUS!)',
    r'wget\s+.*\|\s*(ba)?sh': 'Wget pipe to shell (DANGEROUS!)',
    r'curl\s+.*>\s*.*\.sh\s*&&': 'Download and execute script',
    r'wget\s+.*&&\s*chmod\s*\+x': 'Download and make executable',
    
    # Webhook Exfiltration
    r'discord\.com\/api\/webhooks': 'Discord webhook exfiltration',
    r'hooks\.slack\.com': 'Slack webhook exfiltration',
    # Removed: webhook.*post - too many false positives (legitimate API endpoints)
    
    # Known Malicious Domains (from ClawHavoc)
    r'glot\.io': 'glot.io (known malware host)',
    r'pastebin\.com\/raw': 'Pastebin raw (code hosting)',
    r'paste\.ee|ghostbin|hastebin': 'Paste service (code hosting)',
    r'raw\.githubusercontent\.com.*\.sh': 'GitHub raw shell script',
    
    # Persistence Mechanisms
    r'crontab\s+-': 'Crontab modification',
    r'\/etc\/cron': 'System cron access',
    r'systemctl\s+(enable|start)': 'Systemd service manipulation',
    r'LaunchAgents|LaunchDaemons': 'macOS persistence',
    r'\.bashrc|\.zshrc|\.profile': 'Shell profile modification',
    
    # Data Exfiltration
    r'requests\.(post|put|patch)\s*\([^)]*\b(key|secret|token|password|cred)': 'Credential exfiltration attempt',
    r'urllib.*urlopen.*POST': 'URL POST request',
    r'curl\s+.*-[dX]\s*(POST|PUT)': 'Curl POST/PUT command',
    r'wget\s+.*--post': 'Wget POST command',
    r'ngrok|localtunnel|serveo': 'Tunnel service usage',
    
    # Command Injection
    r'eval\s*\(': 'eval() usage',
    r'exec\s*\(': 'exec() usage',
    r'subprocess.*shell\s*=\s*True': 'Shell injection risk',
    r'os\.system\s*\(': 'os.system() command execution',
    r'os\.popen\s*\(': 'os.popen() command execution',
    
    # File System Attacks
    r'open\s*\([^)]*["\']\/etc\/': '/etc/ file access',
    r'open\s*\([^)]*["\']\/usr\/': '/usr/ file access',
    r'open\s*\([^)]*["\']\/root\/': '/root/ file access',
    r'os\.symlink': 'Symlink creation',
    r'shutil\.rmtree\s*\([^)]*["\']\/': 'Root directory deletion',
    r'rm\s+-rf?\s+\/': 'Dangerous rm command',
    
    # Privilege Escalation - handled specially in scan_file (skip .md files)
    r'chmod\s+777': 'World-writable permissions',
    r'chmod\s+[0-7]*[67][0-7]{2}': 'Dangerous permission change',
    r'setuid|setgid': 'Setuid/setgid usage',
    r'chown\s+root': 'Chown to root',
    
    # Crypto/Wallet
    r'wallet.*\.dat': 'Wallet file access',
    r'seed\s*phrase|mnemonic': 'Seed phrase reference',
    r'keystore': 'Keystore access',
    r'metamask|phantom|ledger': 'Wallet software reference',
    
    # Obfuscation
    r'base64\.(b64)?decode.*exec': 'Base64 decoded execution',
    r'base64\s+-d\s*\|': 'Base64 decode pipe (obfuscation)',
    r'(\\x[0-9a-fA-F]{2}){10,}': 'Hex-encoded string (long)',
    r'zlib\.decompress.*exec': 'Compressed code execution',
    r'marshal\.loads': 'Marshal deserialization',
    r'pickle\.loads?\s*\(': 'Pickle deserialization (RCE risk)',
    
    # Archive-based Attacks (ClawHavoc used password-protected ZIPs)
    r'unzip\s+.*-P': 'Password-protected ZIP extraction',
    r'7z\s+.*-p': '7zip with password',
}

WARNING_PATTERNS = {
    # Only patterns that are ACTUALLY suspicious regardless of skill type
    
    # Raw sockets (unusual - most skills use requests/urllib)
    r'socket\.socket': 'Raw socket usage (unusual)',
    
    # Dynamic code compilation (not just imports, but actual code gen)
    r'compile\s*\(.*exec': 'Dynamic code compilation',
    r'globals\s*\(\)\s*\[': 'Globals manipulation',
    
    # Sensitive system paths (not home dir - that's normal)
    r'\/var\/log': '/var/log access',
    r'\/var\/run': '/var/run access',
    
    # File deletion (more concerning than writes)
    r'shutil\.rmtree': 'Directory tree deletion',
    r'os\.remove|os\.unlink': 'File deletion',
    
    # Email sending (potential spam/phishing)
    r'smtplib|send_mail|sendmail': 'Email sending capability',
    
    # Screenshot/keylogging patterns (but not KeyboardInterrupt!)
    r'pyscreenshot|pyautogui|pynput': 'Screen/keyboard capture library',
    r'\bkeyboard\b(?!Interrupt)': 'Keyboard capture library',
    r'ImageGrab|take_screenshot|capture_screen': 'Screenshot capability',
    
    # Process hiding/injection
    r'ctypes.*kernel|ctypes.*user32': 'Low-level system calls',
    r'win32api|win32con': 'Windows API access',
}

INFO_PATTERNS = {
    # Just for awareness - not alarming
    # Keeping this minimal to reduce noise
}

# Patterns that are always safe/expected
WHITELIST_PATTERNS = [
    r'# ',  # Comments
    r'"""',  # Docstrings
    r"'''",
    r'https://api\.',  # Standard API calls
    r'localhost|127\.0\.0\.1',  # Local only
]

# =============================================================================
# SCANNER
# =============================================================================

@dataclass
class Finding:
    level: str  # CRITICAL, WARNING, INFO
    file: str
    line: int
    pattern: str
    description: str
    context: str = ""

@dataclass
class ScanResult:
    skill_name: str
    files_scanned: int = 0
    total_lines: int = 0
    findings: List[Finding] = field(default_factory=list)
    
    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.findings if f.level == 'CRITICAL')
    
    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.findings if f.level == 'WARNING')
    
    @property
    def info_count(self) -> int:
        return sum(1 for f in self.findings if f.level == 'INFO')
    
    @property
    def risk_score(self) -> int:
        score = 0
        score += self.critical_count * 30  # Criticals are serious
        score += min(self.warning_count, 10) * 3  # Cap warning contribution
        score += min(self.info_count, 5) * 1  # Info barely matters
        return min(100, score)
    
    @property
    def risk_level(self) -> str:
        score = self.risk_score
        if score >= 81:
            return "BLOCKED"
        elif score >= 51:
            return "DANGER"
        elif score >= 21:
            return "CAUTION"
        return "SAFE"
    
    @property
    def recommendation(self) -> str:
        level = self.risk_level
        if level == "BLOCKED":
            return "🔴 BLOCK - Do NOT install this skill"
        elif level == "DANGER":
            return "🔶 DANGER - Detailed review required before installation"
        elif level == "CAUTION":
            return "⚠️ CAUTION - Review findings before proceeding"
        return "✅ APPROVE - Safe to install"


def is_whitelisted(line: str) -> bool:
    """Check if line matches whitelist patterns."""
    for pattern in WHITELIST_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return True
    return False


def scan_file(filepath: Path, result: ScanResult) -> None:
    """Scan a single file for security patterns."""
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return
    
    lines = content.split('\n')
    result.total_lines += len(lines)
    
    rel_path = str(filepath)
    
    for line_num, line in enumerate(lines, 1):
        # Skip whitelisted lines
        if is_whitelisted(line):
            continue
        
        # Skip documentation files for certain patterns (install instructions)
        is_doc_file = rel_path.endswith(('.md', '.rst', '.txt'))
        
        # Check for sudo in non-doc files only
        if not is_doc_file and re.search(r'\bsudo\b', line):
            result.findings.append(Finding(
                level='CRITICAL',
                file=rel_path,
                line=line_num,
                pattern='sudo',
                description='Sudo usage in script',
                context=line.strip()[:100]
            ))
        
        # Special check: shell substitution (avoid regex false positives)
        # In .sh files this is completely normal - skip
        # Only flag in Python/JS where it shouldn't appear
        if '$(' in line and 're.' not in line and "r'" not in line and 'r"' not in line:
            if not any(x in line for x in ['regex', 'pattern', 'findall']):
                is_shell_file = rel_path.endswith(('.sh', '.bash'))
                if not is_shell_file:  # Only flag in non-shell files
                    result.findings.append(Finding(
                        level='CRITICAL',
                        file=rel_path,
                        line=line_num,
                        pattern='$(...)',
                        description='Shell command substitution in non-shell file',
                        context=line.strip()[:100]
                    ))
        
        # Check critical patterns (skip docs for some patterns)
        for pattern, desc in CRITICAL_PATTERNS.items():
            if re.search(pattern, line, re.IGNORECASE):
                # Skip certain patterns in documentation files
                if is_doc_file and any(x in pattern for x in ['sudo', 'chmod', 'chown']):
                    continue
                result.findings.append(Finding(
                    level='CRITICAL',
                    file=rel_path,
                    line=line_num,
                    pattern=pattern[:40],
                    description=desc,
                    context=line.strip()[:100]
                ))
        
        # Check warning patterns (skip in documentation files entirely)
        if not is_doc_file:
            for pattern, desc in WARNING_PATTERNS.items():
                if re.search(pattern, line, re.IGNORECASE):
                    result.findings.append(Finding(
                        level='WARNING',
                        file=rel_path,
                        line=line_num,
                        pattern=pattern[:40],
                        description=desc,
                        context=line.strip()[:100]
                    ))
        
        # Check info patterns (limit to reduce noise)
        if result.info_count < 20:
            for pattern, desc in INFO_PATTERNS.items():
                if re.search(pattern, line, re.IGNORECASE):
                    result.findings.append(Finding(
                        level='INFO',
                        file=rel_path,
                        line=line_num,
                        pattern=pattern[:40],
                        description=desc,
                        context=line.strip()[:80]
                    ))
                    break  # Only one INFO per line


def scan_skill(skill_path: Path) -> ScanResult:
    """Scan entire skill directory."""
    skill_name = skill_path.name
    result = ScanResult(skill_name=skill_name)
    
    # File extensions to scan
    extensions = {'.py', '.sh', '.bash', '.js', '.ts', '.md', '.yaml', '.yml', '.json'}
    
    for root, dirs, files in os.walk(skill_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            filepath = Path(root) / file
            if filepath.suffix.lower() in extensions or file in {'SKILL.md', 'Dockerfile'}:
                result.files_scanned += 1
                scan_file(filepath, result)
    
    return result


def print_report(result: ScanResult) -> None:
    """Print formatted security report."""
    print()
    print("═" * 60)
    print(f"  SKILL SECURITY AUDIT: {result.skill_name}")
    print("═" * 60)
    print()
    
    # Risk Score
    score = result.risk_score
    level = result.risk_level
    level_emoji = {"SAFE": "🟢", "CAUTION": "🟡", "DANGER": "🔶", "BLOCKED": "🔴"}[level]
    print(f"📊 RISK SCORE: {score}/100 - {level_emoji} {level}")
    print()
    
    # Critical Findings
    criticals = [f for f in result.findings if f.level == 'CRITICAL']
    if criticals:
        print(f"🔴 CRITICAL FINDINGS ({len(criticals)})")
        for f in criticals[:10]:  # Limit output
            print(f"  [{f.file}:{f.line}]")
            print(f"    Pattern: {f.description}")
            print(f"    Code: {f.context}")
        if len(criticals) > 10:
            print(f"  ... and {len(criticals) - 10} more")
        print()
    
    # Warnings
    warnings = [f for f in result.findings if f.level == 'WARNING']
    if warnings:
        print(f"🟡 WARNINGS ({len(warnings)})")
        for f in warnings[:5]:
            print(f"  [{f.file}:{f.line}] {f.description}")
        if len(warnings) > 5:
            print(f"  ... and {len(warnings) - 5} more")
        print()
    
    # Info
    infos = [f for f in result.findings if f.level == 'INFO']
    if infos:
        print(f"🟢 INFO ({len(infos)})")
        for f in infos[:3]:
            print(f"  [{f.file}:{f.line}] {f.description}")
        if len(infos) > 3:
            print(f"  ... and {len(infos) - 3} more")
        print()
    
    # Summary
    print(f"📁 FILES SCANNED: {result.files_scanned}")
    print(f"📏 TOTAL LINES: {result.total_lines}")
    print()
    print("═" * 60)
    print(f"  {result.recommendation}")
    print("═" * 60)
    print()


def main():
    parser = argparse.ArgumentParser(description='Skill Security Scanner')
    parser.add_argument('path', help='Path to skill directory')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--install-if-safe', action='store_true', 
                       help='Return exit code 0 only if safe to install')
    args = parser.parse_args()
    
    skill_path = Path(args.path).resolve()
    
    if not skill_path.exists():
        print(f"Error: Path not found: {skill_path}", file=sys.stderr)
        sys.exit(1)
    
    result = scan_skill(skill_path)
    
    if args.json:
        output = {
            'skill_name': result.skill_name,
            'risk_score': result.risk_score,
            'risk_level': result.risk_level,
            'recommendation': result.recommendation,
            'files_scanned': result.files_scanned,
            'total_lines': result.total_lines,
            'critical_count': result.critical_count,
            'warning_count': result.warning_count,
            'info_count': result.info_count,
            'findings': [
                {
                    'level': f.level,
                    'file': f.file,
                    'line': f.line,
                    'description': f.description,
                    'context': f.context
                }
                for f in result.findings
            ]
        }
        print(json.dumps(output, indent=2))
    else:
        print_report(result)
    
    # Exit code for automation
    if args.install_if_safe:
        sys.exit(0 if result.risk_level == "SAFE" else 1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
