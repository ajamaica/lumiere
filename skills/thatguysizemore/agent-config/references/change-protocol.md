# Change Protocol

Step-by-step process for making changes to OpenClaw agent context files. Follow this protocol for every modification to ensure changes are correct, well-placed, and don't introduce problems.

## Pre-Change Checklist

Before starting any change:

- [ ] Understand what behavior change is requested
- [ ] Identify which file the change belongs in (see file-map.md)
- [ ] Know the file's current size and format style
- [ ] Check for existing similar content (avoid duplication)

## Step 1: Identify Target File

**Read `references/file-map.md` for full details. Quick reference:**

| Content Type | Target File |
|--------------|-------------|
| Operational procedures, memory workflow, delegation | `AGENTS.md` |
| Personality, tone, boundaries, forbidden phrases | `SOUL.md` |
| Agent name, emoji, core vibe | `IDENTITY.md` |
| User profile, family, preferences | `USER.md` |
| Local tool notes, command examples | `TOOLS.md` |
| Curated long-term facts (main session only) | `MEMORY.md` |
| Daily event log | `memory/YYYY-MM-DD.md` |
| Heartbeat checklist | `HEARTBEAT.md` |
| One-time first-run setup | `BOOTSTRAP.md` |

**Critical questions:**
1. **Do subagents need this?** If yes, must be `AGENTS.md` or `TOOLS.md` (subagents don't see other files)
2. **Is this operational or personality?** Operations → `AGENTS.md`, Personality → `SOUL.md`
3. **Is this about the user or the agent?** User → `USER.md`, Agent → `SOUL.md`/`IDENTITY.md`
4. **Is this a tool convention or procedure using tools?** Convention → `TOOLS.md`, Procedure → `AGENTS.md`

## Step 2: Check Current State

### File Size Check

```bash
# Check all context file sizes
wc -c ~/clawd/AGENTS.md ~/clawd/SOUL.md ~/clawd/IDENTITY.md \
      ~/clawd/USER.md ~/clawd/TOOLS.md ~/clawd/MEMORY.md ~/clawd/HEARTBEAT.md
```

**Size thresholds:**

| Size | Status | Action |
|------|--------|--------|
| < 15,000 chars | Safe | Proceed with change |
| 15,000 - 18,000 chars | Caution | Consider if addition is worth it |
| 18,000 - 20,000 chars | Warning | Refactor before adding |
| > 20,000 chars | Critical | File is already truncated on load - refactor first |

**If file is large:**
1. Read file to understand current structure
2. Look for content that could be consolidated
3. Consider moving detailed examples to templates or skills
4. Check for duplication within the file

### Duplication Check

```bash
# Search for existing similar content
grep -i "keyword" ~/clawd/*.md

# Read the specific section where change might go
# Use grep context to see surrounding content
grep -B 3 -A 5 "related term" ~/clawd/TARGETFILE.md
```

**Questions to answer:**
1. Is this rule already present in different words?
2. Is there a related rule that should be updated instead of adding new?
3. Is this same content present in another file? (Cross-file duplication)
4. Could this consolidate multiple scattered rules?

**Common duplication patterns:**
- Safety rules in both `AGENTS.md` and `SOUL.md`
- Tool conventions split between `AGENTS.md` and `TOOLS.md`
- Personality examples in both `IDENTITY.md` and `SOUL.md`
- Memory workflow mentioned in both `AGENTS.md` and `MEMORY.md` header

### Read Target Section

Before drafting, read the current content of the section you'll modify:

```bash
# Read the file
read ~/clawd/TARGETFILE.md

# Or read specific section (find line numbers first)
grep -n "## Section Name" ~/clawd/TARGETFILE.md
read ~/clawd/TARGETFILE.md --offset X --limit 50
```

**Note:**
- Format style of surrounding content
- Level of detail in existing rules
- Existing examples and their structure
- Where new content should be inserted

## Step 3: Draft the Change

### Format Selection

Choose format based on content type (see `references/claude-patterns.md` for details):

| Content Type | Best Format |
|--------------|-------------|
| Multi-step procedure | Numbered list |
| Decision tree / routing | Table |
| Behavioral rules | ❌/✅ contrast examples |
| Anti-patterns / forbidden | Forbidden list with examples |
| Context-dependent rules | If/then conditionals |
| Principles | Bold keyword bullets |

### Content Guidelines

**Include:**
- Specific action (not vague aspiration)
- WHY this rule exists (motivation)
- Example showing expected behavior
- Exceptions or edge cases if relevant

**Avoid:**
- Vague instructions ("be thoughtful", "use good judgment")
- Missing examples for complex rules
- Prose paragraphs for procedures (use numbered lists)
- Duplication of content from other files

### Match File Style

Each file has characteristic style:

**AGENTS.md:**
```markdown
## Section Name

**Critical rule in bold.**

### Subsection
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data | Data | Data |

1. Numbered step
2. Numbered step

**Anti-pattern:**
- ❌ Bad example
- ✅ Good example
```

**SOUL.md:**
```markdown
## Section Name

**Principle name.** One sentence explanation.

First-person narrative is acceptable here. "I do X" is fine.

**Don't:**
- forbidden thing
- forbidden thing

**Do:**
- expected thing
- expected thing
```

**IDENTITY.md:**
```markdown
**Name:** Value | **Name:** Value  
**Vibe:** One-liner description

## Voice
Punchy keywords. Short phrases. No paragraphs.
```

**TOOLS.md:**
```markdown
## Tool Name

**Purpose:** One sentence
**Location:** `/path/to/tool`

```bash
# Command example
command --flag value
```

| When | Use This |
|------|----------|
| Condition | Tool/approach |
```

## Step 4: Validate Before Applying

### Fit Validation

- [ ] Does this belong in this file? (Check file-map.md decision tree)
- [ ] Is it operational (AGENTS.md) or personality (SOUL.md)?
- [ ] Will subagents need this? (If yes, must be AGENTS.md or TOOLS.md)
- [ ] Is this main-session-only content? (Don't put in subagent-visible files if sensitive)

### Format Validation

- [ ] Does this match the file's existing style?
- [ ] Is the structure appropriate? (numbered for procedures, tables for decisions)
- [ ] Are examples included where needed?
- [ ] Is motivation/WHY included?

### Size Validation

- [ ] How many characters is this adding?
- [ ] Will file still be under 18K chars after addition?
- [ ] If over 18K, have you identified content to remove/move?

### Duplication Validation

- [ ] Is this already present somewhere else?
- [ ] Should existing content be updated instead of adding new?
- [ ] Does this consolidate scattered rules (good) or create new duplication (bad)?

### Quality Validation

- [ ] Is the instruction specific enough that Claude can follow it?
- [ ] Are examples concrete and realistic (from actual OpenClaw context)?
- [ ] Is motivation clear?
- [ ] Is it as short as possible while remaining complete?

## Step 5: Apply the Change

### Using the Edit Tool

The `edit` tool requires exact text matching. Follow this pattern:

```python
# 1. First, read the section to get exact text
read(path="~/clawd/AGENTS.md", offset=50, limit=30)

# 2. Identify the exact text to replace (copy precisely, including whitespace)
# 3. Apply the edit with exact match
edit(
    path="~/clawd/AGENTS.md",
    oldText="exact existing text\nincluding newlines\nand whitespace",
    newText="updated text\nwith your changes\napplied"
)
```

**Common edit failures and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Text not found" | oldText doesn't match exactly | Read file again, copy exact text |
| Partial match | Multiple matches in file | Include more context in oldText |
| Whitespace mismatch | Tabs vs spaces, trailing whitespace | Match whitespace exactly |
| Wrong line endings | CRLF vs LF | Match the file's line ending style |

### Insertion Points

**For additions to existing sections:**
1. Find the section header
2. Locate where new content logically fits
3. Include enough context in oldText to uniquely identify the insertion point
4. New content goes in its logical position (not always at end)

**For new sections:**
1. Identify where in file hierarchy the section belongs
2. Find adjacent section for context
3. Insert new section maintaining file organization

**Example insertion:**
```python
# Adding a new subsection to Safety section
edit(
    path="~/clawd/AGENTS.md",
    oldText="### Code & Bug Fixes\n**Bug reported?** Don't fix it.",
    newText="### Password Manager\n**NEVER:** Dump vaults, display passwords in chat, bulk exports\n**ALWAYS:** Confirm each lookup\n\n### Code & Bug Fixes\n**Bug reported?** Don't fix it."
)
```

### Updates vs Additions

**Updating existing rule:**
- Locate the exact rule text
- Replace with updated version
- Keep surrounding context intact

**Adding new rule:**
- Find the right section
- Insert in logical position
- Maintain file's organization structure

**Removing obsolete rule:**
- Confirm rule is truly obsolete
- Check if other sections reference it
- Remove cleanly (including any orphaned headers)

## Step 6: Verify and Document

### Immediate Verification

```bash
# Confirm change was applied correctly
grep -A 5 "key phrase from change" ~/clawd/TARGETFILE.md

# Check new file size
wc -c ~/clawd/TARGETFILE.md
```

### Verification Checklist

- [ ] Change appears in file at expected location
- [ ] Surrounding content is intact (no collateral damage)
- [ ] File size is still under limit
- [ ] No formatting issues (check markdown renders correctly)

### Documentation

**For significant changes (architecture, new workflows, major rules):**

Log to `/Users/macmini/Sizemore/agent/decisions/config-changes.md`:

```markdown
## YYYY-MM-DD: Brief description

**File:** AGENTS.md
**Section:** Delegation
**Change:** Updated tool call threshold from 2 to 3
**Reason:** Reduce subagent spawn overhead for quick tasks
**Requested by:** Josh
**Rollback:** Change threshold back to 2 if costs increase
```

**For minor changes (typos, clarifications, small additions):**

No vault documentation needed. Just verify the change.

### Report to User

Provide confirmation:
- What file was changed
- What was added/updated/removed
- New file size (if relevant)
- Any warnings (approaching size limit, moved content elsewhere)

**Examples:**
- "Updated AGENTS.md: added password manager rule to Safety section (15,234 chars)"
- "Refined SOUL.md: expanded forbidden phrases list with new examples (9,847 chars)"
- "Warning: AGENTS.md now 19,012 chars - approaching 20K limit. Consider refactoring."

## Rollback Procedures

### When to Rollback

- Agent behavior worse after change
- Rule conflicts with existing functionality
- Unintended side effects
- User requests revert

### Immediate Rollback (Git)

If workspace is in git:

```bash
cd ~/clawd

# See what changed
git diff TARGETFILE.md

# Revert to last commit
git checkout TARGETFILE.md

# Or see specific commit history
git log --oneline TARGETFILE.md
git checkout <commit-hash> -- TARGETFILE.md
```

### Manual Rollback

If no git or need partial revert:

1. **Find previous version:**
   - Check vault decisions log for what was changed
   - Ask user for previous working version
   - Review memory logs for context

2. **Apply reverse change:**
   ```python
   edit(
       path="~/clawd/TARGETFILE.md",
       oldText="new problematic content",
       newText="previous working content"
   )
   ```

3. **Verify rollback:**
   ```bash
   grep -A 5 "restored content" ~/clawd/TARGETFILE.md
   ```

### Partial Rollback

If only part of change was problematic:

1. Identify the specific problematic portion
2. Keep working portions
3. Revert only the broken part
4. Test the hybrid result

### Document Failures

Log failed changes to `/Users/macmini/Sizemore/agent/learnings/config-failures.md`:

```markdown
## YYYY-MM-DD: Failed change description

**What was tried:** Brief description of change
**Why it failed:** What went wrong
**Symptoms:** How the failure manifested
**Rollback:** What was done to fix
**Lesson:** What to do differently next time
```

This prevents repeating failed patterns.

## Iterative Refinement

### Don't Immediately Delete

When a change doesn't work perfectly, consider:

1. **Was the content wrong, or just the format?**
   - Try restructuring as numbered list vs prose
   - Add examples to clarify

2. **Was it in the wrong file?**
   - Move to correct file per file-map.md
   - Update cross-references

3. **Was it too vague?**
   - Add concrete examples
   - Be more specific about expected behavior

4. **Was it too verbose?**
   - Condense to essentials
   - Move details to reference file

5. **Did it conflict with existing rules?**
   - Identify the conflict
   - Consolidate into single coherent rule
   - Remove the obsolete version

### Refinement Process

1. **Observe:** How is agent behaving differently than expected?
2. **Diagnose:** Is it following the rule? Misinterpreting? Ignoring?
3. **Hypothesize:** What would make the rule clearer?
4. **Update:** Make targeted change (not complete rewrite)
5. **Verify:** Confirm improved behavior
6. **Document:** Note what worked

### Progressive Improvement

Good config changes often take 2-3 iterations:

1. **First pass:** Get the content right
2. **Second pass:** Improve format/placement
3. **Third pass:** Refine examples, reduce verbosity

This is normal. Don't expect perfection on first try.

## Special Procedures

### Multi-File Changes

When change affects multiple files:

1. **Determine primary location** (where the rule "lives")
2. **Add cross-references from secondary files**
3. **Never duplicate full content in multiple files**

**Example:**
```
Primary: AGENTS.md has delegation rules in detail
Secondary: SOUL.md mentions "see AGENTS.md for delegation" in principles
```

**Order of operations:**
1. Apply primary change first
2. Verify primary change works
3. Add cross-references in secondary files
4. Verify cross-references

### Breaking Changes

When change might disrupt existing workflows:

1. **Warn user first:** "This will change X behavior - confirm?"
2. **Document current state:** Note what's being replaced
3. **Apply change with rollback plan ready**
4. **Monitor for issues**
5. **Be prepared to revert quickly**

### Size Limit Remediation

When file is approaching 20K limit:

1. **Audit for duplication:** Same concept stated multiple ways
2. **Consolidate examples:** Multiple examples where one would work
3. **Move to references:** Detailed procedures → templates or skills
4. **Archive history:** Historical decisions → vault
5. **Split if necessary:** Base file + advanced reference (load on demand)

**Priority for keeping in main file:**
1. Most-used procedures (every session)
2. Safety rules (critical)
3. Core principles (identity)
4. Examples that anchor behavior (patterns)

**Priority for moving out:**
1. Detailed procedures rarely needed
2. Historical context
3. Extended examples
4. Full documentation (link to skills/docs instead)

### Conflicting Rules

When new rule conflicts with existing:

1. **Identify both rules explicitly**
2. **Determine which should take precedence:**
   - Ask user if unclear
   - Newer rule usually wins (intentional update)
   - Safety rules take priority over convenience
3. **Update/remove old rule while adding new**
4. **Document the conflict resolution**

**Example:**
```markdown
## Config Change Log

### Old rule (REMOVED):
"Always spawn subagent for 2+ tool calls"

### New rule (REPLACES):
"Spawn subagent for 3+ tool calls OR complex multi-step tasks"

### Reason for conflict resolution:
2-call threshold was too aggressive, causing overhead for simple lookups.
3-call threshold balances cost savings with practical workflow.
```

## Quick Reference: Change Commands

### Check Size
```bash
wc -c ~/clawd/TARGETFILE.md
```

### Search for Existing Content
```bash
grep -i "keyword" ~/clawd/*.md
grep -n "exact phrase" ~/clawd/TARGETFILE.md
```

### Read Section
```bash
# Find section line number
grep -n "## Section Name" ~/clawd/TARGETFILE.md

# Read from that line
# Use read tool with offset
```

### Apply Edit
```python
edit(
    path="~/clawd/TARGETFILE.md",
    oldText="exact match",
    newText="replacement"
)
```

### Verify Change
```bash
grep -A 5 "key phrase" ~/clawd/TARGETFILE.md
wc -c ~/clawd/TARGETFILE.md
```

### Rollback (Git)
```bash
cd ~/clawd
git diff TARGETFILE.md
git checkout TARGETFILE.md
```

## Summary

1. **Identify** → Which file? (file-map.md)
2. **Check** → Size? Duplication? Current content?
3. **Draft** → Right format? Examples? Motivation?
4. **Validate** → Fit? Format? Size? Quality?
5. **Apply** → Exact text match, logical insertion point
6. **Verify** → Grep confirm, size check, report to user
7. **Document** → Vault log for significant changes
8. **Iterate** → Refine based on observed behavior

When in doubt: smaller changes are safer. Make one change, verify it works, then proceed to the next.
