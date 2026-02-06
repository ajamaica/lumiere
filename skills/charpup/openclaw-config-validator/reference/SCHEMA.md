# OpenClaw 2026.2.1 配置 Schema（权威版）

**版本**: 2026.2.1  
**日期**: 2026-02-04  
**来源**: 官方 JSON Schema + Galatea 实践经验  
**官方文档**: https://docs.openclaw.ai/gateway/configuration

> **圣经级参考**：本文档基于 OpenClaw 官方 JSON Schema，融合配置管理最佳实践。任何修改配置的操作前，必须查阅本文档。

---

## 快速导航

- [🚨 修改前检查清单](#修改前检查清单)
- [🚫 绝对禁止](#绝对禁止)
- [📋 顶级节点速查](#顶级节点速查)
- [🔍 详细节点定义](#详细节点定义)
- [⚠️ 故障处理](#故障处理)

---

## 🚨 修改前检查清单

在修改 `~/.openclaw/openclaw.json` 之前，**必须**完成以下所有步骤：

- [ ] **查阅本文档** — 确认目标字段在此文档中明确列出
- [ ] **运行验证脚本** — `/root/.openclaw/workspace/scripts/schema-validate.sh`
- [ ] **备份当前配置** — `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)`
- [ ] **运行 openclaw doctor** — 验证当前配置有效
- [ ] **使用 jq 修改** — 不要直接编辑 JSON
- [ ] **再次验证** — 修改后运行 `openclaw doctor`
- [ ] **准备回滚计划** — 如有错误立即恢复备份

---

## 🚫 绝对禁止

### 禁止创建的字段

以下字段**绝对不能**添加到配置文件中：

| 禁止字段               | 原因                       | 正确替代                     |
| ---------------------- | -------------------------- | ---------------------------- |
| `web.braveApiKey`      | 不存在于 OpenClaw 2026.2.1 | 使用环境变量 `BRAVE_API_KEY` |
| `server`               | 不存在                     | 使用 `gateway` 代替          |
| `database`             | 不存在                     | N/A                          |
| `cache`                | 不存在                     | N/A                          |
| 任何未经验证的顶级节点 | 可能导致网关故障           | 先查阅本文档                 |

### 禁止的操作

- ❌ **直接编辑** `~/.openclaw/openclaw.json`（使用 jq 代替）
- ❌ **创建** 新的顶级配置节点
- ❌ **猜测** 字段名或格式
- ❌ **跳过** 任何检查清单步骤
- ❌ **执行** `openclaw gateway restart`（由 Master 操作）

---

## 📋 顶级节点速查（22个）

| 节点          | 类型   | 字段数 | 风险  | 说明                          |
| ------------- | ------ | ------ | ----- | ----------------------------- |
| `agents`      | Object | 2      | 🟢 低 | Agent 配置（defaults + list） |
| `audio`       | Object | 2      | 🟢 低 | 音频配置（TTS + VoiceWake）⭐ |
| `auth`        | Object | 3      | 🟢 低 | 认证配置                      |
| `bindings`    | Array  | 0      | 🟢 低 | 路由绑定                      |
| `browser`     | Object | 5      | 🟢 低 | 浏览器配置                    |
| `channels`    | Object | 5      | 🟡 中 | 通讯渠道                      |
| `commands`    | Object | 9      | 🟢 低 | 命令配置                      |
| `cron`        | Object | 3      | 🟢 低 | 定时任务                      |
| `diagnostics` | Object | 4      | 🟢 低 | 诊断/OpenTelemetry            |
| `gateway`     | Object | 11     | 🔴 高 | 网关配置（只读）              |
| `hooks`       | Object | 9      | 🟢 低 | Webhook                       |
| `logging`     | Object | 6      | 🟢 低 | 日志配置                      |
| `messages`    | Object | 6      | 🟢 低 | 消息处理                      |
| `meta`        | Object | 2      | 🟢 低 | 元数据                        |
| `models`      | Object | 2      | 🟢 低 | 模型配置                      |
| `plugins`     | Object | 7      | 🟢 低 | 插件管理                      |
| `session`     | Object | 12     | 🟢 低 | 会话管理                      |
| `skills`      | Object | 4      | 🟢 低 | 技能配置                      |
| `talk`        | Object | 6      | 🟢 低 | 语音模式                      |
| `tools`       | Object | 4      | 🟢 低 | 工具配置                      |
| `update`      | Object | 2      | 🟢 低 | 更新配置                      |
| `web`         | Object | 3      | 🟢 低 | WhatsApp Web                  |

---

## 🔍 详细节点定义

### 1. agents（Agent 配置）

**风险**: 🟢 低  
**说明**: 配置 Agent 的默认行为和多个 Agent 实例

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "model": { "primary": "moonshot/kimi-k2.5" },
      "thinkingDefault": "low",
      "timeoutSeconds": 600,
      "sandbox": { "mode": "non-main" }
    },
    "list": [{ "id": "main", "default": true }]
  }
}
```

**关键字段**:

- `defaults.workspace` — 工作空间路径
- `defaults.model.primary` — 主模型
- `defaults.sandbox.mode` — Sandbox 模式（off | non-main | all）
- `list[].id` — Agent ID
- `list[].default` — 是否为默认 Agent

---

### 2. audio（音频配置）⭐

**风险**: 🟢 低  
**说明**: TTS 和语音唤醒配置

```json
{
  "audio": {
    "tts": { "enabled": true, "provider": "elevenlabs" },
    "voiceWake": { "enabled": true, "triggerWord": "Hey Galatea" }
  }
}
```

**关键字段**:

- `tts.enabled` — 启用 TTS
- `tts.provider` — TTS 提供商（elevenlabs | openai | edge）
- `voiceWake.enabled` — 启用语音唤醒
- `voiceWake.triggerWord` — 唤醒词

---

### 3. auth（认证配置）

**风险**: 🟢 低  
**说明**: OAuth 和 API Key 认证配置

```json
{
  "auth": {
    "profiles": {
      "moonshot:default": { "provider": "moonshot", "mode": "api_key" }
    },
    "order": { "moonshot": ["moonshot:default"] }
  }
}
```

---

### 4. bindings（路由绑定）

**风险**: 🟢 低  
**说明**: 将入站消息路由到不同 Agent

```json
{
  "bindings": [{ "agentId": "work", "match": { "channel": "slack", "accountId": "work" } }]
}
```

---

### 5. browser（浏览器配置）

**风险**: 🟢 低  
**说明**: 配置浏览器工具

```json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "chrome",
    "profiles": {
      "chrome": { "cdpPort": 18800 }
    }
  }
}
```

---

### 6. channels（通讯渠道）⚠️

**风险**: 🟡 中  
**说明**: 配置 Discord、WhatsApp、Telegram 等渠道

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "...",
      "groupPolicy": "allowlist",
      "guilds": { "GUILD_ID": { "users": ["USER_ID"] } }
    },
    "feishu": { "enabled": true, "appId": "...", "appSecret": "..." }
  }
}
```

**⚠️ 警告**: 修改 `token` 或 `guilds` 结构可能导致断线。

---

### 7. commands（命令配置）

**风险**: 🟢 低  
**说明**: 配置聊天命令行为

```json
{
  "commands": {
    "native": "auto",
    "text": true,
    "bash": false,
    "config": false,
    "restart": false
  }
}
```

---

### 8. cron（定时任务）

**风险**: 🟢 低  
**说明**: 配置定时任务

```json
{
  "cron": {
    "enabled": true,
    "store": "~/.openclaw/cron.json",
    "maxConcurrentRuns": 4
  }
}
```

---

### 9. diagnostics（诊断）

**风险**: 🟢 低  
**说明**: OpenTelemetry 和诊断配置

```json
{
  "diagnostics": {
    "enabled": true,
    "otel": { "enabled": false }
  }
}
```

---

### 10. gateway（网关配置）🔴

**风险**: 🔴 高 — **只读，禁止修改**  
**说明**: 网关核心配置

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback"
  }
}
```

**🚫 禁止修改**: 任何修改都可能导致网关无法启动。

---

### 11. hooks（Webhook）

**风险**: 🟢 低  
**说明**: Webhook 和 Gmail Pub/Sub 配置

```json
{
  "hooks": {
    "enabled": true,
    "path": "/webhook",
    "mappings": []
  }
}
```

---

### 12. logging（日志配置）

**风险**: 🟢 低  
**说明**: 日志级别和输出配置

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools"
  }
}
```

---

### 13. messages（消息处理）

**风险**: 🟢 低  
**说明**: 消息队列和 TTS 配置

```json
{
  "messages": {
    "queue": { "mode": "collect", "cap": 20 },
    "ackReaction": "👀",
    "tts": { "auto": "off" }
  }
}
```

---

### 14. meta（元数据）

**风险**: 🟢 低  
**说明**: 配置版本和时间戳（自动维护）

```json
{
  "meta": {
    "lastTouchedVersion": "2026.2.1",
    "lastTouchedAt": "2026-02-04T06:25:50.437Z"
  }
}
```

---

### 15. models（模型配置）

**风险**: 🟢 低  
**说明**: LLM 提供商和模型配置

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "moonshot": {
        "baseUrl": "https://api.moonshot.ai/v1",
        "apiKey": "sk-..."
      }
    }
  }
}
```

---

### 16. plugins（插件）

**风险**: 🟢 低  
**说明**: 插件管理和配置

```json
{
  "plugins": {
    "enabled": true,
    "allow": ["discord", "feishu"],
    "entries": { "discord": { "enabled": true } }
  }
}
```

---

### 17. session（会话管理）

**风险**: 🟢 低  
**说明**: 会话范围、重置策略

```json
{
  "session": {
    "scope": "per-sender",
    "reset": { "mode": "daily", "atHour": 4 },
    "agentToAgent": { "maxPingPongTurns": 5 }
  }
}
```

---

### 18. skills（技能）

**风险**: 🟢 低  
**说明**: 技能安装和配置

```json
{
  "skills": {
    "allowBundled": ["gemini", "peekaboo"],
    "entries": { "notion": { "apiKey": "ntn_..." } }
  }
}
```

---

### 19. talk（语音模式）⭐

**风险**: 🟢 低  
**说明**: 语音对话配置（macOS/iOS/Android）

```json
{
  "talk": {
    "voiceId": "elevenlabs_voice_id",
    "voiceAliases": { "Clawd": "EXAVITQu4vr4xnSDxMaL" },
    "modelId": "eleven_v3",
    "interruptOnSpeech": true
  }
}
```

**关键字段**:

- `voiceId` — 默认语音 ID
- `voiceAliases` — 语音别名映射
- `modelId` — TTS 模型
- `interruptOnSpeech` — 检测到语音时打断

---

### 20. tools（工具）

**风险**: 🟢 低  
**说明**: 工具策略和限制

```json
{
  "tools": {
    "media": { "image": { "enabled": true } },
    "web": { "search": { "enabled": true, "provider": "brave" } }
  }
}
```

---

### 21. update（更新）

**风险**: 🟢 低  
**说明**: 自动更新配置

```json
{
  "update": {
    "channel": "stable",
    "checkOnStart": true
  }
}
```

---

### 22. web（WhatsApp Web）

**风险**: 🟢 低  
**说明**: WhatsApp Web 通道配置

```json
{
  "web": {
    "enabled": true,
    "heartbeatSeconds": 60,
    "reconnect": { "initialMs": 2000 }
  }
}
```

---

## ⚠️ 故障处理

### 配置验证失败

```bash
# 1. 检查错误信息
openclaw doctor

# 2. 回滚到备份
cp ~/.openclaw/openclaw.json.backup.* ~/.openclaw/openclaw.json

# 3. 重启网关（由 Master 执行）
# openclaw gateway restart
```

### 网关无法启动

```bash
# 1. 检查配置语法
jq '.' ~/.openclaw/openclaw.json

# 2. 恢复默认配置
mv ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.broken
# 重新运行 onboard
```

---

## 📚 参考文件

| 文件                            | 用途               |
| ------------------------------- | ------------------ |
| `openclaw-official-schema.json` | 官方 JSON Schema   |
| `AGENT_PROMPT.md`               | Agent 配置管理指南 |
| `SCHEMA_MAINTENANCE.md`         | Schema 维护流程    |

---

## 📝 更新日志

| 版本 | 日期       | 变更                                                   |
| ---- | ---------- | ------------------------------------------------------ |
| 2.0  | 2026-02-04 | 基于官方 Schema 重构，新增 logging、talk、audio 等节点 |
| 1.0  | 2026-02-04 | 初始版本，从实际配置提取                               |

---

**Schema 是边界，不是权限。知道边界在哪里，比知道怎么突破边界更重要。**

_Created by Galatea 🜁 — 基于 OpenClaw 2026.2.1 官方 Schema_
