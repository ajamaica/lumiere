#!/usr/bin/env python3
"""Extract token/cost usage from OpenClaw / Clawdbot session JSONL.

- Prefers real cost from usage.cost.total when present.
- Falls back to estimation using PRICE_* env vars if cost missing.

Usage examples:
  extract_cost.py --today
  extract_cost.py --last-days 7
  extract_cost.py --top-sessions 10
  extract_cost.py --last-days 30 --json

Env (optional fallback pricing, per 1M tokens):
  PRICE_INPUT, PRICE_OUTPUT, PRICE_CACHE_READ, PRICE_CACHE_WRITE
"""

from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import glob
import json
import os
import sys
from collections import defaultdict


@dataclasses.dataclass
class UsageRow:
    ts: dt.datetime
    session_file: str
    session_id: str | None
    provider: str | None
    model: str | None
    input_tokens: int
    output_tokens: int
    cache_read: int
    cache_write: int
    cost_total: float | None
    cost_breakdown: dict | None


def _parse_dt(s: str) -> dt.datetime | None:
    try:
        # 2026-01-28T06:15:42.062Z
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return dt.datetime.fromisoformat(s)
    except Exception:
        return None


def _env_price(name: str) -> float | None:
    v = os.environ.get(name)
    if not v:
        return None
    try:
        return float(v)
    except Exception:
        return None


def estimate_cost(row: UsageRow) -> float | None:
    pin = _env_price("PRICE_INPUT")
    pout = _env_price("PRICE_OUTPUT")
    pcr = _env_price("PRICE_CACHE_READ")
    pcw = _env_price("PRICE_CACHE_WRITE")
    if pin is None or pout is None:
        return None

    def per_million(tokens: int, price: float | None) -> float:
        if price is None:
            return 0.0
        return (tokens / 1_000_000.0) * price

    return (
        per_million(row.input_tokens, pin)
        + per_million(row.output_tokens, pout)
        + per_million(row.cache_read, pcr)
        + per_million(row.cache_write, pcw)
    )


def iter_jsonl_files() -> list[str]:
    home = os.path.expanduser("~")
    paths = []
    paths += glob.glob(os.path.join(home, ".openclaw", "agents", "*", "sessions", "*.jsonl"))
    paths += glob.glob(os.path.join(home, ".clawdbot", "agents", "*", "sessions", "*.jsonl"))
    return sorted(set(paths))


def extract_rows(files: list[str]) -> list[UsageRow]:
    rows: list[UsageRow] = []

    for fp in files:
        session_id = None
        provider = None
        model = None

        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        j = json.loads(line)
                    except Exception:
                        continue

                    t = j.get("timestamp")
                    if isinstance(t, str):
                        ts = _parse_dt(t)
                    else:
                        ts = None

                    typ = j.get("type")

                    if typ == "session":
                        session_id = j.get("id")
                        continue

                    if typ == "model_change":
                        provider = j.get("provider")
                        model = j.get("modelId")
                        continue

                    # OpenClaw stores usage under j["message"]["usage"].
                    # Some logs may also include top-level usage.
                    usage = None
                    if isinstance(j.get("usage"), dict):
                        usage = j.get("usage")
                    elif isinstance(j.get("message"), dict) and isinstance(j["message"].get("usage"), dict):
                        usage = j["message"].get("usage")

                    if not isinstance(usage, dict) or ts is None:
                        continue

                    cost = usage.get("cost") if isinstance(usage.get("cost"), dict) else None
                    cost_total = None
                    if cost and isinstance(cost.get("total"), (int, float)):
                        cost_total = float(cost.get("total"))

                    rows.append(
                        UsageRow(
                            ts=ts,
                            session_file=fp,
                            session_id=session_id,
                            provider=j.get("provider") or provider,
                            model=j.get("model") or model,
                            input_tokens=int(usage.get("input") or 0),
                            output_tokens=int(usage.get("output") or 0),
                            cache_read=int(usage.get("cacheRead") or 0),
                            cache_write=int(usage.get("cacheWrite") or 0),
                            cost_total=cost_total,
                            cost_breakdown=cost,
                        )
                    )

        except FileNotFoundError:
            continue

    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--today", action="store_true")
    g.add_argument("--yesterday", action="store_true")
    g.add_argument("--last-days", type=int)

    ap.add_argument("--top-sessions", type=int, default=0)
    ap.add_argument("--json", action="store_true")

    # Budget alerts
    ap.add_argument("--budget-usd", type=float, default=0.0, help="If >0, warn/exit nonzero when total cost exceeds this budget")
    ap.add_argument("--budget-mode", choices=["warn", "exit"], default="exit", help="warn: print alert; exit: exit code 2 on breach")

    args = ap.parse_args()

    now = dt.datetime.now(dt.timezone.utc)
    if args.today:
        start = now.date()
        end = start
    elif args.yesterday:
        start = (now - dt.timedelta(days=1)).date()
        end = start
    else:
        days = int(args.last_days)
        start = (now - dt.timedelta(days=days - 1)).date()
        end = now.date()

    files = iter_jsonl_files()
    rows = extract_rows(files)

    # Filter by date range
    def in_range(r: UsageRow) -> bool:
        d = r.ts.date()
        return start <= d <= end

    rows = [r for r in rows if in_range(r)]

    daily = defaultdict(lambda: {"calls": 0, "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "cost": 0.0, "costEstimated": 0.0, "missingCostCalls": 0})

    # Session aggregation
    per_session = defaultdict(lambda: {"calls": 0, "cost": 0.0, "costEstimated": 0.0, "input": 0, "output": 0, "file": None, "provider": None, "model": None})

    for r in rows:
        d = r.ts.date().isoformat()
        daily[d]["calls"] += 1
        daily[d]["input"] += r.input_tokens
        daily[d]["output"] += r.output_tokens
        daily[d]["cacheRead"] += r.cache_read
        daily[d]["cacheWrite"] += r.cache_write

        sid = r.session_id or os.path.basename(r.session_file)
        ps = per_session[sid]
        ps["calls"] += 1
        ps["input"] += r.input_tokens
        ps["output"] += r.output_tokens
        ps["file"] = r.session_file
        ps["provider"] = r.provider
        ps["model"] = r.model

        if r.cost_total is not None:
            daily[d]["cost"] += r.cost_total
            ps["cost"] += r.cost_total
        else:
            daily[d]["missingCostCalls"] += 1
            est = estimate_cost(r)
            if est is not None:
                daily[d]["costEstimated"] += est
                ps["costEstimated"] += est

    # Total cost across selected range (for budgets)
    total_cost = 0.0
    for v in daily.values():
        total_cost += float(v["cost"] + v["costEstimated"])

    budget_breached = args.budget_usd and total_cost > float(args.budget_usd)

    # Output
    if args.json:
        out = {
            "range": {"start": str(start), "end": str(end)},
            "days": dict(sorted(daily.items())),
            "total": {"cost": total_cost},
        }
        if args.budget_usd:
            out["budget"] = {
                "usd": float(args.budget_usd),
                "breached": bool(budget_breached),
                "mode": args.budget_mode,
            }
        if args.top_sessions:
            top = sorted(per_session.items(), key=lambda kv: (kv[1]["cost"] + kv[1]["costEstimated"]), reverse=True)[: int(args.top_sessions)]
            out["topSessions"] = [
                {
                    "session": k,
                    **v,
                    "total": v["cost"] + v["costEstimated"],
                }
                for k, v in top
            ]
        print(json.dumps(out, indent=2))
        if budget_breached and args.budget_mode == "exit":
            return 2
        return 0

    # Text output (compact)
    for d in sorted(daily.keys()):
        v = daily[d]
        total = v["cost"] + v["costEstimated"]
        suffix = "" if v["missingCostCalls"] == 0 else f" (missingCostCalls={v['missingCostCalls']})"
        print(f"{d}  calls={v['calls']}  cost=${total:.4f}{suffix}")

    if args.budget_usd:
        status = "OK" if not budget_breached else "BREACHED"
        print(f"\nBudget: ${float(args.budget_usd):.2f}  Total: ${total_cost:.4f}  Status: {status}")
        if budget_breached:
            print("ALERT: budget exceeded")

    if args.top_sessions:
        print("\nTop sessions:")
        top = sorted(per_session.items(), key=lambda kv: (kv[1]["cost"] + kv[1]["costEstimated"]), reverse=True)[: int(args.top_sessions)]
        for sid, v in top:
            total = v["cost"] + v["costEstimated"]
            short = os.path.basename(v.get("file") or "")
            print(f"- ${total:.4f}  calls={v['calls']}  {sid}  ({short})")

    if budget_breached and args.budget_mode == "exit":
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
