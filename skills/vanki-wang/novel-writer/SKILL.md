---
# ============================================
# 技能配置 (YAML Frontmatter)
# 这部分必须位于文件最顶部，被三个短横线包围
# 系统会直接读取这里的配置
# ============================================
name: novel-writer
description: 《fangcunzhijian》AI章节生成器
triggers:
  - "写第{chapter_num}章：{prompt}"
parameters:
  chapter_num: string
  prompt: string
entrypoint: run.py
permissions:
  - filesystem:write
  - shell:execute
# ============================================
---

# novel-writer - AI小说章节生成器

此技能专门用于自动生成小说《fangcunzhijian》的章节草稿。

## 功能
- 根据简短的场景提示，生成约600字的章节内容。
- 自动将生成的章节保存为Markdown文件，并放入指定的Obsidian仓库。
- 自动为生成的文件添加Frontmatter元数据（标题、标签）。
- 可选地执行Git提交，以记录版本。

## 使用方法
在OpenClaw中，直接输入以下格式的指令即可触发：
写第{章节号}章：{场景描述}
**例如：**
写第01章：陆玄在老宅阁楼发现人参果核，当晚浇菜时叶片微颤


## 配置
使用前，需要在 `~/.openclaw/novel_config.yaml` 中配置：
- `obsidian_vault`：你的Obsidian仓库根路径。
- `ollama_model`：你希望使用的本地Ollama模型（例如 `qwen3:latest`）。

## 文件结构
- `skill.yaml`：技能定义与触发器。
- `run.py`：核心的生成与文件处理脚本。
- `SKILL.md`：本文档。

---
*技能由 OpenClaw 驱动。*