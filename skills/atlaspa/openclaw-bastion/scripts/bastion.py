#!/usr/bin/env python3
"""
OpenClaw Bastion — Prompt Injection Defense for Agent Workspaces

Runtime content boundary defense: scans files for injection attempts,
analyzes content boundaries, validates command allowlists, and scores
input risk. This tool protects the input/output boundary — the files
being read by the agent, web content, API responses, and user-supplied
documents.

Usage:
    bastion.py scan [file|dir]     [--workspace PATH]
    bastion.py check <file>        [--workspace PATH]
    bastion.py boundaries          [--workspace PATH]
    bastion.py allowlist [--show]  [--workspace PATH]
    bastion.py status              [--workspace PATH]

For active blocking, sanitization, and runtime enforcement,
see openclaw-bastion-pro.
"""

import argparse
import io
import json
import os
import re
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

SKIP_DIRS = {
    ".git", ".svn", ".hg", "__pycache__", "node_modules", ".venv", "venv",
    ".integrity", ".bastion", ".env", ".tox", "dist", "build", "egg-info",
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
    "notes": "Edit this file to customize. Bastion free displays policy only. Bastion Pro enforces it at runtime.",
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


def is_scannable(path: Path) -> bool:
    """Check if a file should be scanned based on extension."""
    # No extension — could be a config file, scan it
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
        # Resolve relative to workspace if not absolute
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
        # Filter out skip dirs in-place to prevent os.walk from descending
        dirnames[:] = [
            d for d in dirnames
            if not should_skip_dir(d) and d not in SELF_SKILL_DIRS
        ]

        # Skip self skill dirs at skills level
        dp = Path(dirpath)
        try:
            rel_dir = dp.relative_to(root).as_posix()
        except ValueError:
            rel_dir = ""

        for fname in filenames:
            fpath = dp / fname
            if is_scannable(fpath):
                try:
                    rel = fpath.relative_to(root).as_posix()
                except ValueError:
                    rel = fpath.name

                # Skip files inside our own skill directories
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

        # Find the matching close fence
        for j in range(i + 1, len(matches)):
            close_match = matches[j]
            close_fence = close_match.group(1)
            if close_fence[0] == fence_char and len(close_fence) >= fence_len:
                ranges.append((open_match.start(), close_match.end()))
                i = j + 1
                break
        else:
            # No matching close — treat rest of file as code block
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

    # Skip empty files
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
            # Skip hex-only strings that look like hashes
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
            # Only flag if surrounded by ASCII (mixed script = suspicious)
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
    return "INFO"


# ---------------------------------------------------------------------------
# Commands
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
    print("BASTION INJECTION SCAN")
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

    # Group by file
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
        print("ACTION REQUIRED: CRITICAL findings indicate active injection attempts.")
        print("  Review flagged files before allowing agent access.")
        print("  Upgrade to openclaw-bastion-pro for automatic blocking.")
    elif warns:
        print("REVIEW SUGGESTED: WARNING findings may indicate injection attempts.")
        print("  Investigate flagged patterns to confirm or dismiss.")

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
    print("BASTION BOUNDARY ANALYSIS")
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

    # Memory directory
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

        # Check if instruction files contain external/user content markers
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

    # --- 3. Writable instruction files (attack surface) ---
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

    # Memory files
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
        print("Upgrade to openclaw-bastion-pro for automated boundary enforcement.")
        score = 2

    print("=" * 64)
    return score


def cmd_allowlist(workspace: Path, show: bool = False):
    """Display or initialize the command allowlist/blocklist."""
    policy = load_policy(workspace)
    policy_path = workspace / POLICY_FILE

    if not policy_path.is_file():
        # Create default policy file
        save_policy(workspace, DEFAULT_POLICY)
        print(f"Created default policy: {policy_path}")
        print()

    print("=" * 64)
    print("BASTION COMMAND POLICY")
    print("=" * 64)
    print(f"Policy file: {policy_path}")
    print()

    if show or True:  # Always show in free version
        print("-" * 48)
        print("ALLOWED COMMANDS")
        print("-" * 48)
        allowlist = policy.get("allowlist", [])
        for i, cmd in enumerate(sorted(allowlist)):
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
    print("NOTE: Bastion free displays the policy. Edit the JSON file directly")
    print("to customize. Upgrade to openclaw-bastion-pro for runtime enforcement")
    print("via hooks that block dangerous commands before execution.")
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

    # Boundary quick check
    instruction_count = sum(
        1 for name in AGENT_INSTRUCTION_FILES
        if (workspace / name).is_file()
    )
    writable_instructions = sum(
        1 for name in AGENT_INSTRUCTION_FILES
        if (workspace / name).is_file() and os.access(workspace / name, os.W_OK)
    )

    print("=" * 64)
    print("BASTION STATUS")
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
    print()

    # Overall posture
    if crits > 0:
        posture = "CRITICAL — Active injection patterns detected"
        code = 2
    elif warns > 0:
        posture = "WARNING — Suspicious patterns found, review needed"
        code = 1
    elif writable_instructions > 3:
        posture = "FAIR — Many writable instruction files"
        code = 1
    elif total_findings > 0:
        posture = "INFO — Minor findings, likely benign"
        code = 0
    else:
        posture = "GOOD — No injection patterns detected"
        code = 0

    print(f"POSTURE: {posture}")
    print("=" * 64)
    return code


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bastion",
        description="OpenClaw Bastion — Prompt Injection Defense",
    )
    parser.add_argument(
        "--workspace", "-w",
        help="Path to the workspace (auto-detected if omitted)",
        default=None,
    )

    sub = parser.add_subparsers(dest="command")

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

    # Pro upsell commands
    for pro_cmd in ("block", "sanitize", "quarantine", "canary", "enforce"):
        sub.add_parser(pro_cmd, help=f"[PRO] {pro_cmd} (requires openclaw-bastion-pro)")

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

    elif args.command in ("block", "sanitize", "quarantine", "canary", "enforce"):
        print(f"'{args.command}' is a Pro feature.")
        print("Upgrade to openclaw-bastion-pro for active defense:")
        print("  block, sanitize, quarantine, canary tokens, enforce policy via hooks")
        sys.exit(1)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
