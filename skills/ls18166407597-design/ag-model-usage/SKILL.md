---
name: model-usage
description: Use CodexBar CLI local cost usage to summarize per-model usage for Codex or Claude, including the current (most recent) model or a full model breakdown. Trigger when asked for model-level usage/cost data from codexbar, or when you need a scriptable per-model summary from codexbar cost JSON.
metadata: { 'openclaw': { 'emoji': '📊', 'requires': { 'bins': ['python3'] } } }
---

# model-usage Skill

查询并显示 AI 模型的使用配额、剩余百分比及下一次额度刷新时间。

## 功能

- **实时同步**：直接从 Google 内部 API 获取最真实的账户配额数据。
- **状态监控**：支持 Gemini、Claude 等核心模型的剩余额度展示。
- **时间预估**：精准显示每个模型下次刷新的具体时间点（已转换为本地时区）。

## 使用方法

直接对 AI 说：

- "查看模型用量"
- "我还有多少额度"
- "model-usage"

## 内部原理

该技能通过读取 `auth-profiles.json` 中的 OAuth 令牌，模拟官方 IDE 客户端的行为向 Google 发起配额查询请求。

## 适用范围

仅适用于使用 Google Antigravity (Cloud Code Assist) OAuth 方式登录的账户。
