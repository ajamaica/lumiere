# Changelog

All notable changes to Skill-Scan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-02-02

### Added

- Layer 5a: Alignment analyzer - verifies code behavior matches SKILL.md description
- Layer 5b: Meta-analyzer - cross-references findings to reduce false positives
- ClawHub integration (`scan-hub` command) for scanning registry skills
- Batch scanning command for multiple skills in parallel
- `--compact` output format for single-line chat summaries
- `check` command for scanning arbitrary text

## [0.2.0] - 2026-02-01

### Added

- Layer 4: LLM-powered deep analysis (`--llm`, `--llm-only`, `--llm-auto`)
- Provider auto-detection (OpenAI / Anthropic)
- LLM prompt templates (`llm_prompts.py`)
- LLM confidence clamping and merge logic
- Evaluation framework with 26 test fixtures

## [0.1.0] - 2026-02-01

### Added

- Core scanning engine with pattern matching (Layer 1)
- 60+ regex detection rules (`dangerous-patterns.json`)
- AST/evasion analyzer for JS/TS obfuscation detection (Layer 2)
- Prompt injection analyzer for SKILL.md threats (Layer 3)
- Behavioral signature detection (data exfiltration, trojan, evasive malware, persistent backdoor)
- Context-aware scoring with false positive reduction
- SKILL.md metadata extraction from YAML frontmatter
- Multiple output formats: text, JSON, quiet
- Risk scoring system (LOW/MEDIUM/HIGH/CRITICAL)
