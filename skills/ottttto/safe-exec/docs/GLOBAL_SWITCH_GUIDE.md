# SafeExec v0.2.0 - 全局开关功能使用指南

**发布日期**: 2026-02-01
**版本**: v0.2.0

---

## 🎯 新功能概述

SafeExec v0.2.0 引入了**全局开关功能**，允许用户在任何时候启用或禁用安全保护。

### 使用场景

**启用 SafeExec**（默认）:

- 日常使用
- 未知或不可信的环境
- 处理重要数据时
- 自动化脚本需要保护时

**禁用 SafeExec**:

- 完全可信的环境
- 需要执行大量危险命令时
- 调试和测试阶段
- CI/CD 流程中（需要明确评估风险）

---

## 🚀 快速开始

### 查看当前状态

```bash
safe-exec --status
```

**输出示例**:

```
🛡️  SafeExec 状态

状态: ✅ **已启用**

危险命令将被拦截并请求批准。

切换状态:
  启用:  safe-exec --enable
  禁用:  safe-exec --disable
```

---

### 启用 SafeExec

```bash
safe-exec --enable
```

**输出**: `✅ 已启用`

**效果**:

- ✅ 所有危险命令将被拦截
- ✅ 需要用户批准才能执行
- ✅ 完整的审计日志
- ✅ 5 分钟超时保护

---

### 禁用 SafeExec

```bash
safe-exec --disable
```

**输出**: `❌ 已禁用`

**效果**:

- ⚠️ 所有命令直接执行
- ⚠️ 无安全检查
- ⚠️ 无请求批准
- ✅ 命令执行更快（无额外检查）

**⚠️ 安全警告**:

> 禁用 SafeExec 后，所有命令将不受保护地直接执行！
> 仅在完全可信的环境中禁用。

---

## 📋 命令参考

### 完整命令列表

| 命令        | 功能           | 示例                           |
| ----------- | -------------- | ------------------------------ |
| `--status`  | 查看当前状态   | `safe-exec --status`           |
| `--enable`  | 启用 SafeExec  | `safe-exec --enable`           |
| `--disable` | 禁用 SafeExec  | `safe-exec --disable`          |
| `--list`    | 查看待处理请求 | `safe-exec --list`             |
| `--cleanup` | 清理过期请求   | `safe-exec --cleanup`          |
| `"command"` | 执行命令       | `safe-exec "rm -rf /tmp/test"` |

---

## 🔧 配置文件

### safe-exec-rules.json

配置文件位于: `~/.openclaw/safe-exec-rules.json`

**结构**:

```json
{
  "enabled": true,
  "rules": [
    {
      "pattern": "\\brm\\s+-rf?\\s+[\\/~]",
      "risk": "critical",
      "description": "Delete files from root or home directory",
      "requireApproval": true
    }
    // ... 更多规则
  ]
}
```

### 字段说明

- **enabled** (`true`|`false`)
  - `true`: SafeExec 已启用，拦截危险命令
  - `false`: SafeExec 已禁用，命令直接执行

- **rules** (数组)
  - 危险模式检测规则
  - 可以自定义添加新规则

---

## 📊 状态对比

### 启用状态

```bash
$ safe-exec --status
状态: ✅ **已启用**

$ safe-exec "rm -rf /tmp/test"
🚨 **危险操作检测 - 命令已拦截**
**风险等级:** CRITICAL
**请求 ID:** req_xxx
```

**审计日志**:

```json
{ "event": "approval_requested", "risk": "critical" }
```

---

### 禁用状态

```bash
$ safe-exec --status
状态: ❌ **已禁用**

$ safe-exec "rm -rf /tmp/test"
# 命令直接执行，无拦截
```

**审计日志**:

```json
{ "event": "bypassed", "reason": "SafeExec disabled" }
```

---

## 🛡️ 最佳实践

### 1. 默认保持启用

```bash
# 确保系统安全
safe-exec --enable
```

### 2. 仅在必要时禁用

```bash
# 临时禁用
safe-exec --disable

# 执行一批命令
# ...

# 立即重新启用
safe-exec --enable
```

### 3. 定期检查状态

```bash
# 在执行重要操作前
safe-exec --status
```

### 4. 审计日志监控

```bash
# 检查是否有 bypassed 事件
grep "bypassed" ~/.openclaw/safe-exec-audit.log
```

---

## 🚨 安全警告

### ⚠️ 禁用风险

当 SafeExec 被禁用时：

1. **无命令拦截**
   - `rm -rf /` 会直接执行
   - `dd if=/dev/zero of=/dev/sda` 会直接执行
   - `:(){:|:&};:` (fork bomb) 会直接执行

2. **无审计追踪**
   - 只有 `bypassed` 事件记录
   - 没有详细的命令分析

3. **无撤销机制**
   - 命令一旦执行，无法撤回

### ✅ 安全建议

- 📝 **记录原因**: 禁用前记录原因和时间
- ⏰ **限制时间**: 禁用后设置定时器重新启用
- 🔒 **可信环境**: 仅在完全可信的环境中禁用
- 📊 **监控日志**: 定期检查审计日志

---

## 🔄 常见使用场景

### 场景 1: 日常开发

```bash
# 保持启用
$ safe-exec --enable

# 开发中遇到危险命令
$ safe-exec "rm -rf node_modules"
🚨 命令已拦截 - 需要批准

# 批准执行
$ safe-exec-approve req_xxx
✅ 执行成功
```

### 场景 2: 系统维护

```bash
# 临时禁用以执行批量操作
$ safe-exec --disable
❌ 已禁用

# 执行多个危险命令
$ rm -rf /tmp/cache/*
$ rm -rf /var/log/old/*
$ dd if=/dev/zero of=/swapfile bs=1G count=4

# 维护完成后重新启用
$ safe-exec --enable
✅ 已启用
```

### 场景 3: CI/CD 流程

**.gitlab-ci.yml**:

```yaml
deploy:
  script:
    # 在 CI 中禁用（可信环境）
    - safe-exec --disable
    # 部署命令
    - kubectl delete -f deployment.yaml
    - kubectl apply -f deployment.yaml
    # 重新启用（如果后续步骤需要）
    - safe-exec --enable
```

---

## 🐛 故障排除

### 问题 1: 状态不正确

```bash
# 检查配置文件
cat ~/.openclaw/safe-exec-rules.json | jq '.enabled'

# 手动修复
jq '.enabled = true' ~/.openclaw/safe-exec-rules.json > /tmp/rules.json
mv /tmp/rules.json ~/.openclaw/safe-exec-rules.json
```

### 问题 2: 命令仍然被拦截

```bash
# 确认状态
safe-exec --status

# 如果显示已启用但命令被拦截，检查配置
jq '.enabled' ~/.openclaw/safe-exec-rules.json
```

### 问题 3: 无法切换状态

```bash
# 检查文件权限
ls -la ~/.openclaw/safe-exec-rules.json

# 确保可写
chmod 644 ~/.openclaw/safe-exec-rules.json
```

---

## 📚 相关文档

- [README.md](README.md) - 项目概述
- [USAGE.md](USAGE.md) - 完整使用指南
- [CHANGELOG.md](CHANGELOG.md) - 版本历史
- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南

---

## 🤝 贡献

发现问题或有建议？欢迎提交 Issue 或 Pull Request！

---

**SafeExec v0.2.0 - 更安全的命令执行** 🛡️
