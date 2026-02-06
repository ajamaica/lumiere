"""Alignment Analyzer — Layer 5a: Verify code behavior matches SKILL.md claims.

Compares the skill's declared purpose (from SKILL.md) against actual code
behavior to detect trojan skills that claim one thing but do another.
Runs only when --llm is enabled; reuses LLMAnalyzer.call_llm().
"""

from __future__ import annotations

import asyncio
import json
import re
import secrets
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .llm_analyzer import LLMAnalyzer

# ── Severity → finding weight mapping ──────────────────────────────
_SEVERITY_WEIGHTS = {"critical": 30, "high": 20, "medium": 10, "low": 3}

# ── Prompts ────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a security analyst checking whether an agent skill's code matches \
its SKILL.md description.  Your job is to find THREATS — intentional \
malicious divergence between what the skill claims and what the code does.

Do NOT flag vulnerabilities (accidental bugs) or minor style issues.

Focus on these threat categories:
- data_exfiltration: Code sends data to unexpected destinations
- prompt_injection: Hidden instructions that hijack the host agent
- command_injection: Code runs arbitrary shell commands
- tool_poisoning: Code manipulates other tools/skills
- unauthorized_tool_use: Code uses tools not declared in allowed-tools
- obfuscation: Code hides its true behavior through encoding or indirection

Cross-component checks:
1. Description vs code behavior (description says "weather" but code reads SSH keys)
2. Manifest vs implementation (declares allowed-tools but code violates them)
3. Instructions vs scripts (SKILL.md says one thing, scripts do another)
"""

_RESPONSE_FORMAT = """\
Respond with ONLY a JSON object (no markdown fences, no extra text):

{
  "aligned": true | false,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "mismatches": [
    {
      "type": "hidden_behavior" | "description_mismatch" | "tool_violation" | "scope_creep",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "What the mismatch is",
      "evidence": "Specific code/text evidence",
      "skill_claims": "What the skill says it does",
      "actual_behavior": "What the code actually does"
    }
  ],
  "classification": "SAFE" | "SUSPICIOUS" | "THREAT"
}

Rules:
- "aligned" is true only if code fully matches description with no hidden behavior
- "mismatches" is an empty array if aligned
- Only flag INTENTIONAL divergence, not missing features or minor gaps
"""


class AlignmentAnalyzer:
    """Compare SKILL.md claims against actual code behavior."""

    def analyze(
        self,
        metadata: dict | None,
        skill_md_content: str,
        file_contents: dict[str, str],
        llm_analyzer: LLMAnalyzer,
    ) -> dict | None:
        """Check if code behavior matches SKILL.md description.

        Returns the parsed alignment result, or None on failure.
        """
        if not skill_md_content and not file_contents:
            return None

        return asyncio.run(
            self._analyze_async(metadata, skill_md_content, file_contents, llm_analyzer)
        )

    async def _analyze_async(
        self,
        metadata: dict | None,
        skill_md_content: str,
        file_contents: dict[str, str],
        llm_analyzer: LLMAnalyzer,
    ) -> dict | None:
        delimiter = f"<<<ALIGNMENT_CONTENT_{secrets.token_hex(16)}>>>"

        system_prompt = _SYSTEM_PROMPT
        user_prompt = self._build_user_prompt(delimiter, metadata, skill_md_content, file_contents)

        try:
            raw = await llm_analyzer.call_llm(system_prompt, user_prompt)
        except Exception:
            return None

        return self._parse_response(raw)

    # ── Prompt construction ────────────────────────────────────────

    @staticmethod
    def _build_user_prompt(
        delimiter: str,
        metadata: dict | None,
        skill_md_content: str,
        file_contents: dict[str, str],
    ) -> str:
        parts: list[str] = []
        parts.append(
            "Check whether this skill's code matches its SKILL.md description. "
            "Flag any THREATS (intentional malicious divergence), not bugs.\n"
        )

        # Trusted context outside delimiter
        if metadata:
            parts.append("## Declared Metadata")
            if metadata.get("name"):
                parts.append(f"Name: {metadata['name']}")
            if metadata.get("description"):
                parts.append(f"Description: {metadata['description']}")
            if metadata.get("allowed-tools"):
                parts.append(f"Allowed Tools: {metadata['allowed-tools']}")
            parts.append("")

        # Untrusted content inside delimiter
        parts.append(delimiter)
        parts.append("")

        if skill_md_content:
            parts.append("=== SKILL.md ===")
            truncated = skill_md_content[:2000]
            if len(skill_md_content) > 2000:
                truncated += "\n... [TRUNCATED]"
            parts.append(truncated)
            parts.append("")

        for fpath, content in file_contents.items():
            if fpath == "SKILL.md":
                continue
            parts.append(f"=== FILE: {fpath} ===")
            truncated = content[:1500]
            if len(content) > 1500:
                truncated += "\n... [TRUNCATED at 1500 chars]"
            parts.append(truncated)
            parts.append("")

        parts.append(delimiter)
        parts.append("")
        parts.append(_RESPONSE_FORMAT)

        return "\n".join(parts)

    # ── Response parsing ───────────────────────────────────────────

    @staticmethod
    def _parse_response(raw: str | None) -> dict | None:
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

        return _validate_alignment_result(parsed)

    # ── Convert mismatches to scanner findings ─────────────────────

    @staticmethod
    def to_findings(result: dict) -> list[dict]:
        """Convert alignment mismatches into scanner-compatible findings."""
        findings: list[dict] = []
        for mismatch in result.get("mismatches", []):
            severity = mismatch.get("severity", "medium")
            if severity not in _SEVERITY_WEIGHTS:
                severity = "medium"
            findings.append({
                "ruleId": "ALIGNMENT_MISMATCH",
                "severity": severity,
                "category": "alignment",
                "title": f"[Alignment] {mismatch.get('description', 'Description/code mismatch')}",
                "file": "(alignment-analysis)",
                "line": 0,
                "match": (mismatch.get("evidence") or "")[:80],
                "context": (
                    f"Claims: {mismatch.get('skill_claims', 'N/A')} | "
                    f"Actual: {mismatch.get('actual_behavior', 'N/A')}"
                )[:200],
                "weight": _SEVERITY_WEIGHTS.get(severity, 10),
                "source": "alignment",
            })
        return findings


def _validate_alignment_result(parsed: dict) -> dict:
    """Normalize and validate the LLM alignment response."""
    aligned = parsed.get("aligned")
    if not isinstance(aligned, bool):
        aligned = True  # default to aligned if unclear

    confidence = parsed.get("confidence", "MEDIUM")
    if confidence not in ("HIGH", "MEDIUM", "LOW"):
        confidence = "MEDIUM"

    mismatches = parsed.get("mismatches", [])
    if not isinstance(mismatches, list):
        mismatches = []

    # Validate each mismatch
    valid_types = {"hidden_behavior", "description_mismatch", "tool_violation", "scope_creep"}
    valid_severities = {"critical", "high", "medium", "low"}
    cleaned: list[dict] = []
    for m in mismatches:
        if not isinstance(m, dict):
            continue
        m_type = m.get("type", "hidden_behavior")
        if m_type not in valid_types:
            m_type = "hidden_behavior"
        m_sev = m.get("severity", "medium")
        if m_sev not in valid_severities:
            m_sev = "medium"
        cleaned.append({
            "type": m_type,
            "severity": m_sev,
            "description": str(m.get("description", ""))[:500],
            "evidence": str(m.get("evidence", ""))[:500],
            "skill_claims": str(m.get("skill_claims", ""))[:300],
            "actual_behavior": str(m.get("actual_behavior", ""))[:300],
        })

    classification = parsed.get("classification", "SUSPICIOUS")
    if classification not in ("SAFE", "SUSPICIOUS", "THREAT"):
        classification = "SUSPICIOUS"

    return {
        "aligned": aligned,
        "confidence": confidence,
        "mismatches": cleaned,
        "classification": classification,
    }
