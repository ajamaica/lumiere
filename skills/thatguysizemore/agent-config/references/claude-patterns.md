# Claude Instruction Patterns

What formats actually work when writing instructions for Claude models. Based on real-world patterns from OpenClaw agents, Anthropic documentation, and multi-agent coordination research.

## Core Principle: Claude Is Already Smart

**Default assumption:** Claude doesn't need explanation of basic concepts. It needs:
- Specific procedures for THIS context
- Constraints it wouldn't guess
- Examples to anchor expected behavior
- Motivation to prioritize your rules over its defaults

**Token efficiency matters.** Every line in your context files competes with conversation history, tool responses, and other skills. Challenge each instruction: "Does Claude really need this?"

## What Works: Instruction Format Hierarchy

### 1. Numbered Processes (MOST EFFECTIVE)

Claude follows numbered sequences reliably. Use for multi-step workflows.

**Example (good):**
```markdown
## Startup (Every Session)

1. Read `IDENTITY.md` (READ FIRST), `SOUL.md`, `USER.md`
2. Read today + yesterday from `/Users/macmini/Sizemore/agent/daily/`
3. If MAIN: vault README, recent decisions, `shared/people/josh.md`
4. If FAMILY GROUP: read `FAMILY.md`
5. If `BOOTSTRAP.md` exists: follow, delete
```

**Why it works:**
- Clear order of operations
- Conditional branching explicit
- No ambiguity about sequence
- Easy to verify compliance

### 2. Tables (EFFECTIVE for decisions/routing)

Use tables for decision trees, model selection, routing rules.

**Example (good):**
```markdown
| Task | Label | Model | Why |
|------|-------|-------|-----|
| Web research | `scout` | sonnet | Browsing burns tokens |
| Coding | `dev` | sonnet/codex | Self-validates |
| Bulk file ops | `file-ops` | kimi | Cheap grunt work |
```

**Why it works:**
- Claude parses tables extremely well
- Quick lookup during execution
- Pattern recognition across rows
- Includes reasoning (WHY column)

### 3. Contrast Examples (EFFECTIVE for behavior)

Before/after, good/bad, ❌/✅ examples anchor Claude's behavior strongly.

**Example (good):**
```markdown
**Given a task:**
- ❌ "I'll help you with that right away!"
- ✅ "yeah yeah, on it" / "fine" / "ugh okay"

**Finishing:**
- ❌ "Task completed successfully!"
- ✅ "done" / "there ya go" / "done. you're welcome 🦞"
```

**Why it works:**
- Claude pays VERY close attention to examples
- Contrast format makes expected behavior unambiguous
- Multiple ✅ options show acceptable variation range
- Can't misinterpret when you show both sides

### 4. Forbidden Lists (EFFECTIVE for constraints)

Explicit anti-patterns with examples prevent common mistakes.

**Example (good):**
```markdown
**NEVER NARRATE INTERNAL PROCESS:**

Forbidden openers:
- "Let me check..." / "I'll check..." / "I'm checking..."
- "Looking at..." / "I can see..." / "I notice..."
- "Based on..." / "After reviewing..." / "I've searched..."

**If you're doing work: DO NOT ANNOUNCE IT. Just do it and report results.**
```

**Why it works:**
- Explicit list of forbidden phrases catches Claude's pattern matching
- Capital emphasis signals importance
- Behavioral rule follows immediately after examples
- Explains the meta-principle, not just the instances

### 5. Conditional Rules (EFFECTIVE for context-awareness)

If/then patterns for context-dependent behavior.

**Example (good):**
```markdown
**External vs Internal:**
- **Do freely:** Read, explore, organize, search web, check calendar/email
- **Ask first:** Send email, tweet, post, anything leaving the machine
```

**Why it works:**
- Clear boundary between categories
- Bold labels for quick scanning
- Both sides of the rule explicit
- No guessing needed

### 6. Bullets with Bold Keywords (MODERATE effectiveness)

Acceptable for lists, but less reliable than numbered processes.

**Example (acceptable):**
```markdown
## Principles

**Resourceful first.** Try before asking. Safe/local → do it. External/risky → confirm.
**Delegate automatically.** Spawn subagents for most tasks.
**Assume competence.** Josh is smart. Don't over-explain.
```

**Why it's moderate:**
- Good for principles (unordered)
- Less reliable for procedures (use numbers instead)
- Bold keyword helps Claude extract key concept
- Brief explanations provide context

### 7. Prose Paragraphs (LEAST EFFECTIVE)

Use sparingly. Claude tends to skim long prose, especially buried in context.

**Example (avoid):**
```markdown
When you receive a message, you should first think about what the user wants, 
then consider whether this is something you can handle yourself or something 
that should be delegated. If it's a complex task, you might want to break it 
down into smaller pieces. Make sure to communicate your progress and be 
helpful throughout the process.
```

**Why it fails:**
- Vague ("think about", "consider", "might want")
- No concrete actions
- No examples to anchor behavior
- Easy to skim past

## Motivation > Bare Commands

Claude follows rules better when it understands WHY they exist.

### Without motivation (weak):
```markdown
- Spawn subagents for 2+ tool calls
```

### With motivation (strong):
```markdown
**You are on Opus ($5/$25 per 1M tokens). Every tool call you make costs 5-8x what a subagent would.**

### The Rule (no exceptions)
- **2+ tool calls?** SPAWN. Every time. No "it's faster if I just..." SPAWN.

### Cost Math (remind yourself)
- You doing 3 tool calls on Opus: ~$0.05-0.15
- Subagent doing same 3 calls on Kimi: ~$0.005-0.01
- **That's 10-15x savings per delegation**
```

**Why motivation works:**
- Claude understands the GOAL, not just the rule
- Can apply principle to edge cases
- Concrete numbers make abstract concepts real
- Multiple angles (rule + math) reinforce same point

## Examples Anchor Behavior

Claude pays very close attention to examples. One good example is worth 10 lines of explanation.

### Pattern: Show the actual format you want

**Vague:**
```markdown
Log events to daily files with timestamps and tags.
```

**Concrete:**
```markdown
### Daily Log Format
```markdown
## HH:MM - Topic [C/H/N/L]
- What/why/follow-up
```

Example:
```markdown
## 14:30 - Josh's email question [C]
- Clarified Church Circles subscription issue
- Sent fix instructions, waiting on confirmation
```
```

**Why examples work:**
- Claude can pattern-match exactly
- No interpretation needed
- Format errors caught immediately
- Easy to verify compliance

### Pattern: Few-shot examples for complex behavior

For complex behaviors, show 2-3 examples covering different cases.

**Example (conversation examples in IDENTITY.md):**
```markdown
## Conversations (The Feel)

**Simple:**
```
Josh: check if the server's up
Gus: checking... yeah it's alive. 340ms response tho, kinda sluggish
```

**Multi-step:**
```
Josh: find when alice is free, set up meeting
Gus: on it
Gus: alice free 2-4pm tomorrow. sent invite. she better show up this time 🦞
```

**Breaks:**
```
Josh: deploy failed
Gus: of course it did. looking... yeah nil pointer line 47. want me to fix it or just roast them?
```
```

**Why few-shot works:**
- Shows expected behavior in realistic contexts
- Covers different situations (simple, multi-step, problems)
- Tone is demonstrated, not described
- Claude can interpolate between examples

## Anti-Patterns to Avoid

### ❌ Duplication Across Files

**Problem:** Same instruction in multiple files (e.g., safety rules in both AGENTS.md and SOUL.md)

**Why it fails:**
- Wastes context window tokens
- Rules can diverge (one updated, one stale)
- Confusing which is authoritative
- Maintenance burden

**Fix:** Each rule lives in ONE file. Cross-reference if needed.

### ❌ Vague Instructions

**Problem:** Instructions that sound helpful but provide no concrete action.

**Examples of vague:**
```
- Be helpful and friendly
- Use good judgment
- Handle errors appropriately
- Communicate effectively
```

**Why they fail:**
- Claude already knows these generically
- No specific behavior to follow
- Can't verify compliance
- Just takes up tokens

**Fix:** Be specific about the behavior you want, with examples.

### ❌ Missing Examples for Complex Rules

**Problem:** Complex behavioral rules without concrete examples.

**Example (bad):**
```markdown
Match the user's energy level in your responses.
```

**Example (good):**
```markdown
## Mirroring

Match energy. Short msg → short reply. Lowercase → lowercase fine. Busy → concise. Chatty → expand.
```

**Why examples matter:**
- "Match energy" is interpretable many ways
- Concrete patterns (short→short) are unambiguous
- Claude can pattern-match

### ❌ Reference Docs That Get Ignored

**Problem:** Linking to external docs that Claude doesn't actually read.

**Example (bad):**
```markdown
For API details, see api-documentation.md
```

**Why it fails:**
- Claude may not read the file unless forced
- No indication of WHEN to read it
- No keywords to trigger loading

**Fix:** Either embed critical info, make it a skill (auto-triggers), or give explicit read conditions.

**Example (good):**
```markdown
**Before making API calls:** Read `references/api-patterns.md` for rate limits and error handling.
```

### ❌ Bloated Context Files

**Problem:** Files approaching 20K char limit with redundant or low-value content.

**Symptoms:**
- Repeated explanations of same concept
- Historical notes that aren't operationally relevant
- Long examples where short ones would work
- Embedding full documentation instead of linking

**Fix:** 
- Audit for duplication
- Move reference material to skills (auto-load when needed)
- Move templates to `~/clawd/templates/`
- Move historical decisions to vault

### ❌ Wrong File Location

**Problem:** Operational rules in personality files, personality in operational files.

**Examples:**
- Safety rules in SOUL.md (should be AGENTS.md - subagents need them)
- Delegation rules in TOOLS.md (should be AGENTS.md)
- Detailed tone examples in IDENTITY.md (should be SOUL.md)

**Why it fails:**
- Subagents only see AGENTS.md + TOOLS.md
- Critical rules in wrong file = not followed in some contexts
- File purpose becomes confusing

**Fix:** Use file-map.md decision tree to place content correctly.

### ❌ No Motivation

**Problem:** Rules without explaining WHY they exist.

**Example (weak):**
```markdown
Always prefer `trash` over `rm`.
```

**Example (strong):**
```markdown
Prefer `trash` > `rm` (recoverable vs permanent deletion - safety net for accidents)
```

**Why motivation helps:**
- Claude can apply principle to similar situations
- Understands priority/importance
- Less likely to skip "arbitrary" seeming rules

### ❌ Format Mismatch

**Problem:** Using wrong format for content type.

**Mismatches:**
- Prose for procedures (use numbered lists)
- Bullets for decision trees (use tables)
- Long paragraphs for tone examples (use ❌/✅ contrasts)
- Tables for principles (use bold keyword bullets)

**Fix:** Match format to content type (see format hierarchy above).

## Rules That Stick vs Rules That Get Skipped

### Rules that stick:
1. **Numbered, specific, with examples**
2. **High in the file** (Claude pays more attention to early content)
3. **Reinforced multiple ways** (rule + motivation + example)
4. **In the right file** (where Claude will actually see them)
5. **Contrast format** (❌/✅ makes expected behavior crystal clear)
6. **Short and scannable** (Claude skims long prose)

### Rules that get skipped:
1. **Vague and buried** ("be thoughtful about X")
2. **Deep in long prose paragraphs**
3. **In wrong file** (personality rule in file subagents don't see)
4. **No examples** (abstract rule without concrete demonstration)
5. **No motivation** (seems arbitrary, easy to override)
6. **Referenced but not loaded** (link to file Claude doesn't open)

## Specific Claude Model Considerations

### Opus
- Very capable but expensive
- May over-think simple tasks
- Tendency toward verbosity without constraints
- Needs explicit terse/concise instructions

**Compensation:**
```markdown
**⚠️ OPUS:** You default to verbose. Push for concise. If it could be one sentence, make it one sentence.
```

### Sonnet
- Good balance of capability and cost
- May drift toward generic helpful tone
- Needs personality reinforcement

**Compensation:**
```markdown
**⚠️ SONNET:** You default to dry/helpful. Push HARDER. Wit/sarcasm aren't optional.
```

### Haiku/Fast Models
- Follows instructions well but less nuanced
- May miss complex conditionals
- Better with simple, explicit rules

**Compensation:**
- Keep rules simple
- Reduce conditionals
- Explicit if/then rather than implied

## Writing Effective Instructions: Checklist

Before adding an instruction to a context file:

### Content
- [ ] Is this something Claude doesn't already know?
- [ ] Is it specific to THIS agent/context?
- [ ] Does it have a concrete action (not just "be good at X")?
- [ ] Is there an example showing expected behavior?
- [ ] Is motivation/WHY included?

### Placement
- [ ] Is it in the right file (per file-map.md)?
- [ ] Will the audience that needs it (main/subagent) see it?
- [ ] Is it near the top of its section (visibility)?
- [ ] Does it duplicate content elsewhere?

### Format
- [ ] Is the format appropriate for the content type?
- [ ] Is it scannable (not buried in prose)?
- [ ] Are examples in ❌/✅ contrast format where applicable?
- [ ] Are multi-step procedures numbered?

### Size
- [ ] How many chars does this add?
- [ ] Is the file still under 18K chars?
- [ ] Could this be a reference file instead?
- [ ] Could existing content be updated instead of adding new?

## Summary: The Perfect Instruction

A perfectly written instruction for Claude context files has:

1. **Clear action** - Specific behavior, not vague aspiration
2. **Right format** - Numbered for procedures, tables for decisions, contrasts for behavior
3. **Concrete example** - Shows exactly what's expected
4. **Motivation** - Explains WHY (Claude follows better when it understands the goal)
5. **Right location** - In the file where it'll be seen by relevant context (main/subagent)
6. **Appropriate length** - As short as possible while remaining complete
7. **Scannable structure** - Bold keywords, clear sections, not buried in prose

**Template:**
```markdown
## Section Name

**MOTIVATION (why this matters):**
One sentence explaining the goal/constraint.

**THE RULE:**
1. Specific step one
2. Specific step two
3. Specific step three

**Examples:**
- ❌ Bad: "Description of what not to do"
- ✅ Good: "Description of what to do instead"

**Reference:** For details, see `references/detailed-guide.md`
```

This pattern combines motivation, numbered process, contrast examples, and progressive disclosure to external reference. Claude can follow this reliably.
