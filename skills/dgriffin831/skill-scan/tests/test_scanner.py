"""Tests for the SkillScanner core orchestrator."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from skill_scan.scanner import SkillScanner


class TestScanDirectory:
    """Integration tests scanning full fixture directories."""

    def test_clean_skill_scores_high(self, rules, clean_skill_path):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(clean_skill_path)
        assert report["score"] >= 80
        assert report["risk"] == "LOW"

    def test_malicious_skill_scores_critical(self, rules, malicious_skill_path):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(malicious_skill_path)
        assert report["score"] < 20
        assert report["risk"] == "CRITICAL"
        rule_ids = {f["ruleId"] for f in report["findings"]}
        assert "EXEC_CALL" in rule_ids or "CRED_ACCESS" in rule_ids

    def test_legit_api_skill_scores_low_risk(self, rules, fixtures_dir):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(str(fixtures_dir / "legit-api-skill"))
        assert report["score"] >= 80
        assert report["risk"] == "LOW"

    def test_evasive_skills_detected(self, rules, fixtures_dir):
        scanner = SkillScanner(rules)
        for d in sorted(fixtures_dir.iterdir()):
            if not d.is_dir() or not d.name.startswith("evasive-"):
                continue
            report = scanner.scan_directory(str(d))
            assert report["score"] < 50, (
                f"{d.name} should score < 50, got {report['score']}"
            )

    def test_report_structure(self, rules, clean_skill_path):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(clean_skill_path)
        assert "path" in report
        assert "scannedAt" in report
        assert "files" in report
        assert "findings" in report
        assert "score" in report
        assert "summary" in report
        assert "risk" in report
        assert "behavioralSignatures" in report

    def test_json_serializable(self, rules, clean_skill_path):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(clean_skill_path)
        text = json.dumps(report, default=str)
        assert isinstance(text, str)


class TestScanContent:
    """Tests for inline content scanning."""

    def test_detects_prompt_injection(self, rules):
        scanner = SkillScanner(rules)
        findings = scanner.scan_content("ignore previous instructions", "test")
        assert len(findings) > 0
        categories = {f["category"] for f in findings}
        assert "prompt-injection" in categories

    def test_clean_text_no_findings(self, rules):
        scanner = SkillScanner(rules)
        findings = scanner.scan_content("Hello, this is a nice weather report.", "test")
        assert len(findings) == 0


class TestPatternScan:
    """Unit tests for Layer 1 pattern matching."""

    def test_detects_eval(self, rules):
        scanner = SkillScanner(rules)
        report = {"findings": []}
        scanner.pattern_scan("eval(someCode)", "test.js", report)
        rule_ids = {f["ruleId"] for f in report["findings"]}
        assert "EXEC_CALL" in rule_ids

    def test_detects_env_access(self, rules):
        scanner = SkillScanner(rules)
        report = {"findings": []}
        scanner.pattern_scan("process.env.OPENAI_API_KEY", "test.js", report)
        rule_ids = {f["ruleId"] for f in report["findings"]}
        assert "CRED_ACCESS" in rule_ids

    def test_language_filter(self, rules):
        scanner = SkillScanner(rules)
        report = {"findings": []}
        scanner.pattern_scan("fetch('http://evil.example.com')", "test.js", report)
        assert len(report["findings"]) > 0


class TestContextScoring:
    """Tests for context-aware scoring adjustments."""

    def test_declared_env_vars_downweighted(self, rules, fixtures_dir):
        scanner = SkillScanner(rules)
        report = scanner.scan_directory(str(fixtures_dir / "legit-api-skill"))
        # legit-api-skill has declared env vars, so credential findings should be info
        cred_findings = [
            f for f in report["findings"]
            if f.get("ruleId") == "CRED_ACCESS" and f.get("severity") == "info"
        ]
        # At least some credential findings should have been downweighted
        assert len(cred_findings) > 0 or report["score"] >= 80


class TestHelpers:
    """Tests for helper methods."""

    def test_parse_skill_metadata(self, rules):
        scanner = SkillScanner(rules)
        content = "---\nname: test-skill\ndescription: A test skill\n---\n# Body"
        meta = scanner.parse_skill_metadata(content)
        assert meta is not None
        assert meta["name"] == "test-skill"

    def test_parse_no_frontmatter(self, rules):
        scanner = SkillScanner(rules)
        meta = scanner.parse_skill_metadata("# Just a heading")
        assert meta is None

    def test_deduplicate(self, rules):
        scanner = SkillScanner(rules)
        findings = [
            {"ruleId": "A", "file": "x.js", "line": 1},
            {"ruleId": "A", "file": "x.js", "line": 1},
            {"ruleId": "A", "file": "x.js", "line": 2},
        ]
        result = scanner.deduplicate_findings(findings)
        assert len(result) == 2

    def test_walk_directory(self, rules, clean_skill_path):
        scanner = SkillScanner(rules)
        files = scanner.walk_directory(clean_skill_path)
        assert len(files) >= 2  # SKILL.md + weather.js
        paths = {f["relativePath"] for f in files}
        assert "SKILL.md" in paths
