#!/usr/bin/env python3
"""
quick_validate.py

Lightweight validator for a Claude Skill directory.

Checks:
- Required SKILL.md exists
- YAML frontmatter exists and contains ONLY: name, description
- name/description are non-empty strings
- Optional folder conventions (scripts/, references/, assets/)
- Warns for common anti-patterns (README.md, extra docs)

Usage:
  python3 scripts/quick_validate.py
Exit codes:
  0 = success
  1 = validation errors
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple


ALLOWED_FRONTMATTER_KEYS = {"name", "description"}
DISALLOWED_TOP_LEVEL_FILES = {
    "README.md",
    "INSTALLATION_GUIDE.md",
    "QUICK_REFERENCE.md",
    "CHANGELOG.md",
}


def eprint(msg: str) -> None:
    print(msg, file=sys.stderr)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # fall back, but warn
        return path.read_text(errors="replace")


def parse_frontmatter(skill_md: str) -> Tuple[Dict[str, str], List[str]]:
    """
    Extract YAML-like frontmatter between first two '---' lines.
    We intentionally parse a tiny subset:
      key: value
    This avoids pulling in external YAML dependencies.

    Returns: (data, errors)
    """
    errors: List[str] = []
    data: Dict[str, str] = {}

    # Must start with '---'
    if not skill_md.lstrip().startswith("---"):
        errors.append("SKILL.md must begin with YAML frontmatter starting with '---'.")
        return data, errors

    # Capture first frontmatter block
    m = re.match(r"\s*---\s*\n(.*?)\n---\s*\n", skill_md, flags=re.DOTALL)
    if not m:
        errors.append("SKILL.md frontmatter block is missing closing '---'.")
        return data, errors

    fm = m.group(1).strip()
    if not fm:
        errors.append("SKILL.md frontmatter is empty. It must include name and description.")
        return data, errors

    # Parse simple "key: value" lines (no nesting allowed)
    for idx, line in enumerate(fm.splitlines(), start=1):
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue

        if ":" not in raw:
            errors.append(f"Frontmatter line {idx} is not a valid 'key: value' pair: {line!r}")
            continue

        key, value = raw.split(":", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            errors.append(f"Frontmatter line {idx} has an empty key.")
            continue

        # Remove optional surrounding quotes
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1].strip()

        data[key] = value

    return data, errors


def validate_frontmatter(data: Dict[str, str]) -> List[str]:
    errors: List[str] = []

    missing = [k for k in ("name", "description") if k not in data]
    if missing:
        errors.append(f"Frontmatter missing required field(s): {', '.join(missing)}")

    extra = [k for k in data.keys() if k not in ALLOWED_FRONTMATTER_KEYS]
    if extra:
        errors.append(
            "Frontmatter contains unsupported field(s): "
            + ", ".join(extra)
            + ". Only 'name' and 'description' are allowed."
        )

    name = data.get("name", "").strip()
    desc = data.get("description", "").strip()

    if "name" in data and not name:
        errors.append("Frontmatter field 'name' must be a non-empty string.")
    if "description" in data and not desc:
        errors.append("Frontmatter field 'description' must be a non-empty string.")

    # Gentle quality warnings (not errors) are handled elsewhere
    return errors


def validate_skill_dir(root: Path) -> Tuple[List[str], List[str]]:
    """
    Returns (errors, warnings)
    """
    errors: List[str] = []
    warnings: List[str] = []

    if not root.exists():
        errors.append(f"Skill directory does not exist: {root}")
        return errors, warnings

    skill_md_path = root / "SKILL.md"
    if not skill_md_path.exists():
        errors.append("Missing required file: SKILL.md")
        return errors, warnings

    # Top-level clutter warnings
    for bad in DISALLOWED_TOP_LEVEL_FILES:
        if (root / bad).exists():
            warnings.append(f"Top-level file '{bad}' is discouraged for skills (remove it).")

    # Parse + validate frontmatter
    skill_md = read_text(skill_md_path)
    fm_data, fm_parse_errors = parse_frontmatter(skill_md)
    errors.extend(fm_parse_errors)
    if not fm_parse_errors:
        errors.extend(validate_frontmatter(fm_data))

    # Optional directories are fine, but if present, they should be directories
    for dirname in ("scripts", "references", "assets"):
        p = root / dirname
        if p.exists() and not p.is_dir():
            errors.append(f"'{dirname}' exists but is not a directory.")

    # Check reference depth: discourage nested reference folders beyond one level
    ref_dir = root / "references"
    if ref_dir.exists():
        for sub in ref_dir.rglob("*"):
            if sub.is_dir() and sub != ref_dir:
                # allow only one level deep (references/*.md). anything deeper warns
                rel_parts = sub.relative_to(ref_dir).parts
                if len(rel_parts) > 1:
                    warnings.append(
                        f"Deeply nested references folder found: references/{sub.relative_to(ref_dir)} "
                        "(prefer one level deep from SKILL.md)."
                    )

    # Warn if SKILL.md is huge (approx line count)
    line_count = skill_md.count("\n") + 1
    if line_count > 500:
        warnings.append(
            f"SKILL.md is {line_count} lines (>500). Consider moving details into references/."
        )

    # Small quality warning for description length
    if "description" in fm_data:
        if len(fm_data["description"].strip()) < 40:
            warnings.append("Frontmatter description seems short; include more trigger context.")

    return errors, warnings


def main() -> int:
    # Run from scripts/ by default; root is parent directory.
    here = Path(__file__).resolve()
    root = here.parent.parent

    errors, warnings = validate_skill_dir(root)

    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  - {w}")
        print()

    if errors:
        eprint("VALIDATION FAILED:")
        for err in errors:
            eprint(f"  - {err}")
        return 1

    print("VALIDATION PASSED ✅")
    print(f"Skill directory: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())