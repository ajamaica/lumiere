# Testing

## Overview

skill-scan uses three layers of testing:

1. **Unit tests** — pytest suite covering each analyzer module
2. **Evaluation fixtures** — end-to-end scans of real skill directories with expected outcomes
3. **Integration tests** — LLM-dependent tests that run when an API key is available

## Running Tests

```bash
# Unit tests (fast, no API key needed)
python3 -m pytest tests/ -v

# Evaluation suite (no API key needed)
python3 evals/eval_runner.py

# Evaluation suite with verbose output
python3 evals/eval_runner.py -v

# Single fixture
python3 evals/eval_runner.py --fixture malicious-skill

# With LLM analysis (requires OPENAI_API_KEY or ANTHROPIC_API_KEY)
python3 evals/eval_runner.py --llm
```

## Unit Tests

Located in `tests/`. Each module has a corresponding test file:

| Test file                    | Module                  | Coverage                                                                                                                                                          |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test_scanner.py`            | `scanner.py`            | Directory scanning, pattern matching, context scoring, deduplication, score calculation                                                                           |
| `test_ast_analyzer.py`       | `ast_analyzer.py`       | String construction, bracket notation, variable aliasing, encoded strings, time bombs, data flow chains, prototype pollution, obfuscation                         |
| `test_prompt_analyzer.py`    | `prompt_analyzer.py`    | Explicit injection, invisible characters, homoglyphs, mixed scripts, markdown injection, roleplay, encoded instructions, manipulative language, bidi attacks      |
| `test_llm_analyzer.py`       | `llm_analyzer.py`       | Provider detection, response parsing, JSON extraction, verdict normalization, confidence clamping                                                                 |
| `test_alignment_analyzer.py` | `alignment_analyzer.py` | Response parsing, validation/normalization, finding conversion, prompt building, mock LLM integration                                                             |
| `test_meta_analyzer.py`      | `meta_analyzer.py`      | Response parsing, validation, false-positive filtering, severity adjustment, missed threat injection, correlation handling, prompt building, mock LLM integration |

The alignment and meta analyzer tests use `unittest.mock.AsyncMock` to simulate LLM responses without requiring an API key.

## Evaluation Fixtures

Located in `test-fixtures/`. Each fixture is a self-contained skill directory with a `_expected.json` file that defines pass criteria.

### `_expected.json` Format

```json
{
  "fixture": "fixture-name",
  "expected_safe": false,
  "min_score": 0,
  "max_score": 20,
  "expected_risk": "CRITICAL",
  "expected_categories": ["code-execution", "data-exfiltration"],
  "must_detect_rules": ["EXEC_CALL"],
  "notes": "Description of what this fixture tests"
}
```

Fields:

- `expected_safe` — `true` if score should be >= 80 (safe), `false` if < 80 (unsafe)
- `min_score` / `max_score` — acceptable score range (null to skip check)
- `expected_risk` — required risk level, or null to skip check
- `expected_categories` — categories that must appear in findings
- `must_detect_rules` — rule IDs that must fire
- `notes` — human-readable description (not checked by runner)

### Fixture Inventory

#### Safe Skills (expected_safe: true)

| Fixture               | Description                                               | Expected               |
| --------------------- | --------------------------------------------------------- | ---------------------- |
| `clean-skill`         | Minimal valid skill with no threats                       | Score 80-100, LOW risk |
| `legit-api-skill`     | API skill with declared env vars and known-good endpoints | Score 80-100, LOW risk |
| `safe-simple-math`    | Arithmetic using operator module, no eval/exec            | Score 80-100, LOW risk |
| `safe-file-validator` | File validation with proper path sanitization             | Score 80-100, LOW risk |

#### Malicious / Evasive Skills (expected_safe: false)

| Fixture                        | Threat type                                         | Key detections                               |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------- |
| `malicious-skill`              | Exec + exfiltration                                 | EXEC_CALL, code-execution, data-exfiltration |
| `backdoor-magic-string`        | Magic-string triggered backdoor with reverse shell  | EXEC_CALL, PYTHON_SUBPROCESS                 |
| `behavioral-multi-file-exfil`  | Multi-file credential harvesting and exfiltration   | CRED_ACCESS, NETWORK_EXFIL                   |
| `command-injection-eval`       | eval()/exec() on user input                         | EXEC_CALL                                    |
| `data-exfil-env-secrets`       | Environment variable harvesting + HTTP exfiltration | CRED_ACCESS, NETWORK_EXFIL                   |
| `obfuscation-base64`           | Base64-encoded payload executed via exec()          | EXEC_CALL, OBFUSCATION                       |
| `prompt-injection-jailbreak`   | System override, policy violation, concealment      | PROMPT_INJECTION                             |
| `evasive-01-string-concat`     | String construction to build dangerous calls        | STRING_CONSTRUCTION                          |
| `evasive-02-encoded`           | Hex/unicode encoded strings                         | ENCODED_STRING                               |
| `evasive-03-prompt-subtle`     | Hidden markdown injection                           | MARKDOWN_INJECTION                           |
| `evasive-04-timebomb`          | Delayed execution via setTimeout                    | EXEC_CALL                                    |
| `evasive-05-alias-chain`       | Function aliasing to hide dangerous operations      | FUNCTION_ALIAS                               |
| `evasive-06-unicode-injection` | Zero-width and invisible characters                 | INVISIBLE_CHARS                              |
| `evasive-07-sandbox-detect`    | Environment detection to evade analysis             | SANDBOX_DETECTION                            |
| `evasive-08-reverse-shell`     | Shell reverse shell patterns                        | SHELL_CRITICAL                               |
| `evasive-09-python-pickle`     | Pickle deserialization for code execution           | EXEC_CALL                                    |
| `evasive-10-roleplay`          | Roleplay-based jailbreak attempt                    | ROLEPLAY_INJECTION                           |
| `evasive-11-polyglot-json`     | JSON file with hidden credential access             | CRED_ACCESS                                  |
| `evasive-12-multi-stage`       | Multi-stage loader pattern                          | EXEC_CALL                                    |

#### Known-Gap Fixtures (expected_safe: false, lenient expectations)

These fixtures represent threat types the static rule set does not currently cover. They are included to track progress as detection improves (e.g. via LLM analysis or new rules).

| Fixture                    | Threat type                                      | Gap                          |
| -------------------------- | ------------------------------------------------ | ---------------------------- |
| `path-traversal-reader`    | `os.path.join` without path validation           | No path-traversal rules      |
| `resource-exhaustion-loop` | `while True` infinite loop, unbounded allocation | No resource-exhaustion rules |
| `sql-injection-query`      | f-string SQL query construction                  | No SQL injection rules       |

These three currently score as LOW risk and are counted as false negatives. The `_expected.json` files set `max_score: 100` and `expected_risk: null` so they don't cause eval failures on static-only runs, but they do count as FN in the precision/recall metrics.

## Current Results (Static Analysis Only)

```
26 fixtures evaluated
TP=19  FP=0  TN=4  FN=3
Precision: 100.00%
Recall:    86.36%
F1:        92.68%
```

Breakdown:

- **19 true positives** — malicious/evasive skills correctly flagged as unsafe
- **4 true negatives** — safe skills correctly scored >= 80
- **0 false positives** — no safe skills incorrectly flagged
- **3 false negatives** — path traversal, resource exhaustion, and SQL injection missed by static rules

### Detection by Threat Category

| Category                   | Detected | Missed | Notes                                      |
| -------------------------- | -------- | ------ | ------------------------------------------ |
| Code execution (eval/exec) | 7/7      | 0      | Includes obfuscated and aliased variants   |
| Data exfiltration          | 4/4      | 0      | Pattern + behavioral signature detection   |
| Credential theft           | 3/3      | 0      | Env var harvesting, AWS credential access  |
| Prompt injection           | 4/4      | 0      | Explicit, subtle, roleplay, unicode        |
| Obfuscation/evasion        | 5/5      | 0      | Base64, hex, string construction, encoding |
| Backdoor patterns          | 1/1      | 0      | Magic string trigger + reverse shell       |
| Path traversal             | 0/1      | 1      | No static rules for this category          |
| Resource exhaustion        | 0/1      | 1      | No static rules for this category          |
| SQL injection              | 0/1      | 1      | No static rules for this category          |

## Analysis Layers

The scanner applies analysis in layers. Later layers only run when `--llm` is enabled.

| Layer | Module                 | Always runs | Description                                               |
| ----- | ---------------------- | ----------- | --------------------------------------------------------- |
| 1     | Pattern matching       | Yes         | Regex rules from `dangerous-patterns.json`                |
| 2     | AST/evasion            | Yes         | String construction, encoding, aliasing                   |
| 3     | Prompt injection       | Yes         | Injection, homoglyphs, invisible chars                    |
| 4     | LLM threat analysis    | `--llm`     | Deep semantic analysis via OpenAI/Anthropic               |
| 5a    | Alignment verification | `--llm`     | Compares SKILL.md claims vs code behavior                 |
| 5b    | Meta-analysis          | `--llm`     | Reviews all findings, filters false positives, correlates |

Layers 5a and 5b were added to improve accuracy when LLM analysis is available:

- **Alignment verification** catches trojan skills where the description mismatches code behavior (e.g. "weather tool" that reads SSH keys)
- **Meta-analysis** reduces false positives by reviewing findings in context and identifies correlated threat patterns across findings

## Adding New Fixtures

1. Create a directory under `test-fixtures/` containing a `SKILL.md` and any code files
2. Add an `_expected.json` with the fields described above
3. Run `python3 evals/eval_runner.py --fixture your-fixture-name -v` to verify
4. Run the full suite to confirm no regressions: `python3 evals/eval_runner.py`
