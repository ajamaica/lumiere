---
name: ops-framework
description: >-
  A 0-token jobs + monitoring framework for OpenClaw: run long-running read tasks
  via scripts, checkpoint/resume safely, and send periodic progress + immediate
  alerts to Telegram. Write jobs are blocked by default and must be explicitly
  approved and verified.
version: 0.1.0
author: Zjianru
license: MIT
compatibility: >-
  Requires Python 3.10+ on the gateway host. Uses `openclaw message send` when
  available; otherwise falls back to Telegram HTTP API using the bot token in
  `openclaw.json`.
---

# Ops Framework（Jobs + Ops Monitor）— OpenClaw Skill (MVP)

目标：把“长任务执行 / 断点续跑 / 进度汇报 / 异常告警”做成 **0-token** 的可复用能力。

这套技能由两部分组成：

- `ops-monitor.py`：一个纯本地脚本，负责跑 status / 检测卡住 / 发送 Telegram 快报
- `ops-jobs.json`：一个声明式 job 配置（包含 kind/risk/命令/策略）

> 推荐作为“外挂”存在：长任务尽量用脚本跑，避免让模型持续盯进度烧 token。

## What this solves

- **Long-running read jobs**: scans, inventories, large syncs, periodic polling; support pause/resume and stall detection.
- **One-shot read jobs**: health checks or lint-like checks; only report when they emit `ACTION REQUIRED` / `ALERT` or fail.
- **One-shot write jobs**: **blocked by default**; must be explicitly approved and must chain to a read-only verification job.

## Quickstart (local)

1) Copy files to your OpenClaw host (suggested layout):

- `~/.openclaw/net/tools/ops-monitor.py`
- `~/.openclaw/net/config/ops-jobs.json`
- `~/.openclaw/net/state/ops-monitor.json` (auto-created)

You can also run the script from any directory as long as `OPENCLAW_HOME` points to your OpenClaw state dir (default `~/.openclaw`).

2) Start from the example config:

- `ops-jobs.example.json`

3) Validate:

```bash
python3 ops-monitor.py validate-config --config-file ~/.openclaw/net/config/ops-jobs.json
python3 ops-monitor.py selftest
```

4) Run one monitoring tick (prints only; does not send):

```bash
python3 ops-monitor.py tick --print-only
```

5) Run periodic ticks via your OS scheduler (launchd/systemd/cron). The script is designed to be called frequently; it decides whether to report based on policy and state.

## Job kinds and safety

`kind` is one of:

- `long_running_read`
- `one_shot_read`
- `one_shot_write` (**never auto-executed by ops-monitor**)

`risk` is one of:

- `read_only`
- `write_local`
- `write_external`

Rules (MVP):

- `long_running_read` may auto-resume **only** when `risk=read_only` and `policy.autoResume=true`.
- `one_shot_read` may run explicitly or via queue (read-only only).
- `one_shot_write` is always blocked from auto-run; it exists as a declarative “approval + verification chain” placeholder.

## Status contract (for long_running_read)

Your `commands.status` must print **JSON** to stdout, with at least:

- `running` (boolean)
- `completed` (boolean)

Recommended:

- `pid` (number)
- `stopReason` (string)
- `progress` (object)
- `progressKey` (string) — stable key used for stall detection
- `level` (`ok|warn|alert`)
- `message` (string)

## Commands

```bash
# Validate config
python3 ops-monitor.py validate-config --config-file ~/.openclaw/net/config/ops-jobs.json

# Print current statuses (no Telegram)
python3 ops-monitor.py status --config-file ~/.openclaw/net/config/ops-jobs.json

# One monitoring tick
python3 ops-monitor.py tick --config-file ~/.openclaw/net/config/ops-jobs.json

# Explicitly start/stop a long job
python3 ops-monitor.py start <job_id> --config-file ~/.openclaw/net/config/ops-jobs.json
python3 ops-monitor.py stop <job_id>  --config-file ~/.openclaw/net/config/ops-jobs.json

# Run one one_shot_read job explicitly
python3 ops-monitor.py run <job_id> --config-file ~/.openclaw/net/config/ops-jobs.json
```

## Reference docs

- Spec (Chinese, detailed): `OPS_FRAMEWORK.md`
