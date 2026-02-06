# Ops Framework（挂件）：Jobs + Ops Monitor

目标：把“长任务执行 / 断点续跑 / 进度汇报 / 异常告警”做成 **0-token** 的可复用能力，作为 net 的外挂系统存在，避免污染 `SOUL.md/HEARTBEAT.md` 的行为准则。

## 这套框架解决什么

- **长时间读任务**：后台跑很久（扫描/盘点/分析/同步），可暂停/续跑、可检测卡住、可按频率汇报进度
- **单次读任务**：一次性检查/采样/健康检查（例如：磁盘/日志大小/状态文件校验），失败或出现 `ACTION REQUIRED` 时立即汇报
- **单次写任务**：任何会产生副作用的任务（本地写文件/外部系统写入/网盘移动改名删除）一律 **默认阻断**，需要显式批准；并且必须挂“读验证任务”

> 心跳（Gateway Heartbeat）仍按官方定义使用：做轻量、需要上下文判断的 check-in。长任务推进/批量任务不要放进 HEARTBEAT。

## Decision Plane：长任务 Intake SOP（对话工作法）

本节是 **net 在主会话中的对话流程**（决策面），目的是：
- 先把你“口语化、默认已共识”的表达翻译成 **可执行护栏与范围**；
- 再判断“是否需要长任务框架”，并由你决定是否启用；
- 一旦启用，后续执行/监控尽量走脚本与状态文件（省 token），而不是让模型持续“盯任务”。

### 0) 基本原则（避免机械提问）

- **先聊任务再清单**：先基于你的原话复述理解并二次确认；只有出现真实信息缺口，才进入“澄清清单”问 1–3 个关键问题。
- **不重复问已给信息**：你说“扫描 X 个文件夹”，成功标准就应推导为“X 扫完并产出清单/统计”；net 应该复述并确认，而不是再问“成功标准是什么”。
- **风险边界是语义化的**：用户不必预先知道所有风险。net 要把“别被封号/别动其他文件/只能读不能写”等口语约束翻译成可执行护栏清单，让你确认/修正。
- **不默认启用长任务**：即使命中长任务阈值，也只“提醒 + 询问是否按长任务处理”，由你最终决定。

### A) 阶段一：先聊任务（复述理解 → 你确认）

net 必须先输出一段“我理解的任务定义”，覆盖：
- 目标（要达成什么）
- 范围（哪些路径/对象；允许触达的 allowlist/denylist）
- 你已给出的成功标准（从你的描述推导出的）
- 你已表达的限制/护栏（语义化翻译）
- 产物（会生成哪些只读产物/报告；放哪里）

然后只问一句：**“我这样理解对吗？有没有漏掉/需要改的？”**

> 如果你确认无误，则进入下一阶段；如果你修正/补充，net 更新理解后再确认一次即可。

### B) 阶段二：口语化约束 → 可执行护栏（示例）

这一步是把你的口语化边界，翻译成可执行规则让你确认：

- “别被封号” →
  - 限速/退避（遇到错误指数退避）
  - 不并发（或严格限制并发）
  - 遵循官方分页/频率建议
  - 异常时自动暂停并汇报（而不是强行重试）
- “别动网盘里其他文件 / 只能读不能写” →
  - 只允许 read 类 MCP/命令
  - 路径范围严格限制（只触达 allowlist）
  - 任何 rename/move/delete/copy/overwrite 一律阻断并 `ACTION REQUIRED`
- “只整理这批 / 其他不动” →
  - 明确 allowlist；allowlist 外一律不触达

### C) 阶段三：长任务判定（命中其一就提醒）

满足以下任意 1 条，net 必须提醒“这可能是长任务”，并问你要不要按长任务框架处理：

1. 预计运行时间 ≥ 10 分钟
2. 外部调用量很大（分页/循环/批处理，可能触发限流/封控）
3. 需要后台持续运行、断点续跑、或需要周期性进度汇报

强调：**命中阈值 ≠ 默认启用**。net 只负责提醒与解释利弊，最终由你决定。

### D) 阶段四：配置确认（二次对齐，默认不跳过）

当你确认“按长任务框架处理”后，net 必须明确说明：
> “下面进入【配置确认（第二次对齐）】。这是为了让长任务框架能正确运行与监控。确认完再开始执行。”

配置确认需要对齐（只读默认策略 B）：
- **job kind**：`long_running_read` / `one_shot_read` / `one_shot_write`
- **风险**：`read_only` / `write_local` / `write_external`（写任务默认阻断）
- **启动/状态/停止入口**：脚本/命令 argv（框架只负责调用，不规定脚本怎么写）
- **汇报频率**：运行中汇报间隔 + 异常立即汇报
- **卡住阈值**：多久无进展视为 stall（仅长任务）
- **静默时段**：默认 23:00–08:00 仅抑制“常规进度”，不抑制异常
- **是否允许自动续跑**：默认 false（只读任务策略 B：不自动续跑；需要你明确授权才开）

#### 语义化“跳过配置确认”

只有当你明确表达出类似 **“跳过配置，直接开始”** / **“不用展示配置，按默认直接跑”** 的语义，net 才能跳过“展示配置”步骤。

即便跳过展示，net 仍必须：
- 口头确认关键安全护栏（只读/范围/禁止写）
- 使用默认安全策略（autoResume=false；写任务阻断）

### E) 执行与进度查询契约（省 token）

- **执行**：长任务必须由脚本启动/继续（`start`），框架只负责调用与记录状态；不应由模型反复“思考推进”。
- **进度查询**：你问进度时，net 应优先运行 `commands.status`（事实 JSON），用事实汇报；除非你明确授权，否则不做模型式推测/盯梢。
- **异常**：脚本/监控发现异常（卡住/退出/越界写风险/配置错误）应立即通过 `Ops 快报` 汇报，并进入等待确认状态。

### F) 脚本能力解耦（本框架不负责“怎么写脚本”）

本框架只规定 **脚本如何被运行/监控**（见下文 Job Schema 与 status 契约），不规定脚本如何实现。

当某任务需要脚本但当前不存在时，net 应：
- 先停在对齐阶段，说明“需要一个 start/status 入口才能接入框架”
- 再把“需要的接口与输出契约”讲清楚（例如 status 必须输出 JSON，包含 running/completed）
- 由 `inet/coder`（或你提供）来产出脚本；框架只负责接入与监控

## 文件与入口（Single Source of Truth）

- Job Registry（配置）：`~/.openclaw/net/config/ops-jobs.json`
- Runtime State（运行态）：`~/.openclaw/net/state/ops-monitor.json`
- 工具脚本：`~/.openclaw/net/tools/ops-monitor.py`
- （可选）调度器（macOS launchd）：`~/Library/LaunchAgents/ai.openclaw.ops-monitor.plist`

## Job Schema（v1）

`kind` 只有 3 类（与你的口径一致）：

- `long_running_read`
- `one_shot_read`
- `one_shot_write`

核心字段（每个 job）：

- `id`：唯一标识（字符串）
- `name`：展示名（可省略，默认等于 `id`）
- `kind`：上面三选一
- `risk`：`read_only` / `write_local` / `write_external`
- `enabled`：是否纳入监控与自动策略（默认 false）
- `cwd`：命令运行目录（可省略，默认 `~/.openclaw`）
- `commands`：
  - `long_running_read`：必须有 `start` + `status`
  - `one_shot_*`：必须有 `run`
- `policy`（可选）：覆盖全局 defaults
  - `reportEverySeconds`：运行中进度汇报间隔（默认 1800s）
  - `stallSeconds`：运行中进度不变视为卡住阈值（默认 3600s，仅长任务）
  - `autoResume`：是否允许自动续跑（默认 false，**只读任务默认策略 B**）
  - `autoResumeBackoffSeconds`：自动续跑退避（默认 900s）
  - `quietHours`：静默时段（默认 23:00–08:00；仅抑制“常规进度”，异常不抑制）
- `approval`（可选，仅写任务建议配置）
  - `required`：默认 true
  - `granted`：默认 false（未 granted 一律阻断）
- `after`（可选）：链式任务
  - 写任务 **必须** 在 `after` 里挂一个 read-only 的验证 job（可加 `delaySeconds` 延迟执行）
  - 例：`{"jobId": "verify-x", "when": "success", "delaySeconds": 60}`

## `status` 命令契约（仅 long_running_read）

`commands.status` 必须输出 **纯 JSON**（stdout），至少包含：

- `running`: boolean
- `completed`: boolean

推荐字段：

- `pid`: number（可选）
- `stopReason`: string（可选）
- `progress`: object（可选，用于进度展示）
- `progressKey`: string（可选，用于“是否有进展”判断；不提供则用 progress 自动生成）
- `level`: `"ok" | "warn" | "alert"`（可选）
- `message`: string（可选，一句话摘要）

示例：

```json
{
  "running": true,
  "completed": false,
  "pid": 12345,
  "progress": { "scannedDirs": 2900, "pendingDirs": 80, "totalBytes": 1420507813725 },
  "progressKey": "scannedDirs=2900,totalBytes=1420507813725"
}
```

## Ops 快报（Telegram）消息契约

- 单独一条消息：`🛠️ Ops 快报（HH:MM:SS）`
- 只包含 **事实**（来自 status/状态文件/退出码），不猜 ETA
- 运行中：按 `reportEverySeconds` 汇报（或进度变化时汇报）
- 异常：立即汇报（卡住/暂停/队列任务失败/配置错误）
- 静默时段：仅抑制“常规进度”，不抑制异常/阻断/需要确认

## 命令速查（手动）

```bash
# 配置校验
python3 ~/.openclaw/net/tools/ops-monitor.py validate-config

# 查看当前 job 状态（不发 Telegram）
python3 ~/.openclaw/net/tools/ops-monitor.py status

# 执行一次监控 tick（建议给 launchd 调用）
python3 ~/.openclaw/net/tools/ops-monitor.py tick

# 显式启动/停止 long_running_read
python3 ~/.openclaw/net/tools/ops-monitor.py start <job_id>
python3 ~/.openclaw/net/tools/ops-monitor.py stop <job_id>

# 显式运行一次 one_shot_read
python3 ~/.openclaw/net/tools/ops-monitor.py run <job_id>
```

## 安全边界（必须遵守）

- `one_shot_write`：Ops Monitor **不自动执行**；未显式批准一律阻断并汇报 `ACTION REQUIRED`
- 外部资产（网盘/云盘）写操作一律视为高风险：必须 `scan → plan → 你确认 → apply`
- 所有自动动作必须可回退、可解释，并在 Ops 快报中明示（不允许悄悄消耗资源）
