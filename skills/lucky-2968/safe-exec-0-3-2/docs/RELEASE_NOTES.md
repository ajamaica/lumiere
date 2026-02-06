# SafeExec v0.1.2 发布说明

## 🎉 首次发布

SafeExec v0.1.2 现已发布！这是 AI Agent 安全防护层的第一个稳定版本。

## ✨ 新功能

- 🔍 **智能风险评估** - 检测 10+ 类危险操作模式
- 🚨 **命令拦截** - 自动拦截危险命令并请求批准
- 📊 **审计日志** - 完整记录所有安全事件
- ⚙️ **灵活配置** - 自定义规则和超时设置
- 🧹 **自动清理** - 过期请求自动清理
- 📝 **完整文档** - README、使用指南、贡献指南

## 📦 安装

```bash
git clone https://github.com/yourusername/safe-exec.git ~/.openclaw/skills/safe-exec
chmod +x ~/.openclaw/skills/safe-exec/*.sh
ln -sf ~/.openclaw/skills/safe-exec/safe-exec.sh ~/.local/bin/safe-exec
```

## 🚀 快速开始

```bash
# 执行危险命令
safe-exec "rm -rf /tmp/test"

# 查看待处理请求
safe-exec --list

# 批准请求
safe-exec-approve req_xxxxx
```

## 🔒 安全特性

- ✅ Zero-trust 架构
- ✅ 完整审计追踪
- ✅ 自动过期保护
- ✅ 最小权限原则

## 📚 文档

- [README](README.md) - 项目概览
- [使用指南](USAGE.md) - 详细使用说明
- [博客](BLOG.md) - 项目介绍
- [贡献指南](CONTRIBUTING.md) - 如何贡献

## 🙏 致谢

感谢 OpenClaw 社区的支持和反馈！

## 📮 联系方式

- GitHub: https://github.com/yourusername/safe-exec
- Email: 731554297@qq.com
- Discord: https://discord.gg/clawd

---

**完整更新日志**: [CHANGELOG.md](CHANGELOG.md)
