# Skill-Scan - OpenClaw Skill Security Auditor

Multi-layered security scanner for OpenClaw agent skill packages. Detects malicious code, evasion techniques, prompt injection, and misaligned behavior through static analysis and optional LLM-powered deep inspection.

## Prerequisites

- **Python 3.10+** — check with `python3 --version`
- **pip** — check with `pip3 --version` or `python3 -m pip --version`

If pip is not installed:

```bash
# Option 1: System package manager (requires sudo)
sudo apt-get install python3-pip        # Debian/Ubuntu
brew install python3                     # macOS (includes pip)

# Option 2: Bootstrap pip without sudo
python3 -m ensurepip --upgrade
```

## Quick Start

```bash
pip install -e .
skill-scan scan /path/to/skill
```

### Alerting (OpenClaw)

Send alert on MEDIUM+ risk using configured OpenClaw channel:

```bash
OPENCLAW_ALERT_CHANNEL=slack skill-scan scan /path/to/skill --alert
```

Optional target for channels that require a recipient:

```bash
OPENCLAW_ALERT_CHANNEL=slack OPENCLAW_ALERT_TO=@security skill-scan scan /path/to/skill --alert
```

Alert only on HIGH/CRITICAL:

```bash
OPENCLAW_ALERT_CHANNEL=slack skill-scan scan /path/to/skill --alert --alert-threshold HIGH
```

### Scan from ClawHub

```bash
skill-scan scan-hub some-skill-slug
```

### Check Arbitrary Text

```bash
skill-scan check "some suspicious text"
```

### Batch Scan

```bash
skill-scan batch /path/to/skills-directory
```

## Analysis Layers

| Layer | Module                 | Purpose                                | When    |
| ----- | ---------------------- | -------------------------------------- | ------- |
| 1     | Pattern matching       | Fast regex-based detection             | Always  |
| 2     | AST/evasion analysis   | Catches obfuscation tricks             | Always  |
| 3     | Prompt injection       | Detects social engineering in SKILL.md | Always  |
| 4     | LLM deep analysis      | Semantic threat understanding          | `--llm` |
| 5a    | Alignment verification | Code vs description matching           | `--llm` |
| 5b    | Meta-analysis          | Finding review and correlation         | `--llm` |

## Risk Scoring

- **LOW (80-100)** - Safe, no significant threats
- **MEDIUM (50-79)** - Moderate risk, review needed
- **HIGH (20-49)** - Serious threats detected
- **CRITICAL (0-19)** - Multiple critical threats, do not use

## Detection Categories

**Execution threats** - `eval()`, `exec()`, `child_process`, dynamic imports

**Credential theft** - `.env` access, API keys, tokens, private keys, wallet files

**Data exfiltration** - `fetch()`, `axios`, `requests`, sockets, webhooks

**Filesystem manipulation** - Write/delete/rename operations

**Obfuscation** - Base64, hex, unicode encoding, string construction

**Prompt injection** - Jailbreaks, invisible characters, homoglyphs, roleplay framing, encoded instructions

**Behavioral signatures** - Compound patterns: data exfiltration, trojan skills, evasive malware, persistent backdoors

## Output Formats

```bash
skill-scan scan path/            # Formatted text report (default)
skill-scan scan path/ --json     # Raw JSON
skill-scan scan path/ --compact  # Single-line summary
skill-scan scan path/ --quiet    # Score + verdict only
```

## LLM Options

```bash
skill-scan scan path/ --llm        # Always run layers 4-5
skill-scan scan path/ --llm-only   # Skip pattern analysis, LLM only
skill-scan scan path/ --llm-auto   # LLM only if pattern analysis finds MEDIUM+
```

Provider auto-detected from environment:

- `OPENAI_API_KEY` -> gpt-4o-mini
- `ANTHROPIC_API_KEY` -> claude-sonnet-4-5

### Environment Variables

Create a `.env` file in the repository root with any needed keys:

| Variable                 | Required For            | Description                                             |
| ------------------------ | ----------------------- | ------------------------------------------------------- |
| `OPENAI_API_KEY`         | LLM scanning            | OpenAI API key (uses gpt-4o-mini)                       |
| `ANTHROPIC_API_KEY`      | LLM scanning            | Anthropic API key (alternative to OpenAI)               |
| `PROMPTINTEL_API_KEY`    | MoltThreats integration | PromptIntel API key                                     |
| `OPENCLAW_ALERT_CHANNEL` | Alerts                  | OpenClaw channel name for alerts                        |
| `OPENCLAW_ALERT_TO`      | Alerts                  | Optional recipient/target for channels that require one |

Static analysis requires **no keys** — it works out of the box.

## Files

```
skill-scan/
├── pyproject.toml                  # Package metadata (v0.3.0)
├── TESTING.md                      # Eval approach and results
├── rules/
│   └── dangerous-patterns.json     # 60+ regex detection rules
├── skill_scan/
│   ├── cli.py                      # CLI entry point
│   ├── scanner.py                  # Core scanning engine
│   ├── models.py                   # Data classes for findings
│   ├── reporter.py                 # Report formatting
│   ├── ast_analyzer.py             # Layer 2: JS/TS evasion detection
│   ├── prompt_analyzer.py          # Layer 3: Prompt injection detection
│   ├── llm_analyzer.py             # Layer 4: LLM deep analysis
│   ├── alignment_analyzer.py       # Layer 5a: Code vs description matching
│   ├── meta_analyzer.py            # Layer 5b: Meta-analysis
│   └── clawhub.py                  # ClawHub registry integration
├── tests/                          # Unit tests
├── evals/                          # Evaluation framework
└── test-fixtures/                  # 26 test cases (safe + malicious)
```

## Requirements

- Python 3.10+
- `httpx>=0.27` (for LLM API calls)
- API key only needed for `--llm` modes (static analysis is self-contained)

## Testing

```bash
python3 -m pytest tests/ -v
python3 evals/eval_runner.py
python3 evals/eval_runner.py --llm       # With LLM layers
```

**Static analysis results**: 100% precision, 86% recall across 26 fixtures.

## Exit Codes

- `0` - LOW risk
- `1` - MEDIUM risk
- `2` - HIGH risk
- `3` - CRITICAL risk

## Uninstalling

### 1. Remove the AGENTS.md section

During installation, one of two sections was added to your workspace `AGENTS.md`:

- `## Skill-Scan — Automatic Pre-Install Security Scanning` (Option A), or
- `## Skill-Scan — On-Demand Skill Security Scanning` (Option B)

Delete whichever section was added.

### 2. Uninstall the Python package

```bash
pip uninstall skill-scan
```

### 3. Remove the skill directory

```bash
rm -rf skills/skill-scan
```

### 4. Clean up environment variables

Remove from your `.env` (if no other skill uses them):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `PROMPTINTEL_API_KEY`
- `OPENCLAW_ALERT_CHANNEL`
- `OPENCLAW_ALERT_TO`

skill-scan does not create any files in the workspace outside its own directory.

## Related Skills

- **input-guard** - External input scanning
- **memory-scan** - Agent memory security
- **guardrails** - Security policy configuration
