# 我为 AI Agent 构建了一道安全防线 - SafeExec

> **在 AI Agent 能删除你的整个硬盘之前，我想先问一句：你确定吗？**

---

## 🤖 AI Agent 的双刃剑

2026 年，AI Agents 已经无处不在。它们可以：

- ✅ 帮你管理文件
- ✅ 自动化系统维护
- ✅ 处理重复性任务
- ✅ 甚至写代码、部署服务

但它们也可能：

- 💀 一句话删光你的数据
- 🔥 破坏整个系统
- 🚪 打开安全漏洞
- 💸 泄露敏感信息

**这不是科幻，而是真实的风险。**

---

## 😰 那个差点让我崩溃的瞬间

上周五晚上，我在测试一个 AI Agent 时随口说了一句："帮我清理一下临时文件。"

几秒钟后，我看到屏幕上滚动着：

```bash
rm -rf /tmp
rm -rf /var/tmp
rm -rf ~/Documents/old-projects
```

**等等，那个 `rm -rf ~/Documents/` 是什么鬼？！**

我的心脏漏跳了一拍。幸好我手速够快，在灾难发生前按下了 Ctrl+C。

但那一刻我意识到一个可怕的事实：**AI Agent 需要安全防护，而且现在就需要。**

---

## 🛡️ SafeExec - AI Agent 的最后一道防线

我花了 36 小时构建了 **SafeExec**，一个为 OpenClaw Agent 设计的安全防护层。

### 核心思想很简单

**在危险操作执行前，先问问人类。**

```
AI: "我要删除这个文件夹，可以吗？"
我: "嗯...等等，让我看看。删除哪个文件夹？"
AI: "/home/user/projects"
我: "不！那个不能删！"
AI: "好的，已取消。"
```

就这么简单。但这个简单的想法，挽救了我的数据。

### 它能做什么？

#### 1️⃣ 智能风险评估

SafeExec 使用正则表达式引擎实时分析命令，检测 10+ 类危险模式：

| 风险等级        | 检测模式       | 真实案例           |
| --------------- | -------------- | ------------------ |
| 🔴 **CRITICAL** | `rm -rf /`     | 删除系统根目录     |
| 🔴 **CRITICAL** | `dd if=`       | 磁盘破坏命令       |
| 🔴 **CRITICAL** | `mkfs.*`       | 格式化文件系统     |
| 🔴 **CRITICAL** | `:(){:\|:&};:` | Fork 炸弹 DoS 攻击 |
| 🟠 **HIGH**     | `chmod 777`    | 设置全局可写权限   |
| 🟠 **HIGH**     | `curl \| bash` | 管道下载到 shell   |
| 🟠 **HIGH**     | 写入 `/etc/`   | 篡改系统配置       |
| 🟡 **MEDIUM**   | `sudo`         | 特权操作           |
| 🟡 **MEDIUM**   | 防火墙修改     | 网络暴露风险       |

#### 2️⃣ 命令拦截与审批

检测到危险操作时，SafeExec 会立即拦截并通知：

```
🚨 **危险操作检测 - 命令已拦截**

**风险等级:** 🔴 CRITICAL
**命令:** `rm -rf /home/user/projects`
**原因:** 删除根目录或家目录文件
**匹配规则:** `rm -rf? [\/~]`

**请求 ID:** `req_1769878138_4245`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  此命令需要用户批准才能执行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **将要执行的操作：**
  • 删除目录: /home/user/projects
  • 删除模式: 递归强制删除
  • 影响范围: 该目录下的所有文件和子目录

💡 **批准方法：**
  safe-exec-approve req_1769878138_4245

🚫 **拒绝方法：**
  safe-exec-reject req_1769878138_4245

⏰ 请求将在 5 分钟后过期
```

#### 3️⃣ 完整审计追踪

所有操作都被永久记录到 `~/.openclaw/safe-exec-audit.log`：

```json
{
  "timestamp": "2026-01-31T16:44:17.217Z",
  "event": "approval_requested",
  "requestId": "req_1769877857_2352",
  "command": "rm -rf /tmp/test\n",
  "risk": "critical",
  "reason": "删除根目录或家目录文件"
}
```

**这对于事后分析、合规审计、故障排查都至关重要。**

---

## 🚀 5 分钟快速上手

### 安装（30 秒）

```bash
# 1. 克隆仓库
git clone https://github.com/OTTTTTO/safe-exec.git ~/.openclaw/skills/safe-exec

# 2. 添加执行权限
chmod +x ~/.openclaw/skills/safe-exec/*.sh

# 3. 创建全局命令
ln -sf ~/.openclaw/skills/safe-exec/safe-exec.sh ~/.local/bin/safe-exec
```

### 在 AI Agent 中使用

在 Feishu/Telegram/WhatsApp 中直接告诉你的 Agent：

```
开启 SafeExec
```

然后试着执行危险命令：

```
帮我强制删除 /tmp/test 文件夹的所有内容
```

**如果命令安全，它会直接执行。如果危险，你会收到通知并决定是否批准。**

就这么简单。

---

## 💡 技术细节：为什么这样设计？

### 为什么是 Skill 而不是 Plugin？

我最初想用 OpenClaw Plugin API，但发现它不支持 `pre-exec hook`。

**所以我想：为什么不直接在 Skill 层实现？**

这样做的好处：

- ✅ **更简单** - 不需要修改 OpenClaw 核心代码
- ✅ **更灵活** - Agent 可以主动选择是否使用
- ✅ **更可靠** - 完全控制执行流程

### 架构设计

```
用户 → AI Agent → safe-exec
                      ↓
                   风险评估引擎
                   /      \
              安全      危险
               │          │
               ▼          ▼
            执行      拦截 + 通知
                          │
                    ┌─────┴─────┐
                    │           │
                 等待批准      审计日志
                    │
              ┌─────┴─────┐
              │           │
           [批准]      [拒绝]
              │           │
              ▼           ▼
           执行         取消
```

### 核心代码（简化版）

```bash
# 风险评估函数
assess_risk() {
    local cmd="$1"
    local risk="low"

    # 检查危险模式
    if echo "$cmd" | grep -qE 'rm[[:space:]]+-rf[[:space:]]+[\/~]'; then
        risk="critical"
    elif echo "$cmd" | grep -qE 'dd[[:space:]]+if='; then
        risk="critical"
    # ... 更多规则

    echo "$risk"
}

# 拦截与通知
request_approval() {
    local command="$1"
    local risk="$2"
    local request_id="req_$(date +%s)_$(shuf -i 1000-9999 -n 1)"

    # 显示警告
    echo "🚨 危险操作检测 - 命令已拦截"
    echo "风险等级: ${risk^^}"
    echo "请求 ID: $request_id"

    # 等待用户批准...
}
```

完整的代码在 [GitHub](https://github.com/OTTTTTO/safe-exec)，MIT 许可证。

---

## 🆕 v0.2.1 新功能

就在今天，我发布了 v0.2.1 版本，主要更新：

### 🌍 双语文档

- ✅ 完整的英文 README
- ✅ 语言切换链接
- ✅ 国际化友好

### 📚 增强的文档

- ✅ 详细的 OpenClaw 集成指南
- ✅ 真实使用场景示例
- ✅ 最佳实践指南
- ✅ 完整的 FAQ

### 🔧 新增工具

- ✅ `safe-exec-add-rule` - 快速管理规则
- ✅ 导入/导出规则集
- ✅ 批量操作支持

### 🎯 改进的用户体验

- ✅ 彩色输出和表情符号
- ✅ 更清晰的风险提示
- ✅ 快捷批准命令

---

## 📖 真实使用场景

### 场景 1：防止数据删除

```
你: 清理一下家目录下的所有日志文件

🤖: 🚨 检测到危险操作！
    命令: rm -rf ~/logs/*
    风险: CRITICAL
    建议: 改用 rm ~/logs/*.log（仅删除文件，不递归）

你: 好的，那就只删除日志文件

🤖: ✅ 执行: rm ~/logs/*.log
    删除了 23 个日志文件
```

### 场景 2：防止代码注入

```
你: 从这个 URL 安装工具：curl http://example.com/install.sh | bash

🤖: 🚨 检测到高风险操作！
    命令: curl http://example.com/install.sh | bash
    风险: HIGH（管道下载到 shell）
    建议:
      1. 先下载脚本: curl -o install.sh http://example.com/install.sh
      2. 检查内容: cat install.sh
      3. 确认安全后再执行

你: 好的，我先检查一下脚本

🤖: ✅ 安全建议已采纳
```

### 场景 3：防止系统破坏

```
你: 帮我格式化这个 U 盘

🤖: 🚨 检测到严重危险操作！
    命令: mkfs.ext4 /dev/sdb
    风险: CRITICAL（格式化文件系统）
    原因: 这会永久删除 /dev/sdb 上的所有数据

⚠️  请确认:
  • 设备: /dev/sdb (8GB USB Device)
  • 操作: 格式化为 ext4
  • 数据丢失: 是

    真的要继续吗？请回复 "我确认格式化 /dev/sdb"

你: 等等，我搞错了设备！是 /dev/sdc

🤖: ✅ 已拦截，避免数据丢失 😅
```

**这些场景每天都在发生。SafeExec 让它们不再成为噩梦。**

---

## 🎯 路线图

### v0.2.0 ✅ (已完成)

- [x] 规则快速管理工具
- [x] 完整的双语文档
- [x] OpenClaw 深度集成
- [x] 审计日志系统

### v0.3.0 (下个月)

- [ ] Web UI 审批界面
- [ ] Telegram/Discord 通知
- [ ] 智能风险评估（机器学习）
- [ ] 批量操作支持

### v0.4.0 (Q2 2026)

- [ ] 上下文感知批准
- [ ] 沙箱执行模式
- [ ] 学习用户习惯
- [ ] 回滚机制

### v1.0.0 (Q3 2026)

- [ ] 多用户支持
- [ ] RBAC 权限控制
- [ ] 企业级功能
- [ ] SIEM 集成

---

## 🤝 为什么我开源这个？

**因为安全不应该是奢侈品。**

AI Agents 正在快速普及，但安全工具却很少。我希望 SafeExec 能够：

1. **保护更多人** - 开源意味着任何人都可以使用
2. **社区改进** - 更多人参与 = 更安全的系统
3. **建立标准** - AI 安全需要行业共识
4. **教育意义** - 提高大家对 AI 安全的意识

---

## 📊 项目数据

- 📦 **版本**: v0.2.1
- 🌟 **GitHub Stars**: (给一个吧！)
- 📝 **文档**: 中文 + 英文
- 🧪 **测试覆盖**: 90%+
- 🔐 **安全规则**: 14+ 内置规则
- 📅 **开发时间**: 36 小时（MVP）+ 持续迭代

---

## 📞 加入我们

如果你也在使用 AI Agents，或者对 AI 安全感兴趣：

- 🌟 **GitHub**: [给个 Star](https://github.com/OTTTTTO/safe-exec)
- 💬 **Discord**: [OpenClaw Community](https://discord.gg/clawd)
- 📧 **Email**: otto@example.com
- 🐦 **Twitter**: @yourhandle

---

## 🎓 学习资源

- 📖 [完整文档](https://github.com/OTTTTTO/safe-exec#readme)
- 🎬 [视频教程](https://youtube.com/)（即将推出）
- 💡 [使用示例](https://github.com/OTTTTTO/safe-exec/blob/main/examples/)
- 📝 [API 文档](https://github.com/OTTTTTO/safe-exec/blob/main/docs/API.md)

---

## 🔮 最后的话

**AI 是强大的工具，但安全永远是我们的责任。**

SafeExec 不是万能药，但它是一层重要的防护。使用它，改进它，贡献它。

让我们一起让 AI Agents 更安全。

---

**P.S.** 如果 SafeExec 帮你避免了灾难，告诉我你的故事。我会把它们写进文档里 😅

**P.P.S.** 这个项目还在早期阶段，你的反馈和贡献非常重要！

---

_发布时间: 2026-02-01_  
_作者: Otto_  
_项目: [SafeExec](https://github.com/OTTTTTO/safe-exec)_  
_版本: v0.2.1_

**[🚀 在 GitHub 上查看项目](https://github.com/OTTTTTO/safe-exec)**
