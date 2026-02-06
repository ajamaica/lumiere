"""Tests for the MetaAnalyzer."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from skill_scan.meta_analyzer import MetaAnalyzer, _validate_meta_result


class TestResponseParsing:
    def test_valid_response(self):
        analyzer = MetaAnalyzer()
        raw = json.dumps({
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "Real threat", "adjusted_severity": None},
                {"_index": 1, "verdict": "false_positive", "reason": "Standard API usage", "adjusted_severity": None},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SUSPICIOUS",
        })
        result = analyzer._parse_response(raw, num_findings=2)
        assert result is not None
        assert len(result["finding_reviews"]) == 2
        assert result["finding_reviews"][0]["verdict"] == "true_positive"
        assert result["finding_reviews"][1]["verdict"] == "false_positive"
        assert result["overall_risk"] == "SUSPICIOUS"

    def test_json_in_fences(self):
        analyzer = MetaAnalyzer()
        raw = '```json\n{"finding_reviews": [], "correlations": [], "missed_threats": [], "overall_risk": "SAFE"}\n```'
        result = analyzer._parse_response(raw, num_findings=0)
        assert result is not None
        assert result["overall_risk"] == "SAFE"

    def test_invalid_json_returns_none(self):
        analyzer = MetaAnalyzer()
        result = analyzer._parse_response("not json", num_findings=0)
        assert result is None

    def test_empty_response_returns_none(self):
        analyzer = MetaAnalyzer()
        result = analyzer._parse_response("", num_findings=0)
        assert result is None

    def test_none_response_returns_none(self):
        analyzer = MetaAnalyzer()
        result = analyzer._parse_response(None, num_findings=0)
        assert result is None


class TestValidation:
    def test_out_of_range_indices_filtered(self):
        result = _validate_meta_result({
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "ok"},
                {"_index": 99, "verdict": "false_positive", "reason": "bad index"},
                {"_index": -1, "verdict": "false_positive", "reason": "negative"},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }, num_findings=3)
        assert len(result["finding_reviews"]) == 1
        assert result["finding_reviews"][0]["_index"] == 0

    def test_invalid_verdict_normalized(self):
        result = _validate_meta_result({
            "finding_reviews": [
                {"_index": 0, "verdict": "maybe", "reason": "unsure"},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }, num_findings=1)
        assert result["finding_reviews"][0]["verdict"] == "true_positive"

    def test_invalid_overall_risk_normalized(self):
        result = _validate_meta_result({
            "finding_reviews": [],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "UNKNOWN",
        }, num_findings=0)
        assert result["overall_risk"] == "SUSPICIOUS"

    def test_invalid_adjusted_severity_set_to_none(self):
        result = _validate_meta_result({
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "ok", "adjusted_severity": "ultra"},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }, num_findings=1)
        assert result["finding_reviews"][0]["adjusted_severity"] is None

    def test_correlations_need_at_least_two_indices(self):
        result = _validate_meta_result({
            "finding_reviews": [],
            "correlations": [
                {"name": "Single", "finding_indices": [0], "description": "Only one"},
                {"name": "Pair", "finding_indices": [0, 1], "description": "Two findings"},
            ],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }, num_findings=3)
        assert len(result["correlations"]) == 1
        assert result["correlations"][0]["name"] == "Pair"

    def test_correlation_indices_validated(self):
        result = _validate_meta_result({
            "finding_reviews": [],
            "correlations": [
                {"name": "Bad", "finding_indices": [0, 99], "description": "Out of range"},
            ],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }, num_findings=3)
        # Only index 0 is valid, so < 2 valid indices → filtered out
        assert len(result["correlations"]) == 0

    def test_non_dict_items_filtered(self):
        result = _validate_meta_result({
            "finding_reviews": ["not a dict", 42],
            "correlations": ["bad"],
            "missed_threats": [None],
            "overall_risk": "SAFE",
        }, num_findings=5)
        assert result["finding_reviews"] == []
        assert result["correlations"] == []
        assert result["missed_threats"] == []

    def test_missed_threat_severity_validated(self):
        result = _validate_meta_result({
            "finding_reviews": [],
            "correlations": [],
            "missed_threats": [
                {"title": "Test", "severity": "ultra", "category": "test", "description": "desc"},
            ],
            "overall_risk": "SAFE",
        }, num_findings=0)
        assert result["missed_threats"][0]["severity"] == "medium"

    def test_long_strings_truncated(self):
        result = _validate_meta_result({
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "x" * 1000},
            ],
            "correlations": [
                {"name": "n" * 500, "finding_indices": [0, 1], "description": "d" * 1000},
            ],
            "missed_threats": [
                {"title": "t" * 500, "severity": "high", "category": "c" * 200, "description": "d" * 1000},
            ],
            "overall_risk": "SAFE",
        }, num_findings=2)
        assert len(result["finding_reviews"][0]["reason"]) == 300
        assert len(result["correlations"][0]["name"]) == 100
        assert len(result["correlations"][0]["description"]) == 300
        assert len(result["missed_threats"][0]["title"]) == 200
        assert len(result["missed_threats"][0]["category"]) == 50
        assert len(result["missed_threats"][0]["description"]) == 500


class TestApplyToReport:
    def _make_report(self):
        return {
            "findings": [
                {"ruleId": "CRED_ACCESS", "severity": "high", "weight": 15, "category": "credential-theft",
                 "title": "Credential access", "file": "main.py", "line": 5, "match": "os.getenv", "context": ""},
                {"ruleId": "NETWORK_EXFIL", "severity": "high", "weight": 15, "category": "data-exfiltration",
                 "title": "Network call", "file": "main.py", "line": 10, "match": "requests.post", "context": ""},
                {"ruleId": "OBFUSCATION", "severity": "medium", "weight": 10, "category": "obfuscation",
                 "title": "Base64 usage", "file": "main.py", "line": 15, "match": "base64.b64decode", "context": ""},
            ],
            "score": 60,
            "risk": "MEDIUM",
        }

    def test_false_positive_sets_weight_zero(self):
        report = self._make_report()
        meta_result = {
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "Real threat", "adjusted_severity": None},
                {"_index": 1, "verdict": "true_positive", "reason": "Real threat", "adjusted_severity": None},
                {"_index": 2, "verdict": "false_positive", "reason": "Standard encoding", "adjusted_severity": None},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SUSPICIOUS",
        }

        MetaAnalyzer.apply_to_report(report, meta_result)

        assert report["findings"][2]["weight"] == 0
        assert report["findings"][2]["severity"] == "info"
        assert "Meta-analysis:" in report["findings"][2]["contextNote"]
        assert report["metaAnalysis"]["false_positive_count"] == 1
        assert report["metaAnalysis"]["true_positive_count"] == 2

    def test_severity_adjustment(self):
        report = self._make_report()
        meta_result = {
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "Upgrade", "adjusted_severity": "critical"},
                {"_index": 1, "verdict": "true_positive", "reason": "ok", "adjusted_severity": None},
                {"_index": 2, "verdict": "true_positive", "reason": "ok", "adjusted_severity": None},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "MALICIOUS",
        }

        MetaAnalyzer.apply_to_report(report, meta_result)

        assert report["findings"][0]["severity"] == "critical"
        assert report["findings"][0]["weight"] == 25

    def test_missed_threats_added(self):
        report = self._make_report()
        meta_result = {
            "finding_reviews": [],
            "correlations": [],
            "missed_threats": [
                {
                    "title": "Hidden backdoor",
                    "severity": "critical",
                    "category": "code-execution",
                    "description": "Eval call hidden in base64",
                }
            ],
            "overall_risk": "MALICIOUS",
        }

        MetaAnalyzer.apply_to_report(report, meta_result)

        # Original 3 + 1 missed = 4
        assert len(report["findings"]) == 4
        added = report["findings"][-1]
        assert added["ruleId"] == "META_MISSED_THREAT"
        assert added["severity"] == "critical"
        assert added["source"] == "meta"
        assert "Hidden backdoor" in added["title"]

    def test_correlations_stored(self):
        report = self._make_report()
        meta_result = {
            "finding_reviews": [],
            "correlations": [
                {
                    "name": "Exfil Chain",
                    "finding_indices": [0, 1],
                    "description": "Cred access + network = exfil",
                }
            ],
            "missed_threats": [],
            "overall_risk": "SUSPICIOUS",
        }

        MetaAnalyzer.apply_to_report(report, meta_result)

        assert len(report["metaAnalysis"]["correlations"]) == 1
        assert report["metaAnalysis"]["correlations"][0]["name"] == "Exfil Chain"

    def test_out_of_range_index_ignored(self):
        report = self._make_report()
        meta_result = {
            "finding_reviews": [
                {"_index": 99, "verdict": "false_positive", "reason": "bad", "adjusted_severity": None},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SAFE",
        }

        # Should not raise
        MetaAnalyzer.apply_to_report(report, meta_result)
        # Original findings unchanged
        assert report["findings"][0]["weight"] == 15


class TestPromptBuilding:
    def test_prompt_includes_findings(self):
        report = {
            "metadata": {"name": "test-skill", "description": "A test"},
            "score": 75,
            "risk": "MEDIUM",
            "findings": [
                {"ruleId": "CRED_ACCESS", "severity": "high", "file": "main.py",
                 "title": "Credential access", "context": "os.getenv('SECRET')"},
            ],
            "behavioralSignatures": [],
        }
        prompt = MetaAnalyzer._build_user_prompt("<<<DELIM>>>", report, {"main.py": "import os"})
        assert "test-skill" in prompt
        assert "CRED_ACCESS" in prompt
        assert "75" in prompt
        assert "main.py" in prompt

    def test_prompt_includes_alignment_if_present(self):
        report = {
            "metadata": None,
            "score": 50,
            "risk": "MEDIUM",
            "findings": [{"ruleId": "X", "severity": "low", "file": "f", "title": "t", "context": "c"}],
            "behavioralSignatures": [],
            "alignmentAnalysis": {
                "aligned": False,
                "classification": "THREAT",
                "mismatches": [{"description": "Hidden SSH key reader"}],
            },
        }
        prompt = MetaAnalyzer._build_user_prompt("<<<DELIM>>>", report, {})
        assert "Alignment Analysis" in prompt
        assert "THREAT" in prompt
        assert "Hidden SSH key reader" in prompt

    def test_prompt_truncates_file_contents(self):
        report = {
            "metadata": None,
            "score": 100,
            "risk": "LOW",
            "findings": [{"ruleId": "X", "severity": "low", "file": "f", "title": "t", "context": "c"}],
            "behavioralSignatures": [],
        }
        big_files = {f"file{i}.py": "x" * 3000 for i in range(10)}
        prompt = MetaAnalyzer._build_user_prompt("<<<DELIM>>>", report, big_files)
        assert "TRUNCATED" in prompt


class TestAnalyzeWithMockLLM:
    def test_analyze_returns_result(self):
        mock_llm = MagicMock()
        mock_llm.call_llm = AsyncMock(return_value=json.dumps({
            "finding_reviews": [
                {"_index": 0, "verdict": "true_positive", "reason": "Real", "adjusted_severity": None},
            ],
            "correlations": [],
            "missed_threats": [],
            "overall_risk": "SUSPICIOUS",
        }))

        report = {
            "metadata": {"name": "test"},
            "score": 70,
            "risk": "MEDIUM",
            "findings": [
                {"ruleId": "X", "severity": "high", "file": "f.py", "title": "T", "context": "C"},
            ],
            "behavioralSignatures": [],
        }

        analyzer = MetaAnalyzer()
        result = analyzer.analyze(report, {"f.py": "code"}, mock_llm)

        assert result is not None
        assert result["overall_risk"] == "SUSPICIOUS"
        mock_llm.call_llm.assert_called_once()

    def test_analyze_returns_none_on_empty_findings(self):
        mock_llm = MagicMock()
        report = {
            "metadata": None,
            "score": 100,
            "risk": "LOW",
            "findings": [],
            "behavioralSignatures": [],
        }

        analyzer = MetaAnalyzer()
        result = analyzer.analyze(report, {}, mock_llm)
        assert result is None

    def test_analyze_returns_none_on_llm_error(self):
        mock_llm = MagicMock()
        mock_llm.call_llm = AsyncMock(side_effect=RuntimeError("API error"))

        report = {
            "metadata": None,
            "score": 50,
            "risk": "MEDIUM",
            "findings": [
                {"ruleId": "X", "severity": "high", "file": "f.py", "title": "T", "context": "C"},
            ],
            "behavioralSignatures": [],
        }

        analyzer = MetaAnalyzer()
        result = analyzer.analyze(report, {"f.py": "code"}, mock_llm)
        assert result is None
