# Doc Search Skill

Lightweight local document search without a vector database. This repo includes a Codex skill definition plus simple Python tools for indexing and searching docs.

## What it does

- Multi-strategy search: filename, title/headings, frontmatter, content
- Incremental indexing based on file mtime
- Context lines around matches
- Simple scoring and optional TF-IDF hooks

## Structure

- `SKILL.md`: Codex skill description and usage
- `scripts/search.py`: search tool (direct search or index-based)
- `scripts/indexer.py`: builds an index (JSON)
- `scripts/quick_search.sh`: fast rg-based search shortcut

## Requirements

- Python 3.8+ (for `search.py` and `indexer.py`)
- `ripgrep` (optional, for `quick_search.sh`)

## Quick start

Direct search (no index):

```bash
python scripts/search.py "query" /path/to/docs
```

With context lines:

```bash
python scripts/search.py "query" /path/to/docs --context 3
```

Limit file types:

```bash
python scripts/search.py "query" /path/to/docs --types md,txt
```

## Index-based search (recommended for large repos)

Build the index:

```bash
python scripts/indexer.py /path/to/docs --output index.json
```

Search using the index:

```bash
python scripts/search.py "query" --index index.json
```

## Output formats

`search.py` supports:

- `--format json`
- `--format simple`
- `--format files`

Example:

```bash
python scripts/search.py "query" /path/to/docs --format json
```

## Notes

- Default file types: `md, txt, rst, py, js, ts, yaml, yml, json`
- Default excludes: `.git, node_modules, __pycache__, .venv, venv`
- Large files (>1MB) are skipped by the indexer

## License

No license file is included yet. Add one if you plan to distribute.
