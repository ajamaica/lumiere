"""Data models for skill-scan."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class Finding:
    rule_id: str
    severity: str
    category: str
    title: str
    file: str = ""
    line: int = 0
    match: str = ""
    context: str = ""
    weight: int = 0
    source: str = ""
    context_note: str = ""

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Use camelCase keys matching JS output
        return {
            "ruleId": d["rule_id"],
            "severity": d["severity"],
            "category": d["category"],
            "title": d["title"],
            "file": d["file"],
            "line": d["line"],
            "match": d["match"],
            "context": d["context"],
            "weight": d["weight"],
            "source": d["source"],
            "contextNote": d["context_note"],
        }


@dataclass
class FileInfo:
    path: str
    absolute_path: str
    size: int
    type: str


@dataclass
class BehavioralSignature:
    name: str
    description: str
    severity: str
    confidence: str
    suppressed: bool = False
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def finding_to_dict(f: Finding | dict) -> dict[str, Any]:
    if isinstance(f, Finding):
        return f.to_dict()
    # Already a dict — normalise keys
    return {
        "ruleId": f.get("ruleId", f.get("rule_id", "")),
        "severity": f.get("severity", ""),
        "category": f.get("category", ""),
        "title": f.get("title", ""),
        "file": f.get("file", ""),
        "line": f.get("line", 0),
        "match": f.get("match", ""),
        "context": f.get("context", ""),
        "weight": f.get("weight", 0),
        "source": f.get("source", ""),
        "contextNote": f.get("contextNote", f.get("context_note", "")),
    }


def report_to_dict(report: dict) -> dict:
    """Convert a report dict so all findings use camelCase keys."""
    out = dict(report)
    out["findings"] = [finding_to_dict(f) for f in report.get("findings", [])]
    out["behavioralSignatures"] = [
        s.to_dict() if isinstance(s, BehavioralSignature) else s
        for s in report.get("behavioralSignatures", [])
    ]
    return out
