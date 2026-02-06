#!/usr/bin/env python3
"""ClawdHub Security Auditor — main entry point.

Usage:
    python3 -m auditor [--full-scan] [--skill SLUG] [--report-dir DIR] [--watch SECONDS] [--db PATH]
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .analyzer import AuditReport, analyze_skill
from .reporter import save_report, to_markdown
from .state import AuditState

logger = logging.getLogger("auditor")

DEFAULT_REPORT_DIR = "./audit-reports"
DEFAULT_DB_PATH = "./audit_state.db"


def _run_clawdhub(args: list[str], timeout: int = 60) -> subprocess.CompletedProcess[str]:
    """Run a clawdhub CLI command and return the result."""
    cmd = ["clawdhub"] + args
    logger.debug("Running: %s", " ".join(cmd))
    return subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout,
    )


def fetch_skill_list() -> list[dict[str, str]]:
    """Fetch available skills from the registry via clawdhub CLI.

    Returns:
        List of dicts with 'slug' and 'version' keys.
    """
    result = _run_clawdhub(["search", "*", "--json"])
    if result.returncode != 0:
        # Fallback: try 'explore' or 'list'
        result = _run_clawdhub(["search", "", "--json"])
    if result.returncode != 0:
        logger.warning("clawdhub search failed (rc=%d): %s", result.returncode, result.stderr.strip())
        # Try parsing non-JSON output
        skills: list[dict[str, str]] = []
        plain = _run_clawdhub(["search", "*"])
        if plain.returncode == 0:
            for line in plain.stdout.splitlines():
                parts = line.strip().split()
                if parts:
                    slug = parts[0]
                    version = parts[1] if len(parts) > 1 else "unknown"
                    skills.append({"slug": slug, "version": version})
        return skills

    try:
        data = json.loads(result.stdout)
        if isinstance(data, list):
            return [
                {"slug": s.get("slug", s.get("name", "")), "version": s.get("version", "unknown")}
                for s in data if isinstance(s, dict)
            ]
    except json.JSONDecodeError:
        logger.warning("Could not parse clawdhub output as JSON")

    return []


def download_skill(slug: str, dest_dir: str) -> Path | None:
    """Download a skill to a temporary directory.

    Args:
        slug: The skill slug.
        dest_dir: Directory to install into.

    Returns:
        Path to the installed skill directory, or None on failure.
    """
    result = _run_clawdhub(["install", slug, "--dir", dest_dir], timeout=120)
    if result.returncode != 0:
        logger.error("Failed to download %s: %s", slug, result.stderr.strip())
        return None

    # The skill should be installed under dest_dir/skills/slug or dest_dir/slug
    for candidate in [
        Path(dest_dir) / "skills" / slug,
        Path(dest_dir) / slug,
    ]:
        if candidate.is_dir():
            return candidate

    # Try to find any new directory
    for p in Path(dest_dir).rglob("SKILL.md"):
        return p.parent

    logger.warning("Could not locate installed skill %s in %s", slug, dest_dir)
    return None


def audit_single_skill(
    slug: str,
    state: AuditState,
    report_dir: str,
    version: str = "unknown",
    force: bool = False,
) -> AuditReport | None:
    """Audit a single skill: download, analyze, report, record.

    Args:
        slug: Skill slug.
        state: AuditState instance.
        report_dir: Directory to save reports.
        version: Skill version string.
        force: Re-audit even if already done.

    Returns:
        AuditReport or None on failure.
    """
    if not force and state.is_audited(slug, version):
        logger.info("Skipping %s@%s (already audited)", slug, version)
        return None

    logger.info("Auditing %s@%s ...", slug, version)

    with tempfile.TemporaryDirectory(prefix=f"audit_{slug}_") as tmpdir:
        skill_path = download_skill(slug, tmpdir)
        if skill_path is None:
            logger.error("Could not download %s, skipping", slug)
            return None

        report = analyze_skill(str(skill_path))

    # Save report
    save_report(report, report_dir)

    # Record in state
    state.record_audit(
        slug=slug,
        version=version,
        result=report.result,
        risk_score=report.risk_score,
        findings=[
            {"pattern_id": f.pattern_id, "severity": f.severity, "file": f.file, "line": f.line_number}
            for f in report.findings
        ],
    )

    # Print summary
    if report.findings:
        logger.warning("⚠️  %s: %d findings (risk=%d, max=%s)", slug, len(report.findings), report.risk_score, report.max_severity)
    else:
        logger.info("✅ %s: clean", slug)

    return report


def run_scan(
    full_scan: bool = False,
    skill_slug: str | None = None,
    report_dir: str = DEFAULT_REPORT_DIR,
    db_path: str = DEFAULT_DB_PATH,
) -> list[AuditReport]:
    """Run an audit scan.

    Args:
        full_scan: Re-audit all skills regardless of state.
        skill_slug: If set, audit only this skill.
        report_dir: Where to save reports.
        db_path: Path to SQLite state database.

    Returns:
        List of generated AuditReports.
    """
    state = AuditState(db_path)
    reports: list[AuditReport] = []

    try:
        if skill_slug:
            report = audit_single_skill(skill_slug, state, report_dir, force=full_scan)
            if report:
                reports.append(report)
        else:
            skills = fetch_skill_list()
            if not skills:
                logger.warning("No skills found in registry")
                return reports

            logger.info("Found %d skills in registry", len(skills))

            if full_scan:
                queue = skills
            else:
                queue = state.build_queue(skills)

            logger.info("%d skills in audit queue", len(queue))

            for skill in queue:
                try:
                    report = audit_single_skill(
                        slug=skill["slug"],
                        state=state,
                        report_dir=report_dir,
                        version=skill.get("version", "unknown"),
                        force=full_scan,
                    )
                    if report:
                        reports.append(report)
                except Exception:
                    logger.exception("Error auditing %s, continuing...", skill["slug"])
    finally:
        state.close()

    return reports


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="ClawdHub Security Auditor — static vulnerability scanner for skills",
    )
    parser.add_argument("--full-scan", action="store_true", help="Re-audit all skills (ignore state)")
    parser.add_argument("--skill", type=str, default=None, help="Audit a single skill by slug")
    parser.add_argument("--report-dir", type=str, default=DEFAULT_REPORT_DIR, help="Directory for reports")
    parser.add_argument("--db", type=str, default=DEFAULT_DB_PATH, help="Path to state database")
    parser.add_argument("--watch", type=int, default=None, metavar="SECONDS", help="Run continuously with sleep interval")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable debug logging")
    parser.add_argument("--local", type=str, default=None, help="Analyze a local skill directory (no download)")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if args.local:
        report = analyze_skill(args.local)
        save_report(report, args.report_dir)
        print(to_markdown(report))
        sys.exit(1 if report.findings else 0)

    if args.watch:
        logger.info("Running in watch mode (interval=%ds)", args.watch)
        while True:
            try:
                run_scan(
                    full_scan=args.full_scan,
                    skill_slug=args.skill,
                    report_dir=args.report_dir,
                    db_path=args.db,
                )
            except KeyboardInterrupt:
                logger.info("Shutting down.")
                break
            except Exception:
                logger.exception("Scan cycle failed")
            logger.info("Sleeping %ds...", args.watch)
            time.sleep(args.watch)
    else:
        reports = run_scan(
            full_scan=args.full_scan,
            skill_slug=args.skill,
            report_dir=args.report_dir,
            db_path=args.db,
        )
        flagged = [r for r in reports if r.result == "flagged"]
        logger.info("Scan complete: %d audited, %d flagged", len(reports), len(flagged))
        sys.exit(1 if flagged else 0)


if __name__ == "__main__":
    main()
