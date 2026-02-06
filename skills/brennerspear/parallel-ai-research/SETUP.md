# Research Skill - Setup

One-time setup for the research skill. Skip if already done.

---

## 1. Install parallel-research CLI

The CLI lives in this skill's `scripts/` folder. Symlink it to make it available globally:

```bash
# Option A: Symlink to ~/.local/bin (recommended, usually in PATH)
mkdir -p ~/.local/bin
ln -sf ~/.openclaw/skills/research/scripts/parallel-research ~/.local/bin/parallel-research

# Option B: Symlink to /usr/local/bin (system-wide, needs sudo)
sudo ln -sf ~/.openclaw/skills/research/scripts/parallel-research /usr/local/bin/parallel-research
```

**Verify it works:**

```bash
parallel-research --help
```

**Set your API key:**

```bash
# Create secrets directory
mkdir -p ~/.secrets/parallel_ai

# Save your API key
echo "PARALLEL_API_KEY=your_key_here" > ~/.secrets/parallel_ai/.env
chmod 600 ~/.secrets/parallel_ai/.env

# Add to your shell profile (~/.bashrc or ~/.zshrc)
echo 'export $(cat ~/.secrets/parallel_ai/.env | xargs)' >> ~/.bashrc
source ~/.bashrc
```

---

## 2. Install export-pdf CLI

Symlink alongside parallel-research:

```bash
ln -sf ~/.openclaw/skills/research/scripts/export-pdf ~/.local/bin/export-pdf
```

### Dependencies

**pandoc** (required):

```bash
# macOS
brew install pandoc

# Linux
sudo apt-get install pandoc
```

**uv** (required — handles PyMuPDF automatically):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

The script uses `uvx --with pymupdf` so you don't need to manually install PyMuPDF or manage a venv.

### Verify

```bash
export-pdf --help  # should show usage
```

---

## 3. Research Directory

Research docs live in the workspace:

```
~/.openclaw/workspace/research/
```

Create it if needed:

```bash
mkdir -p ~/.openclaw/workspace/research
```

---

## Why These Tools?

### PDF Export (pandoc + PyMuPDF)

Other options have issues:

- **`markdown_pdf`** — pagination bug drops content on long docs
- **`weasyprint`** — pango/cairo linking issues on macOS
- **`wkhtmltopdf`** — removed from Homebrew
- **`pandoc` alone** — needs heavy LaTeX install for PDF

The pandoc→HTML→fitz pipeline avoids all these.

### Deep Research (Parallel AI)

- Async API for deep research that takes minutes/hours
- Returns comprehensive markdown reports
- `parallel-research` CLI wraps the API cleanly
