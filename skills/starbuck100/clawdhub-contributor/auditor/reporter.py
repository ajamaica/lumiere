"""Report formatting for audit results."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .analyzer import AuditReport

logger = logging.getLogger(__name__)


def to_dict(report: AuditReport) -> dict[str, Any]:
    """Convert an AuditReport to a plain dict."""
    data = asdict(report)
    data["result"] = report.result
    data["max_severity"] = report.max_severity
    return data


def to_json(report: AuditReport, indent: int = 2) -> str:
    """Format an AuditReport as JSON string."""
    return json.dumps(to_dict(report), indent=indent, ensure_ascii=False)


def to_markdown(report: AuditReport) -> str:
    """Format an AuditReport as human-readable Markdown."""
    lines: list[str] = []
    lines.append(f"# Audit Report: {report.skill_slug}")
    lines.append("")
    lines.append(f"- **Path:** `{report.skill_path}`")
    lines.append(f"- **Files scanned:** {report.files_scanned}")
    lines.append(f"- **Findings:** {len(report.findings)}")
    lines.append(f"- **Risk score:** {report.risk_score}/100")
    lines.append(f"- **Result:** {report.result}")
    if report.max_severity:
        lines.append(f"- **Max severity:** {report.max_severity}")
    lines.append("")

    if not report.findings:
        lines.append("✅ No issues found.")
        return "\n".join(lines)

    by_sev: dict[str, list] = {}
    for f in report.findings:
        by_sev.setdefault(f.severity, []).append(f)

    for sev in ("critical", "high", "medium", "low"):
        items = by_sev.get(sev, [])
        if not items:
            continue
        icon = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵"}[sev]
        lines.append(f"## {icon} {sev.upper()} ({len(items)})")
        lines.append("")
        for f in items:
            loc = f"`{f.file}:{f.line_number}`" if f.file else "(metadata)"
            lines.append(f"- **[{f.pattern_id}] {f.name}** — {loc}")
            lines.append(f"  {f.description}")
            if f.line_content:
                lines.append(f"  ```")
                lines.append(f"  {f.line_content}")
                lines.append(f"  ```")
            lines.append("")

    return "\n".join(lines)


def save_report(report: AuditReport, report_dir: str) -> Path:
    """Save report as both JSON and Markdown files.

    Returns:
        Path to the JSON report file.
    """
    out = Path(report_dir)
    out.mkdir(parents=True, exist_ok=True)

    json_path = out / f"{report.skill_slug}.json"
    md_path = out / f"{report.skill_slug}.md"

    json_path.write_text(to_json(report), encoding="utf-8")
    md_path.write_text(to_markdown(report), encoding="utf-8")

    logger.info("Reports saved: %s, %s", json_path, md_path)
    return json_path


def prepare_api_payload(report: AuditReport) -> dict[str, Any]:
    """Prepare payload for future POST /api/v1/reports/security endpoint.

    Returns:
        Dict ready for JSON serialization and HTTP submission.
    """
    return {
        "skill_slug": report.skill_slug,
        "risk_score": report.risk_score,
        "result": report.result,
        "max_severity": report.max_severity,
        "findings_count": len(report.findings),
        "findings": [
            {
                "pattern_id": f.pattern_id,
                "severity": f.severity,
                "name": f.name,
                "file": f.file,
                "line_number": f.line_number,
            }
            for f in report.findings
        ],
    }
