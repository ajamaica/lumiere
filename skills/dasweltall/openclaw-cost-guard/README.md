# openclaw-cost-guard

Track **real OpenClaw/Clawdbot usage + cost** from session JSONL logs, generate summaries, and support **budget alerts**.

## What it does

- Reads OpenClaw logs: `~/.openclaw/agents/*/sessions/*.jsonl`
- Also reads legacy logs: `~/.clawdbot/agents/*/sessions/*.jsonl`
- Extracts per-call usage from `message.usage` (tokens + cost breakdown when available)
- Summarizes cost by day and can list **top expensive sessions**
- Can act as a **budget check** (exit code 2 on breach) so it can be wired into cron/alerts

## Quick start

```bash
python3 scripts/extract_cost.py --today
python3 scripts/extract_cost.py --last-days 7
python3 scripts/extract_cost.py --today --top-sessions 10
python3 scripts/extract_cost.py --today --top-sessions 10 --json
```

## Budget alerts

Exit code behavior:

- `0` = OK
- `2` = budget exceeded

Examples:

```bash
python3 scripts/extract_cost.py --today --budget-usd 5

# non-failing (always exit 0)
python3 scripts/extract_cost.py --today --budget-usd 5 --budget-mode warn
```

## Fallback cost estimation (optional)

If a provider doesn’t write `usage.cost`, you can estimate using env vars (per **1M tokens**):

```bash
export PRICE_INPUT=1.75
export PRICE_OUTPUT=14
export PRICE_CACHE_READ=0.175
export PRICE_CACHE_WRITE=0

python3 scripts/extract_cost.py --last-days 7
```

## Token-saving playbook

See `SKILL.md` (kept short on purpose). It includes a playbook the agent can follow to keep output/tool usage minimal.
