---
name: memory-skills-sync
version: 1.0.0
description: 同步记忆系统技能文件到create目录的工具
metadata:
  clawdbot:
    emoji: "🔄"
    category: "utility"
    requires:
      skills: []
---

# 记忆系统技能同步工具

一个用于同步记忆系统技能文件到create目录的自动化工具。

## 功能
- 将主目录中的记忆系统技能脚本同步到create目录
- 自动设置正确的文件权限
- 同步相关文档文件

## 使用方法
```bash
# 手动运行同步
bash /root/clawd/skills/memory-skills-sync/sync_memory_skills.sh

# 或者通过skill调用
# (具体调用方式取决于Clawdbot的skill执行机制)
```

## 文件结构
```
skills/memory-skills-sync/
├── SKILL.md           # 本说明文件
├── sync_memory_skills.sh  # 主同步脚本
├── README.md         # 详细说明
└── package.json      # 包定义
```

## 依赖
- bash
- cp (复制命令)
- chmod (权限设置)
- find (文件查找)

## 验证
- 同步脚本已在多个目录中验证可执行
- 权限设置正确
- 目标目录存在性检查已实现