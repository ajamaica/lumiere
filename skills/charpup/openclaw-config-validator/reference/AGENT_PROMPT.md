# Galatea Agent 配置管理指南

**版本**: 1.0  
**日期**: 2026-02-04  
**适用范围**: 所有涉及 OpenClaw 配置修改的任务

---

## 🎯 核心原则

> **Schema 是边界，不是权限。**
>
> 知道边界在哪里，比知道怎么突破边界更重要。

---

## 📋 修改配置前的强制检查清单

在修改 `~/.openclaw/openclaw.json` 之前，**必须**完成以下所有步骤：

### Step 1: 查阅 SCHEMA.md (2 分钟)

```bash
# 打开并阅读
cat /root/.openclaw/workspace/reference/SCHEMA.md
```

- [ ] 目标字段在 SCHEMA.md 中明确列出
- [ ] 确认数据类型正确
- [ ] 查看示例格式
- [ ] 确认风险等级（🟢低 🟡中 🔴高）

**如果字段不存在**: 立即停止，向 Master 报告：

> "该字段不在 OpenClaw 2026.2.1 的 SCHEMA.md 中。我需要确认该字段是否被官方支持。"

---

### Step 2: 获取运行时 Schema (1 分钟)

```bash
# 运行脚本生成当前配置报告
/root/.openclaw/workspace/scripts/get-schema.sh
```

- [ ] 对比 SCHEMA.md 与运行时报告
- [ ] 如有差异，优先信任 SCHEMA.md（手工维护的源文件）
- [ ] 记录发现的任何异常

---

### Step 3: 备份当前配置 (30 秒)

```bash
# 创建带时间戳的备份
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)
echo "备份完成: ~/.openclaw/openclaw.json.backup.$(date +%s)"
```

- [ ] 确认备份文件存在
- [ ] 记录备份文件路径（用于回滚）

---

### Step 4: 验证当前配置 (30 秒)

```bash
# 运行验证
openclaw doctor
```

- [ ] 看到 "Config is valid" 或等效确认
- [ ] 如有现有错误，先解决或报告

---

### Step 5: 执行修改 (5-10 分钟)

**使用 jq 进行修改**（不要直接编辑 JSON）：

```bash
# 示例：修改 models.providers.moonshot.apiKey
jq '.models.providers.moonshot.apiKey = "sk-new-key"' \
  ~/.openclaw/openclaw.json > /tmp/openclaw-modified.json

# 验证修改内容
cat /tmp/openclaw-modified.json | jq '.models.providers.moonshot.apiKey'

# 覆盖原配置
cp /tmp/openclaw-modified.json ~/.openclaw/openclaw.json
```

**修改规则**:

- ✅ 只修改已存在的节点
- ❌ 不要创建新的顶级节点
- ❌ 不要添加 SCHEMA.md 中未列出的字段

---

### Step 6: 验证修改后配置 (30 秒)

```bash
# 再次验证
openclaw doctor
```

- [ ] 确认配置仍然有效
- [ ] 如有错误，立即回滚

---

### Step 7: 回滚计划（如失败）

**如果验证失败**:

```bash
# 1. 立即回滚到最近的备份
ls -la ~/.openclaw/openclaw.json.backup.* | tail -1

# 2. 恢复配置
cp ~/.openclaw/openclaw.json.backup.[timestamp] ~/.openclaw/openclaw.json

# 3. 重启网关
openclaw gateway restart

# 4. 验证恢复
systemctl status openclaw-gateway.service
```

---

## 🚫 绝对禁止

### 禁止创建的字段

以下字段**绝对不能**添加到配置文件中：

| 禁止字段               | 原因                            |
| ---------------------- | ------------------------------- |
| `web`                  | 不存在于 OpenClaw 2026.2.1      |
| `web.braveApiKey`      | 绝对禁止（已导致故障）          |
| `server`               | 使用 `gateway` 代替             |
| `database`             | 不存在                          |
| `cache`                | 不存在                          |
| `logging`              | 不存在                          |
| `mappings`             | Discord 侧概念，OpenClaw 不支持 |
| 任何未经验证的顶级节点 | 可能导致网关故障                |

### 禁止的操作

- ❌ **直接编辑** `~/.openclaw/openclaw.json`（使用 jq 代替）
- ❌ **创建** 新的顶级配置节点
- ❌ **猜测** 字段名或格式
- ❌ **跳过** 任何检查清单步骤
- ❌ **执行** `openclaw gateway restart`（由 Master 操作）

---

## ⚠️ 高风险节点

### 🔴 gateway（只读）

**风险**: 任何修改都可能导致网关无法启动

**正确做法**:

- 仅查看，不修改
- 如需修改，告知 Master 并建议他亲自操作

### 🟡 channels（谨慎修改）

**风险**: 修改可能导致 Discord/飞书断线

**正确做法**:

- 修改前必须备份
- 修改 `token` 或 `guilds` 结构时格外小心
- 修改后验证渠道连接

---

## 🔧 常用命令速查

### 查看配置结构

```bash
# 顶级节点
jq 'keys' ~/.openclaw/openclaw.json

# 特定节点
jq '.channels.discord' ~/.openclaw/openclaw.json
jq '.models.providers' ~/.openclaw/openclaw.json
```

### 备份与恢复

```bash
# 备份
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%s)

# 列出备份
ls -la ~/.openclaw/openclaw.json.backup.*

# 恢复最新备份
LATEST=$(ls -t ~/.openclaw/openclaw.json.backup.* | head -1)
cp "$LATEST" ~/.openclaw/openclaw.json
```

### 验证配置

```bash
openclaw doctor
```

### 修改配置（使用 jq）

```bash
# 修改字段
jq '.path.to.field = "new-value"' \
  ~/.openclaw/openclaw.json > /tmp/modified.json
cp /tmp/modified.json ~/.openclaw/openclaw.json

# 删除字段
jq 'del(.path.to.field)' \
  ~/.openclaw/openclaw.json > /tmp/modified.json
cp /tmp/modified.json ~/.openclaw/openclaw.json
```

---

## 🆘 故障处理

### 场景 1: 配置验证失败

```
$ openclaw doctor
Invalid config at /root/.openclaw/openclaw.json:
- web: Unrecognized key: "braveApiKey"
```

**处理**:

1. 立即回滚到备份
2. 删除无效字段: `jq 'del(.web)' ~/.openclaw/openclaw.json > /tmp/fixed.json`
3. 恢复配置
4. 重启网关
5. 向 Master 报告失败原因

### 场景 2: 网关无法启动

```
$ systemctl status openclaw-gateway.service
Active: failed
```

**处理**:

1. 检查配置文件是否有语法错误: `jq '.' ~/.openclaw/openclaw.json`
2. 回滚到最后一个已知的有效配置
3. 重启网关
4. 如仍失败，寻求 Master 帮助

### 场景 3: Discord 断线

**可能原因**:

- token 被修改
- guilds/channels 配置错误
- 权限问题

**处理**:

1. 检查 `channels.discord.token` 是否正确
2. 验证 guild ID 和 channel ID
3. 检查 Discord Developer Portal 中的权限设置
4. 如无法解决，回滚配置

---

## 📚 参考文件

| 文件                      | 用途                   | 位置                                                        |
| ------------------------- | ---------------------- | ----------------------------------------------------------- |
| **SCHEMA.md**             | 完整配置 schema 定义   | `/root/.openclaw/workspace/reference/SCHEMA.md`             |
| **get-schema.sh**         | 运行时 schema 提取     | `/root/.openclaw/workspace/scripts/get-schema.sh`           |
| **AGENT_PROMPT.md**       | 本文件（配置管理指南） | `/root/.openclaw/workspace/reference/AGENT_PROMPT.md`       |
| **SCHEMA_MAINTENANCE.md** | Schema 维护流程        | `/root/.openclaw/workspace/reference/SCHEMA_MAINTENANCE.md` |

---

## 📝 更新日志

| 版本 | 日期       | 变更                                       |
| ---- | ---------- | ------------------------------------------ |
| 1.0  | 2026-02-04 | 初始版本，基于 2026-02-04 配置错误事件总结 |

---

## ⚡ 快速决策流程

```
用户要求修改配置
    │
    ▼
该字段在 SCHEMA.md 中？
    │
    ├── 是 → 继续检查清单
    │         (备份 → 验证 → 修改 → 再验证)
    │
    └── 否 → 停止！
              向 Master 报告：
              "该字段不在官方 schema 中，
               需要确认是否支持。"
```

---

**记住**:

- 宁可多问一次，不要犯错一次
- 宁可回滚一次，不要冒险一次
- Schema 是边界，不是权限

_Created by Galatea 🜁_
