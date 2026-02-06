---
name: skill-reviewer
description: Review and audit agent skills (SKILL.md files) for quality, correctness, and effectiveness. Use when evaluating a skill before publishing, reviewing someone else's skill, scoring skill quality, identifying defects in skill content, or improving an existing skill.
metadata:
  {
    'clawdbot':
      { 'emoji': '🔍', 'requires': { 'anyBins': ['npx'] }, 'os': ['linux', 'darwin', 'win32'] },
  }
---

# Skill Reviewer

Audit agent skills (SKILL.md files) for quality, correctness, and completeness. Provides a structured review framework with scoring rubric, defect checklists, and improvement recommendations.

## When to Use

- Reviewing a skill before publishing to the registry
- Evaluating a skill you downloaded from the registry
- Auditing your own skills for quality improvements
- Comparing skills in the same category
- Deciding whether a skill is worth installing

## Review Process

### Step 1: Structural Check

Verify the skill has the required structure. Read the file and check each item:

```
STRUCTURAL CHECKLIST:
[ ] Valid YAML frontmatter (opens and closes with ---)
[ ] `name` field present and is a valid slug (lowercase, hyphenated)
[ ] `description` field present and non-empty
[ ] `metadata` field present with valid JSON
[ ] `metadata.clawdbot.emoji` is a single emoji
[ ] `metadata.clawdbot.requires.anyBins` lists real CLI tools
[ ] Title heading (# Title) immediately after frontmatter
[ ] Summary paragraph after title
[ ] "When to Use" section present
[ ] At least 3 main content sections
[ ] "Tips" section present at the end
```

### Step 2: Frontmatter Quality

#### Description field audit

The description is the most impactful field. Evaluate it against these criteria:

```
DESCRIPTION SCORING:

[2] Starts with what the skill does (active verb)
    GOOD: "Write Makefiles for any project type."
    BAD:  "This skill covers Makefiles."
    BAD:  "A comprehensive guide to Make."

[2] Includes trigger phrases ("Use when...")
    GOOD: "Use when setting up build automation, defining multi-target builds"
    BAD:  No trigger phrases at all

[2] Specific scope (mentions concrete tools, languages, or operations)
    GOOD: "SQLite/PostgreSQL/MySQL — schema design, queries, CTEs, window functions"
    BAD:  "Database stuff"

[1] Reasonable length (50-200 characters)
    TOO SHORT: "Make things" (no search surface)
    TOO LONG:  300+ characters (gets truncated)

[1] Contains searchable keywords naturally
    GOOD: "cron jobs, systemd timers, scheduling"
    BAD:  Keywords stuffed unnaturally

Score: __/8
```

#### Metadata audit

```
METADATA SCORING:

[1] emoji is relevant to the skill topic
[1] requires.anyBins lists tools the skill actually uses (not generic tools like "bash")
[1] os array is accurate (don't claim win32 if commands are Linux-only)
[1] JSON is valid (test with a JSON parser)

Score: __/4
```

### Step 3: Content Quality

#### Example density

Count code blocks and total lines:

```
EXAMPLE DENSITY:

Lines:       ___
Code blocks: ___
Ratio:       1 code block per ___ lines

TARGET: 1 code block per 8-15 lines
< 8  lines per block: possibly over-fragmented
> 20 lines per block: needs more examples
```

#### Example quality

For each code block, check:

````
EXAMPLE QUALITY CHECKLIST:

[ ] Language tag specified (```bash, ```python, etc.)
[ ] Command is syntactically correct
[ ] Output shown in comments where helpful
[ ] Uses realistic values (not foo/bar/baz)
[ ] No placeholder values left (TODO, FIXME, xxx)
[ ] Self-contained (doesn't depend on undefined variables)
    OR setup is shown/referenced
[ ] Covers the common case (not just edge cases)
````

Score each example 0-3:

- **0**: Broken or misleading
- **1**: Works but minimal (no output, no context)
- **2**: Good (correct, has output or explanation)
- **3**: Excellent (copy-pasteable, realistic, covers edge case)

#### Section organization

```
ORGANIZATION SCORING:

[2] Organized by task/scenario (not by abstract concept)
    GOOD: "## Encode and Decode" → "## Inspect Characters" → "## Convert Formats"
    BAD:  "## Theory" → "## Types" → "## Advanced"

[2] Most common operations come first
    GOOD: Basic usage → Variations → Advanced → Edge cases
    BAD:  Configuration → Theory → Finally the basic usage

[1] Sections are self-contained (can be used independently)

[1] Consistent depth (not mixing h2 with h4 randomly)

Score: __/6
```

#### Cross-platform accuracy

```
PLATFORM CHECKLIST:

[ ] macOS differences noted where relevant
    (sed -i '' vs sed -i, brew vs apt, BSD vs GNU flags)
[ ] Linux distro variations noted (apt vs yum vs pacman)
[ ] Windows compatibility addressed if os includes "win32"
[ ] Tool version assumptions stated (Docker v2 syntax, Python 3.x)
```

### Step 4: Actionability Assessment

The core question: can an agent follow these instructions to produce correct results?

```
ACTIONABILITY SCORING:

[3] Instructions are imperative ("Run X", "Create Y")
    NOT: "You might consider..." or "It's recommended to..."

[3] Steps are ordered logically (prerequisites before actions)

[2] Error cases addressed (what to do when something fails)

[2] Output/result described (how to verify it worked)

Score: __/10
```

### Step 5: Tips Section Quality

```
TIPS SCORING:

[2] 5-10 tips present

[2] Tips are non-obvious (not "read the documentation")
    GOOD: "The number one Makefile bug: spaces instead of tabs"
    BAD:  "Make sure to test your code"

[2] Tips are specific and actionable
    GOOD: "Use flock to prevent overlapping cron runs"
    BAD:  "Be careful with concurrent execution"

[1] No tips contradict the main content

[1] Tips cover gotchas/footguns specific to this topic

Score: __/8
```

## Scoring Summary

```
SKILL REVIEW SCORECARD
═══════════════════════════════════════
Skill: [name]
Reviewer: [agent/human]
Date: [date]

Category              Score    Max
─────────────────────────────────────
Structure             __       11
Description           __        8
Metadata              __        4
Example density       __        3*
Example quality       __        3*
Organization          __        6
Actionability         __       10
Tips                  __        8
─────────────────────────────────────
TOTAL                 __       53+

* Example density and quality are per-sample,
  not summed. Use the average across all examples.

RATING:
  45+  Excellent — publish-ready
  35-44 Good — minor improvements needed
  25-34 Fair — significant gaps to address
  < 25  Poor — needs major rework

VERDICT: [PUBLISH / REVISE / REWORK]
```

## Common Defects

### Critical (blocks publishing)

```
DEFECT: Invalid frontmatter
DETECT: YAML parse error, missing required fields
FIX:    Validate YAML, ensure name/description/metadata all present

DEFECT: Broken code examples
DETECT: Syntax errors, undefined variables, wrong flags
FIX:    Test every command in a clean environment

DEFECT: Wrong tool requirements
DETECT: metadata.requires lists tools not used in content, or omits tools that are used
FIX:    Grep content for command names, update requires to match

DEFECT: Misleading description
DETECT: Description promises coverage the content doesn't deliver
FIX:    Align description with actual content, or add missing content
```

### Major (should fix before publishing)

````
DEFECT: No "When to Use" section
IMPACT: Agent doesn't know when to activate the skill
FIX:    Add 4-8 bullet points describing trigger scenarios

DEFECT: Text walls without examples
DETECT: Any section > 10 lines with no code block
FIX:    Add concrete examples for every concept described

DEFECT: Examples missing language tags
DETECT: ``` without language identifier
FIX:    Add bash, python, javascript, yaml, etc. to every code fence

DEFECT: No Tips section
IMPACT: Missing the distilled expertise that makes a skill valuable
FIX:    Add 5-10 non-obvious, actionable tips

DEFECT: Abstract organization
DETECT: Sections named "Theory", "Overview", "Background", "Introduction"
FIX:    Reorganize by task/operation: what the user is trying to DO
````

### Minor (nice to fix)

```
DEFECT: Placeholder values
DETECT: foo, bar, baz, example.com, 1.2.3.4, TODO, FIXME
FIX:    Replace with realistic values (myapp, api.example.com, 192.168.1.100)

DEFECT: Inconsistent formatting
DETECT: Mixed heading levels, inconsistent code block style
FIX:    Standardize heading hierarchy and formatting

DEFECT: Missing cross-references
DETECT: Mentions tools/concepts covered by other skills without referencing them
FIX:    Add "See the X skill for more on Y" notes

DEFECT: Outdated commands
DETECT: docker-compose (v1), python (not python3), npm -g without npx alternative
FIX:    Update to current tool versions and syntax
```

## Comparative Review

When comparing skills in the same category:

```
COMPARATIVE CRITERIA:

1. Coverage breadth
   Which skill covers more use cases?

2. Example quality
   Which has more runnable, realistic examples?

3. Depth on common operations
   Which handles the 80% case better?

4. Edge case coverage
   Which addresses more gotchas and failure modes?

5. Cross-platform support
   Which works across more environments?

6. Freshness
   Which uses current tool versions and syntax?

WINNER: [skill A / skill B / tie]
REASON: [1-2 sentence justification]
```

## Quick Review Template

For a fast review when you don't need full scoring:

```markdown
## Quick Review: [skill-name]

**Structure**: [OK / Issues: ...]
**Description**: [Strong / Weak: reason]
**Examples**: [X code blocks across Y lines — density OK/low/high]
**Actionability**: [Agent can/cannot follow these instructions because...]
**Top defect**: [The single most impactful thing to fix]
**Verdict**: [PUBLISH / REVISE / REWORK]
```

## Review Workflow

### Reviewing your own skill before publishing

````bash
# 1. Validate frontmatter
head -20 skills/my-skill/SKILL.md
# Visually confirm YAML is valid

# 2. Count code blocks
grep -c '```' skills/my-skill/SKILL.md
# Divide total lines by this number for density

# 3. Check for placeholders
grep -n -i 'todo\|fixme\|xxx\|foo\|bar\|baz' skills/my-skill/SKILL.md

# 4. Check for missing language tags
grep -n '^```$' skills/my-skill/SKILL.md
# Every code fence should have a language tag — bare ``` is a defect

# 5. Verify tool requirements match content
# Extract requires from frontmatter, then grep for each tool in content

# 6. Test commands (sample 3-5 from the skill)
# Run them in a clean shell to verify they work

# 7. Run the scorecard mentally or in a file
# Target: 35+ for good, 45+ for excellent
````

### Reviewing a registry skill after installing

```bash
# Install the skill
npx molthub@latest install skill-name

# Read it
cat skills/skill-name/SKILL.md

# Run the quick review template
# If score < 25, consider uninstalling and finding an alternative
```

## Tips

- The description field accounts for more real-world impact than all other fields combined. A perfect skill with a bad description will never be found via search.
- Count code blocks as your first quality signal. Skills with fewer than 8 code blocks are almost always too abstract to be useful.
- Test 3-5 commands from the skill in a clean environment. If more than one fails, the skill wasn't tested before publishing.
- "Organized by task" vs. "organized by concept" is the single biggest structural quality differentiator. Good skills answer "how do I do X?" — bad skills explain "what is X?"
- A skill with great tips but weak examples is better than one with thorough examples but no tips. Tips encode expertise that examples alone don't convey.
- Check the `requires.anyBins` against what the skill actually uses. A common defect is listing `bash` (which everything has) instead of the actual tools like `docker`, `curl`, or `jq`.
- Short skills (< 150 lines) usually aren't worth publishing — they don't provide enough value over a quick web search. If your skill is short, it might be better as a section in a larger skill.
- The best skills are ones you'd bookmark yourself. If you wouldn't use it, don't publish it.
