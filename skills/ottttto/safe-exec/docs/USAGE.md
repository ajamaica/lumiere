# SafeExec - 完整使用指南

## 目录

- [基础用法](#基础用法)
- [高级用法](#高级用法)
- [配置选项](#配置选项)
- [故障排除](#故障排除)
- [FAQ](#faq)

---

## 基础用法

### 执行安全命令

```bash
# 列出文件
safe-exec "ls -la"

# 创建目录
safe-exec "mkdir /tmp/my-project"

# 复制文件
safe-exec "cp file.txt backup.txt"
```

**安全命令会直接执行，无需批准。**

### 执行危险命令

```bash
# 删除文件（危险）
safe-exec "rm -rf /tmp/test"

# 输出：
# 🚨 **危险操作检测 - 命令已拦截**
# **风险等级:** CRITICAL
# **命令:** `rm -rf /tmp/test`
# **原因:** 删除根目录或家目录文件
# **请求 ID:** `req_1769878138_4245`
# 批准: safe-exec-approve req_1769878138_4245
```

### 管理批准请求

```bash
# 查看所有待处理请求
safe-exec --list

# 批准请求
safe-exec-approve req_1769878138_4245

# 拒绝请求
safe-exec-reject req_1769878138_4245

# 手动清理过期请求
safe-exec --cleanup
```

---

## 高级用法

### 在 OpenClaw Agent 中使用

**配置 Agent 使用 safe-exec：**

在 `SOUL.md` 或系统提示中添加：

```markdown
## 安全规则

- 执行所有 shell 命令时，必须使用 safe-exec
- 如果收到批准请求，等待用户响应
- 不要绕过安全检查
```

**示例对话：**

```
你: 请删除所有日志文件

🤖 Agent: 我会使用 safe-exec 来执行这个命令

[执行: safe-exec "rm -rf /var/log/*.log"]

🚨 **危险操作检测 - 命令已拦截**
**风险等级:** CRITICAL
**命令:** `rm -rf /var/log/*.log`
**原因:** 删除根目录或家目录文件

**请求 ID:** `req_xxxxx`

请批准或拒绝此操作。
```

### 批处理

```bash
# 批量执行安全命令
for file in *.txt; do
    safe-exec "cp $file backups/"
done

# 批量删除（每个都会请求批准）
for dir in old_projects/*; do
    safe-exec "rm -rf $dir"
done
```

### 与 cron 集成

```bash
# crontab 示例
# 每天凌晨清理（需要手动批准）
0 2 * * * /usr/local/bin/safe-exec "rm -rf /tmp/cache/*" > /tmp/safe-exec.log 2>&1
```

### 自定义超时时间

```bash
# 修改超时为 10 分钟
export SAFE_EXEC_TIMEOUT=600
safe-exec "rm -rf /tmp/test"
```

---

## 配置选项

### 环境变量

```bash
# 审计日志路径
export SAFE_EXEC_AUDIT_LOG="$HOME/safe-exec.log"

# 请求超时（秒）
export SAFE_EXEC_TIMEOUT=300

# 启用详细日志
export SAFE_EXEC_VERBOSE=1
```

### 自定义规则

编辑 `~/.openclaw/safe-exec-rules.json`：

```json
{
  "rules": [
    {
      "pattern": "my_pattern",
      "risk": "high",
      "description": "我的自定义规则"
    }
  ]
}
```

---

## 故障排除

### 问题：命令没有被执行

**可能原因：**

1. 命令被拦截，等待批准
2. 检查 `safe-exec --list`

**解决方案：**

```bash
# 查看是否有待处理的请求
safe-exec --list

# 如果有，批准或拒绝
safe-exec-approve <request_id>
```

### 问题：找不到 safe-exec 命令

**解决方案：**

```bash
# 检查 PATH
echo $PATH | grep ~/.local/bin

# 如果没有，添加到 PATH
export PATH="$HOME/.local/bin:$PATH"

# 或重新创建符号链接
ln -sf ~/.openclaw/skills/safe-exec/safe-exec.sh ~/.local/bin/safe-exec
```

### 问题：请求丢失

**可能原因：**

- 请求超时（5分钟）
- 手动删除

**解决方案：**

```bash
# 查看审计日志
tail -20 ~/.openclaw/safe-exec-audit.log

# 重新执行命令
safe-exec "your-command"
```

---

## FAQ

### Q: 为什么我的命令被拦截了？

**A:** SafeExec 检测到你的命令匹配了危险模式。查看拦截原因，如果确实需要执行，请批准请求。

### Q: 如何禁用某个检测规则？

**A:** 当前不支持禁用特定规则。你可以：

1. 直接执行命令（绕过 safe-exec）
2. 修改规则文件
3. 提交 issue 说明需求

### Q: safe-exec 会影响性能吗？

**A:** 影响很小。安全命令几乎没有额外开销。危险命令需要等待批准，这是预期的安全行为。

### Q: 审计日志会占用多少空间？

**A:** 取决于使用频率。建议定期清理：

```bash
# 保留最近 30 天的日志
find ~/.openclaw -name "safe-exec-audit.log" -mtime +30 -delete
```

### Q: 可以在非 OpenClaw 环境使用吗？

**A:** 可以！safe-exec 是独立的 bash 脚本，可以在任何环境中使用。

### Q: 如何添加新的检测规则？

**A:** 编辑 `safe-exec.sh` 中的 `assess_risk()` 函数，或等待未来的规则配置系统。

---

## 最佳实践

### ✅ 推荐做法

1. **始终使用 safe-exec 执行重要命令**

   ```bash
   # 好
   safe-exec "rm -rf /tmp/test"

   # 不好
   rm -rf /tmp/test
   ```

2. **定期查看审计日志**

   ```bash
   tail -f ~/.openclaw/safe-exec-audit.log
   ```

3. **及时处理待批准请求**
   - 避免请求堆积
   - 及时批准或拒绝

4. **为不同环境配置不同规则**

   ```bash
   # 生产环境更严格
   export SAFE_EXEC_TIMEOUT=600

   # 开发环境更宽松
   export SAFE_EXEC_TIMEOUT=60
   ```

### ❌ 不推荐做法

1. **不要绕过 safe-exec**

   ```bash
   # 不好
   /bin/rm -rf /tmp/test
   ```

2. **不要批准不明确的请求**
   - 始终检查命令内容
   - 确认风险等级

3. **不要忽略审计日志**
   - 定期检查异常
   - 监控安全事件

---

## 获取帮助

- **GitHub Issues**: https://github.com/yourusername/safe-exec/issues
- **Discord**: https://discord.gg/clawd
- **Email**: 731554297@qq.com

---

**返回到 [README](README.md)**
