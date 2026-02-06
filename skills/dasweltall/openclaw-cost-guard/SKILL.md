---
name: openclaw-cost-guard
description: Track OpenClaw/Clawdbot token and cost usage from session JSONL logs (prefer real usage.cost when present), generate daily/weekly summaries and top expensive sessions, and run budget checks (exit code on breach). Use to monitor spend, enforce budgets via cron/alerts, and apply a token-saving playbook to reduce output/tool-call cost.
---

# OpenClaw Cost Guard

Use this skill when you need:

- **accurate cost reports** (daily/weekly/lifetime)
- **top expensive sessions**
- **guardrails to reduce token burn** (without changing config unless user asks)

## 1) Data source (important)

Prefer **session JSONL** logs (they contain per-call `usage`, often with **real USD cost**):

- OpenClaw: `~/.openclaw/agents/*/sessions/*.jsonl`
- Legacy/compat: `~/.clawdbot/agents/*/sessions/*.jsonl`

Do **not** estimate from “current context window” style token fields.

## 2) Quick commands

### Daily costs (last 7 days)

```bash
python3 {baseDir}/scripts/extract_cost.py --last-days 7
```

### Today / yesterday

```bash
python3 {baseDir}/scripts/extract_cost.py --today
python3 {baseDir}/scripts/extract_cost.py --yesterday
```

### Top expensive sessions

```bash
python3 {baseDir}/scripts/extract_cost.py --top-sessions 10
```

### JSON output (for dashboards)

```bash
python3 {baseDir}/scripts/extract_cost.py --last-days 30 --json
```

## 3) If cost is missing (fallback estimate)

Some providers may omit `usage.cost`. You can provide per-1M-token prices:

```bash
export PRICE_INPUT=1.75
export PRICE_OUTPUT=14
export PRICE_CACHE_READ=0.175
export PRICE_CACHE_WRITE=0
python3 {baseDir}/scripts/extract_cost.py --last-days 7
```

## 4) Budget alerts

The extractor can run as a **budget check**:

```bash
python3 {baseDir}/scripts/extract_cost.py --today --budget-usd 5
```

- If budget is exceeded, it prints an **ALERT** and exits with code **2** (default).
- For non-failing checks:

```bash
python3 {baseDir}/scripts/extract_cost.py --today --budget-usd 5 --budget-mode warn
```

### Wiring it to a cron alert (recommended)

Run it daily (or hourly) and if exit code is 2, send yourself a Telegram message.
(Implementation depends on your OpenClaw channel setup; do not embed secrets in scripts.)

## 5) Token-saving playbook (teach the AI)

When the user says “use as few tokens as possible”, apply:

- **Default response budget:** 1–6 lines, bullets > paragraphs
- **Ask 1 question max** (only if truly blocking)
- **Progressive disclosure:** offer details only if asked
- **Tool calls:** batch; avoid repeated `status`/browser calls
- **No log dumps** into chat; summarize + point to file path
- **Hard limits:** max 3 web iterations (search/fetch) per task

Optional phrasing to keep yourself in check:

> "Answer in <=6 lines. If more is needed, ask permission."
