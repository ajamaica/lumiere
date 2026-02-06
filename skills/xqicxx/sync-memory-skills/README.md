# 记忆系统技能同步工具

## 概述
一个用于同步记忆系统技能文件到create目录的自动化工具。确保所有相关目录中的记忆系统技能文件保持最新。

## 功能特性
- 自动同步验证脚本到所有相关目录
- 自动设置正确的执行权限
- 验证目标目录存在性
- 提供详细的同步进度反馈

## 使用方法

### 直接运行
```bash
bash sync_memory_skills.sh
```

### 作为技能运行
此脚本可以作为记忆系统管理的一部分定期运行。

## 同步内容
- 记忆系统验证脚本
- 启动检查脚本
- 相关文档文件

## 目标目录
- `/root/clawd/create/memory-baidu-embedding-db/`
- `/root/clawd/create/triple-memory-baidu-embedding/scripts/`
- `/root/clawd/create/secure-memory-stack/scripts/`
- 其他记忆相关子目录

## 依赖
- Bash shell
- 标准Unix工具 (cp, chmod, find)