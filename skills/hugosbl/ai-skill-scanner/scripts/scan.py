#!/usr/bin/env python3
"""
Skill Security Scanner — Scans OpenBot/Clawdbot skills for malicious patterns.
Detects: credential exfiltration, suspicious network calls, obfuscated code,
         hidden payloads, and other red flags.

Usage:
    python3 scan.py <skill-path>           # Scan a local skill folder
    python3 scan.py <skill-path> --json    # JSON output
    python3 scan.py <skill-path> --verbose # Show matched lines
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# Import advanced checks
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from advanced_checks import run_advanced_checks
    HAS_ADVANCED = True
except ImportError:
    HAS_ADVANCED = False

# ── Severity levels ──────────────────────────────────────────────────────────
CRITICAL = "CRITICAL"  # Almost certainly malicious
HIGH = "HIGH"          # Very suspicious, likely malicious
MEDIUM = "MEDIUM"      # Suspicious, needs manual review
LOW = "LOW"            # Informational, possibly benign
INFO = "INFO"          # Just noting something

SEVERITY_ORDER = {CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0}

# ── Detection rules ──────────────────────────────────────────────────────────
# Each rule: (id, severity, description, regex_pattern, file_extensions or None for all)

RULES = [
    # ── Credential exfiltration ──
    ("CRED_EXFIL_FETCH", CRITICAL,  # noscan
     "Sends data to external URL (potential credential exfiltration)",
     r"""(?:fetch|axios|got|request|http\.request|https\.request|urllib\.request|requests\.(get|post|put|patch))\s*\(.*(?:api[_-]?key|token|secret|password|credential|auth|cookie|session)""",  # noscan
     None),

    ("CRED_EXFIL_CURL", CRITICAL,  # noscan
     "Sends credentials via curl/wget",
     r"""(?:curl|wget)\s+.*(?:-d|--data|--data-raw|--data-binary)\s+.*(?:api[_-]?key|token|secret|password|credential|auth)""",  # noscan
     None),

    ("CRED_READ_ENV", MEDIUM,  # noscan
     "Reads environment variables (may access API keys)",
     r"""(?:process\.env|os\.environ|os\.getenv|ENV\[|Deno\.env)\s*[\[.(]\s*['"]\s*(?!PATH|HOME|USER|SHELL|TERM|LANG|LC_|XDG_|NODE_ENV|DEBUG|VERBOSE)""",  # noscan
     None),

    # ── Suspicious network calls ──
    ("NET_HARDCODED_IP", HIGH,  # noscan
     "Hardcoded IP address in network call",
     r"""(?:https?://|fetch\s*\(|request\s*\(|axios|got\s*\(|requests?\.).*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}""",  # noscan
     None),

    ("NET_EXTERNAL_URL", MEDIUM,  # noscan
     "External HTTP(S) request to non-standard domain",
     r"""(?:fetch|axios|got|request|http\.get|https\.get|requests?\.|urllib|curl|wget)\s*\(?.*https?://(?!(?:api\.github\.com|api\.openai\.com|api\.anthropic\.com|api\.google\.com|registry\.npmjs\.org|pypi\.org|clawhub\.com|clawd\.bot|localhost|127\.0\.0\.1|0\.0\.0\.0))""",  # noscan
     None),

    ("NET_WEBHOOK", HIGH,  # noscan
     "Sends data to webhook URL",  # noscan
     r"""(?:webhook|discord\.com/api/webhooks|hooks\.slack\.com|pipedream|requestbin|webhook\.site|ngrok|serveo|localtunnel)""",  # noscan
     None),

    ("NET_DNS_EXFIL", CRITICAL,  # noscan
     "Possible DNS exfiltration pattern",
     r"""(?:dns\.resolve|dns\.lookup|nslookup|dig\s+).*(?:token|key|secret|password|credential)""",  # noscan
     None),

    # ── Code obfuscation ──
    ("OBFUSC_BASE64_DECODE", MEDIUM,  # noscan
     "Base64 decoding (may hide malicious payload)",
     r"""(?:atob|Buffer\.from|base64\.b64decode|base64\.decode|btoa)\s*\(""",  # noscan
     None),

    ("OBFUSC_EVAL", HIGH,  # noscan
     "Dynamic code execution (eval/exec/Function)",
     r"""(?:^|\s|;|\()\s*(?:eval|exec|Function|setTimeout|setInterval)\s*\(\s*(?:[a-zA-Z_$]|atob|Buffer|base64|decode|unescape)""",  # noscan
     None),

    ("OBFUSC_HEX_STRING", MEDIUM,  # noscan
     "Long hex-encoded string (possible hidden payload)",
     r"""(?:0x[0-9a-fA-F]{20,}|\\x[0-9a-fA-F]{2}(?:\\x[0-9a-fA-F]{2}){9,}|['""][0-9a-fA-F]{40,}['""]\s*[;,)])""",  # noscan
     None),

    ("OBFUSC_CHAR_CODES", HIGH,  # noscan
     "Character code construction (building strings to avoid detection)",
     r"""(?:String\.fromCharCode|chr\(|\\u00[0-9a-fA-F]{2}){3,}""",  # noscan
     None),

    # ── File system access ──
    ("FS_READ_SENSITIVE", HIGH,  # noscan
     "Reads sensitive files (SSH keys, credentials, configs)",
     r"""(?:readFile|read_file|open|cat|readFileSync|fs\.read)\s*\(?.*(?:\.ssh|\.aws|\.env|\.npmrc|\.docker|\.kube|\.gnupg|auth.*\.json|credentials|config\.json|secret|token|\.clawdbot|\.openai|keychain)""",  # noscan
     None),

    ("FS_READ_BROWSER", CRITICAL,  # noscan
     "Reads browser data (cookies, passwords, history)",  # noscan
     r"""(?:readFile|read_file|open\s*\(|fs\.read|cat\s).*(?:Login\s*Data|Web\s*Data|Local\s*State|Cookies).*(?:chrome|firefox|brave|edge|chromium)""",  # noscan
     [".js", ".mjs", ".ts", ".py", ".sh", ".bash"]),

    ("FS_WRITE_STARTUP", CRITICAL,  # noscan
     "Writes to startup/autorun locations",
     r"""(?:LaunchAgents|LaunchDaemons|crontab|\.bashrc|\.zshrc|\.profile|\.bash_profile|autostart|init\.d|systemd|startup).*(?:write|append|>>|cp|mv|tee)""",  # noscan
     None),

    # ── Process execution ──
    ("EXEC_SHELL", MEDIUM,  # noscan
     "Shell command execution",
     r"""(?:child_process|subprocess|os\.system|os\.popen|exec\s*\(|execSync|spawn|Popen)\s*\(""",  # noscan
     None),

    ("EXEC_REVERSE_SHELL", CRITICAL,  # noscan
     "Reverse shell pattern detected",
     r"""(?:nc\s+-[a-z]*e|bash\s+-i|\/dev\/tcp\/|mkfifo|\bncat\b|socat.*exec|python.*pty\.spawn|perl.*socket|ruby.*TCPSocket)""",  # noscan
     None),

    # ── Data collection ──
    ("DATA_KEYLOG", CRITICAL,  # noscan
     "Keyboard/input monitoring pattern",
     r"""(?:keylog|keystroke|keyboard\.on|input\.on|keypress|keydown|pynput|keyboard\.hook)""",  # noscan
     None),

    ("DATA_SCREENSHOT", HIGH,  # noscan
     "Screenshot capture",  # noscan
     r"""(?:screenshot|screen\.capture|pyautogui\.screenshot|ImageGrab|screencapture\s)""",  # noscan
     None),

    ("DATA_CLIPBOARD", HIGH,  # noscan
     "Clipboard access",  # noscan
     r"""(?:clipboard|pbcopy|pbpaste|xclip|xsel|pyperclip|navigator\.clipboard)""",  # noscan
     None),

    # ── Crypto/wallet ──
    ("CRYPTO_WALLET", HIGH,  # noscan
     "Cryptocurrency wallet/key pattern",
     r"""(?:private[_-]?key|seed[_-]?phrase|mnemonic|wallet.*(?:export|dump|extract)|keystore)""",  # noscan
     None),

    ("CRYPTO_MINING", CRITICAL,  # noscan
     "Cryptocurrency mining pattern",
     r"""(?:cryptonight|stratum\+tcp|xmrig|coinhive|minergate|hashrate|mining[_-]?pool)""",  # noscan
     None),

    # ── Prompt injection ──
    ("PROMPT_INJECT", HIGH,  # noscan
     "Prompt injection attempt in skill text",
     r"""(?:ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions|you\s+are\s+now|new\s+instructions?:|system\s*:\s*you|<\|im_start\|>|<\|endoftext\|>|\[INST\]|\[\/INST\])""",  # noscan
     [".md", ".txt", ".json", ".yaml", ".yml"]),

    ("PROMPT_OVERRIDE", MEDIUM,  # noscan
     "Attempts to override agent behavior",
     r"""(?:do\s+not\s+(?:mention|tell|reveal|show|display)|hide\s+this|secret\s+instruction|act\s+as\s+if|pretend\s+(?:you|that)|forget\s+(?:everything|all))""",  # noscan
     [".md", ".txt", ".json", ".yaml", ".yml"]),

    # ── Suspicious patterns ──
    ("SUS_MINIFIED", LOW,  # noscan
     "Minified/compressed code (hard to audit)",
     r""".{500,}""",  # noscan
     [".js", ".py", ".sh", ".bash"]),

    ("SUS_ENCODED_URL", HIGH,  # noscan
     "URL constructed from encoded/split parts (evasion technique)",
     r"""(?:['"][a-z]{3,5}:\/\/['"]|\+\s*['"]\/\/|join\s*\(\s*['"]['"]?\s*\)\s*.*(?:http|ftp|ws))""",  # noscan
     None),

    ("SUS_TELEMETRY", MEDIUM,  # noscan
     "Telemetry/analytics tracking",  # noscan
     r"""(?:telemetry|analytics|tracking|sentry\.io|mixpanel|amplitude|segment\.io|google-analytics|gtag|plausible|posthog)""",  # noscan
     None),
]

# ── File extensions to scan ──────────────────────────────────────────────────
SCANNABLE_EXTENSIONS = {
    ".md", ".txt", ".json", ".json5", ".yaml", ".yml", ".toml",
    ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx",
    ".py", ".sh", ".bash", ".zsh", ".fish",
    ".rb", ".go", ".rs", ".swift", ".kt",
    ".html", ".htm", ".css", ".xml", ".svg",
    ".env", ".ini", ".cfg", ".conf",
}

SKIP_DIRS = {"node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build"}

# Inline ignore marker — add `# noscan` to a line to suppress findings on it
NOSCAN_MARKER = re.compile(r"#\s*noscan|<!--\s*noscan\s*-->")

# Maximum file size to scan (512KB)
MAX_FILE_SIZE = 512 * 1024


@dataclass
class Finding:
    rule_id: str
    severity: str
    description: str
    file: str
    line_num: int
    line_content: str
    context: str = ""


@dataclass
class ScanResult:
    skill_path: str
    skill_name: str
    files_scanned: int = 0
    findings: list = field(default_factory=list)
    errors: list = field(default_factory=list)

    @property
    def score(self) -> str:
        if not self.findings:
            return "CLEAN"
        max_sev = max(SEVERITY_ORDER.get(f.severity, 0) for f in self.findings)
        if max_sev >= SEVERITY_ORDER[CRITICAL]:
            return "DANGEROUS"
        if max_sev >= SEVERITY_ORDER[HIGH]:
            return "SUSPICIOUS"
        if max_sev >= SEVERITY_ORDER[MEDIUM]:
            return "REVIEW"
        return "INFO"

    @property
    def summary(self) -> dict:
        counts = {}
        for f in self.findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return counts


def scan_file(filepath: Path, findings: list, errors: list) -> bool:
    """Scan a single file. Returns True if file was scanned."""
    ext = filepath.suffix.lower()
    if ext not in SCANNABLE_EXTENSIONS and filepath.name not in (".env", "Makefile", "Dockerfile"):
        return False

    try:
        size = filepath.stat().st_size
        if size > MAX_FILE_SIZE:
            errors.append(f"Skipped {filepath}: too large ({size} bytes)")
            return False
        if size == 0:
            return False

        content = filepath.read_text(errors="replace")
        lines = content.split("\n")

        for rule_id, severity, description, pattern, extensions in RULES:
            if extensions and ext not in extensions:
                continue

            try:
                regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
            except re.error:
                continue

            for i, line in enumerate(lines, 1):
                if NOSCAN_MARKER.search(line):
                    continue
                if regex.search(line):
                    findings.append(Finding(
                        rule_id=rule_id,
                        severity=severity,
                        description=description,
                        file=str(filepath),
                        line_num=i,
                        line_content=line.strip()[:200],
                    ))
        return True

    except (PermissionError, UnicodeDecodeError, OSError) as e:
        errors.append(f"Error reading {filepath}: {e}")
        return False


def scan_skill(skill_path: str) -> ScanResult:
    """Scan an entire skill directory."""
    path = Path(skill_path).resolve()
    result = ScanResult(
        skill_path=str(path),
        skill_name=path.name,
    )

    if not path.is_dir():
        result.errors.append(f"Not a directory: {path}")
        return result

    for root, dirs, files in os.walk(path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for fname in files:
            fpath = Path(root) / fname
            rel = fpath.relative_to(path)
            if scan_file(fpath, result.findings, result.errors):
                result.files_scanned += 1

    # Sort findings by severity (critical first)
    result.findings.sort(key=lambda f: -SEVERITY_ORDER.get(f.severity, 0))

    return result


def format_text(result: ScanResult, verbose: bool = False) -> str:
    """Format scan result as human-readable text."""
    lines = []
    lines.append(f"🔍 Skill Scanner — {result.skill_name}")
    lines.append(f"   Path: {result.skill_path}")
    lines.append(f"   Files scanned: {result.files_scanned}")
    lines.append("")

    if not result.findings:
        lines.append("✅ CLEAN — No security issues detected")
        return "\n".join(lines)

    # Score
    score = result.score
    emoji = {"DANGEROUS": "🚨", "SUSPICIOUS": "⚠️", "REVIEW": "🔎", "INFO": "ℹ️"}.get(score, "❓")
    lines.append(f"{emoji} Score: {score}")
    lines.append(f"   Summary: {result.summary}")
    lines.append("")

    # Findings
    sev_emoji = {CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🔵", INFO: "⚪"}

    for f in result.findings:
        e = sev_emoji.get(f.severity, "❓")
        try:
            rel_file = Path(f.file).relative_to(result.skill_path)
        except ValueError:
            rel_file = f.file or "(structural)"
        lines.append(f"{e} [{f.severity}] {f.rule_id}")
        lines.append(f"   {f.description}")
        lines.append(f"   📁 {rel_file}:{f.line_num}")
        if verbose:
            lines.append(f"   > {f.line_content}")
        lines.append("")

    if result.errors:
        lines.append("⚠️ Scan errors:")
        for e in result.errors:
            lines.append(f"   - {e}")

    return "\n".join(lines)


def format_json(result: ScanResult) -> str:
    """Format scan result as JSON."""
    data = {
        "skill": result.skill_name,
        "path": result.skill_path,
        "filesScanned": result.files_scanned,
        "score": result.score,
        "summary": result.summary,
        "findings": [asdict(f) for f in result.findings],
        "errors": result.errors,
    }
    return json.dumps(data, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="Scan skills for security issues")
    parser.add_argument("path", help="Path to skill directory")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show matched lines")
    parser.add_argument("--basic", action="store_true", help="Skip advanced checks (faster)")
    parser.add_argument("--exclude", action="append", default=[], help="Exclude file patterns")
    args = parser.parse_args()

    result = scan_skill(args.path)

    # Run advanced checks unless --basic
    if HAS_ADVANCED and not args.basic:
        try:
            adv_findings = run_advanced_checks(args.path)
            for af in adv_findings:
                result.findings.append(Finding(
                    rule_id=af.get("check", "UNKNOWN"),
                    severity=af.get("severity", "MEDIUM"),
                    description=af.get("description", ""),
                    file=af.get("file", ""),
                    line_num=af.get("line_num", 0),
                    line_content=af.get("line_content", ""),
                ))
            # Re-sort
            result.findings.sort(key=lambda f: -SEVERITY_ORDER.get(f.severity, 0))
        except Exception as e:
            result.errors.append(f"Advanced checks error: {e}")

    if args.json:
        print(format_json(result))
    else:
        print(format_text(result, verbose=args.verbose))

    # Exit code based on score
    codes = {"CLEAN": 0, "INFO": 0, "REVIEW": 1, "SUSPICIOUS": 2, "DANGEROUS": 3}
    sys.exit(codes.get(result.score, 1))


if __name__ == "__main__":
    main()
