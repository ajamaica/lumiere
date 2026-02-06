"""SkillGuard Reporter — Formats audit reports."""

from __future__ import annotations

import json
from collections import defaultdict

SEVERITY_ICONS = {
    "critical": "\U0001f534",  # red circle
    "high": "\U0001f7e0",      # orange circle
    "medium": "\U0001f7e1",    # yellow circle
    "low": "\U0001f535",       # blue circle
    "info": "\u2139\ufe0f",    # info
}

RISK_ICONS = {
    "LOW": "\u2705",       # check mark
    "MEDIUM": "\u26a0\ufe0f",  # warning
    "HIGH": "\U0001f7e0",      # orange circle
    "CRITICAL": "\U0001f534",  # red circle
}


def format_text_report(report: dict) -> str:
    lines: list[str] = []

    lines.append("\u2550" * 43)
    lines.append("  SkillGuard Security Audit Report")
    lines.append("\u2550" * 43)
    lines.append("")
    lines.append(f"  Path:     {report['path']}")
    lines.append(f"  Scanned:  {report['scannedAt']}")
    lines.append(f"  Files:    {len(report['files'])}")
    risk_icon = RISK_ICONS.get(report.get("risk", "LOW"), "")
    lines.append(f"  Score:    {report['score']}/100 {risk_icon} {report.get('risk', 'LOW')} RISK")
    lines.append("")

    # Summary bar
    parts: list[str] = []
    summary = report.get("summary", {})
    if summary.get("critical", 0) > 0:
        parts.append(f"{SEVERITY_ICONS['critical']} {summary['critical']} critical")
    if summary.get("high", 0) > 0:
        parts.append(f"{SEVERITY_ICONS['high']} {summary['high']} high")
    if summary.get("medium", 0) > 0:
        parts.append(f"{SEVERITY_ICONS['medium']} {summary['medium']} medium")
    if summary.get("low", 0) > 0:
        parts.append(f"{SEVERITY_ICONS['low']} {summary['low']} low")
    if not parts:
        parts.append("\u2705 No issues found")
    lines.append(f"  Findings: {' | '.join(parts)}")
    lines.append("")

    # Flags
    flags = report.get("flags", [])
    if flags:
        lines.append("  Flags:")
        for flag in flags:
            lines.append(f"    \u2691 {flag}")
        lines.append("")

    # Metadata
    metadata = report.get("metadata")
    if metadata:
        lines.append("  Skill Metadata:")
        for key, val in metadata.items():
            display = json.dumps(val) if isinstance(val, (dict, list)) else str(val)
            lines.append(f"    {key}: {display}")
        lines.append("")

    # Findings grouped by severity
    findings = report.get("findings", [])
    if findings:
        lines.append("\u2500" * 43)
        lines.append("  FINDINGS")
        lines.append("\u2500" * 43)
        lines.append("")

        by_severity = _group_by(findings, "severity")
        for severity in ["critical", "high", "medium", "low", "info"]:
            group = by_severity.get(severity, [])
            if not group:
                continue

            icon = SEVERITY_ICONS.get(severity, "")
            lines.append(f"  {icon} {severity.upper()} ({len(group)})")
            lines.append("")

            by_rule = _group_by(group, "ruleId")
            for rule_id, rule_findings in by_rule.items():
                lines.append(f"    [{rule_id}] {rule_findings[0].get('title', '')}")

                shown = rule_findings[:5]
                for f in shown:
                    ctx = f.get("context", "")[:100]
                    lines.append(f"      \u2192 {f.get('file', '')}:{f.get('line', 0)}  {ctx}")
                if len(rule_findings) > 5:
                    lines.append(f"      ... and {len(rule_findings) - 5} more")
                lines.append("")

    # LLM Analysis section
    llm_analysis = report.get("llmAnalysis")
    if llm_analysis:
        lines.append("\u2500" * 43)
        lines.append("  LLM ANALYSIS")
        lines.append("\u2500" * 43)
        lines.append("")

        llm = llm_analysis
        verdict = llm.get("verdict", "")
        if verdict == "SAFE":
            verdict_icon = "\u2705"
        elif verdict == "MALICIOUS":
            verdict_icon = "\U0001f534"
        elif verdict == "ERROR":
            verdict_icon = "\u274c"
        else:
            verdict_icon = "\u26a0\ufe0f"

        confidence = llm.get("confidence", 0)
        lines.append(f"  Verdict:    {verdict_icon} {verdict} (confidence: {confidence:.2f})")
        lines.append(f"  Model:      {llm.get('model', 'unknown')} ({llm.get('provider', 'unknown')})")
        lines.append(f"  Latency:    {llm.get('latencyMs', 0)}ms")
        lines.append("")

        if llm.get("overall_assessment"):
            lines.append(f"  Assessment: {llm['overall_assessment']}")
            lines.append("")

        if llm.get("primary_threats"):
            lines.append(f"  Threats:    {', '.join(llm['primary_threats'])}")
            lines.append("")

        if llm.get("error"):
            lines.append(f"  Error:      {llm['error']}")
            lines.append("")

    # Alignment Analysis section
    alignment = report.get("alignmentAnalysis")
    if alignment:
        lines.append("\u2500" * 43)
        lines.append("  ALIGNMENT ANALYSIS")
        lines.append("\u2500" * 43)
        lines.append("")

        aligned = alignment.get("aligned", True)
        confidence = alignment.get("confidence", "MEDIUM")
        classification = alignment.get("classification", "SAFE")

        if aligned:
            align_icon = "\u2705"
        elif classification == "THREAT":
            align_icon = "\U0001f534"
        else:
            align_icon = "\u26a0\ufe0f"

        lines.append(f"  Aligned:        {align_icon} {aligned}")
        lines.append(f"  Confidence:     {confidence}")
        lines.append(f"  Classification: {classification}")
        lines.append("")

        mismatches = alignment.get("mismatches", [])
        if mismatches:
            lines.append(f"  Mismatches ({len(mismatches)}):")
            for m in mismatches[:10]:
                sev_icon = SEVERITY_ICONS.get(m.get("severity", "medium"), "")
                lines.append(f"    {sev_icon} [{m.get('type', '?')}] {m.get('description', '')[:120]}")
                if m.get("evidence"):
                    lines.append(f"      Evidence: {m['evidence'][:100]}")
            lines.append("")

    # Meta-Analysis section
    meta = report.get("metaAnalysis")
    if meta:
        lines.append("\u2500" * 43)
        lines.append("  META-ANALYSIS")
        lines.append("\u2500" * 43)
        lines.append("")

        fp_count = meta.get("false_positive_count", 0)
        tp_count = meta.get("true_positive_count", 0)
        overall = meta.get("overall_risk", "SUSPICIOUS")

        lines.append(f"  Overall Risk:     {overall}")
        lines.append(f"  True Positives:   {tp_count}")
        lines.append(f"  False Positives:  {fp_count}")
        lines.append("")

        correlations = meta.get("correlations", [])
        if correlations:
            lines.append(f"  Correlations ({len(correlations)}):")
            for c in correlations[:5]:
                indices = ", ".join(str(i) for i in c.get("finding_indices", []))
                lines.append(f"    \u2022 {c.get('name', '?')} (findings: {indices})")
                if c.get("description"):
                    lines.append(f"      {c['description'][:120]}")
            lines.append("")

    # Verdict
    lines.append("\u2500" * 43)
    lines.append(f"  VERDICT: {_get_verdict(report)}")
    lines.append("\u2500" * 43)
    lines.append("")

    return "\n".join(lines)


def format_compact_report(report: dict, skill_name: str | None = None) -> str:
    name = skill_name or (report.get("metadata") or {}).get("name") or report["path"].split("/")[-1]
    lines: list[str] = []

    lines.append(f"\U0001f6e1\ufe0f **SkillGuard Audit: {name}**")
    risk_icon = RISK_ICONS.get(report.get("risk", "LOW"), "")
    lines.append(f"Score: **{report['score']}/100** {risk_icon}")
    lines.append("")

    findings = report.get("findings", [])
    if not findings:
        lines.append("\u2705 Clean \u2014 no issues detected.")
        return "\n".join(lines)

    by_category = _group_by(findings, "category")
    for category, cat_findings in by_category.items():
        worst = max(cat_findings, key=lambda f: _severity_rank(f.get("severity", "info")))
        icon = SEVERITY_ICONS.get(worst.get("severity", "info"), "")
        lines.append(f"{icon} **{category}**: {len(cat_findings)} finding(s)")

        unique_matches = list(dict.fromkeys(f.get("match", "") for f in cat_findings))[:3]
        for m in unique_matches:
            lines.append(f"  `{m}`")

    llm_analysis = report.get("llmAnalysis")
    if llm_analysis:
        lines.append("")
        llm = llm_analysis
        verdict = llm.get("verdict", "")
        if verdict == "SAFE":
            verdict_icon = "\u2705"
        elif verdict == "MALICIOUS":
            verdict_icon = "\U0001f534"
        else:
            verdict_icon = "\u26a0\ufe0f"
        lines.append(f"{verdict_icon} **LLM**: {verdict} ({llm.get('model', '')}, {llm.get('latencyMs', 0)}ms)")
        if llm.get("overall_assessment"):
            lines.append(f"  {llm['overall_assessment'][:200]}")

    alignment = report.get("alignmentAnalysis")
    if alignment:
        lines.append("")
        aligned = alignment.get("aligned", True)
        classification = alignment.get("classification", "SAFE")
        if aligned:
            lines.append(f"\u2705 **Alignment**: Aligned ({classification})")
        else:
            mismatches = alignment.get("mismatches", [])
            lines.append(f"\u26a0\ufe0f **Alignment**: {len(mismatches)} mismatch(es) ({classification})")

    meta = report.get("metaAnalysis")
    if meta:
        fp = meta.get("false_positive_count", 0)
        tp = meta.get("true_positive_count", 0)
        overall = meta.get("overall_risk", "SUSPICIOUS")
        lines.append(f"\U0001f50d **Meta**: {overall} ({tp} TP, {fp} FP)")

    lines.append("")
    lines.append(f"Verdict: {_get_verdict(report)}")

    return "\n".join(lines)


def format_moltbook_post(report: dict, skill_name: str | None = None) -> str:
    name = skill_name or (report.get("metadata") or {}).get("name") or "Unknown Skill"
    lines: list[str] = []

    lines.append(f"\U0001f6e1\ufe0f SkillGuard Audit: {name}")
    lines.append(f"Score: {report['score']}/100 | Risk: {report.get('risk', 'LOW')}")
    lines.append("")

    summary = report.get("summary", {})
    if summary.get("critical", 0) > 0:
        lines.append(f"\u26a0\ufe0f CRITICAL ISSUES FOUND ({summary['critical']})")
        criticals = [f for f in report.get("findings", []) if f.get("severity") == "critical"]
        for f in criticals[:5]:
            lines.append(f"- [{f.get('ruleId', '')}] {f.get('title', '')} @ {f.get('file', '')}:{f.get('line', 0)}")
        lines.append("")

    if summary.get("high", 0) > 0:
        lines.append(f"\U0001f7e0 High severity: {summary['high']} finding(s)")
    if summary.get("medium", 0) > 0:
        lines.append(f"\U0001f7e1 Medium severity: {summary['medium']} finding(s)")

    lines.append("")
    lines.append(f"Verdict: {_get_verdict(report)}")
    lines.append("")
    lines.append("---")
    lines.append("Scanned by SkillGuard v0.1.0 | @kai_claw")

    return "\n".join(lines)


def _get_verdict(report: dict) -> str:
    score = report.get("score", 0)
    if score >= 80:
        return "\u2705 PASS \u2014 Low risk, appears safe to install."
    if score >= 50:
        return "\u26a0\ufe0f CAUTION \u2014 Review findings before installing."
    if score >= 20:
        return "\U0001f7e0 WARNING \u2014 Significant security concerns detected."
    return "\U0001f534 FAIL \u2014 Critical security issues. Do NOT install without thorough manual review."


def _severity_rank(sev: str) -> int:
    return {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}.get(sev, 0)


def _group_by(items: list[dict], key: str) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        groups[item.get(key, "")].append(item)
    return dict(groups)
