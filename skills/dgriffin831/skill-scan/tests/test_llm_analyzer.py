"""Tests for the LLMAnalyzer."""

from __future__ import annotations

import pytest

from skill_scan.llm_analyzer import LLMAnalyzer


class TestProviderDetection:
    def test_no_key_not_available(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        analyzer = LLMAnalyzer()
        assert not analyzer.is_available()
        assert analyzer.provider == "none"

    def test_openai_detected(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test123")
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        analyzer = LLMAnalyzer()
        assert analyzer.is_available()
        assert analyzer.provider == "openai"
        assert analyzer.model == "gpt-4o-mini"

    def test_anthropic_fallback(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test123")
        analyzer = LLMAnalyzer()
        assert analyzer.is_available()
        assert analyzer.provider == "anthropic"


class TestResponseParsing:
    def test_valid_json(self):
        analyzer = LLMAnalyzer()
        result = analyzer._parse_response('{"verdict": "SAFE", "confidence": 0.9, "findings": []}')
        assert result["verdict"] == "SAFE"
        assert result["confidence"] == 0.9

    def test_json_in_fences(self):
        analyzer = LLMAnalyzer()
        raw = '```json\n{"verdict": "MALICIOUS", "confidence": 0.8, "findings": []}\n```'
        result = analyzer._parse_response(raw)
        assert result["verdict"] == "MALICIOUS"

    def test_invalid_json(self):
        analyzer = LLMAnalyzer()
        result = analyzer._parse_response("not json at all")
        assert result["verdict"] == "SUSPICIOUS"
        assert result["confidence"] == 0.3

    def test_empty_response(self):
        analyzer = LLMAnalyzer()
        result = analyzer._parse_response("")
        assert result["verdict"] == "SUSPICIOUS"

    def test_invalid_verdict_normalized(self):
        analyzer = LLMAnalyzer()
        result = analyzer._parse_response('{"verdict": "UNKNOWN", "confidence": 0.5}')
        assert result["verdict"] == "SUSPICIOUS"

    def test_confidence_clamped(self):
        analyzer = LLMAnalyzer()
        result = analyzer._parse_response('{"verdict": "SAFE", "confidence": 5.0}')
        assert result["confidence"] == 1.0


@pytest.mark.requires_llm
class TestLLMIntegration:
    """These tests require an actual LLM API key."""

    def test_analyze_returns_result(self, monkeypatch):
        analyzer = LLMAnalyzer()
        if not analyzer.is_available():
            pytest.skip("No LLM API key available")
        result = analyzer.analyze(
            "/tmp/test-skill",
            {"name": "test", "description": "test skill"},
            [{"path": "SKILL.md", "size": 100, "type": "text"}],
            {"SKILL.md": "---\nname: test\n---\n# Test\nHello world"},
        )
        assert result is not None
        assert result["verdict"] in ("SAFE", "SUSPICIOUS", "MALICIOUS", "ERROR")
