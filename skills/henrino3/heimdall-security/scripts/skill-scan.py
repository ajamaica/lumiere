#!/usr/bin/env python3
"""
Skill Scanner v4.0 - Context-Aware Security Scanner for OpenClaw Skills
with AI-Powered Analysis Mode

NEW in v4.0:
- --analyze flag: AI-powered narrative security analysis
- Explains WHY each finding is dangerous
- Provides attack scenarios and impact assessment
- Gives actionable recommendations

v3.0 Features:
- Remote fetch detection (skill.md/heartbeat.md from internet)
- Heartbeat injection patterns
- MCP tool abuse (no_human_approval, auto_approve)
- Unicode tag injection (hidden U+E0001-U+E007F)
- Auto-approve exploits (curl | bash)
- Crypto wallet extraction patterns
- Agent impersonation patterns
- Data pre-fill exfiltration (Google Forms)

Usage:
    skill-scan <path-to-skill>
    skill-scan --analyze <path>  # AI-powered narrative analysis
    skill-scan --json <path>     # JSON output
    skill-scan -v <path>         # Verbose
    skill-scan --strict <path>   # Ignore context, flag everything
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from enum import IntEnum


class Severity(IntEnum):
    SAFE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class Context(IntEnum):
    CODE = 3        # Actual executable code - full severity
    CONFIG = 2      # Config files - reduced severity
    DOCS = 1        # Documentation - heavily reduced
    STRING = 0      # Inside a string literal - likely a pattern/blocklist


@dataclass
class Finding:
    severity: Severity
    original_severity: Severity  # Before context adjustment
    category: str
    pattern: str
    file: str
    line: int
    match: str
    description: str
    context: Context
    suppressed: bool = False
    suppression_reason: str = ""


@dataclass
class ScanResult:
    path: str
    files_scanned: int
    findings: List[Finding] = field(default_factory=list)
    suppressed_count: int = 0
    
    @property
    def active_findings(self) -> List[Finding]:
        return [f for f in self.findings if not f.suppressed]
    
    @property
    def max_severity(self) -> Severity:
        active = self.active_findings
        if not active:
            return Severity.SAFE
        return max(f.severity for f in active)
    
    @property
    def action(self) -> str:
        sev = self.max_severity
        if sev == Severity.SAFE:
            return "✅ SAFE - OK to install"
        elif sev == Severity.LOW:
            return "📝 LOW - Review recommended"
        elif sev == Severity.MEDIUM:
            return "⚠️ MEDIUM - Manual review required"
        elif sev == Severity.HIGH:
            return "🔴 HIGH - Do NOT install without audit"
        else:
            return "🚨 CRITICAL - BLOCKED - Likely malicious"


# =============================================================================
# CONTEXT DETECTION
# =============================================================================

FILE_CONTEXTS = {
    '.md': Context.DOCS, '.txt': Context.DOCS, '.rst': Context.DOCS, '.adoc': Context.DOCS,
    '.yaml': Context.CONFIG, '.yml': Context.CONFIG, '.json': Context.CONFIG, 
    '.toml': Context.CONFIG, '.ini': Context.CONFIG,
    '.py': Context.CODE, '.js': Context.CODE, '.ts': Context.CODE, '.sh': Context.CODE, 
    '.bash': Context.CODE, '.mjs': Context.CODE, '.cjs': Context.CODE,
}

BLOCKLIST_INDICATORS = [
    r'patterns?\s*[=:]', r'blocklist\s*[=:]', r'blacklist\s*[=:]',
    r'detect(ion)?_patterns?', r'malicious_patterns?', r'attack_patterns?',
    r'PATTERNS\s*[=:\[]', r'regex(es)?\s*[=:]', r'r["\'].*["\'],?\s*#',
    r'description["\']?\s*:',
]

SECURITY_TOOL_INDICATORS = [
    'prompt-guard', 'prompt_guard', 'security-scan', 'detect.py',
    'patterns.py', 'blocklist', 'firewall', 'waf', 'filter',
]


def get_file_context(filepath: Path) -> Context:
    suffix = filepath.suffix.lower()
    name = filepath.name.lower()
    for indicator in SECURITY_TOOL_INDICATORS:
        if indicator in str(filepath).lower():
            return Context.DOCS
    if any(doc in name for doc in ['readme', 'changelog', 'license', 'contributing', 'history']):
        return Context.DOCS
    return FILE_CONTEXTS.get(suffix, Context.CODE)


def is_in_string_literal(line: str, match_start: int) -> bool:
    before = line[:match_start]
    single_quotes = len(re.findall(r"(?<!\\)'", before))
    double_quotes = len(re.findall(r'(?<!\\)"', before))
    raw_double = len(re.findall(r'r"', before))
    raw_single = len(re.findall(r"r'", before))
    return (single_quotes - raw_single) % 2 == 1 or (double_quotes - raw_double) % 2 == 1


def is_blocklist_definition(line: str, prev_lines: List[str]) -> bool:
    context_lines = prev_lines[-5:] + [line]
    context = '\n'.join(context_lines)
    return any(re.search(ind, context, re.IGNORECASE) for ind in BLOCKLIST_INDICATORS)


def adjust_severity_for_context(severity: Severity, context: Context, 
                                 is_string: bool, is_blocklist: bool,
                                 filepath: str = "") -> Tuple[Severity, str]:
    is_security_tool = any(ind in filepath.lower() for ind in SECURITY_TOOL_INDICATORS)
    
    if is_blocklist:
        return Severity.SAFE, "Pattern in blocklist definition"
    if is_security_tool:
        if context in (Context.DOCS, Context.STRING) or is_string:
            return Severity.SAFE, "Security tool - pattern example"
        new_val = max(0, severity.value - 2)
        return Severity(max(1, new_val)), "Security tool - detection pattern"
    if is_string:
        new_val = max(0, severity.value - 3)
        return Severity(new_val), "Pattern in string literal"
    if context == Context.DOCS:
        new_val = max(0, severity.value - 3)
        return Severity(new_val), "Pattern in documentation"
    if context == Context.CONFIG:
        new_val = max(0, severity.value - 1)
        return Severity(max(1, new_val)), "Pattern in config file"
    return severity, ""


# =============================================================================
# PATTERN DEFINITIONS
# =============================================================================

PATTERNS: List[Tuple[str, Severity, str, str]] = [
    # Credential Access
    (r"cat\s+.*\.env\b", Severity.CRITICAL, "credential_access", "Reading .env file"),
    (r"source\s+.*\.env\b", Severity.HIGH, "credential_access", "Sourcing .env file"),
    (r"open\([^)]*\.env[^)]*\)", Severity.HIGH, "credential_access", "Opening .env file"),
    (r"secrets?/[a-zA-Z]", Severity.HIGH, "credential_access", "Accessing secrets directory"),
    (r"password\s*=\s*['\"][^'\"]+['\"]", Severity.CRITICAL, "credential_access", "Hardcoded password"),
    (r"api[_-]?key\s*=\s*['\"][^'\"]{10,}['\"]", Severity.CRITICAL, "credential_access", "Hardcoded API key"),
    (r"token\s*=\s*['\"][^'\"]{20,}['\"]", Severity.CRITICAL, "credential_access", "Hardcoded token"),
    (r"BEGIN\s+(RSA|PRIVATE|OPENSSH)\s+PRIVATE\s+KEY", Severity.CRITICAL, "credential_access", "Embedded private key"),
    
    # Network Exfiltration
    (r"curl\s+-[^s]*\s+(http|https)://(?!localhost|127\.0\.0\.1)", Severity.HIGH, "network_exfil", "Curl to external URL"),
    (r"wget\s+(http|https)://(?!localhost|127\.0\.0\.1)", Severity.HIGH, "network_exfil", "Wget to external URL"),
    (r"requests\.(get|post|put|delete)\s*\(['\"]https?://(?!localhost)", Severity.MEDIUM, "network_exfil", "HTTP request to external"),
    (r"fetch\s*\(\s*['\"]https?://(?!localhost)", Severity.MEDIUM, "network_exfil", "Fetch to external URL"),
    (r"webhook\.site", Severity.CRITICAL, "network_exfil", "Known exfil domain"),
    (r"ngrok\.io", Severity.HIGH, "network_exfil", "Ngrok tunnel"),
    (r"requestbin\.(com|net)", Severity.CRITICAL, "network_exfil", "Known exfil service"),
    (r"burpcollaborator", Severity.CRITICAL, "network_exfil", "Burp collaborator"),
    
    # Shell Execution
    (r"subprocess\.(?:run|call|Popen)\s*\(\s*['\"]", Severity.HIGH, "shell_exec", "Subprocess with string command"),
    (r"subprocess\.(?:run|call|Popen)\s*\(\s*\[", Severity.MEDIUM, "shell_exec", "Subprocess with list command"),
    (r"os\.system\s*\(\s*['\"]", Severity.HIGH, "shell_exec", "OS system call"),
    (r"os\.popen\s*\(\s*['\"]", Severity.HIGH, "shell_exec", "OS popen"),
    (r"exec\s*\(\s*(?:compile|open)", Severity.CRITICAL, "shell_exec", "Exec with dynamic code"),
    (r"eval\s*\(\s*(?:input|request|argv)", Severity.CRITICAL, "shell_exec", "Eval with user input"),
    (r"\|\s*bash\s*$", Severity.CRITICAL, "shell_exec", "Pipe to bash"),
    (r"\|\s*sh\s*$", Severity.CRITICAL, "shell_exec", "Pipe to shell"),
    (r"bash\s+-c\s+['\"]", Severity.HIGH, "shell_exec", "Bash -c execution"),
    
    # Filesystem
    (r"shutil\.rmtree\s*\(\s*['\"]?/", Severity.CRITICAL, "filesystem", "Recursive delete from root"),
    (r"os\.remove\s*\(\s*['\"]?~", Severity.HIGH, "filesystem", "Delete in home directory"),
    (r"/etc/passwd", Severity.CRITICAL, "filesystem", "System file access"),
    (r"/etc/shadow", Severity.CRITICAL, "filesystem", "Password file access"),
    (r"~/.ssh/(?:id_|authorized)", Severity.CRITICAL, "filesystem", "SSH key access"),
    
    # Obfuscation
    (r"exec\s*\(\s*base64\.b64decode", Severity.CRITICAL, "obfuscation", "Exec base64 payload"),
    (r"eval\s*\(\s*base64\.b64decode", Severity.CRITICAL, "obfuscation", "Eval base64 payload"),
    (r"exec\s*\(\s*codecs\.decode", Severity.CRITICAL, "obfuscation", "Exec encoded payload"),
    (r"exec\s*\(\s*['\"]\\x", Severity.CRITICAL, "obfuscation", "Exec hex-encoded payload"),
    (r"getattr\s*\([^,]+,\s*['\"]__(?:import|builtins|globals)", Severity.CRITICAL, "obfuscation", "Dynamic dunder access"),
    
    # Data Exfiltration
    (r"(post|put|send)\s*\([^)]*\b(password|token|api_?key|secret)\b", Severity.CRITICAL, "data_exfil", "Sending credentials"),
    (r"json\.dumps\s*\([^)]*\benv\b", Severity.HIGH, "data_exfil", "Serializing env"),
    
    # Privilege Escalation
    (r"sudo\s+-S", Severity.CRITICAL, "privilege", "Sudo with stdin password"),
    (r"chmod\s+[47]77", Severity.HIGH, "privilege", "World-writable permissions"),
    (r"setuid\s*\(", Severity.CRITICAL, "privilege", "Setuid call"),
    
    # Persistence
    (r"crontab\s+-[el]", Severity.MEDIUM, "persistence", "Cron listing"),
    (r"crontab\s+<<", Severity.CRITICAL, "persistence", "Cron injection"),
    (r"echo\s+.*>>\s*~/\.(bashrc|zshrc|profile)", Severity.HIGH, "persistence", "Shell config injection"),
    (r"/etc/rc\.local", Severity.HIGH, "persistence", "Startup script modification"),
    
    # Crypto/Mining
    (r"xmrig", Severity.CRITICAL, "crypto", "Crypto miner detected"),
    (r"stratum\+tcp://", Severity.CRITICAL, "crypto", "Mining pool protocol"),
    (r"monero.*wallet|wallet.*monero", Severity.CRITICAL, "crypto", "Monero wallet"),
    
    # v3.0 Patterns
    (r"curl\s+.*skill\.md", Severity.CRITICAL, "remote_fetch", "Fetching skill from internet"),
    (r"curl\s+.*SKILL\.md", Severity.CRITICAL, "remote_fetch", "Fetching skill from internet"),
    (r"curl\s+.*heartbeat\.md", Severity.CRITICAL, "remote_fetch", "Fetching heartbeat from internet"),
    (r"curl\s+.*HEARTBEAT\.md", Severity.CRITICAL, "remote_fetch", "Fetching heartbeat from internet"),
    (r"wget\s+.*skill\.md", Severity.CRITICAL, "remote_fetch", "Fetching skill from internet"),
    (r"fetch\s+.*heartbeat", Severity.HIGH, "remote_fetch", "Fetching heartbeat instructions"),
    (r"https?://.*\.md\s*>\s*~/", Severity.CRITICAL, "remote_fetch", "Downloading MD to home dir"),
    (r"https?://.*\.md\s*>\s*~/.*(moltbot|openclaw|clawdbot)", Severity.CRITICAL, "remote_fetch", "Downloading to agent skills dir"),
    
    (r">>\s*.*HEARTBEAT\.md", Severity.CRITICAL, "heartbeat_injection", "Appending to heartbeat file"),
    (r">\s*.*HEARTBEAT\.md", Severity.HIGH, "heartbeat_injection", "Overwriting heartbeat file"),
    (r"echo\s+.*>.*heartbeat", Severity.HIGH, "heartbeat_injection", "Writing to heartbeat"),
    (r"(every|periodic|interval).*fetch.*https?://", Severity.HIGH, "heartbeat_injection", "Periodic remote fetch pattern"),
    
    (r"mcp[_-]?tool", Severity.MEDIUM, "mcp_abuse", "MCP tool reference"),
    (r"no[_-]?human[_-]?(approval|review|confirm)", Severity.CRITICAL, "mcp_abuse", "Bypassing human approval"),
    (r"auto[_-]?approve", Severity.CRITICAL, "mcp_abuse", "Auto-approve pattern"),
    (r"skip[_-]?(confirm|approval|review)", Severity.HIGH, "mcp_abuse", "Skipping confirmation"),
    (r"PreToolUse.*override", Severity.CRITICAL, "mcp_abuse", "Hook override attempt"),
    (r"PromptSubmit.*bypass", Severity.CRITICAL, "mcp_abuse", "Prompt submission bypass"),
    
    (r"[\U000E0001-\U000E007F]", Severity.CRITICAL, "unicode_injection", "Hidden Unicode tag character"),
    (r"\\u[Ee]00[0-7][0-9a-fA-F]", Severity.HIGH, "unicode_injection", "Unicode tag escape sequence"),
    (r"&#x[Ee]00[0-7][0-9a-fA-F];", Severity.HIGH, "unicode_injection", "HTML entity Unicode tag"),
    
    (r"always\s+allow", Severity.HIGH, "auto_approve", "Always allow pattern"),
    (r"allow\s+all", Severity.HIGH, "auto_approve", "Allow all pattern"),
    (r"\$\([^)]+\)", Severity.MEDIUM, "auto_approve", "Process substitution"),
    (r"`[^`]+`", Severity.MEDIUM, "auto_approve", "Backtick command substitution"),
    (r"curl\s+[^|]*\|\s*bash", Severity.CRITICAL, "auto_approve", "Curl pipe to bash"),
    (r"curl\s+[^|]*\|\s*sh", Severity.CRITICAL, "auto_approve", "Curl pipe to shell"),
    
    (r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}", Severity.HIGH, "crypto_wallet", "Bitcoin address pattern"),
    (r"0x[a-fA-F0-9]{40}", Severity.HIGH, "crypto_wallet", "Ethereum address pattern"),
    (r"wallet\s*[=:]\s*['\"][^'\"]{25,}", Severity.HIGH, "crypto_wallet", "Wallet assignment"),
    (r"(seed|mnemonic)\s*(phrase|words?)", Severity.CRITICAL, "crypto_wallet", "Seed phrase reference"),
    (r"private[_-]?key\s*[=:]", Severity.CRITICAL, "crypto_wallet", "Private key assignment"),
    
    (r"(i\s+am|i'm)\s+(the\s+)?(admin|owner|developer|creator)", Severity.HIGH, "impersonation", "Authority claim"),
    (r"system\s*:\s*you\s+are", Severity.HIGH, "impersonation", "System prompt injection"),
    (r"\[SYSTEM\]", Severity.HIGH, "impersonation", "Fake system tag"),
    (r"ignore\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?)", Severity.CRITICAL, "impersonation", "Instruction override"),
    
    (r"docs\.google\.com/forms.*entry\.", Severity.HIGH, "prefill_exfil", "Google Forms pre-fill"),
    (r"forms\.gle.*\?", Severity.MEDIUM, "prefill_exfil", "Google Forms with params"),
    (r"GET.*[?&](secret|token|key|password)=", Severity.CRITICAL, "prefill_exfil", "Secrets in GET params"),
    
    # Supply chain patterns
    (r"git\s+clone\s+https?://(?!github\.com/(openclaw|henrino3)/)", Severity.HIGH, "supply_chain", "Git clone from external repo"),
    (r"npm\s+install\s+(?!-[gD])", Severity.MEDIUM, "supply_chain", "npm install (supply chain risk)"),
    (r"pip\s+install\s+(?!-r)", Severity.MEDIUM, "supply_chain", "pip install (supply chain risk)"),
    
    # Telemetry patterns
    (r"opentelemetry|otel", Severity.MEDIUM, "telemetry", "OpenTelemetry (sends data externally)"),
    (r"signoz|uptrace|jaeger|zipkin", Severity.HIGH, "telemetry", "Telemetry backend"),
    (r"analytics\.(track|send|log)", Severity.MEDIUM, "telemetry", "Analytics tracking"),
]

SCAN_EXTENSIONS = {'.py', '.js', '.ts', '.sh', '.bash', '.mjs', '.cjs', '.md', '.yaml', '.yml', '.json'}


def scan_file(filepath: Path, strict: bool = False) -> List[Finding]:
    findings = []
    file_context = get_file_context(filepath)
    
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return findings
    
    lines = content.split('\n')
    
    for pattern, severity, category, description in PATTERNS:
        regex = re.compile(pattern, re.IGNORECASE)
        
        for line_num, line in enumerate(lines, 1):
            matches = list(regex.finditer(line))
            for match in matches:
                is_string = is_in_string_literal(line, match.start())
                is_blocklist = is_blocklist_definition(line, lines[max(0, line_num-6):line_num-1])
                
                if is_blocklist:
                    context = Context.STRING
                elif is_string:
                    context = Context.STRING
                else:
                    context = file_context
                
                if strict:
                    adjusted_severity = severity
                    suppressed = False
                    suppression_reason = ""
                else:
                    adjusted_severity, suppression_reason = adjust_severity_for_context(
                        severity, context, is_string, is_blocklist, str(filepath)
                    )
                    suppressed = adjusted_severity == Severity.SAFE and severity != Severity.SAFE
                
                findings.append(Finding(
                    severity=adjusted_severity,
                    original_severity=severity,
                    category=category,
                    pattern=pattern,
                    file=str(filepath),
                    line=line_num,
                    match=match.group()[:80],
                    description=description,
                    context=context,
                    suppressed=suppressed,
                    suppression_reason=suppression_reason
                ))
    
    return findings


def scan_skill(skill_path: str, strict: bool = False) -> ScanResult:
    path = Path(skill_path).expanduser().resolve()
    
    if not path.exists():
        print(f"❌ Path does not exist: {path}", file=sys.stderr)
        sys.exit(1)
    
    result = ScanResult(path=str(path), files_scanned=0)
    
    if path.is_file():
        files = [path]
    else:
        files = list(path.rglob('*'))
    
    for filepath in files:
        if filepath.is_file() and filepath.suffix.lower() in SCAN_EXTENSIONS:
            result.files_scanned += 1
            findings = scan_file(filepath, strict)
            result.findings.extend(findings)
    
    result.suppressed_count = len([f for f in result.findings if f.suppressed])
    
    return result


def get_skill_content(path: str, max_chars: int = 50000) -> str:
    """Get skill content for AI analysis."""
    p = Path(path)
    content_parts = []
    total_chars = 0
    
    for filepath in sorted(p.rglob('*')):
        if filepath.is_file() and filepath.suffix.lower() in SCAN_EXTENSIONS:
            try:
                text = filepath.read_text(encoding='utf-8', errors='ignore')
                rel_path = str(filepath.relative_to(p))
                chunk = f"\n--- {rel_path} ---\n{text[:10000]}\n"
                if total_chars + len(chunk) > max_chars:
                    break
                content_parts.append(chunk)
                total_chars += len(chunk)
            except:
                pass
    
    return ''.join(content_parts)


def generate_ai_analysis(result: ScanResult, skill_content: str) -> str:
    """Generate AI-powered narrative analysis."""
    
    # Build findings summary for the prompt
    findings_text = []
    for f in result.active_findings:
        if f.severity >= Severity.MEDIUM:
            findings_text.append(f"- [{f.severity.name}] {f.category}: {f.description} (Match: {f.match})")
    
    findings_summary = '\n'.join(findings_text[:30])  # Limit to top 30
    
    prompt = f"""You are a security analyst reviewing an AI agent skill for potential risks.

SKILL PATH: {result.path}
FILES SCANNED: {result.files_scanned}
MAX SEVERITY: {result.max_severity.name}
ACTIVE ISSUES: {len(result.active_findings)}

DETECTED PATTERNS:
{findings_summary}

SKILL CONTENT (truncated):
{skill_content[:30000]}

Write a security analysis report in this EXACT format:

============================================================
🔍 HEIMDALL SECURITY ANALYSIS
============================================================

📁 Skill: [skill name]
⚡ Verdict: [emoji + verdict based on severity]

## Summary
[2-3 sentence overview of what this skill does and the main security concerns]

## Key Risks

### 1. [Risk Category]
[Explain what the pattern does, why it's dangerous, and what an attacker could achieve]

### 2. [Risk Category]
[Same format - be specific about the attack scenario]

[Add more risks as needed, focus on CRITICAL and HIGH severity only]

## What You're Agreeing To
[Numbered list of what the user accepts by installing this skill]

## Recommendation
🔴/🟡/🟢 [Clear actionable recommendation]
✅ Safe conditions (if any)

## References
- [Relevant security sources if applicable]
============================================================

Be direct, specific, and alarming where appropriate. Focus on real risks, not theoretical ones.
If the skill appears safe, say so clearly."""

    # Try using oracle CLI first
    try:
        proc = subprocess.run(
            ['oracle', '-m', 'anthropic/claude-sonnet-4-20250514', '-p', prompt],
            capture_output=True,
            text=True,
            timeout=120
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip()
    except Exception:
        pass
    
    # Fallback: try curl to OpenRouter
    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    if not api_key:
        # Try reading from file
        key_paths = [
            os.path.expanduser('~/clawd/secrets/openrouter.key'),
            os.path.expanduser('~/.config/openrouter/key'),
        ]
        for kp in key_paths:
            if os.path.exists(kp):
                with open(kp) as f:
                    api_key = f.read().strip()
                break
    
    if api_key:
        try:
            import urllib.request
            import urllib.error
            
            data = json.dumps({
                "model": "anthropic/claude-3.5-sonnet",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4000
            }).encode('utf-8')
            
            req = urllib.request.Request(
                'https://openrouter.ai/api/v1/chat/completions',
                data=data,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/henrino3/heimdall'
                }
            )
            
            with urllib.request.urlopen(req, timeout=120) as resp:
                result_json = json.loads(resp.read().decode('utf-8'))
                return result_json['choices'][0]['message']['content']
        except Exception as e:
            pass
    
    # Final fallback: generate basic report without AI
    return generate_basic_report(result)


def generate_basic_report(result: ScanResult) -> str:
    """Generate a basic report without AI when API is unavailable."""
    skill_name = Path(result.path).name
    
    critical = [f for f in result.active_findings if f.severity == Severity.CRITICAL]
    high = [f for f in result.active_findings if f.severity == Severity.HIGH]
    
    report = f"""
============================================================
🔍 HEIMDALL SECURITY ANALYSIS (Basic Mode)
============================================================

📁 Skill: {skill_name}
⚡ Verdict: {result.action}

## Summary
Automated scan detected {len(result.active_findings)} potential security issues.
AI analysis unavailable - showing pattern-based findings only.

## Critical Issues ({len(critical)})
"""
    
    for f in critical[:5]:
        report += f"\n### {f.category}\n- **Pattern:** {f.description}\n- **Match:** `{f.match}`\n- **Location:** {f.file}:{f.line}\n"
    
    report += f"\n## High Severity Issues ({len(high)})\n"
    
    for f in high[:5]:
        report += f"\n### {f.category}\n- **Pattern:** {f.description}\n- **Match:** `{f.match}`\n"
    
    report += """
## Recommendation
Review the flagged patterns manually before installing.
Run with --analyze and ensure OPENROUTER_API_KEY is set for full AI analysis.

============================================================
"""
    return report


def print_report(result: ScanResult, verbose: bool = False, show_suppressed: bool = False):
    """Print scan report."""
    print("\n" + "="*60)
    print("🔍 SKILL SECURITY SCAN REPORT v4.0")
    print("="*60)
    print(f"📁 Path: {result.path}")
    print(f"📄 Files scanned: {result.files_scanned}")
    print(f"🔢 Active issues: {len(result.active_findings)}")
    if result.suppressed_count > 0:
        print(f"🔇 Suppressed (context-aware): {result.suppressed_count}")
    print(f"⚡ Max severity: {result.max_severity.name}")
    print(f"📋 Action: {result.action}")
    print("="*60)
    
    active = result.active_findings
    if active:
        by_severity: Dict[Severity, List[Finding]] = {}
        for f in active:
            by_severity.setdefault(f.severity, []).append(f)
        
        for sev in sorted(by_severity.keys(), reverse=True):
            findings = by_severity[sev]
            print(f"\n{'🚨' if sev >= Severity.HIGH else '⚠️'} {sev.name} ({len(findings)} issues):")
            
            by_cat: Dict[str, List[Finding]] = {}
            for f in findings:
                by_cat.setdefault(f.category, []).append(f)
            
            for cat, cat_findings in by_cat.items():
                print(f"  [{cat}]")
                shown = 0
                for f in cat_findings:
                    if verbose or shown < 3:
                        rel_path = f.file.replace(result.path + '/', '')
                        ctx = f"[{f.context.name}]" if f.context != Context.CODE else ""
                        print(f"    • {rel_path}:{f.line} {ctx} - {f.description}")
                        print(f"      Match: {f.match}")
                        shown += 1
                if not verbose and len(cat_findings) > 3:
                    print(f"    ... and {len(cat_findings) - 3} more")
    
    if show_suppressed and result.suppressed_count > 0:
        print(f"\n🔇 SUPPRESSED FINDINGS ({result.suppressed_count}):")
        suppressed = [f for f in result.findings if f.suppressed]
        for f in suppressed[:10]:
            rel_path = f.file.replace(result.path + '/', '')
            print(f"  • {rel_path}:{f.line} - {f.description}")
            print(f"    Reason: {f.suppression_reason}")
        if len(suppressed) > 10:
            print(f"  ... and {len(suppressed) - 10} more")
    
    print("\n" + "="*60)
    
    if result.max_severity >= Severity.HIGH:
        print("❌ RECOMMENDATION: Do NOT install this skill without thorough review")
        return 1
    elif result.max_severity >= Severity.MEDIUM:
        print("⚠️ RECOMMENDATION: Review flagged items before installing")
        return 0
    else:
        print("✅ RECOMMENDATION: Skill appears safe to install")
        return 0


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Scan OpenClaw skills for security issues (v4.0 - AI Analysis)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('path', help='Path to skill directory or file')
    parser.add_argument('-v', '--verbose', action='store_true', help='Show all findings')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--strict', action='store_true', help='Ignore context, flag everything')
    parser.add_argument('--show-suppressed', action='store_true', help='Show suppressed findings')
    parser.add_argument('--analyze', action='store_true', help='AI-powered narrative analysis')
    
    args = parser.parse_args()
    
    result = scan_skill(args.path, strict=args.strict)
    
    if args.analyze:
        print("\n🔍 Running AI-powered security analysis...\n")
        skill_content = get_skill_content(args.path)
        analysis = generate_ai_analysis(result, skill_content)
        print(analysis)
        sys.exit(1 if result.max_severity >= Severity.HIGH else 0)
    elif args.json:
        output = {
            'version': '4.0',
            'path': result.path,
            'files_scanned': result.files_scanned,
            'max_severity': result.max_severity.name,
            'action': result.action,
            'active_findings': len(result.active_findings),
            'suppressed_findings': result.suppressed_count,
            'findings': [
                {
                    'severity': f.severity.name,
                    'original_severity': f.original_severity.name,
                    'category': f.category,
                    'file': f.file,
                    'line': f.line,
                    'match': f.match,
                    'description': f.description,
                    'context': f.context.name,
                    'suppressed': f.suppressed,
                    'suppression_reason': f.suppression_reason
                }
                for f in result.findings if not f.suppressed or args.show_suppressed
            ]
        }
        print(json.dumps(output, indent=2))
        sys.exit(1 if result.max_severity >= Severity.HIGH else 0)
    else:
        sys.exit(print_report(result, args.verbose, args.show_suppressed))


if __name__ == '__main__':
    main()
