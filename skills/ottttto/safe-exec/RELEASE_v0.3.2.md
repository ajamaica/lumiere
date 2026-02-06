# 更新说明 - v0.3.2

## 🎯 本次更新

### 完全向后兼容的结构优化

在保持完全向后兼容的前提下，优化了项目结构：

#### 新增内容

1. **README 拆分**
   - ✨ 简洁的 README.md（快速开始）
   - 📖 详细的 README-detail.md（完整指南）

2. **对话式安装**
   - 📦 ClawdHub 一键安装：`Help me install SafeExec skill from ClawdHub`

3. **清晰的目录结构**
   - 📁 scripts/ - 核心脚本
   - 📁 monitoring/ - 监控系统
   - 📁 tests/ - 测试
   - 📁 tools/ - 工具
   - 📁 docs/ - 详细文档

#### 兼容性保证

**所有现有用户无需任何更改！**

✅ **核心脚本**：

- `safe-exec.sh` → 软链接到 `scripts/safe-exec.sh`

✅ **辅助脚本**：

- `safe-exec-approve.sh` → 软链接到 `scripts/safe-exec-approve.sh`
- `safe-exec-reject.sh` → 软链接到 `scripts/safe-exec-reject.sh`
- `safe-exec-list.sh` → 软链接到 `scripts/safe-exec-list.sh`
- `safe-exec-check-pending.sh` → 软链接到 `scripts/safe-exec-check-pending.sh`
- `safe-exec-ai-wrapper.sh` → 软链接到 `scripts/safe-exec-ai-wrapper.sh`

#### 无需更改

如果你是以下用户，**完全不受影响**：

- ✅ 对话式用户（`Enable SafeExec`）
- ✅ ClawdHub 用户
- ✅ 直接调用 `safe-exec.sh` 的用户
- ✅ 所有命令行接口保持不变

#### 可选更新

如果你直接调用了辅助脚本，可以选择更新路径：

```bash
# 旧方式（仍然可用）
~/.openclaw/skills/safe-exec/safe-exec-list.sh

# 新方式（推荐）
~/.openclaw/skills/safe-exec/scripts/safe-exec-list.sh

# 或使用软链接（两者都可用）
~/.openclaw/skills/safe-exec/safe-exec-list.sh
```

---

## 📦 升级方式

### ClawdHub 用户

```
Help me update SafeExec to the latest version
```

或重新安装：

```
Help me install SafeExec skill from ClawdHub
```

### GitHub 用户

```bash
cd ~/.openclaw/skills/safe-exec
git pull origin master
```

---

## 📚 相关文档

- [完整影响评估](IMPACT_ASSESSMENT.md)
- [项目结构说明](PROJECT_STRUCTURE.md)
- [更新指南](UPDATE_NOTES.md)
