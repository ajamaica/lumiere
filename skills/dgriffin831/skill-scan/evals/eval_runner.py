#!/usr/bin/env python3
"""Evaluation runner for skill-scan.

Scans all test fixtures, loads _expected.json from each, compares results,
and reports TP/FP/TN/FN counts with precision, recall, and F1.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure the parent directory is on the path so we can import skill_scan
sys.path.insert(0, str(Path(__file__).parent.parent))

from skill_scan.scanner import SkillScanner


FIXTURES_DIR = Path(__file__).parent.parent / "test-fixtures"
RULES_PATH = Path(__file__).parent.parent / "rules" / "dangerous-patterns.json"


def load_rules() -> list[dict]:
    data = json.loads(RULES_PATH.read_text())
    return data["rules"]


def run_eval(
    verbose: bool = False,
    fixture_name: str | None = None,
    llm: bool = False,
) -> bool:
    rules = load_rules()
    llm_options = {"llm": llm} if llm else {}
    scanner = SkillScanner(rules, llm_options)

    fixtures = sorted(FIXTURES_DIR.iterdir())
    if fixture_name:
        fixtures = [f for f in fixtures if f.name == fixture_name]

    tp = fp = tn = fn_ = 0
    failures: list[str] = []

    for fixture_dir in fixtures:
        if not fixture_dir.is_dir():
            continue

        expected_path = fixture_dir / "_expected.json"
        if not expected_path.exists():
            if verbose:
                print(f"  SKIP {fixture_dir.name} (no _expected.json)")
            continue

        expected = json.loads(expected_path.read_text())
        report = scanner.scan_directory(str(fixture_dir))

        score = report["score"]
        risk = report.get("risk", "LOW")
        rule_ids = {f["ruleId"] for f in report["findings"]}
        categories = {f["category"] for f in report["findings"]}

        ok = True
        reasons: list[str] = []

        # Check safe/unsafe classification
        expected_safe = expected.get("expected_safe", True)
        is_safe = score >= 80
        if expected_safe and is_safe:
            tn += 1
        elif expected_safe and not is_safe:
            fp += 1
            ok = False
            reasons.append(f"expected safe but got score={score} risk={risk}")
        elif not expected_safe and not is_safe:
            tp += 1
        else:
            fn_ += 1
            ok = False
            reasons.append(f"expected unsafe but got score={score} risk={risk}")

        # Check score range
        min_score = expected.get("min_score")
        max_score = expected.get("max_score")
        if min_score is not None and score < min_score:
            ok = False
            reasons.append(f"score {score} < min_score {min_score}")
        if max_score is not None and score > max_score:
            ok = False
            reasons.append(f"score {score} > max_score {max_score}")

        # Check expected risk
        expected_risk = expected.get("expected_risk")
        if expected_risk and risk != expected_risk:
            ok = False
            reasons.append(f"expected risk {expected_risk} but got {risk}")

        # Check expected categories
        expected_cats = expected.get("expected_categories", [])
        for cat in expected_cats:
            if cat not in categories:
                ok = False
                reasons.append(f"missing expected category: {cat}")

        # Check must-detect rules
        must_detect = expected.get("must_detect_rules", [])
        for rule in must_detect:
            if rule not in rule_ids:
                ok = False
                reasons.append(f"missing expected rule: {rule}")

        icon = "\u2705" if ok else "\u274c"
        print(f"  {icon} {fixture_dir.name:<40s} {score:3d}/100 {risk:8s}", end="")
        if verbose or not ok:
            for r in reasons:
                print(f"\n      {r}", end="")
        print()

        if not ok:
            failures.append(fixture_dir.name)

    # Summary
    total = tp + fp + tn + fn_
    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / (tp + fn_) if (tp + fn_) > 0 else 1.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    print(f"\n{'='*60}")
    print(f"  Results: {total} fixtures evaluated")
    print(f"  TP={tp}  FP={fp}  TN={tn}  FN={fn_}")
    print(f"  Precision: {precision:.2%}")
    print(f"  Recall:    {recall:.2%}")
    print(f"  F1:        {f1:.2%}")

    if failures:
        print(f"\n  FAILURES ({len(failures)}):")
        for name in failures:
            print(f"    - {name}")

    print(f"{'='*60}")

    return len(failures) == 0


def main():
    parser = argparse.ArgumentParser(description="Run skill-scan evaluations")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show details for all fixtures")
    parser.add_argument("--fixture", type=str, help="Run only a specific fixture")
    parser.add_argument("--llm", action="store_true", help="Enable LLM analysis")
    args = parser.parse_args()

    print("skill-scan Evaluation Runner")
    print(f"Fixtures: {FIXTURES_DIR}\n")

    success = run_eval(
        verbose=args.verbose,
        fixture_name=args.fixture,
        llm=args.llm,
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
