---
name: prompts-workflow
description: Automated workflow for collecting, converting, and publishing AI prompts to ClawdHub. Collects from multiple sources (Reddit, GitHub, Hacker News, SearXNG), converts prompts into Clawdbot Skills, and publishes them automatically.
version: 1.0.0
author: Clawdbot
license: MIT
tags: [automation, prompts, workflow, clawdhub, publishing]
category: automation
---

# Prompts Workflow - AI 提示词自动化工作流

自动化收集、转换和发布 AI 提示词到 ClawdHub 的工作流技能。

## 功能

这个技能提供了一个统一的编排层，用于管理 AI 提示词的完整生命周期：

- **Collect**: 从多个来源（Reddit、GitHub、Hacker News、SearXNG）收集 AI 提示词
- **Convert**: 将收集到的提示词转换为 Clawdbot Skills
- **Publish**: 自动发布生成的技能到 ClawdHub

## 使用方式

### 1. 自动模式（推荐）

运行完整的自动化流程：

```bash
cd /root/clawd/skills/prompts-workflow
node main.js auto
```

### 2. 交互模式（断点恢复）

从失败的地方恢复执行：

```bash
node main.js interactive
```

### 3. 手动模式（指定步骤）

只运行特定步骤：

```bash
# 只收集
node main.js manual collect

# 收集并转换
node main.js manual collect convert

# 只发布
node main.js manual publish
```

### 4. 查看状态

检查当前工作流状态：

```bash
node main.js status
```

## 输出文件

- `output/state.json`: 工作流执行状态
- `output/workflow.log`: 详细日志
- `output/prompts/`: 收集到的原始提示词
- `output/skills/`: 转换后的技能

## Cron 集成

### 方式 1: 通过 sessions_spawn（推荐）

```bash
# 在 crontab 中添加
0 9 * * * cd /root/clawd && /usr/local/bin/clawdbot sessions_spawn --task "运行 prompts-workflow 技能，使用自动模式完整执行收集、转换和发布流程" --cleanup delete
```

### 方式 2: 直接执行

```bash
# 在 crontab 中添加
0 9 * * * cd /root/clawd/skills/prompts-workflow && /usr/bin/node main.js auto >> /root/clawd/skills/prompts-workflow/output/cron.log 2>&1
```

## 状态管理

工作流会自动保存执行状态：

- **pending**: 等待执行
- **running**: 正在执行
- **completed**: 执行成功
- **failed**: 执行失败

失败时，`interactive` 模式会自动跳过已完成的步骤，从失败处恢复。

## 错误处理

- 每个步骤独立捕获错误
- 错误信息记录到状态文件和日志
- 支持断点恢复和重试

## 脚本架构

```
prompts-workflow/
├── main.js           # 编排器（状态管理、错误处理）
├── SKILL.md          # 技能文档
├── scripts/
│   ├── collect.sh    # 收集提示词
│   ├── convert.js    # 转换为技能
│   └── publish.sh    # 发布到 ClawdHub
└── output/
    ├── state.json    # 执行状态
    ├── workflow.log  # 日志
    ├── prompts/      # 原始提示词
    └── skills/       # 生成的技能
```

## 混合方案优势

1. **灵活性**: 核心脚本可以独立运行和测试
2. **统一性**: 编排器提供统一的状态管理和错误处理
3. **可扩展性**: 易于添加新步骤（评估、过滤等）
4. **可恢复性**: 支持断点恢复，避免重复执行
5. **集成性**: 可通过 cron、Slack 消息等多种方式触发

## 监控和日志

- 实时输出进度信息
- 详细日志保存到 `output/workflow.log`
- 状态可通过 `status` 命令查看

## 注意事项

- 确保 Node.js 18+ 已安装
- 确保脚本有执行权限（main.js 会自动设置）
- 确保 ClawdHub token 有效（见 TOOLS.md）
- 建议先手动测试再配置自动 cron

## 开发

### 添加新步骤

1. 在 `scripts/` 中添加新脚本
2. 在 `main.js` 的 `PromptWorkflow` 类中添加方法
3. 在步骤数组中添加新步骤名称

### 修改步骤顺序

编辑 `main.js` 中的步骤数组：

```javascript
const steps = ['collect', 'convert', 'publish', 'your-new-step']
```

## 维护

- 定期检查 `output/workflow.log` 了解执行情况
- 使用 `node main.js status` 查看当前状态
- 清理旧数据：删除 `output/prompts/` 和 `output/skills/` 中的过期文件
