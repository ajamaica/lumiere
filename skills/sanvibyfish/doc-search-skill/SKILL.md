---
name: doc-search
description: 文档内容检索技能，用于在项目文件中搜索和定位信息。当需要在本地文档中查找关键词、搜索项目文件内容、定位特定信息、或需要快速了解项目文档结构时使用此技能。支持多策略搜索（文件名、标题、内容）、增量索引、上下文返回。适用于 Markdown、文本文件、代码文件等。
---

# Doc Search 文档检索

轻量级本地文档检索，无需向量数据库。

## 核心能力

1. **多策略搜索** - 文件名 > 标题/frontmatter > 正文内容，按相关性排序
2. **增量索引** - 基于文件修改时间，只更新变化的文件
3. **上下文返回** - 返回匹配行及前后 N 行
4. **TF-IDF 排序** - 可选的轻量相关性排序

## 快速使用

### 直接搜索（无需索引）

```bash
# 简单关键词搜索
python scripts/search.py "关键词" /path/to/docs

# 带上下文
python scripts/search.py "关键词" /path/to/docs --context 3

# 限制文件类型
python scripts/search.py "关键词" /path/to/docs --types md,txt
```

### 使用索引（大型项目推荐）

```bash
# 构建索引
python scripts/indexer.py /path/to/docs --output index.json

# 基于索引搜索（更快）
python scripts/search.py "关键词" --index index.json
```

## 搜索策略

搜索按以下优先级返回结果：

| 优先级 | 匹配类型         | 权重 |
| ------ | ---------------- | ---- |
| 1      | 文件名完全匹配   | 100  |
| 2      | 文件名包含       | 80   |
| 3      | 标题/H1 匹配     | 70   |
| 4      | Frontmatter 匹配 | 60   |
| 5      | 正文内容匹配     | 40   |

多次匹配会累加权重。

## 输出格式

```json
{
  "query": "搜索词",
  "total": 5,
  "results": [
    {
      "file": "docs/guide.md",
      "score": 150,
      "matches": [
        {
          "type": "title",
          "line": 1,
          "content": "# 用户指南",
          "context": ["---", "title: 用户指南", "---"]
        },
        {
          "type": "content",
          "line": 42,
          "content": "这是关于搜索词的说明",
          "context": ["上一行", "这是关于搜索词的说明", "下一行"]
        }
      ]
    }
  ]
}
```

## 配置文件（可选）

在项目根目录创建 `.docsearch.yaml`：

```yaml
# 要索引的目录
include:
  - docs/
  - README.md
  - src/**/*.md

# 排除的模式
exclude:
  - node_modules/
  - '*.min.js'
  - .git/

# 文件类型
types:
  - md
  - txt
  - py
  - js

# 索引选项
index:
  max_file_size: 1mb
  extract_frontmatter: true
  extract_headings: true
```

## 高级用法

### 组合 Bash 工具

当不需要索引时，直接用 ripgrep：

```bash
# 快速搜索
rg "关键词" --type md -C 2 --json

# 搜索标题
rg "^#.*关键词" --type md

# 搜索 frontmatter
rg -U "^---[\s\S]*?关键词[\s\S]*?^---" --type md
```

### Python API

```python
from scripts.search import DocSearch

searcher = DocSearch("/path/to/docs")
results = searcher.search("关键词", context_lines=2)

for r in results:
    print(f"{r['file']} (score: {r['score']})")
    for m in r['matches']:
        print(f"  L{m['line']}: {m['content']}")
```

## 适用场景

- 项目文档快速定位
- 代码库中查找注释/文档
- 笔记系统内容检索
- 配置文件搜索

## 限制

- 不支持语义搜索（需要向量数据库）
- 中文分词依赖简单切分
- 大文件（>1MB）建议跳过
