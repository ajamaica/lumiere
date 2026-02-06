# Report Format

Follow this exact order and include every section.

1. Header
2. Threat Model
3. Summary
4. Findings Table
5. Remediation Plan
6. Redaction Notice

## 1) Header

Must include:

- Timestamp from `meta.generated_at`.
- Mode: `Verified`.
- OS from `os.uname` plus `os.release` or `os.sw_vers`.
- OpenClaw version from `openclaw.version`.
- State dir and config path from `meta.state_dir` and `meta.config_path`.
- Runtime context from `env.virt`.

## 2) Threat Model

Follow `references/threat-model.md`. Tie abuse cases and mitigations to actual findings.

## 3) Summary

Required fields:

- Total checks: must equal the number of rows in the findings table.
- Counts by severity: critical, warn, info.
- Count of unverified findings: number of rows whose Evidence contains `(UNVERIFIED)`.
- Top 3 urgent fixes: pick the highest-impact fixes from critical or warn.

Rules:

- Do not guess totals. Derive from the table.
- If any required check is missing, add it before producing the summary.

## 4) Findings Table

Use the schema in `references/evidence-template.md`.

## 5) Remediation Plan

Use three sections, in this order:

1. Immediate containment
2. Hardening
3. Hygiene and monitoring

Each section must list concrete fixes drawn from the findings.

## 6) Redaction Notice

One sentence confirming no secrets were printed.
