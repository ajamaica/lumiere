# Upstream / Open-source notes

这份目录是从 `~/.openclaw/net/` 抽取出来的可复用能力包（不依赖 OpenClaw 源码改动）。推荐走 **“Skill/外挂”** 路线开源：合并成本低、可立刻复用、也不和官方 roadmap 冲突。

## 发布路径（推荐顺序）

1) **新建独立仓库**（最快）：例如 `openclaw-ops-framework`，直接把本目录作为 repo 根目录。
2) **在 skills 生态里发布**：把内容放到 `skills/<your_handle>/ops-framework/`，然后：
   - 自己维护一个 skills 仓库；或
   - 提交到社区的 skills 汇总清单（例如 `awesome-openclaw-skills`）加一条链接。
3) **官方仓库 PR（可选）**：只提“缺失的原语/接口”类改动；这套框架本身建议保持 userland。

## 提交前检查清单

- [ ] 不包含任何密钥（Telegram bot token、MCP access token、provider apiKey 等）
- [ ] 不包含任何个人路径（例如 `/Users/<name>/...`）与个人信息
- [ ] 示例配置使用占位路径（`/path/to/workdir`）与占位 chat id
- [ ] `python3 ops-monitor.py selftest` 通过

## PR 文案草稿（可直接复制）

标题：

> Add Ops Framework (0-token long-running jobs monitor)

内容要点：

- 背景：长任务（扫描/盘点/同步）不适合放进 HEARTBEAT，会持续触发模型思考并消耗 tokens。
- 方案：提供一个 userland 脚本 `ops-monitor.py` + 声明式 `ops-jobs.json`：
  - `long_running_read` 支持断点续跑/卡住检测/按策略汇报
  - `one_shot_read` 可作为写后验证或健康检查（只在 `ACTION REQUIRED` / `ALERT` 时汇报）
  - `one_shot_write` 默认阻断，必须显式批准，并链到 read-only 验证 job
- 安全：默认 `autoResume=false`；仅 `risk=read_only` 才允许自动续跑；静默时段仅抑制“常规进度”不抑制异常。
- 兼容：Python 标准库；可用 `openclaw message send` 发送 Telegram，或直接调用 Telegram API。

