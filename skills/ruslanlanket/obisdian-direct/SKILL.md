---
name: obsidian
description: >
  Work with Obsidian vaults as a knowledge base. Features: fuzzy/phonetic search across all notes,
  auto-folder detection for new notes, create/read/edit notes with frontmatter, manage tags and wikilinks.
  Use when: querying knowledge base, saving notes/documents, editing existing notes by user instructions.
---

# Obsidian Knowledge Base

Obsidian vault = folder with Markdown files + `.obsidian/` config.

## Configuration

- **Vault Path:** `/home/ruslan/webdav/data/ruslain`
- **Env:** `OBSIDIAN_VAULT=/home/ruslan/webdav/data/ruslain`

## CLI Usage

Scripts location: `/home/ruslan/.openclaw/workspace/skills/obsidian/scripts`

Note: Global flags (`--vault`, `--json`) must come BEFORE the command.

```bash
export OBSIDIAN_VAULT=/home/ruslan/webdav/data/ruslain
cd /home/ruslan/.openclaw/workspace/skills/obsidian/scripts

# Search (fuzzy/phonetic) - uses ripgrep for speed
python3 obsidian_search.py "$OBSIDIAN_VAULT" "query" --limit 10 --json

# List notes
python3 obsidian_cli.py --json list                    # all notes
python3 obsidian_cli.py --json list "Projects"         # in folder

# List folders
python3 obsidian_cli.py --json folders

# Read note
python3 obsidian_cli.py --json read "Note Name"

# Create note
python3 obsidian_cli.py --json create "Title" -c "Content" -f "Folder" -t tag1 tag2
python3 obsidian_cli.py --json create "Title" -c "Content" --auto-folder  # auto-detect folder

# Edit note
python3 obsidian_cli.py --json edit "Note" append -c "Text to append"
python3 obsidian_cli.py --json edit "Note" prepend -c "Text at start"
python3 obsidian_cli.py --json edit "Note" replace -c "New full content"
python3 obsidian_cli.py --json edit "Note" replace-section -s "Summary" -c "New section text"

# Tags
python3 obsidian_cli.py --json tags

# Links (incoming/outgoing)
python3 obsidian_cli.py --json links "Note Name"

# Suggest folder for content
python3 obsidian_cli.py --json suggest-folder "content text" --title "Note Title"
```

## Workflow: Query Knowledge Base

1. Run `obsidian_search.py` with user query
2. Read top results if needed for context
3. Formulate answer based on found content
4. Cite sources: `[[Note Name]]`

## Workflow: Save Note

1. If no folder specified → run `suggest-folder` or use `--auto-folder`
2. Create note with `create` command
3. Add appropriate tags based on content
4. Report created path to user

## Workflow: Edit Note by Prompt

User prompts like:

- "Добавь резюме в конец заметки X" → `edit X append -c "..."`
- "Перепиши заметку Y более кратко" → read note, rewrite, `edit Y replace -c "..."`
- "Добавь секцию 'Выводы' в заметку Z" → `edit Z replace-section -s "Выводы" -c "..."`

## Note Format

```markdown
---
created: 2024-01-15T10:30:00
modified: 2024-01-15T12:00:00
tags:
  - project
  - work
---

# Title

Content with [[wikilinks]] and #inline-tags.
```

## Wikilinks

- `[[Note Name]]` — link to note
- `[[Note Name|Display Text]]` — link with alias
- `[[Note Name#Section]]` — link to section

## Frontmatter Fields

Standard fields:

- `created` — creation timestamp
- `modified` — last edit timestamp
- `tags` — list of tags
- `aliases` — alternative names for linking

## Search Behavior

`obsidian_search.py` uses:

- ripgrep for fast initial filtering
- Title matching (highest weight)
- Tag matching
- Fuzzy content search with phonetic transliteration (RU↔EN)
- Returns: path, title, score, matched context
