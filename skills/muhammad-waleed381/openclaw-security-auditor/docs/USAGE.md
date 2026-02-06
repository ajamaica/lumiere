# Usage

This skill runs a security audit against your OpenClaw configuration and
returns a detailed markdown report.

## Basic Usage Examples

- "Run security audit"
- "Audit my OpenClaw config"
- "Re-run the security audit and summarize top risks"

If your OpenClaw config is not in the default location, specify the path:

- "Run security audit using config at /path/to/openclaw.json"

## How to Interpret the Security Report

The report includes:

- Overall risk score (0-100)
- Findings grouped by severity (Critical, High, Medium, Low)
- For each finding: description, why it matters, how to fix, and example config
- A prioritized remediation roadmap

## Understanding Risk Scores

- 0-20: Well-secured, only minor improvements recommended
- 21-40: Some gaps that should be addressed soon
- 41-60: Moderate risk, prioritize remediation
- 61-80: High risk, immediate action recommended
- 81-100: Critical risk, urgent remediation required

The score is based on the number and severity of findings. Fixing critical and
high issues typically drops the score significantly.

## Common Questions

### Does this send my data anywhere?

No. The skill runs entirely on your local OpenClaw instance and uses your
existing LLM configuration.

### Will it expose my secrets?

No. The skill strips all secrets before analysis and only reports metadata
like present/missing/configured.

### Which LLMs are supported?

Whatever your OpenClaw instance already uses (Opus, GPT, Gemini, local models,
and others).

### What if I have a custom config path?

Provide the path when you run the audit, and the skill will read that file.

## What to Do After Receiving a Report

1. Fix Critical issues first.
2. Address High severity findings next.
3. Apply Medium and Low recommendations during regular maintenance.
4. Re-run the audit to confirm improvements.
5. Schedule periodic audits after major config changes.
