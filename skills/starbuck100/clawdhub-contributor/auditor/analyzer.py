"""Static analysis engine for skill packages."""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .patterns import PATTERNS, Pattern

logger = logging.getLogger(__name__)

SEVERITY_WEIGHTS: dict[str, int] = {
    "critical": 25,
    "high": 15,
    "medium": 5,
    "low": 1,
}

MAX_FILE_SIZE = 1_048_576  # 1 MB
TEXT_EXTENSIONS = {
    ".md", ".txt", ".sh", ".bash", ".py", ".js", ".ts", ".json", ".yaml",
    ".yml", ".toml", ".ini", ".cfg", ".conf", ".env", ".example", ".csv",
    ".html", ".css", ".xml", ".rb", ".pl", ".lua", ".rs", ".go", ".java",
    ".c", ".h", ".cpp", ".hpp", ".r", ".jl", "",
}

# Directories/files to skip during scanning (test fixtures, docs with examples)
SKIP_DIRS = {"tests", "test", "__tests__", "node_modules", ".git", "__pycache__", "audit-reports"}
SKIP_SUFFIXES = {"_test.py", "_test.sh", ".test.js", ".test.ts", ".spec.js", ".spec.ts"}


@dataclass
class Finding:
    """A single matched vulnerability pattern."""
    pattern_id: str
    name: str
    severity: str
    description: str
    file: str
    line_number: int
    line_content: str


@dataclass
class AuditReport:
    """Full audit report for a skill."""
    skill_path: str
    skill_slug: str
    findings: list[Finding] = field(default_factory=list)
    risk_score: int = 0
    files_scanned: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def result(self) -> str:
        """Return 'clean' or 'flagged'."""
        return "flagged" if self.findings else "clean"

    @property
    def max_severity(self) -> str | None:
        """Return the highest severity found."""
        order = ["critical", "high", "medium", "low"]
        for sev in order:
            if any(f.severity == sev for f in self.findings):
                return sev
        return None


def _is_text_file(path: Path) -> bool:
    """Heuristic check for text files."""
    return path.suffix.lower() in TEXT_EXTENSIONS


def _check_metadata(skill_path: Path) -> list[Finding]:
    """Check metadata-level issues (no regex needed)."""
    findings: list[Finding] = []

    # Missing LICENSE
    license_files = [f for f in skill_path.iterdir() if f.name.upper().startswith("LICENSE")]
    if not license_files:
        findings.append(Finding(
            pattern_id="META_001", name="Missing license", severity="low",
            description="No LICENSE file found.", file="", line_number=0, line_content="",
        ))

    # SKILL.md metadata check
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        findings.append(Finding(
            pattern_id="META_002", name="No SKILL.md", severity="low",
            description="SKILL.md is missing.", file="", line_number=0, line_content="",
        ))
    else:
        try:
            content = skill_md.read_text(errors="replace")
            if not content.startswith("---"):
                findings.append(Finding(
                    pattern_id="META_002", name="No SKILL.md metadata", severity="low",
                    description="SKILL.md has no frontmatter.", file="SKILL.md",
                    line_number=1, line_content=content[:80],
                ))
        except OSError:
            pass

    # Changelog
    changelog_names = {"CHANGELOG", "CHANGELOG.md", "changelog", "changelog.md", "CHANGES", "CHANGES.md"}
    if not any((skill_path / n).exists() for n in changelog_names):
        findings.append(Finding(
            pattern_id="META_004", name="No changelog", severity="low",
            description="No changelog found.", file="", line_number=0, line_content="",
        ))

    # Large files
    for root, _dirs, files in os.walk(skill_path):
        for fname in files:
            fpath = Path(root) / fname
            try:
                if fpath.stat().st_size > MAX_FILE_SIZE:
                    rel = str(fpath.relative_to(skill_path))
                    findings.append(Finding(
                        pattern_id="META_003", name="Large file in skill", severity="low",
                        description=f"File {rel} exceeds 1MB.",
                        file=rel, line_number=0, line_content="",
                    ))
            except OSError:
                pass

    return findings


def _compile_patterns() -> list[tuple[str, Pattern, re.Pattern[str]]]:
    """Pre-compile all regex patterns."""
    compiled: list[tuple[str, Pattern, re.Pattern[str]]] = []
    for severity, patterns in PATTERNS.items():
        for pat in patterns:
            if pat["regex"] == "__NO_FILE_MATCH__":
                continue
            try:
                compiled.append((severity, pat, re.compile(pat["regex"])))
            except re.error as exc:
                logger.warning("Invalid regex in %s: %s", pat["id"], exc)
    return compiled


_COMPILED: list[tuple[str, Pattern, re.Pattern[str]]] | None = None


def _get_compiled() -> list[tuple[str, Pattern, re.Pattern[str]]]:
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = _compile_patterns()
    return _COMPILED


def analyze_skill(skill_path: str) -> AuditReport:
    """Perform static analysis on a skill directory.

    Args:
        skill_path: Path to the skill's root directory.

    Returns:
        AuditReport with all findings and computed risk score.
    """
    root = Path(skill_path).resolve()
    slug = root.name
    report = AuditReport(skill_path=str(root), skill_slug=slug)

    if not root.is_dir():
        logger.error("Skill path does not exist or is not a directory: %s", root)
        return report

    compiled = _get_compiled()

    # Metadata checks
    report.findings.extend(_check_metadata(root))

    # Scan files (skip test dirs and test files to reduce false positives)
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skipped directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            fpath = Path(dirpath) / fname
            if not _is_text_file(fpath):
                continue
            # Skip test files
            if any(fname.endswith(s) for s in SKIP_SUFFIXES):
                continue
            rel = str(fpath.relative_to(root))
            try:
                content = fpath.read_text(errors="replace")
            except OSError as exc:
                logger.warning("Cannot read %s: %s", rel, exc)
                continue

            report.files_scanned += 1

            for line_no, line in enumerate(content.splitlines(), start=1):
                for severity, pat, regex in compiled:
                    if regex.search(line):
                        report.findings.append(Finding(
                            pattern_id=pat["id"],
                            name=pat["name"],
                            severity=severity,
                            description=pat["description"],
                            file=rel,
                            line_number=line_no,
                            line_content=line.strip()[:200],
                        ))

    # Compute risk score (0–100)
    raw = sum(SEVERITY_WEIGHTS.get(f.severity, 0) for f in report.findings)
    report.risk_score = min(100, raw)

    logger.info(
        "Audit complete for %s: %d findings, risk_score=%d",
        slug, len(report.findings), report.risk_score,
    )
    return report
