# Doc Search 技能

轻量级本地文档检索，无需向量数据库。本仓库包含 Codex 技能定义以及用于索引与搜索的 Python 脚本。

## 能力概览

- 多策略搜索：文件名、标题/子标题、frontmatter、正文
- 基于文件修改时间的增量索引
- 返回匹配行上下文
- 简单评分机制（可扩展 TF-IDF）

## 目录结构

- `SKILL.md`: Codex 技能说明与用法
- `scripts/search.py`: 搜索工具（直接搜索或基于索引）
- `scripts/indexer.py`: 构建索引（JSON）
- `scripts/quick_search.sh`: 基于 rg 的快速搜索脚本

## 依赖

- Python 3.8+（`search.py` 和 `indexer.py`）
- `ripgrep`（可选，用于 `quick_search.sh`）

## 快速开始

直接搜索（不使用索引）：

```bash
python scripts/search.py "关键词" /path/to/docs
```

带上下文：

```bash
python scripts/search.py "关键词" /path/to/docs --context 3
```

限制文件类型：

```bash
python scripts/search.py "关键词" /path/to/docs --types md,txt
```

## 基于索引的搜索（大项目推荐）

构建索引：

```bash
python scripts/indexer.py /path/to/docs --output index.json
```

使用索引搜索：

```bash
python scripts/search.py "关键词" --index index.json
```

## 输出格式

`search.py` 支持：

- `--format json`
- `--format simple`
- `--format files`

示例：

```bash
python scripts/search.py "关键词" /path/to/docs --format json
```

## 说明

- 默认文件类型：`md, txt, rst, py, js, ts, yaml, yml, json`
- 默认排除：`.git, node_modules, __pycache__, .venv, venv`
- 索引器会跳过大文件（>1MB）

## 许可证

当前未包含 License 文件，如需发布请补充。
