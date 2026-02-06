"""Pytest fixtures for skill-scan tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent.parent / "test-fixtures"
RULES_PATH = Path(__file__).parent.parent / "rules" / "dangerous-patterns.json"


@pytest.fixture
def rules() -> list[dict]:
    data = json.loads(RULES_PATH.read_text())
    return data["rules"]


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES_DIR


@pytest.fixture
def clean_skill_path() -> str:
    return str(FIXTURES_DIR / "clean-skill")


@pytest.fixture
def malicious_skill_path() -> str:
    return str(FIXTURES_DIR / "malicious-skill")
