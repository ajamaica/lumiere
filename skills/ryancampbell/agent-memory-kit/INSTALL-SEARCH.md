# Memory Kit Search - Installation Guide

**Time required:** 5 minutes  
**Prerequisites:** Memory Kit v2.0+ installed

---

## 1. Verify Installation

The search system is included with Memory Kit v2.1+.

Check if files exist:

```bash
ls -l skills/agent-memory-kit/bin/memory-search
ls -l skills/agent-memory-kit/lib/search.sh
```

**Expected:** Files exist and are executable.

If missing, pull latest Memory Kit:

```bash
cd skills/agent-memory-kit
git pull origin main
```

---

## 2. Add to PATH (Recommended)

### For Bash

Add to `~/.bashrc`:

```bash
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"
```

Reload:

```bash
source ~/.bashrc
```

### For Zsh (macOS default)

Add to `~/.zshrc`:

```bash
export PATH="$PATH:$HOME/.openclaw/workspace/skills/agent-memory-kit/bin"
```

Reload:

```bash
source ~/.zshrc
```

### Verify

```bash
which memory-search
# Should output: /Users/[you]/.openclaw/workspace/skills/agent-memory-kit/bin/memory-search

memory-search --help
# Should show help text
```

---

## 3. Alternative: Use Full Path

If you don't want to modify PATH:

```bash
# Create alias
alias memory-search="$HOME/.openclaw/workspace/skills/agent-memory-kit/bin/memory-search"
```

Or always use full path:

```bash
$HOME/.openclaw/workspace/skills/agent-memory-kit/bin/memory-search --today
```

---

## 4. Test Basic Search

```bash
# Basic keyword search
memory-search "memory"

# Should show results from memory files
```

**Expected output:**

- Results with file paths
- Preview text
- Color-coded display

If you see results, ✅ installation successful!

---

## 5. Set Up Tagging (Start Now)

### Update Today's Daily Log

Open today's memory file:

```bash
vim memory/$(date +%Y-%m-%d).md
```

Add frontmatter at the top:

```markdown
---
date: 2026-02-04
agents: []
projects: []
tags: []
status: active
wins: []
blockers: []
---

# Daily Log — February 4, 2026
```

Tag any significant entries:

```markdown
### Memory Kit Search Setup #win #kits

Set up the search system. Works great!

**Tags:** #win #kits
```

---

## 6. Copy Templates (Optional)

Use the new v2 templates for future entries:

```bash
# Copy daily template
cp skills/agent-memory-kit/templates/daily-template-v2.md memory/daily-template.md

# Copy procedure template
cp skills/agent-memory-kit/templates/procedure-template-v2.md memory/procedures/procedure-template.md
```

**Why:** Templates include frontmatter and tag examples.

---

## 7. Update Wake Routine

In your `AGENTS.md` or wake routine:

**Add this step:**

```markdown
### On Wake:

1. Read SOUL.md
2. Read USER.md
3. **Run: `memory-search --today` (quick orientation)** ← NEW
4. Read yesterday's daily log
5. If main session: Read MEMORY.md
```

**Why:** Get instant context without reading full files.

---

## 8. Test Advanced Features

### Tag Search

```bash
memory-search --tag decision
```

**Expected:** Find entries tagged `#decision` (if any exist).

If no results: That's normal if you haven't tagged entries yet.

### Date Range

```bash
memory-search --since 7d
```

**Expected:** Results from last 7 days only.

### Shortcuts

```bash
memory-search --today
memory-search --recent-decisions
```

**Expected:** Filtered results.

### Count Mode

```bash
memory-search "memory" --count
```

**Expected:** Count summary with file breakdown.

### JSON Output

```bash
memory-search "memory" --format json | head -20
```

**Expected:** Valid JSON array.

If all these work, ✅ advanced features ready!

---

## 9. Tag Recent Files (Optional)

To make search more useful immediately, tag your recent daily logs:

```bash
# Edit yesterday's log
vim memory/$(date -v-1d +%Y-%m-%d).md  # macOS
vim memory/$(date -d "yesterday" +%Y-%m-%d).md  # Linux
```

Add tags to significant entries:

```markdown
### Some Achievement #win #kits

Did a thing!

**Tags:** #win #kits
```

Repeat for last 2-3 days.

**Why:** Gives search useful data immediately.

---

## 10. Add to Heartbeat (Optional)

In `HEARTBEAT.md` (if it exists):

```markdown
### Memory Health Check (every 2-3 days)

- [ ] Run: `memory-search --active-blockers`
- [ ] Any blockers >3 days old? Escalate or resolve.
- [ ] Run: `memory-search --recent-decisions`
- [ ] Any decisions need follow-up?
```

**Why:** Proactive blocker and decision tracking.

---

## 11. Learn the Tag System

### Core Tags to Use

**Event/Topic:**

- `#decision` — Important decisions
- `#learning` — Lessons learned
- `#blocker` — Problems blocking progress
- `#win` — Achievements
- `#procedure` — Reference to how-to

**Domain:**

- `#kits` — Kit work
- `#distribution` — Marketing/posting
- `#product` — Product dev
- `#infrastructure` — Technical platform
- `#team` — Team coordination
- `#content` — Writing/documentation

**Meta:**

- `#important` — High-value info
- `#todo` — Action items
- `#archived` — Historical

**Rule:** Use 2-4 tags per entry.

---

## 12. Read Documentation

**Quick start (5 min):**

```bash
cat skills/agent-memory-kit/QUICKSTART-SEARCH.md
```

**Full guide (15 min):**

```bash
cat skills/agent-memory-kit/SEARCH.md
```

**Real examples (10 min):**

```bash
cat skills/agent-memory-kit/EXAMPLES.md
```

**Testing guide:**

```bash
cat skills/agent-memory-kit/TESTING.md
```

---

## Troubleshooting

### "Command not found"

**Problem:** `memory-search` not in PATH.

**Solution:**

1. Check PATH: `echo $PATH`
2. Verify file exists: `ls skills/agent-memory-kit/bin/memory-search`
3. Use full path or add to PATH (Step 2)

---

### "Permission denied"

**Problem:** Script not executable.

**Solution:**

```bash
chmod +x skills/agent-memory-kit/bin/memory-search
chmod +x skills/agent-memory-kit/lib/search.sh
```

---

### "No results found"

**Problem:** Search works but finds nothing.

**Solutions:**

1. **Check if memory files exist:** `ls memory/*.md`
2. **Try broader search:** `memory-search ""` (finds all)
3. **Tag files first:** No tags = tag searches fail

---

### "Bash version error"

**Problem:** Associative array errors.

**Solution:** Already fixed in v2.1.0 (uses temp files for compatibility).

If still seeing errors:

```bash
bash --version
# Should be 3.2+
```

---

### "Slow search"

**Problem:** Search takes >5 seconds.

**Solutions:**

1. **Check file count:** `ls memory/*.md | wc -l`
2. **Use date filters:** `--since 7d` reduces scope
3. **Use tag filters:** `--tag decision` reduces files scanned

**Normal:** <2 seconds for 100 files.

---

## Uninstallation

If you want to remove search (keep Memory Kit):

```bash
rm -f skills/agent-memory-kit/bin/memory-search
rm -rf skills/agent-memory-kit/lib/
rm -f skills/agent-memory-kit/SEARCH.md
rm -f skills/agent-memory-kit/QUICKSTART-SEARCH.md
rm -f skills/agent-memory-kit/EXAMPLES.md
```

**Note:** Keeps Memory Kit v2.0 core features intact.

---

## Next Steps After Installation

1. **Tag today's work** (practice tagging as you log)
2. **Try 3-5 searches** (get comfortable with CLI)
3. **Read QUICKSTART-SEARCH.md** (5-minute guide)
4. **Use daily for a week** (build the habit)
5. **Provide feedback** (what works? what doesn't?)

---

## Support

**Issues?**

1. Check this guide
2. Read `SEARCH.md`
3. Test with `TESTING.md` scenarios
4. Log bug in `memory/feedback.md` with `#bug #search` tags

**Improvements?**

- Add to `memory/feedback.md` with `#search #feedback`

---

## Verification Checklist

After installation, verify:

- [ ] `memory-search --help` works
- [ ] `memory-search "memory"` shows results
- [ ] `memory-search --today` runs (may be empty if no today entries)
- [ ] `memory-search --format json` returns valid JSON
- [ ] `memory-search "keyword" --count` shows count
- [ ] Tagged at least one entry in today's log
- [ ] Added to PATH or created alias
- [ ] Read QUICKSTART-SEARCH.md

If all checked, ✅ you're ready to search!

---

_Installation complete. Start tagging, start searching!_
