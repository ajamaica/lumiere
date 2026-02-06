# Prompts Workflow 修复总结

## 问题描述

### 症状

- **Collect 步骤**: 工作正常，成功收集了 239 条提示词
- **Convert 步骤**: 失败

### 根本原因

1. `convert.js` 期望处理 Twitter 推文数据
2. 但 `collect.sh` 收集的是 Reddit/GitHub/HackerNews 数据
3. 缺少依赖模块：`dedup-manager.js`

## 解决方案

### 1. 修改 main.js 的 convert() 方法

**文件**: `/root/clawd/skills/prompts-workflow/main.js`

**修改前**:

```javascript
const convertScript = join(WORKFLOW_DIR, 'scripts', 'convert.js')
// ...
const result = this.execCommand(`node "${convertScript}"`)
```

**修改后**:

```javascript
const convertScript = '/root/clawd/scripts/convert-prompts-to-skills.py'
// ...
const result = this.execCommand(`python3 "${convertScript}"`)
```

### 2. 重命名旧脚本

```bash
mv scripts/convert.js scripts/convert.js.old
```

### 3. 修复 Python 脚本语法错误

**文件**: `/root/clawd/scripts/convert-prompts-to-skills.py`

**问题**: f-string 中嵌套 JSON 语法错误

```python
# 错误代码（第 143 行）
metadata: {{"clawdbot":{{"type":"{actual_type.lower()}","inferred_type":"{actual_type}","source":"{source}","original_url":"{url}","quality_score":{quality_score}}}}}}
```

**修复**:

```python
# 修复后
import json as json_lib
metadata_obj = {
    "clawdbot": {
        "type": actual_type.lower(),
        "inferred_type": actual_type,
        "source": source,
        "original_url": url,
        "quality_score": quality_score
    }
}
metadata_json = json_lib.dumps(metadata_obj, ensure_ascii=False)

skill_md = f"""---
name: {skill_name_final}
description: {description}
metadata: {metadata_json}
---
```

## 验证结果

### Workflow 状态

```
=== Workflow State ===
Mode: manual
Started: 2026-02-01T05:02:44.821Z
Ended: 2026-02-01T05:02:44.944Z

Steps:
  ⏸️ collect: pending
  ✅ convert: completed
  ⏸️ publish: pending
```

### 转换统计（测试运行）

- **总计处理**: 138 条提示词
- **成功转换**: 23 个 Skills
- **跳过**:
  - 内容无效: 58 条
  - 重复: 0 条
  - 低质量: 57 条
- **类型分布**:
  - Text Prompt: 71
  - Image Generation: 10
  - Video Generation: 0
- **打包**: 23 个 .skill 文件

## 输出文件位置

- **Skills 目录**: `/root/clawd/dist/skills/`
- **Workflow 日志**: `/root/clawd/skills/prompts-workflow/output/workflow.log`
- **转换日志**: `/root/clawd/data/conversion-logs/conversion-20260201_130212.jsonl`
- **转换报告**: `/root/clawd/data/conversion-logs/conversion-report-20260201_130212.json`

## 使用方式

### 运行完整 workflow

```bash
cd /root/clawd/skills/prompts-workflow
node main.js auto
```

### 运行单个步骤

```bash
cd /root/clawd/skills/prompts-workflow
node main.js manual collect
node main.js manual convert
node main.js manual publish
```

### 查看状态

```bash
cd /root/clawd/skills/prompts-workflow
node main.js status
```

### 从失败恢复（交互模式）

```bash
cd /root/clawd/skills/prompts-workflow
node main.js interactive
```

## 技术细节

### 数据源

- **image-prompts.jsonl**: 40 行
- **video-prompts.jsonl**: 0 行
- **general-prompts-v2.jsonl**: 97 行

### 质量筛选

- 最小质量分数: 60
- 内容验证:
  - 最小长度: 20 字符
  - 最大长度: 2000 字符
  - 必须包含动作动词
  - 不允许截断标记

## 修复日期

2026-02-01 13:02 (Asia/Shanghai)

## 修复人

Momo (Clawdbot AI Assistant)
