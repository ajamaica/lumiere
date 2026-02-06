# SafeExec 更新说明

## 📋 本次更新内容

### 1. 文档拆分与优化

**之前：**

- 单一的 README.md（24KB+）
- 包含所有详细内容

**现在：**

- ✨ **README.md** - 简洁的主文档（5KB）
- 📖 **README-detail.md** - 完整详细文档（10KB）

### 2. 对话式安装说明

新增 ClawdHub 一键安装方法：

```
Help me install SafeExec skill from ClawdHub
```

或中文：

```
帮我安装 ClawdHub 中的 SafeExec skills
```

### 3. 项目结构重组

建立了清晰的目录结构：

```
safe-exec/
├── scripts/      # 核心脚本
├── monitoring/   # 监控系统
├── tests/        # 测试脚本
├── tools/        # 工具脚本
└── docs/         # 详细文档
```

详见：[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

### 4. 版本发布策略更新

**新策略：**

- ✅ 功能更新 → 创建 Git tag
- 📝 仅文档更新 → 仅 commit，不创建 tag

这样可以保持 version tags 的清晰性。

---

## 📦 文件变更

### 新增文件

- `README-detail.md` - 详细文档
- `PROJECT_STRUCTURE.md` - 目录结构说明
- `scripts/` - 核心脚本目录
- `monitoring/` - 监控脚本目录
- `tests/` - 测试脚本目录
- `tools/` - 工具脚本目录
- `docs/` - 详细文档目录

### 修改文件

- `README.md` - 重写为简洁版本
- `CHANGELOG.md` - 更新版本信息

### 移动文件

- 所有 `*.sh` 脚本 → `scripts/` 或相应目录
- 所有详细文档 → `docs/`

---

## 🚀 升级指南

### 现有用户

如果你已经从 GitHub 安装：

```bash
# 1. 更新代码
cd ~/.openclaw/skills/safe-exec
git pull origin master

# 2. 重新创建软链接
ln -sf scripts/safe-exec.sh ~/.local/bin/safe-exec
ln -sf scripts/safe-exec-*.sh ~/.local/bin/

# 3. 验证安装
safe-exec --status
```

### ClawdHub 用户

如果你从 ClawdHub 安装：

```
Help me update SafeExec to the latest version
```

或重新安装：

```
Help me install SafeExec skill from ClawdHub
```

---

## 📚 文档导航

- **快速开始** → [README.md](README.md)
- **详细文档** → [README-detail.md](README-detail.md)
- **项目结构** → [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **变更日志** → [CHANGELOG.md](CHANGELOG.md)

---

**更新日期:** 2026-02-01
**版本:** v0.3.1+
