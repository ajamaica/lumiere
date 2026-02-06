# ops-framework (OpenClaw)

一个可开源的 **0-token** “长任务执行 + 监控 + Telegram 汇报”能力包（MVP）。

## 内容

- `SKILL.md`：技能说明（安装/用法）
- `OPS_FRAMEWORK.md`：详细规范（Decision Plane / Job Schema / 消息契约）
- `ops-monitor.py`：本地监控器（Python 标准库，无三方依赖）
- `ops-jobs.example.json`：示例 job 配置（只读/写任务阻断/链式验证）

## 最小验证

```bash
python3 ops-monitor.py selftest
python3 ops-monitor.py validate-config --config-file ./ops-jobs.example.json
python3 ops-monitor.py tick --config-file ./ops-jobs.example.json --print-only
```

## 发布/上游

见 `UPSTREAM.md`。

