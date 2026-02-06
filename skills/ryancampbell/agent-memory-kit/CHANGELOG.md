# Changelog

All notable changes to the Agent Memory Kit.

---

## [2.1.0] - 2026-02-04

### Added - Search & Recall System

**Problem:** "Where did we decide that?" With 3,865+ lines across memory files, finding specific context took 2-5 minutes of manual grep or re-reading.

**Solution:** Semantic search with tagging, quick recall shortcuts, and CLI tool.

#### New Files

- `bin/memory-search` — CLI search tool
- `lib/search.sh` — Core search implementation
- `lib/synonyms.txt` — Keyword synonym dictionary
- `templates/daily-template-v2.md` — Updated template with frontmatter + tags
- `templates/procedure-template-v2.md` — Updated template with tags
- `SEARCH.md` — Complete search system documentation

#### Core Features

**1. Tag System**

- Inline tags (`#decision`, `#learning`, `#blocker`, `#win`, etc.)
- 3 categories: Event/Topic, Domain, Meta
- 15 core tags covering common patterns
- Tag-based filtering in search

**2. Frontmatter Metadata**

- YAML frontmatter for daily logs
- Structured fields: date, agents, projects, tags, status, wins, blockers
- Quick file filtering without reading content

**3. CLI Search Tool**

- Keyword search across all memory files
- Tag filtering (single or multiple tags)
- Date range filtering (absolute or relative: 7d, 2w, 1m)
- Project/agent filtering
- Procedure-only search
- Pattern detection (count occurrences)
- Quick shortcuts: `--today`, `--recent-decisions`, `--active-blockers`
- Output formats: text (colored) or JSON

**4. Relevance Scoring**

- Results ranked by relevance
- Tag match = highest priority
- Heading match bonus
- Recent file bonus
- Archived penalty

#### Search Examples

```bash
# Find past decisions
memory-search --recent-decisions

# Today's context
memory-search --today

# Keyword + tag
memory-search "ClawHub" --tag decision

# Procedure lookup
memory-search --procedure "posting"

# Pattern detection
memory-search "token limit" --count

# Date range
memory-search "launch" --since 7d
```

#### Workflow Integration

**Updated wake routine:**

- Added `memory-search --today` for quick orientation
- Faster context assembly (<10 seconds vs 2-5 minutes)

**Daily logging:**

- Tag entries as you write (2-4 tags per entry)
- Add frontmatter to daily logs
- Update frontmatter at day end

**Heartbeat checks:**

- Memory health check (every 2-3 days)
- Active blocker detection
- Recent decision review

#### Performance

- **Find time:** 2-5 minutes → <10 seconds
- **Search speed:** <2 seconds for 100 files
- **Tag coverage target:** 70%+ of entries
- **Bash 3.2+ compatible** (macOS default bash)

#### Documentation Updates

- README.md — Added Search & Recall section
- SEARCH.md — Complete 600+ line guide
- Templates updated with tagging examples

### Changed

- Wake routine now includes `memory-search --today`
- Daily logging workflow includes tagging
- Procedure template updated with tag structure

### Impact

- **Before:** Manual grep, 2-5 min to find context, hard to detect patterns
- **After:** Semantic search, <10 sec recall, pattern detection, tag-based filtering

### Technical Notes

- File-based (no database)
- Works offline
- Grep-based with enhanced features
- Compatible with bash 3.2+ (macOS)
- Uses temp files for associative array compatibility

---

## [2.0.0] - 2026-02-03

### Added - Compaction Survival Features

**Problem:** Every compaction = context loss. Pre-compaction flush was manual, key context required re-reading files.

**Solution:** Structured pre-compaction flush system + quick context snapshots.

#### New Files

- `templates/compaction-survival.md` — Complete guide to surviving compactions
- `templates/context-snapshot-template.md` — Quick "save state" template
- `helpers/check-compaction.sh` — Token limit checker
- `INSTALLATION.md` — Step-by-step setup guide

#### Improvements

- **context-snapshot.md** — New file type for pre-compaction state capture
  - Current focus
  - Active decisions
  - Running subagents
  - Next actions
  - Recent wins & blockers
  - Notes to future-self

- **Updated wake routine** — Added post-compaction context snapshot check
- **Updated daily routine** — Added pre-compaction flush step (~160K tokens)
- **Heartbeat integration** — Token limit checks can be added to HEARTBEAT.md

#### Key Features

1. **Automatic reminder system** — Check tokens during heartbeat
2. **Structured flush checklist** — Never forget what to capture
3. **Quick re-orientation** — context-snapshot.md = <2 min to full context
4. **Reduced re-reading** — Focus on recent + relevant, not everything

#### Documentation Updates

- README.md — Added Compaction Survival section
- ARCHITECTURE.md — Added compaction routine
- SKILL.md — Updated file list

### Changed

- Daily routine now includes token monitoring
- Wake routine prioritizes context-snapshot.md for post-compaction

### Impact

- **Before:** Manual flush, 5+ min re-orientation after compaction, frequent context loss
- **After:** Structured flush, <2 min re-orientation, minimal context loss

---

## [1.0.0] - 2026-02-02

### Initial Release

#### Core Features

- 3-layer memory architecture (Working, Long-term, Feedback)
- Episodic memory (daily logs)
- Semantic memory (MEMORY.md)
- Procedural memory (procedures/)
- Feedback loops (feedback.md)

#### Templates

- ARCHITECTURE.md
- feedback.md
- procedure-template.md
- daily-template.md

#### Documentation

- README.md (full guide)
- SKILL.md (quick reference)

---

## Future Improvements (Ideas)

- [ ] Automatic token usage detection script
- [ ] Compaction frequency analytics (track how often)
- [ ] Context snapshot versioning (keep last 3)
- [ ] Procedure usage tracking (which HOWs are accessed most?)
- [ ] Integration with OpenClaw status API for automated checks

---

_This kit is actively used by Team Reflectt. Improvements come from real pain points._
