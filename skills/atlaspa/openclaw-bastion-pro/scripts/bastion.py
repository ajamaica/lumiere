#!/usr/bin/env python3
"""
OpenClaw Bastion Pro — Full Prompt Injection Defense Suite

Runtime content boundary defense: scans files for injection attempts,
analyzes content boundaries, validates command allowlists, scores input
risk, AND actively neutralizes threats — block injections, sanitize
hidden Unicode, quarantine compromised files, deploy canary tokens,
and enforce content policies via hooks.

Free version alerts. Pro version subverts, quarantines, and defends.

Usage:
    bastion.py scan [file|dir]        [--workspace PATH]
    bastion.py check <file>           [--workspace PATH]
    bastion.py boundaries             [--workspace PATH]
    bastion.py allowlist [--show]     [--workspace PATH]
    bastion.py status                 [--workspace PATH]
    bastion.py block <file>           [--workspace PATH]
    bastion.py sanitize <file|dir>    [--workspace PATH]
    bastion.py quarantine <file>      [--workspace PATH]
    bastion.py unquarantine <file>    [--workspace PATH]
    bastion.py canary [file|dir]      [--workspace PATH]
    bastion.py enforce                [--workspace PATH]
    bastion.py protect                [--workspace PATH]
"""

import argparse
import io
import json
import os
import re
import secrets
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Windows Unicode stdout fix
# ---------------------------------------------------------------------------

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

POLICY_FILE = ".bastion-policy.json"
CANARY_DIR = ".bastion"
CANARY_MANIFEST = "canary-manifest.json"
QUARANTINE_DIR = ".quarantine/bastion"
QUARANTINE_PREFIX = ".quarantined-"

SKIP_DIRS = {
    ".git", ".svn", ".hg", "__pycache__", "node_modules", ".venv", "venv",
    ".integrity", ".bastion", ".env", ".tox", "dist", "build", "egg-info",
    ".quarantine",
}

SELF_SKILL_DIRS = {"openclaw-bastion", "openclaw-bastion-pro"}

SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_WARNING = "WARNING"
SEVERITY_INFO = "INFO"

# Agent identity/instruction files — high-value targets
AGENT_INSTRUCTION_FILES = {
    "SOUL.md", "AGENTS.md", "IDENTITY.md", "USER.md",
    "TOOLS.md", "HEARTBEAT.md", "MEMORY.md", "CLAUDE.md",
}

# File extensions to scan (text-based)
SCANNABLE_EXTENSIONS = {
    ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".htm", ".xml",
    ".csv", ".log", ".sh", ".bash", ".zsh", ".bat", ".cmd", ".ps1",
    ".env", ".conf", ".rst", ".tex", ".rb", ".go", ".rs", ".java",
    ".c", ".cpp", ".h", ".hpp", ".css", ".scss", ".less", ".sql",
    ".r", ".R", ".jl", ".lua", ".php", ".swift", ".kt", ".scala",
}

# ---------------------------------------------------------------------------
# Injection detection patterns
# ---------------------------------------------------------------------------

INSTRUCTION_OVERRIDE_PATTERNS = [
    (r"(?i)ignore\s+(all\s+)?previous\s+instructions", "ignore previous instructions"),
    (r"(?i)disregard\s+(all\s+)?(above|previous|prior)", "disregard above/previous"),
    (r"(?i)forget\s+(all\s+)?your\s+instructions", "forget your instructions"),
    (r"(?i)you\s+are\s+now\s+(?!(?:ready|going|able|looking|viewing|seeing))", "you are now [role switch]"),
    (r"(?i)new\s+system\s+prompt", "new system prompt"),
    (r"(?i)override\s+(all\s+)?(previous|safety|existing)\s+(instructions|rules|guidelines)", "override safety/instructions"),
    (r"(?i)act\s+as\s+if\s+you\s+(have\s+)?no\s+(restrictions|rules|guidelines|limits)", "act as if no restrictions"),
    (r"(?i)entering\s+(a\s+)?(new|special|developer|admin|debug)\s+mode", "entering developer/admin mode"),
    (r"(?i)from\s+now\s+on[,\s]+you\s+(will|must|should|shall)", "from now on you must..."),
    (r"(?i)execute\s+the\s+following\s+(commands?|instructions?|code)\s*(:|without)", "execute following commands"),
]

SYSTEM_PROMPT_MARKERS = [
    (r"<\s*system\s*>", "<system> tag"),
    (r"\[\s*SYSTEM\s*\]", "[SYSTEM] marker"),
    (r"<<\s*SYS\s*>>", "<<SYS>> marker"),
    (r"<\s*\|im_start\|>\s*system", "<|im_start|>system marker"),
    (r"\[INST\]", "[INST] marker"),
    (r"###\s*System\s*:", "### System: marker"),
]

HIDDEN_INSTRUCTION_PATTERNS = [
    (r"(?i)in\s+your\s+next\s+response[,\s]+you\s+(must|should|will|shall)", "multi-turn: in your next response"),
    (r"(?i)when\s+asked\s+about\s+\w+[,\s]+always\s+(say|respond|reply|answer)", "multi-turn: when asked about X, always say Y"),
    (r"(?i)whenever\s+(the\s+)?user\s+(asks|mentions|says)[,\s]+you\s+(must|should|will)", "multi-turn: whenever user asks, you must"),
    (r"(?i)remember\s+this\s+for\s+(all\s+)?future\s+(responses|interactions|conversations)", "multi-turn: remember for future"),
    (r"(?i)do\s+not\s+(tell|inform|alert|warn)\s+(the\s+)?user", "stealth: do not tell the user"),
    (r"(?i)hide\s+this\s+(from|in)\s+(the\s+)?(user|output|response)", "stealth: hide this from user"),
]

HTML_INJECTION_PATTERNS = [
    (r"<\s*script[\s>]", "<script> tag"),
    (r"<\s*iframe[\s>]", "<iframe> tag"),
    (r"<\s*object[\s>]", "<object> tag"),
    (r"<\s*embed[\s>]", "<embed> tag"),
    (r"<\s*link\s[^>]*rel\s*=\s*[\"']?import", "<link rel=import>"),
    (r"style\s*=\s*[\"'][^\"']*display\s*:\s*none", "display:none hidden content"),
    (r"<\s*div[^>]*hidden", "hidden div"),
    (r"<\s*img\s[^>]*onerror\s*=", "<img onerror=> execution"),
    (r"<\s*svg\s[^>]*onload\s*=", "<svg onload=> execution"),
    (r"<\s*body\s[^>]*onload\s*=", "<body onload=> execution"),
]

EXFIL_IMAGE_PATTERN = (
    r"!\[[^\]]*\]\(\s*https?://[^)]*"
    r"(?:[?&][a-zA-Z0-9_]+=(?:[A-Za-z0-9+/]{20,}={0,2}|[0-9a-fA-F]{20,}))"
)

BASE64_BLOB_PATTERN = r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{80,}={0,2}(?![A-Za-z0-9+/])"

UNICODE_TRICKS = [
    ("\u200b", "zero-width space"),
    ("\u200c", "zero-width non-joiner"),
    ("\u200d", "zero-width joiner"),
    ("\u2060", "word joiner"),
    ("\u2062", "invisible times"),
    ("\u2063", "invisible separator"),
    ("\ufeff", "zero-width no-break space / BOM"),
    ("\u202a", "LTR embedding"),
    ("\u202b", "RTL embedding"),
    ("\u202c", "pop directional formatting"),
    ("\u202d", "LTR override"),
    ("\u202e", "RTL override"),
    ("\u2066", "LTR isolate"),
    ("\u2067", "RTL isolate"),
    ("\u2068", "first strong isolate"),
    ("\u2069", "pop directional isolate"),
    ("\u00ad", "soft hyphen"),
]

# Homoglyph pairs: visually similar characters that can substitute ASCII
HOMOGLYPH_CHARS = [
    ("\u0430", "Cyrillic 'a' (homoglyph of Latin 'a')"),
    ("\u0435", "Cyrillic 'e' (homoglyph of Latin 'e')"),
    ("\u043e", "Cyrillic 'o' (homoglyph of Latin 'o')"),
    ("\u0440", "Cyrillic 'p' (homoglyph of Latin 'p')"),
    ("\u0441", "Cyrillic 'c' (homoglyph of Latin 'c')"),
    ("\u0443", "Cyrillic 'y' (homoglyph of Latin 'y')"),
    ("\u0445", "Cyrillic 'x' (homoglyph of Latin 'x')"),
    ("\u0455", "Cyrillic 's' (homoglyph of Latin 's')"),
    ("\u0456", "Cyrillic 'i' (homoglyph of Latin 'i')"),
    ("\u04bb", "Cyrillic 'h' (homoglyph of Latin 'h')"),
]

SHELL_INJECTION_PATTERNS = [
    (r"\$\([^)]+\)", "$(command) subshell execution"),
    (r"`[^`]{5,}`", "backtick command execution"),
]

DELIMITER_CONFUSION_PATTERNS = [
    (r"```\s*\n.*?(?:ignore|disregard|forget|override|system)", "fake code block boundary with injection"),
]

DANGEROUS_COMMAND_PATTERNS = [
    (r"(?i)curl\s+[^\|]*\|\s*(?:ba)?sh", "curl pipe to shell"),
    (r"(?i)wget\s+[^\|]*\|\s*(?:ba)?sh", "wget pipe to shell"),
    (r"(?i)wget\s+-O-\s+[^\|]*\|\s*sh", "wget -O- pipe to shell"),
    (r"(?i)rm\s+-rf\s+/(?:\s|$)", "rm -rf / (destructive)"),
    (r"(?i):()\{\s*:\|\s*:&\s*\}", "fork bomb"),
    (r"(?i)mkfs\.", "filesystem format command"),
    (r"(?i)dd\s+if=/dev/(?:zero|random)\s+of=/dev/", "dd overwrite device"),
]

# Characters to strip during sanitization (all UNICODE_TRICKS chars)
SANITIZE_CHARS = {char for char, _ in UNICODE_TRICKS}
SANITIZE_CHARS.update({char for char, _ in HOMOGLYPH_CHARS})

# ---------------------------------------------------------------------------
# Default allowlist / blocklist policy
# ---------------------------------------------------------------------------

DEFAULT_POLICY = {
    "version": 1,
    "description": "Bastion command policy — controls which commands are considered safe or dangerous",
    "allowlist": [
        "git", "python", "python3", "node", "npm", "npx", "yarn", "pnpm",
        "pip", "pip3", "cargo", "go", "rustc", "javac", "java", "mvn",
        "gradle", "dotnet", "ruby", "gem", "bundle", "composer", "php",
        "make", "cmake", "gcc", "g++", "clang", "clang++",
        "cat", "head", "tail", "less", "more", "wc", "sort", "uniq",
        "grep", "rg", "find", "fd", "ls", "dir", "tree", "pwd", "echo",
        "mkdir", "cp", "mv", "touch", "chmod", "chown",
        "docker", "docker-compose", "kubectl",
        "pytest", "jest", "mocha", "vitest", "cargo test",
        "eslint", "prettier", "black", "ruff", "mypy", "tsc",
    ],
    "blocklist_patterns": [
        "curl *| *sh", "curl *| *bash",
        "wget *| *sh", "wget *| *bash",
        "wget -O- *| *sh",
        "rm -rf /", "rm -rf /*",
        ":(){ :|:& };:",
        "mkfs.*",
        "dd if=/dev/zero of=/dev/*",
        "dd if=/dev/random of=/dev/*",
        "> /dev/sda",
        "chmod 777 /",
        "eval $(curl *)",
        "python -c * urllib *",
        "nc -e /bin/sh *",
        "bash -i >& /dev/tcp/*",
    ],
    "notes": "Edit this file to customize. Bastion Pro enforces at runtime via hooks.",
}

# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_workspace(workspace_arg: str = None) -> Path:
    """Determine workspace path from arg, env, or defaults."""
    ws = workspace_arg

    if ws is None:
        ws = os.environ.get("OPENCLAW_WORKSPACE")

    if ws is None:
        cwd = Path.cwd()
        if (cwd / "AGENTS.md").exists():
            ws = str(cwd)

    if ws is None:
        ws = str(Path.home() / ".openclaw" / "workspace")

    p = Path(ws)
    if not p.is_dir():
        print(f"ERROR: Workspace not found: {p}", file=sys.stderr)
        sys.exit(1)
    return p


def read_file_text(path: Path) -> str | None:
    """Read file as text, returning None if binary or unreadable."""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except (OSError, ValueError):
        return None


def write_file_text(path: Path, content: str):
    """Write text to a file, creating parent directories if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(content)


def is_scannable(path: Path) -> bool:
    """Check if a file should be scanned based on extension."""
    if path.suffix == "":
        return True
    return path.suffix.lower() in SCANNABLE_EXTENSIONS


def should_skip_dir(dirname: str) -> bool:
    """Check if a directory should be skipped during traversal."""
    return dirname in SKIP_DIRS or dirname.startswith(".")


def collect_scannable_files(root: Path, target: str = None) -> dict:
    """
    Collect files to scan. Returns {rel_path_str: abs_Path}.
    If target is specified, scans only that file or directory.
    """
    files = {}

    if target:
        target_path = Path(target)
        if not target_path.is_absolute():
            target_path = root / target_path

        if target_path.is_file():
            try:
                rel = target_path.relative_to(root).as_posix()
            except ValueError:
                rel = target_path.name
            if is_scannable(target_path):
                files[rel] = target_path
            return files
        elif target_path.is_dir():
            root_scan = target_path
        else:
            print(f"ERROR: Target not found: {target}", file=sys.stderr)
            sys.exit(1)
    else:
        root_scan = root

    for dirpath, dirnames, filenames in os.walk(root_scan):
        dirnames[:] = [
            d for d in dirnames
            if not should_skip_dir(d) and d not in SELF_SKILL_DIRS
        ]

        dp = Path(dirpath)
        for fname in filenames:
            fpath = dp / fname
            if is_scannable(fpath):
                try:
                    rel = fpath.relative_to(root).as_posix()
                except ValueError:
                    rel = fpath.name

                if any(
                    rel.startswith(f"skills/{sd}/") for sd in SELF_SKILL_DIRS
                ):
                    continue

                files[rel] = fpath

    return files


def load_policy(workspace: Path) -> dict:
    """Load the bastion policy file, or return defaults."""
    policy_path = workspace / POLICY_FILE
    if policy_path.is_file():
        try:
            with open(policy_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return DEFAULT_POLICY.copy()


def save_policy(workspace: Path, policy: dict):
    """Save the bastion policy file."""
    policy_path = workspace / POLICY_FILE
    with open(policy_path, "w", encoding="utf-8") as f:
        json.dump(policy, f, indent=2)


def ensure_bastion_dir(workspace: Path) -> Path:
    """Ensure the .bastion metadata directory exists."""
    d = workspace / CANARY_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


def ensure_quarantine_dir(workspace: Path) -> Path:
    """Ensure the quarantine directory exists."""
    d = workspace / QUARANTINE_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


def create_backup(path: Path) -> Path:
    """Create a .bak backup of a file, returning the backup path."""
    bak = path.with_suffix(path.suffix + ".bak")
    counter = 1
    while bak.exists():
        bak = path.with_suffix(f"{path.suffix}.bak{counter}")
        counter += 1
    shutil.copy2(path, bak)
    return bak


# ---------------------------------------------------------------------------
# Code block detection (context-aware scanning)
# ---------------------------------------------------------------------------

def build_code_block_ranges(text: str) -> list:
    """
    Build a sorted list of (start_pos, end_pos) for fenced code blocks.
    Used to skip patterns inside code examples.
    """
    ranges = []
    fence_re = re.compile(r"^(`{3,}|~{3,})", re.MULTILINE)
    matches = list(fence_re.finditer(text))

    i = 0
    while i < len(matches) - 1:
        open_match = matches[i]
        open_fence = open_match.group(1)
        fence_char = open_fence[0]
        fence_len = len(open_fence)

        for j in range(i + 1, len(matches)):
            close_match = matches[j]
            close_fence = close_match.group(1)
            if close_fence[0] == fence_char and len(close_fence) >= fence_len:
                ranges.append((open_match.start(), close_match.end()))
                i = j + 1
                break
        else:
            ranges.append((open_match.start(), len(text)))
            break
        continue

    return ranges


def is_inside_code_block(pos: int, code_ranges: list) -> bool:
    """Check if position falls inside any fenced code block range."""
    for start, end in code_ranges:
        if start <= pos < end:
            return True
        if start > pos:
            break
    return False


def line_number_at(text: str, pos: int) -> int:
    """Return 1-based line number for a character position."""
    return text[:pos].count("\n") + 1


# ---------------------------------------------------------------------------
# Core scanning engine
# ---------------------------------------------------------------------------

def scan_file(path: Path, rel_path: str) -> list:
    """
    Scan a single file for all prompt injection patterns.
    Returns a list of finding dicts.
    """
    text = read_file_text(path)
    if text is None:
        return []

    if not text.strip():
        return []

    findings = []
    code_ranges = build_code_block_ranges(text)

    def add(pattern_type: str, detail: str, line: int, severity: str,
            matched: str = ""):
        findings.append({
            "type": "injection",
            "file": rel_path,
            "pattern_type": pattern_type,
            "detail": detail,
            "line": line,
            "severity": severity,
            "matched": matched[:120] if matched else "",
        })

    # --- 1. Instruction override attempts ---
    for pattern, desc in INSTRUCTION_OVERRIDE_PATTERNS:
        for m in re.finditer(pattern, text):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "instruction_override", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_CRITICAL,
                    m.group(),
                )

    # --- 2. System prompt markers ---
    for pattern, desc in SYSTEM_PROMPT_MARKERS:
        for m in re.finditer(pattern, text):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "system_prompt_marker", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_CRITICAL,
                    m.group(),
                )

    # --- 3. Hidden instruction / multi-turn manipulation ---
    for pattern, desc in HIDDEN_INSTRUCTION_PATTERNS:
        for m in re.finditer(pattern, text):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "hidden_instruction", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_CRITICAL,
                    m.group(),
                )

    # --- 4. HTML injection in markdown ---
    for pattern, desc in HTML_INJECTION_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "html_injection", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_CRITICAL,
                    m.group(),
                )

    # --- 5. Markdown image exfiltration ---
    for m in re.finditer(EXFIL_IMAGE_PATTERN, text):
        if not is_inside_code_block(m.start(), code_ranges):
            add(
                "exfil_image", "Markdown image with encoded data in URL",
                line_number_at(text, m.start()),
                SEVERITY_CRITICAL,
                m.group(),
            )

    # --- 6. Base64 blobs outside code blocks ---
    for m in re.finditer(BASE64_BLOB_PATTERN, text):
        if not is_inside_code_block(m.start(), code_ranges):
            blob = m.group()
            if re.fullmatch(r"[0-9a-fA-F]+", blob) and len(blob) <= 128:
                continue
            add(
                "base64_payload",
                f"Large base64 blob ({len(blob)} chars)",
                line_number_at(text, m.start()),
                SEVERITY_WARNING,
                blob[:60] + "...",
            )

    # --- 7. Unicode tricks (zero-width, RTL overrides) ---
    for char, desc in UNICODE_TRICKS:
        idx = text.find(char)
        while idx != -1:
            add(
                "unicode_trick",
                f"Hidden Unicode U+{ord(char):04X}: {desc}",
                line_number_at(text, idx),
                SEVERITY_WARNING,
                repr(char),
            )
            idx = text.find(char, idx + 1)

    # --- 8. Homoglyph substitution ---
    for char, desc in HOMOGLYPH_CHARS:
        idx = text.find(char)
        while idx != -1:
            before_ok = idx == 0 or text[idx - 1].isascii()
            after_ok = idx == len(text) - 1 or text[idx + 1].isascii()
            if before_ok and after_ok:
                add(
                    "homoglyph",
                    f"Homoglyph: {desc}",
                    line_number_at(text, idx),
                    SEVERITY_WARNING,
                    text[max(0, idx - 10):idx + 11],
                )
            idx = text.find(char, idx + 1)

    # --- 9. Shell injection outside code blocks ---
    for pattern, desc in SHELL_INJECTION_PATTERNS:
        for m in re.finditer(pattern, text):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "shell_injection", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_WARNING,
                    m.group(),
                )

    # --- 10. Encoded payloads / dangerous commands ---
    for pattern, desc in DANGEROUS_COMMAND_PATTERNS:
        for m in re.finditer(pattern, text):
            if not is_inside_code_block(m.start(), code_ranges):
                add(
                    "dangerous_command", desc,
                    line_number_at(text, m.start()),
                    SEVERITY_CRITICAL,
                    m.group(),
                )

    # --- 11. Delimiter confusion ---
    for pattern, desc in DELIMITER_CONFUSION_PATTERNS:
        for m in re.finditer(pattern, text, re.DOTALL):
            add(
                "delimiter_confusion", desc,
                line_number_at(text, m.start()),
                SEVERITY_WARNING,
                m.group()[:80],
            )

    return findings


def compute_file_risk(findings: list) -> str:
    """Compute a risk label for a file based on its findings."""
    if not findings:
        return "CLEAN"
    crits = sum(1 for f in findings if f["severity"] == SEVERITY_CRITICAL)
    warns = sum(1 for f in findings if f["severity"] == SEVERITY_WARNING)
    if crits >= 3:
        return "CRITICAL"
    if crits >= 1:
        return "HIGH"
    if warns >= 3:
        return "MEDIUM"
    if warns >= 1:
        return "LOW"
    if findings:
        return "INFO"
    return "CLEAN"


# ---------------------------------------------------------------------------
# Free Commands (scan, check, boundaries, allowlist, status)
# ---------------------------------------------------------------------------

def cmd_scan(workspace: Path, target: str = None):
    """Scan files for prompt injection patterns."""
    files = collect_scannable_files(workspace, target)

    if not files:
        print("No scannable files found.")
        return 0

    all_findings = []
    file_risks = {}

    for rel, abspath in sorted(files.items()):
        findings = scan_file(abspath, rel)
        if findings:
            all_findings.extend(findings)
            file_risks[rel] = compute_file_risk(findings)

    # --- Report ---
    print("=" * 64)
    print("BASTION PRO INJECTION SCAN")
    print("=" * 64)
    print(f"Workspace : {workspace}")
    if target:
        print(f"Target    : {target}")
    print(f"Scanned   : {len(files)} files")
    print(f"Timestamp : {now_iso()}")
    print()

    crits = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)
    warns = sum(1 for f in all_findings if f["severity"] == SEVERITY_WARNING)
    infos = sum(1 for f in all_findings if f["severity"] == SEVERITY_INFO)

    if not all_findings:
        print("RESULT: CLEAN")
        print("No injection patterns detected.")
        print("=" * 64)
        return 0

    print(f"RESULT: {len(all_findings)} FINDING(S)")
    if crits:
        print(f"  CRITICAL : {crits}")
    if warns:
        print(f"  WARNING  : {warns}")
    if infos:
        print(f"  INFO     : {infos}")
    print()

    by_file = {}
    for f in all_findings:
        by_file.setdefault(f["file"], []).append(f)

    for fname in sorted(by_file.keys()):
        risk = file_risks.get(fname, "CLEAN")
        findings = by_file[fname]
        print("-" * 48)
        print(f"  {fname}  [Risk: {risk}]")
        print("-" * 48)
        for f in sorted(findings, key=lambda x: x["line"]):
            matched_display = ""
            if f["matched"]:
                matched_display = f"  >>  {f['matched']}"
            print(
                f"  [{f['severity']:8s}] Line {f['line']:>5d}: "
                f"{f['pattern_type']} - {f['detail']}"
                f"{matched_display}"
            )
        print()

    print("=" * 64)

    if crits:
        print("ACTION REQUIRED: CRITICAL findings detected.")
        print("  Run 'bastion block <file>' to neutralize injection patterns.")
        print("  Run 'bastion quarantine <file>' to isolate compromised files.")
        print("  Run 'bastion protect' for automated full defense sweep.")
    elif warns:
        print("REVIEW SUGGESTED: WARNING findings may indicate injection attempts.")
        print("  Run 'bastion sanitize <file>' to strip hidden Unicode.")

    print("=" * 64)

    if crits:
        return 2
    if warns or infos:
        return 1
    return 0


def cmd_check(workspace: Path, filepath: str):
    """Quick single-file injection check."""
    target_path = Path(filepath)
    if not target_path.is_absolute():
        target_path = workspace / target_path

    if not target_path.is_file():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        return 2

    try:
        rel = target_path.relative_to(workspace).as_posix()
    except ValueError:
        rel = target_path.name

    findings = scan_file(target_path, rel)
    risk = compute_file_risk(findings)

    print(f"CHECK: {rel}  [Risk: {risk}]")

    if not findings:
        print("  No injection patterns detected.")
        return 0

    for f in sorted(findings, key=lambda x: x["line"]):
        matched_display = ""
        if f["matched"]:
            matched_display = f"  >>  {f['matched']}"
        print(
            f"  [{f['severity']:8s}] Line {f['line']:>5d}: "
            f"{f['pattern_type']} - {f['detail']}"
            f"{matched_display}"
        )

    crits = sum(1 for f in findings if f["severity"] == SEVERITY_CRITICAL)
    return 2 if crits else 1


def cmd_boundaries(workspace: Path):
    """Analyze content boundary safety in the workspace."""
    print("=" * 64)
    print("BASTION PRO BOUNDARY ANALYSIS")
    print("=" * 64)
    print(f"Workspace : {workspace}")
    print(f"Timestamp : {now_iso()}")
    print()

    issues = []

    # --- 1. Identify agent instruction files ---
    print("-" * 48)
    print("AGENT INSTRUCTION FILES (trusted input)")
    print("-" * 48)

    instruction_files = []
    for name in sorted(AGENT_INSTRUCTION_FILES):
        p = workspace / name
        if p.is_file():
            instruction_files.append((name, p))
            stat = p.stat()
            writable = os.access(p, os.W_OK)
            print(f"  {name:20s}  {stat.st_size:>8d} bytes  writable={writable}")

    mem_dir = workspace / "memory"
    if mem_dir.is_dir():
        for f in sorted(mem_dir.iterdir()):
            if f.is_file() and f.suffix == ".md":
                rel = f"memory/{f.name}"
                stat = f.stat()
                writable = os.access(f, os.W_OK)
                instruction_files.append((rel, f))
                print(f"  {rel:20s}  {stat.st_size:>8d} bytes  writable={writable}")
    print()

    # --- 2. Check for mixed trusted/untrusted content ---
    print("-" * 48)
    print("BOUNDARY CONFUSION CHECK")
    print("-" * 48)

    for name, path in instruction_files:
        text = read_file_text(path)
        if text is None:
            continue

        external_markers = [
            (r"(?i)user[- ]?(?:provided|supplied|uploaded|input)", "user-supplied content marker"),
            (r"(?i)(?:api|web|external)\s+(?:response|content|data)", "external content marker"),
            (r"(?i)paste[d]?\s+(?:from|content|text)", "pasted content marker"),
            (r"https?://[^\s)]+", "URL reference"),
        ]

        file_issues = []
        code_ranges = build_code_block_ranges(text)
        for pattern, desc in external_markers:
            for m in re.finditer(pattern, text):
                if not is_inside_code_block(m.start(), code_ranges):
                    file_issues.append((desc, line_number_at(text, m.start())))

        if file_issues:
            print(f"  {name}: MIXED CONTENT DETECTED")
            for desc, line in file_issues[:5]:
                print(f"    Line {line}: {desc}")
            issues.append({
                "file": name,
                "type": "boundary_confusion",
                "detail": f"Agent instruction file contains {len(file_issues)} external content markers",
            })
        else:
            print(f"  {name}: clean boundary")

    print()

    # --- 3. Writable instruction files ---
    print("-" * 48)
    print("WRITABLE INSTRUCTION FILES (attack surface)")
    print("-" * 48)

    writable_critical = []
    for name, path in instruction_files:
        if os.access(path, os.W_OK):
            writable_critical.append(name)

    if writable_critical:
        print("  The following agent instruction files are writable by skills:")
        for name in writable_critical:
            print(f"    - {name}")
        print()
        print("  If a skill is compromised, it can modify these files to inject")
        print("  instructions that the agent will trust on next session start.")
        issues.append({
            "file": ", ".join(writable_critical),
            "type": "writable_instruction",
            "detail": f"{len(writable_critical)} instruction files are writable",
        })
    else:
        print("  No writable instruction files found. Good.")
    print()

    # --- 4. Blast radius analysis ---
    print("-" * 48)
    print("BLAST RADIUS ANALYSIS")
    print("-" * 48)

    blast_levels = {
        "SOUL.md": ("CRITICAL", "Defines core agent identity and behavior. Compromise = full agent takeover."),
        "AGENTS.md": ("CRITICAL", "Defines agent configuration and capabilities. Compromise = behavior override."),
        "IDENTITY.md": ("CRITICAL", "Defines agent persona. Compromise = identity hijack."),
        "USER.md": ("HIGH", "User preferences and context. Compromise = social engineering vector."),
        "TOOLS.md": ("HIGH", "Tool configuration. Compromise = tool restriction bypass."),
        "HEARTBEAT.md": ("MEDIUM", "Session state. Compromise = state manipulation."),
        "MEMORY.md": ("MEDIUM", "Agent memory. Compromise = persistent instruction injection."),
    }

    for name, (level, desc) in sorted(blast_levels.items()):
        p = workspace / name
        exists = p.is_file()
        status = "EXISTS" if exists else "absent"
        print(f"  [{level:8s}] {name:20s} ({status})")
        if exists:
            print(f"             {desc}")

    if mem_dir.is_dir():
        mem_files = [f.name for f in mem_dir.iterdir() if f.is_file() and f.suffix == ".md"]
        if mem_files:
            print(f"  [MEDIUM  ] memory/*.md ({len(mem_files)} files)")
            print(f"             Persistent memory. Compromise = long-term instruction injection.")

    print()

    # --- 5. Boundary score ---
    print("=" * 64)
    total_issues = len(issues)
    if total_issues == 0:
        print("BOUNDARY SAFETY: GOOD")
        print("No boundary confusion or high-risk writable files detected.")
        score = 0
    elif total_issues <= 2:
        print("BOUNDARY SAFETY: FAIR")
        print(f"{total_issues} issue(s) detected. Review recommended.")
        score = 1
    else:
        print("BOUNDARY SAFETY: POOR")
        print(f"{total_issues} issues detected. Action recommended.")
        print("Run 'bastion protect' for automated boundary enforcement.")
        score = 2

    print("=" * 64)
    return score


def cmd_allowlist(workspace: Path, show: bool = False):
    """Display or initialize the command allowlist/blocklist."""
    policy = load_policy(workspace)
    policy_path = workspace / POLICY_FILE

    if not policy_path.is_file():
        save_policy(workspace, DEFAULT_POLICY)
        print(f"Created default policy: {policy_path}")
        print()

    print("=" * 64)
    print("BASTION PRO COMMAND POLICY")
    print("=" * 64)
    print(f"Policy file: {policy_path}")
    print()

    if show or True:
        print("-" * 48)
        print("ALLOWED COMMANDS")
        print("-" * 48)
        allowlist = policy.get("allowlist", [])
        for cmd in sorted(allowlist):
            print(f"  {cmd}")
        print(f"  ({len(allowlist)} commands)")
        print()

        print("-" * 48)
        print("BLOCKED PATTERNS")
        print("-" * 48)
        blocklist = policy.get("blocklist_patterns", [])
        for pattern in sorted(blocklist):
            print(f"  {pattern}")
        print(f"  ({len(blocklist)} patterns)")
        print()

    print("=" * 64)
    print("Bastion Pro enforces this policy at runtime via hooks.")
    print("Run 'bastion enforce' to generate the hook configuration.")
    print("=" * 64)
    return 0


def cmd_status(workspace: Path):
    """Quick summary of workspace injection defense posture."""
    files = collect_scannable_files(workspace)

    total_findings = 0
    crits = 0
    warns = 0
    infos = 0
    risky_files = 0

    for rel, abspath in files.items():
        findings = scan_file(abspath, rel)
        if findings:
            risky_files += 1
            total_findings += len(findings)
            crits += sum(1 for f in findings if f["severity"] == SEVERITY_CRITICAL)
            warns += sum(1 for f in findings if f["severity"] == SEVERITY_WARNING)
            infos += sum(1 for f in findings if f["severity"] == SEVERITY_INFO)

    policy = load_policy(workspace)
    policy_exists = (workspace / POLICY_FILE).is_file()

    instruction_count = sum(
        1 for name in AGENT_INSTRUCTION_FILES
        if (workspace / name).is_file()
    )
    writable_instructions = sum(
        1 for name in AGENT_INSTRUCTION_FILES
        if (workspace / name).is_file() and os.access(workspace / name, os.W_OK)
    )

    # Canary status
    canary_manifest_path = workspace / CANARY_DIR / CANARY_MANIFEST
    canary_count = 0
    if canary_manifest_path.is_file():
        try:
            with open(canary_manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            canary_count = len(manifest.get("canaries", {}))
        except (json.JSONDecodeError, OSError):
            pass

    # Quarantine status
    quarantine_path = workspace / QUARANTINE_DIR
    quarantined_count = 0
    if quarantine_path.is_dir():
        quarantined_count = sum(1 for _ in quarantine_path.iterdir() if _.is_file())

    print("=" * 64)
    print("BASTION PRO STATUS")
    print("=" * 64)
    print(f"Workspace           : {workspace}")
    print(f"Files scanned       : {len(files)}")
    print(f"Injection findings  : {total_findings}")
    if total_findings:
        print(f"  CRITICAL          : {crits}")
        print(f"  WARNING           : {warns}")
        print(f"  INFO              : {infos}")
    print(f"Files with findings : {risky_files}")
    print(f"Instruction files   : {instruction_count}")
    print(f"Writable instr.     : {writable_instructions}")
    print(f"Policy file         : {'present' if policy_exists else 'not created (run allowlist)'}")
    print(f"Canary tokens       : {canary_count} deployed")
    print(f"Quarantined files   : {quarantined_count}")
    print()

    if crits > 0:
        posture = "CRITICAL -- Active injection patterns detected"
        code = 2
    elif warns > 0:
        posture = "WARNING -- Suspicious patterns found, review needed"
        code = 1
    elif writable_instructions > 3:
        posture = "FAIR -- Many writable instruction files"
        code = 1
    elif total_findings > 0:
        posture = "INFO -- Minor findings, likely benign"
        code = 0
    else:
        posture = "GOOD -- No injection patterns detected"
        code = 0

    print(f"POSTURE: {posture}")
    print("=" * 64)
    return code


# ---------------------------------------------------------------------------
# Pro Commands: block, sanitize, quarantine, unquarantine, canary,
#               enforce, protect
# ---------------------------------------------------------------------------

def cmd_block(workspace: Path, filepath: str):
    """
    Neutralize injection patterns in a file by wrapping them in warning
    comments. Creates a .bak backup first. Adds
    '<!-- [BLOCKED by openclaw-bastion-pro] -->' around detected patterns.
    """
    target_path = Path(filepath)
    if not target_path.is_absolute():
        target_path = workspace / target_path

    if not target_path.is_file():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        return 2

    try:
        rel = target_path.relative_to(workspace).as_posix()
    except ValueError:
        rel = target_path.name

    text = read_file_text(target_path)
    if text is None:
        print(f"ERROR: Cannot read file: {filepath}", file=sys.stderr)
        return 2

    # Scan for findings
    findings = scan_file(target_path, rel)
    if not findings:
        print(f"BLOCK: {rel} -- No injection patterns detected. Nothing to block.")
        return 0

    # Create backup before modifying
    bak = create_backup(target_path)
    print(f"BLOCK: Backup created: {bak.name}")

    # Collect all match positions for CRITICAL and WARNING patterns
    code_ranges = build_code_block_ranges(text)
    all_patterns = (
        INSTRUCTION_OVERRIDE_PATTERNS
        + SYSTEM_PROMPT_MARKERS
        + HIDDEN_INSTRUCTION_PATTERNS
        + HTML_INJECTION_PATTERNS
        + DANGEROUS_COMMAND_PATTERNS
    )

    # Gather match spans, sorted by start position descending (for safe replacement)
    matches = []
    for pattern, desc in all_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if not is_inside_code_block(m.start(), code_ranges):
                matches.append((m.start(), m.end(), desc))

    # Also match exfiltration images
    for m in re.finditer(EXFIL_IMAGE_PATTERN, text):
        if not is_inside_code_block(m.start(), code_ranges):
            matches.append((m.start(), m.end(), "exfiltration image"))

    if not matches:
        print(f"BLOCK: {rel} -- No blockable patterns found (findings may be informational).")
        return 0

    # Deduplicate overlapping spans, keeping the widest
    matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))
    deduped = []
    for start, end, desc in matches:
        if deduped and start < deduped[-1][1]:
            # Overlapping -- extend previous if needed
            if end > deduped[-1][1]:
                deduped[-1] = (deduped[-1][0], end, deduped[-1][2])
            continue
        deduped.append((start, end, desc))

    # Apply blocks in reverse order to preserve positions
    modified = text
    blocked_count = 0
    for start, end, desc in reversed(deduped):
        original_text = modified[start:end]
        blocked = (
            f"<!-- [BLOCKED by openclaw-bastion-pro] {desc} -->"
            f"{original_text}"
            f"<!-- [/BLOCKED] -->"
        )
        modified = modified[:start] + blocked + modified[end:]
        blocked_count += 1

    write_file_text(target_path, modified)

    print(f"BLOCK: {rel}")
    print(f"  Patterns neutralized : {blocked_count}")
    print(f"  Backup              : {bak.name}")
    print(f"  Original findings   : {len(findings)}")
    print()

    for f in sorted(findings, key=lambda x: x["line"])[:10]:
        print(f"  [{f['severity']:8s}] Line {f['line']:>5d}: {f['detail']}")

    if len(findings) > 10:
        print(f"  ... and {len(findings) - 10} more findings")

    print()
    print("Injection patterns have been wrapped in BLOCKED comments.")
    print("Review the file and remove blocked content if appropriate.")
    return 0


def cmd_sanitize(workspace: Path, target: str):
    """
    Strip zero-width characters, RTL overrides, and hidden Unicode from
    files. Creates backups. Reports what was removed.
    """
    files = collect_scannable_files(workspace, target)

    if not files:
        print("No scannable files found.")
        return 0

    # Build the set of characters to strip (Unicode tricks only, not homoglyphs)
    strip_chars = {char for char, _ in UNICODE_TRICKS}

    # Build regex for stripping
    strip_pattern = "[" + "".join(re.escape(c) for c in strip_chars) + "]"
    strip_re = re.compile(strip_pattern)

    print("=" * 64)
    print("BASTION PRO SANITIZE")
    print("=" * 64)
    print(f"Workspace : {workspace}")
    print(f"Target    : {target}")
    print(f"Timestamp : {now_iso()}")
    print()

    total_removed = 0
    files_modified = 0

    for rel, abspath in sorted(files.items()):
        text = read_file_text(abspath)
        if text is None:
            continue

        # Count occurrences
        found = strip_re.findall(text)
        if not found:
            continue

        # Create backup
        bak = create_backup(abspath)

        # Build detailed removal report
        char_counts = {}
        for char in found:
            label = f"U+{ord(char):04X}"
            for uc, desc in UNICODE_TRICKS:
                if uc == char:
                    label = f"U+{ord(char):04X} ({desc})"
                    break
            char_counts[label] = char_counts.get(label, 0) + 1

        # Strip characters
        cleaned = strip_re.sub("", text)
        write_file_text(abspath, cleaned)

        files_modified += 1
        total_removed += len(found)

        print(f"  {rel}: {len(found)} hidden characters removed")
        for label, count in sorted(char_counts.items()):
            print(f"    {label}: {count}")
        print(f"    Backup: {bak.name}")
        print()

    print("=" * 64)
    print(f"SANITIZE COMPLETE: {total_removed} characters removed from {files_modified} file(s)")
    print("=" * 64)

    return 0 if total_removed == 0 else 1


def cmd_quarantine(workspace: Path, filepath: str):
    """
    Move a file with injection patterns to .quarantine/bastion/ with
    evidence metadata.
    """
    target_path = Path(filepath)
    if not target_path.is_absolute():
        target_path = workspace / target_path

    if not target_path.is_file():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        return 2

    try:
        rel = target_path.relative_to(workspace).as_posix()
    except ValueError:
        rel = target_path.name

    # Scan for evidence
    findings = scan_file(target_path, rel)
    risk = compute_file_risk(findings)

    # Prepare quarantine destination
    q_dir = ensure_quarantine_dir(workspace)
    safe_name = rel.replace("/", "__").replace("\\", "__")
    q_file = q_dir / safe_name
    q_meta = q_dir / (safe_name + ".meta.json")

    # Handle name collision
    counter = 1
    while q_file.exists():
        q_file = q_dir / f"{safe_name}.{counter}"
        q_meta = q_dir / f"{safe_name}.{counter}.meta.json"
        counter += 1

    # Move the file
    shutil.move(str(target_path), str(q_file))

    # Write evidence metadata
    metadata = {
        "original_path": rel,
        "original_abs_path": str(target_path),
        "quarantined_at": now_iso(),
        "risk_level": risk,
        "finding_count": len(findings),
        "critical_count": sum(1 for f in findings if f["severity"] == SEVERITY_CRITICAL),
        "warning_count": sum(1 for f in findings if f["severity"] == SEVERITY_WARNING),
        "findings": findings[:20],  # Cap to prevent huge metadata files
        "quarantine_file": str(q_file),
    }
    with open(q_meta, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"QUARANTINE: {rel}")
    print(f"  Risk level   : {risk}")
    print(f"  Findings     : {len(findings)}")
    print(f"  Moved to     : {q_file.relative_to(workspace)}")
    print(f"  Metadata     : {q_meta.relative_to(workspace)}")
    print()
    print("File has been quarantined and is no longer accessible to the agent.")
    print("Run 'bastion unquarantine' to restore.")
    return 0


def cmd_unquarantine(workspace: Path, filepath: str):
    """Restore a quarantined file to its original location."""
    q_dir = workspace / QUARANTINE_DIR

    if not q_dir.is_dir():
        print("ERROR: No quarantine directory found.", file=sys.stderr)
        return 2

    # Search by original path or quarantined filename
    safe_name = filepath.replace("/", "__").replace("\\", "__")

    # Try to find by quarantine name first
    q_file = q_dir / safe_name
    q_meta = q_dir / (safe_name + ".meta.json")

    # If not found directly, search metadata files for original path
    if not q_file.is_file():
        found = False
        for meta_file in q_dir.glob("*.meta.json"):
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                if meta.get("original_path") == filepath:
                    q_meta = meta_file
                    q_name = meta_file.name.replace(".meta.json", "")
                    q_file = q_dir / q_name
                    found = True
                    break
            except (json.JSONDecodeError, OSError):
                continue

        if not found:
            print(f"ERROR: Quarantined file not found: {filepath}", file=sys.stderr)
            print("  Available quarantined files:")
            for f in sorted(q_dir.iterdir()):
                if f.is_file() and not f.name.endswith(".meta.json"):
                    print(f"    {f.name}")
            return 2

    if not q_file.is_file():
        print(f"ERROR: Quarantined file missing: {q_file}", file=sys.stderr)
        return 2

    # Read metadata for original path
    original_path = None
    if q_meta.is_file():
        try:
            with open(q_meta, "r", encoding="utf-8") as f:
                meta = json.load(f)
            original_path = meta.get("original_abs_path") or meta.get("original_path")
        except (json.JSONDecodeError, OSError):
            pass

    if original_path is None:
        # Reconstruct from safe name
        original_path = str(workspace / safe_name.replace("__", "/"))

    dest = Path(original_path)
    if not dest.is_absolute():
        dest = workspace / dest

    # Ensure parent directory exists
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Move back
    shutil.move(str(q_file), str(dest))

    # Clean up metadata
    if q_meta.is_file():
        q_meta.unlink()

    try:
        rel = dest.relative_to(workspace).as_posix()
    except ValueError:
        rel = dest.name

    print(f"UNQUARANTINE: {rel}")
    print(f"  Restored to : {dest}")
    print()
    print("WARNING: This file was quarantined for containing injection patterns.")
    print("Run 'bastion check' to verify it is safe before allowing agent access.")
    return 0


def cmd_canary(workspace: Path, target: str = None):
    """
    Deploy canary strings into monitored files. If an injection attack
    reads and leaks these files, the canary string appears in the
    exfiltration, proving the attack. Generates unique canary tokens
    per file.
    """
    bastion_dir = ensure_bastion_dir(workspace)
    manifest_path = bastion_dir / CANARY_MANIFEST

    # Load existing manifest
    manifest = {"version": 1, "canaries": {}, "deployed_at": now_iso()}
    if manifest_path.is_file():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    # Determine target files — if none specified, use agent instruction files
    if target:
        files = collect_scannable_files(workspace, target)
    else:
        files = {}
        for name in sorted(AGENT_INSTRUCTION_FILES):
            p = workspace / name
            if p.is_file():
                files[name] = p
        # Also add memory files
        mem_dir = workspace / "memory"
        if mem_dir.is_dir():
            for f in sorted(mem_dir.iterdir()):
                if f.is_file() and f.suffix == ".md":
                    rel = f"memory/{f.name}"
                    files[rel] = f

    if not files:
        print("No target files found for canary deployment.")
        return 0

    print("=" * 64)
    print("BASTION PRO CANARY DEPLOYMENT")
    print("=" * 64)
    print(f"Workspace : {workspace}")
    print(f"Timestamp : {now_iso()}")
    print()

    deployed = 0
    canaries = manifest.get("canaries", {})

    for rel, abspath in sorted(files.items()):
        text = read_file_text(abspath)
        if text is None:
            continue

        # Generate a unique canary token
        token = f"CANARY-{secrets.token_hex(12)}"

        # Check if file already has a canary
        existing_token = canaries.get(rel, {}).get("token")
        if existing_token and existing_token in text:
            print(f"  {rel}: canary already deployed (token={existing_token[:20]}...)")
            continue

        # Inject canary as an invisible HTML comment at the end
        canary_line = f"\n<!-- {token} -->\n"
        modified = text.rstrip() + canary_line

        write_file_text(abspath, modified)

        canaries[rel] = {
            "token": token,
            "deployed_at": now_iso(),
            "file_path": str(abspath),
        }
        deployed += 1
        print(f"  {rel}: canary deployed (token={token[:20]}...)")

    manifest["canaries"] = canaries
    manifest["last_deployment"] = now_iso()

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print()
    print("=" * 64)
    print(f"CANARY DEPLOYMENT COMPLETE: {deployed} token(s) deployed")
    print(f"Manifest: {manifest_path.relative_to(workspace)}")
    print()
    print("If these tokens appear in any external request, URL, or output,")
    print("it proves that an exfiltration attack accessed the monitored files.")
    print("=" * 64)
    return 0


def cmd_enforce(workspace: Path):
    """
    Generate a Claude Code hook configuration that runs bastion scan
    on file reads (PreToolUse hook for Read tool). Outputs the JSON
    config to add to settings.
    """
    # Determine the path to this script
    script_path = Path(__file__).resolve()

    hook_config = {
        "hooks": {
            "PreToolUse": [
                {
                    "matcher": "Read",
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"python3 \"{script_path}\" check \"$TOOL_INPUT_FILE\" --workspace \"{workspace}\"",
                            "timeout": 15,
                            "description": "Bastion Pro: scan file for injection patterns before reading"
                        }
                    ]
                },
                {
                    "matcher": "Bash",
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"python3 \"{script_path}\" check-command \"$TOOL_INPUT_COMMAND\" --workspace \"{workspace}\"",
                            "timeout": 10,
                            "description": "Bastion Pro: validate command against policy before execution"
                        }
                    ]
                }
            ],
            "SessionStart": [
                {
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"python3 \"{script_path}\" protect --workspace \"{workspace}\"",
                            "timeout": 60,
                            "description": "Bastion Pro: full protection sweep on session start"
                        }
                    ]
                }
            ]
        }
    }

    print("=" * 64)
    print("BASTION PRO ENFORCE — Hook Configuration")
    print("=" * 64)
    print()
    print("Add the following to your Claude Code settings.json to enable")
    print("runtime injection defense:")
    print()
    print("-" * 48)
    print(json.dumps(hook_config, indent=2))
    print("-" * 48)
    print()
    print("Configuration locations:")
    print("  Global : ~/.claude/settings.json")
    print("  Project: .claude/settings.json")
    print()
    print("The PreToolUse hooks will:")
    print("  - Scan files for injection patterns before Read operations")
    print("  - Validate commands against the allowlist before Bash execution")
    print("  - Block operations that trigger CRITICAL findings (exit code 2)")
    print()
    print("The SessionStart hook will:")
    print("  - Run a full protection sweep when a new session begins")
    print()

    # Also write to a file for easy copy
    enforce_path = workspace / CANARY_DIR / "enforce-hooks.json"
    ensure_bastion_dir(workspace)
    with open(enforce_path, "w", encoding="utf-8") as f:
        json.dump(hook_config, f, indent=2)
    print(f"Hook config saved to: {enforce_path.relative_to(workspace)}")
    print("=" * 64)
    return 0


def cmd_protect(workspace: Path):
    """
    Full automated sweep: scan all files, sanitize hidden Unicode,
    quarantine files with CRITICAL injections, deploy canaries, report.
    Recommended for session startup.
    """
    print("=" * 64)
    print("BASTION PRO PROTECT — Full Defense Sweep")
    print("=" * 64)
    print(f"Workspace : {workspace}")
    print(f"Timestamp : {now_iso()}")
    print()

    files = collect_scannable_files(workspace)
    if not files:
        print("No scannable files found.")
        print("=" * 64)
        return 0

    # --- Phase 1: Scan ---
    print("-" * 48)
    print("PHASE 1: SCANNING")
    print("-" * 48)

    all_findings = []
    file_findings = {}  # rel -> [findings]
    file_risks = {}

    for rel, abspath in sorted(files.items()):
        findings = scan_file(abspath, rel)
        if findings:
            all_findings.extend(findings)
            file_findings[rel] = findings
            file_risks[rel] = compute_file_risk(findings)

    crits = sum(1 for f in all_findings if f["severity"] == SEVERITY_CRITICAL)
    warns = sum(1 for f in all_findings if f["severity"] == SEVERITY_WARNING)

    print(f"  Scanned {len(files)} files")
    print(f"  Found {len(all_findings)} finding(s): {crits} CRITICAL, {warns} WARNING")
    print(f"  Files with findings: {len(file_findings)}")
    print()

    # --- Phase 2: Sanitize hidden Unicode ---
    print("-" * 48)
    print("PHASE 2: SANITIZING HIDDEN UNICODE")
    print("-" * 48)

    strip_chars = {char for char, _ in UNICODE_TRICKS}
    strip_pattern = "[" + "".join(re.escape(c) for c in strip_chars) + "]"
    strip_re = re.compile(strip_pattern)

    sanitized_count = 0
    total_chars_removed = 0

    for rel, abspath in sorted(files.items()):
        text = read_file_text(abspath)
        if text is None:
            continue

        found = strip_re.findall(text)
        if not found:
            continue

        bak = create_backup(abspath)
        cleaned = strip_re.sub("", text)
        write_file_text(abspath, cleaned)

        sanitized_count += 1
        total_chars_removed += len(found)
        print(f"  {rel}: {len(found)} hidden characters removed")

    if sanitized_count == 0:
        print("  No hidden Unicode characters found.")
    print()

    # --- Phase 3: Quarantine CRITICAL files ---
    print("-" * 48)
    print("PHASE 3: QUARANTINING CRITICAL FILES")
    print("-" * 48)

    quarantined_count = 0
    critical_files = [
        rel for rel, risk in file_risks.items() if risk == "CRITICAL"
    ]

    if critical_files:
        q_dir = ensure_quarantine_dir(workspace)
        for rel in critical_files:
            abspath = files.get(rel)
            if abspath is None or not abspath.is_file():
                continue

            # Skip agent instruction files from auto-quarantine (too disruptive)
            basename = Path(rel).name
            if basename in AGENT_INSTRUCTION_FILES:
                print(f"  {rel}: CRITICAL but instruction file -- blocking instead of quarantining")
                # Block instead
                cmd_block(workspace, rel)
                continue

            safe_name = rel.replace("/", "__").replace("\\", "__")
            q_file = q_dir / safe_name
            q_meta = q_dir / (safe_name + ".meta.json")

            counter = 1
            while q_file.exists():
                q_file = q_dir / f"{safe_name}.{counter}"
                q_meta = q_dir / f"{safe_name}.{counter}.meta.json"
                counter += 1

            findings = file_findings.get(rel, [])
            metadata = {
                "original_path": rel,
                "original_abs_path": str(abspath),
                "quarantined_at": now_iso(),
                "risk_level": "CRITICAL",
                "finding_count": len(findings),
                "critical_count": sum(1 for f in findings if f["severity"] == SEVERITY_CRITICAL),
                "auto_quarantined": True,
                "findings": findings[:20],
                "quarantine_file": str(q_file),
            }

            shutil.move(str(abspath), str(q_file))
            with open(q_meta, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

            quarantined_count += 1
            print(f"  {rel}: QUARANTINED")
    else:
        print("  No files at CRITICAL risk level.")
    print()

    # --- Phase 4: Deploy canaries ---
    print("-" * 48)
    print("PHASE 4: DEPLOYING CANARY TOKENS")
    print("-" * 48)

    bastion_dir = ensure_bastion_dir(workspace)
    manifest_path = bastion_dir / CANARY_MANIFEST

    manifest = {"version": 1, "canaries": {}, "deployed_at": now_iso()}
    if manifest_path.is_file():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    canaries = manifest.get("canaries", {})
    canary_deployed = 0

    for name in sorted(AGENT_INSTRUCTION_FILES):
        p = workspace / name
        if not p.is_file():
            continue

        text = read_file_text(p)
        if text is None:
            continue

        existing_token = canaries.get(name, {}).get("token")
        if existing_token and existing_token in text:
            continue

        token = f"CANARY-{secrets.token_hex(12)}"
        canary_line = f"\n<!-- {token} -->\n"
        modified = text.rstrip() + canary_line
        write_file_text(p, modified)

        canaries[name] = {
            "token": token,
            "deployed_at": now_iso(),
            "file_path": str(p),
        }
        canary_deployed += 1
        print(f"  {name}: canary deployed")

    manifest["canaries"] = canaries
    manifest["last_deployment"] = now_iso()
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    if canary_deployed == 0:
        print("  Canary tokens already deployed or no target files found.")
    print()

    # --- Summary ---
    print("=" * 64)
    print("BASTION PRO PROTECT COMPLETE")
    print("=" * 64)
    print(f"  Files scanned          : {len(files)}")
    print(f"  Total findings         : {len(all_findings)}")
    print(f"  Unicode chars removed  : {total_chars_removed} across {sanitized_count} file(s)")
    print(f"  Files quarantined      : {quarantined_count}")
    print(f"  Canaries deployed      : {canary_deployed}")
    print()

    if crits > 0 and quarantined_count > 0:
        print("CRITICAL threats neutralized. Review quarantined files.")
        code = 1
    elif crits > 0:
        print("CRITICAL patterns detected but files are instruction files (blocked, not quarantined).")
        code = 2
    elif warns > 0:
        print("WARNING patterns found. Review recommended.")
        code = 1
    else:
        print("Workspace is clean. Defense posture: GOOD.")
        code = 0

    print("=" * 64)
    return code


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bastion",
        description="OpenClaw Bastion Pro -- Full Prompt Injection Defense Suite",
    )
    parser.add_argument(
        "--workspace", "-w",
        help="Path to the workspace (auto-detected if omitted)",
        default=None,
    )

    sub = parser.add_subparsers(dest="command")

    # --- Free commands ---

    # scan
    p_scan = sub.add_parser("scan", help="Scan files for injection patterns")
    p_scan.add_argument(
        "target", nargs="?", default=None,
        help="File or directory to scan (defaults to entire workspace)",
    )

    # check
    p_check = sub.add_parser("check", help="Quick single-file injection check")
    p_check.add_argument("file", help="File to check")

    # boundaries
    sub.add_parser("boundaries", help="Analyze content boundary safety")

    # allowlist
    p_allow = sub.add_parser("allowlist", help="Display command allowlist/blocklist")
    p_allow.add_argument("--show", action="store_true", help="Display current policy")

    # status
    sub.add_parser("status", help="Quick posture summary")

    # --- Pro commands ---

    # block
    p_block = sub.add_parser("block", help="Neutralize injection patterns in a file")
    p_block.add_argument("file", help="File to block injection patterns in")

    # sanitize
    p_sanitize = sub.add_parser("sanitize", help="Strip hidden Unicode from files")
    p_sanitize.add_argument("target", help="File or directory to sanitize")

    # quarantine
    p_quarantine = sub.add_parser("quarantine", help="Quarantine a file with injections")
    p_quarantine.add_argument("file", help="File to quarantine")

    # unquarantine
    p_unquarantine = sub.add_parser("unquarantine", help="Restore a quarantined file")
    p_unquarantine.add_argument("file", help="File to restore from quarantine")

    # canary
    p_canary = sub.add_parser("canary", help="Deploy canary tokens into monitored files")
    p_canary.add_argument(
        "target", nargs="?", default=None,
        help="File or directory (defaults to agent instruction files)",
    )

    # enforce
    sub.add_parser("enforce", help="Generate Claude Code hook config for runtime defense")

    # protect
    sub.add_parser("protect", help="Full automated defense sweep (recommended at startup)")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    workspace = resolve_workspace(args.workspace)

    if args.command == "scan":
        code = cmd_scan(workspace, args.target)
        sys.exit(code)

    elif args.command == "check":
        code = cmd_check(workspace, args.file)
        sys.exit(code)

    elif args.command == "boundaries":
        code = cmd_boundaries(workspace)
        sys.exit(code)

    elif args.command == "allowlist":
        code = cmd_allowlist(workspace, getattr(args, "show", False))
        sys.exit(code)

    elif args.command == "status":
        code = cmd_status(workspace)
        sys.exit(code)

    elif args.command == "block":
        code = cmd_block(workspace, args.file)
        sys.exit(code)

    elif args.command == "sanitize":
        code = cmd_sanitize(workspace, args.target)
        sys.exit(code)

    elif args.command == "quarantine":
        code = cmd_quarantine(workspace, args.file)
        sys.exit(code)

    elif args.command == "unquarantine":
        code = cmd_unquarantine(workspace, args.file)
        sys.exit(code)

    elif args.command == "canary":
        code = cmd_canary(workspace, args.target)
        sys.exit(code)

    elif args.command == "enforce":
        code = cmd_enforce(workspace)
        sys.exit(code)

    elif args.command == "protect":
        code = cmd_protect(workspace)
        sys.exit(code)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
