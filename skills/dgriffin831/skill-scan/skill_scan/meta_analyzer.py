"""Meta Analyzer — Layer 5b: Second-pass review of all findings.

Filters false positives, correlates related findings, and provides an
overall risk assessment.  Runs after all other analysis layers (including
alignment) so it can review everything.  Reuses LLMAnalyzer.call_llm().
"""

from __future__ import annotations

import asyncio
import json
import re
import secrets
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .llm_analyzer import LLMAnalyzer

# ── Prompts ────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are reviewing findings from an automated agent-skill security scanner.

Your job:
1. Classify each finding as "true_positive" or "false_positive" with a reason.
2. Optionally adjust severity one level up or down.
3. Identify correlations — groups of related findings that together reveal a \
threat pattern.
4. Note any threats the scanner may have MISSED.
5. Provide an overall risk assessment.

Be conservative: only mark a finding as false_positive if you are confident \
the pattern is benign in context.  When in doubt, keep it as true_positive.
"""

_RESPONSE_FORMAT = """\
Respond with ONLY a JSON object (no markdown fences, no extra text):

{
  "finding_reviews": [
    {
      "_index": 0,
      "verdict": "true_positive" | "false_positive",
      "reason": "Why this is or isn't a real threat",
      "adjusted_severity": "critical" | "high" | "medium" | "low" | "info" | null
    }
  ],
  "correlations": [
    {
      "name": "Short name for the correlated pattern",
      "finding_indices": [0, 3, 5],
      "description": "How these findings relate"
    }
  ],
  "missed_threats": [
    {
      "title": "Threat the scanner missed",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "category-name",
      "description": "Details"
    }
  ],
  "overall_risk": "SAFE" | "SUSPICIOUS" | "MALICIOUS"
}

Rules:
- "finding_reviews" must have one entry per finding (matched by _index)
- "adjusted_severity" is null to keep original severity, or a new level
- "correlations" and "missed_threats" can be empty arrays
- Return ONLY the JSON object
"""


class MetaAnalyzer:
    """Second-pass analysis: filter false positives, correlate, and prioritize."""

    def analyze(
        self,
        report: dict,
        file_contents: dict[str, str],
        llm_analyzer: LLMAnalyzer,
    ) -> dict | None:
        """Run meta-analysis on the full scan report.

        Returns the parsed meta-analysis result, or None on failure.
        """
        findings = report.get("findings", [])
        if not findings:
            return None

        return asyncio.run(
            self._analyze_async(report, file_contents, llm_analyzer)
        )

    async def _analyze_async(
        self,
        report: dict,
        file_contents: dict[str, str],
        llm_analyzer: LLMAnalyzer,
    ) -> dict | None:
        delimiter = f"<<<META_CONTENT_{secrets.token_hex(16)}>>>"

        system_prompt = _SYSTEM_PROMPT
        user_prompt = self._build_user_prompt(delimiter, report, file_contents)

        try:
            raw = await llm_analyzer.call_llm(system_prompt, user_prompt)
        except Exception:
            return None

        return self._parse_response(raw, len(report.get("findings", [])))

    # ── Prompt construction ────────────────────────────────────────

    @staticmethod
    def _build_user_prompt(
        delimiter: str,
        report: dict,
        file_contents: dict[str, str],
    ) -> str:
        parts: list[str] = []
        parts.append(
            "Review the following scan findings and determine which are true "
            "positives vs false positives.  Also look for correlations and "
            "missed threats.\n"
        )

        # Skill metadata (trusted context)
        metadata = report.get("metadata")
        if metadata:
            parts.append("## Skill Metadata")
            if metadata.get("name"):
                parts.append(f"Name: {metadata['name']}")
            if metadata.get("description"):
                parts.append(f"Description: {metadata['description']}")
            parts.append("")

        # Score context
        parts.append(f"Current score: {report.get('score', 100)}/100")
        parts.append(f"Risk level: {report.get('risk', 'LOW')}")
        parts.append("")

        # Compact findings summary
        findings = report.get("findings", [])
        parts.append(f"## Findings ({len(findings)} total)\n")
        for i, f in enumerate(findings):
            parts.append(
                f"[{i}] {f.get('ruleId', '?')} | {f.get('severity', '?')} | "
                f"{f.get('file', '?')} | {f.get('title', '?')}"
            )
            ctx = f.get("context", "")
            if ctx:
                parts.append(f"    context: {ctx[:120]}")
            note = f.get("contextNote", "")
            if note:
                parts.append(f"    note: {note[:120]}")
        parts.append("")

        # Alignment analysis summary if present
        alignment = report.get("alignmentAnalysis")
        if alignment:
            parts.append("## Alignment Analysis")
            parts.append(f"Aligned: {alignment.get('aligned')}")
            parts.append(f"Classification: {alignment.get('classification')}")
            for m in alignment.get("mismatches", [])[:5]:
                parts.append(f"  - {m.get('description', '')[:150]}")
            parts.append("")

        # Behavioral signatures
        sigs = report.get("behavioralSignatures", [])
        if sigs:
            parts.append("## Behavioral Signatures")
            for sig in sigs:
                suppressed = " (suppressed)" if sig.get("suppressed") else ""
                parts.append(f"  - {sig.get('name', '?')}: {sig.get('description', '')[:100]}{suppressed}")
            parts.append("")

        # Key file contents (inside delimiter, truncated)
        parts.append(delimiter)
        parts.append("")

        # Include SKILL.md first if available
        if "SKILL.md" in file_contents:
            content = file_contents["SKILL.md"]
            truncated = content[:1500]
            if len(content) > 1500:
                truncated += "\n... [TRUNCATED]"
            parts.append("=== SKILL.md ===")
            parts.append(truncated)
            parts.append("")

        # Include other files (limited to keep within token budget)
        other_files = {k: v for k, v in file_contents.items() if k != "SKILL.md"}
        chars_remaining = 3000
        for fpath, content in other_files.items():
            if chars_remaining <= 0:
                break
            truncated = content[:min(1000, chars_remaining)]
            if len(content) > len(truncated):
                truncated += "\n... [TRUNCATED]"
            parts.append(f"=== FILE: {fpath} ===")
            parts.append(truncated)
            parts.append("")
            chars_remaining -= len(truncated)

        parts.append(delimiter)
        parts.append("")
        parts.append(_RESPONSE_FORMAT)

        return "\n".join(parts)

    # ── Response parsing ───────────────────────────────────────────

    @staticmethod
    def _parse_response(raw: str | None, num_findings: int) -> dict | None:
        if not raw or not isinstance(raw, str):
            return None

        cleaned = raw.strip()
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

        parsed = None
        try:
            parsed = json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            m = re.search(r"\{[\s\S]*\}", cleaned)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                except (json.JSONDecodeError, ValueError):
                    return None
            else:
                return None

        return _validate_meta_result(parsed, num_findings)

    # ── Apply meta-analysis results to report ──────────────────────

    @staticmethod
    def apply_to_report(report: dict, meta_result: dict) -> None:
        """Mutate the report based on meta-analysis verdicts.

        - False positives: set weight=0, add contextNote, keep finding
        - True positives: optionally adjust severity
        - Missed threats: add as new findings
        """
        findings = report.get("findings", [])
        valid_severities = {"critical", "high", "medium", "low", "info"}
        severity_to_weight = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 0}

        for review in meta_result.get("finding_reviews", []):
            idx = review.get("_index")
            if not isinstance(idx, int) or idx < 0 or idx >= len(findings):
                continue

            finding = findings[idx]

            if review.get("verdict") == "false_positive":
                finding["weight"] = 0
                reason = review.get("reason", "Classified as false positive by meta-analysis")
                finding["contextNote"] = f"Meta-analysis: {reason[:200]}"
                finding["severity"] = "info"
            elif review.get("verdict") == "true_positive":
                adj = review.get("adjusted_severity")
                if adj and adj in valid_severities and adj != finding.get("severity"):
                    finding["severity"] = adj
                    finding["weight"] = severity_to_weight.get(adj, finding.get("weight", 8))
                    finding["contextNote"] = (
                        (finding.get("contextNote") or "")
                        + f" (severity adjusted by meta-analysis: {review.get('reason', '')[:100]})"
                    ).strip()

        # Add missed threats as new findings
        for missed in meta_result.get("missed_threats", []):
            severity = missed.get("severity", "medium")
            if severity not in valid_severities or severity == "info":
                severity = "medium"
            report["findings"].append({
                "ruleId": "META_MISSED_THREAT",
                "severity": severity,
                "category": missed.get("category", "behavioral"),
                "title": f"[Meta] {missed.get('title', 'Missed threat')}",
                "file": "(meta-analysis)",
                "line": 0,
                "match": "",
                "context": (missed.get("description") or "")[:200],
                "weight": severity_to_weight.get(severity, 8),
                "source": "meta",
            })

        # Store correlations and overall risk
        report.setdefault("metaAnalysis", {})
        report["metaAnalysis"]["correlations"] = meta_result.get("correlations", [])
        report["metaAnalysis"]["overall_risk"] = meta_result.get("overall_risk", "SUSPICIOUS")
        report["metaAnalysis"]["finding_reviews"] = meta_result.get("finding_reviews", [])

        # Count FP/TP stats
        reviews = meta_result.get("finding_reviews", [])
        report["metaAnalysis"]["false_positive_count"] = sum(
            1 for r in reviews if r.get("verdict") == "false_positive"
        )
        report["metaAnalysis"]["true_positive_count"] = sum(
            1 for r in reviews if r.get("verdict") == "true_positive"
        )


def _validate_meta_result(parsed: dict, num_findings: int) -> dict:
    """Normalize and validate the LLM meta-analysis response."""
    # Finding reviews
    reviews = parsed.get("finding_reviews", [])
    if not isinstance(reviews, list):
        reviews = []

    valid_verdicts = {"true_positive", "false_positive"}
    valid_severities = {"critical", "high", "medium", "low", "info"}
    cleaned_reviews: list[dict] = []
    for r in reviews:
        if not isinstance(r, dict):
            continue
        idx = r.get("_index")
        if not isinstance(idx, int) or idx < 0 or idx >= num_findings:
            continue
        verdict = r.get("verdict", "true_positive")
        if verdict not in valid_verdicts:
            verdict = "true_positive"
        adj_sev = r.get("adjusted_severity")
        if adj_sev is not None and adj_sev not in valid_severities:
            adj_sev = None
        cleaned_reviews.append({
            "_index": idx,
            "verdict": verdict,
            "reason": str(r.get("reason", ""))[:300],
            "adjusted_severity": adj_sev,
        })

    # Correlations
    correlations = parsed.get("correlations", [])
    if not isinstance(correlations, list):
        correlations = []
    cleaned_corrs: list[dict] = []
    for c in correlations:
        if not isinstance(c, dict):
            continue
        indices = c.get("finding_indices", [])
        if not isinstance(indices, list):
            continue
        valid_indices = [i for i in indices if isinstance(i, int) and 0 <= i < num_findings]
        if len(valid_indices) < 2:
            continue
        cleaned_corrs.append({
            "name": str(c.get("name", ""))[:100],
            "finding_indices": valid_indices,
            "description": str(c.get("description", ""))[:300],
        })

    # Missed threats
    missed = parsed.get("missed_threats", [])
    if not isinstance(missed, list):
        missed = []
    cleaned_missed: list[dict] = []
    for m in missed:
        if not isinstance(m, dict):
            continue
        m_sev = m.get("severity", "medium")
        if m_sev not in valid_severities:
            m_sev = "medium"
        cleaned_missed.append({
            "title": str(m.get("title", ""))[:200],
            "severity": m_sev,
            "category": str(m.get("category", "behavioral"))[:50],
            "description": str(m.get("description", ""))[:500],
        })

    # Overall risk
    overall_risk = parsed.get("overall_risk", "SUSPICIOUS")
    if overall_risk not in ("SAFE", "SUSPICIOUS", "MALICIOUS"):
        overall_risk = "SUSPICIOUS"

    return {
        "finding_reviews": cleaned_reviews,
        "correlations": cleaned_corrs,
        "missed_threats": cleaned_missed,
        "overall_risk": overall_risk,
    }
