---
name: gdocs-markdown
description: Create Google Docs from Markdown files. Use when the user wants to create a Google Doc from Markdown content, or when working with gog CLI and need to populate Google Docs with content. This skill handles the conversion Markdown → DOCX → Google Docs via Drive upload, since gog docs CLI only supports create/export/cat/copy but NOT write/update content.
---

# Google Docs from Markdown

Create Google Docs from Markdown files using the workflow: Markdown → DOCX → Drive Upload → Google Docs.

## Why This Skill Exists

`gog docs` CLI does NOT support writing/updating content to Google Docs. It only supports:
- `create` - Create empty doc
- `export` - Export to file
- `cat` - Read content
- `copy` - Copy existing doc

This skill provides the missing workflow to create Google Docs WITH content from Markdown.

## Author

Created by **techla**

## Prerequisites

- `gog` CLI authenticated with Google account
- `pandoc` binary (auto-downloaded on first use if not available)

## Installation Note

After installing from ClawHub, fix the script permissions:
```bash
chmod +x ~/.openclaw/workspace/skills/gdocs-markdown/scripts/gdocs-create.sh
```

## Usage

### Quick Create

```bash
# Create Google Doc from markdown file
gdocs-create.sh /path/to/file.md "Tiêu đề Document"
```

### Manual Workflow

If you need more control, follow these steps:

1. **Ensure pandoc is available:**
   ```bash
   # Auto-downloaded to /tmp/pandoc-3.1.11/bin/pandoc on first use
   # Or use system pandoc if available
   ```

2. **Convert Markdown to DOCX:**
   ```bash
   /tmp/pandoc-3.1.11/bin/pandoc input.md -o output.docx
   ```

3. **Upload to Drive (auto-converts to Google Docs):**
   ```bash
   gog drive upload output.docx
   ```

4. **Result:** Google Drive returns a link to the converted Google Doc

## Script Reference

See `scripts/gdocs-create.sh` for the helper script that automates this workflow.

## Example

```bash
# Create a report from markdown
echo "# Báo Cáo\n\nNội dung..." > /tmp/report.md
gdocs-create.sh /tmp/report.md "Báo Cáo Tháng 2"

# Output: https://docs.google.com/document/d/xxxxx/edit
```

## Notes

- Google Drive automatically converts DOCX to Google Docs format on upload
- The resulting document is fully editable in Google Docs
- Original DOCX file remains in Drive but can be deleted if only Google Docs version is needed
