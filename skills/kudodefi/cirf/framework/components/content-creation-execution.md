# CONTENT CREATION EXECUTION

> **Component** | Specific to create-content workflow
> Execution sequence for content creation workflow.
> Referenced by `workflow.yaml` via `directive.execution`

---

> **EXECUTE AFTER INITIALIZATION COMPLETES**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if validation fails
> - Return to previous step if gaps identified

---

## STEP 1: SOURCE SELECTION

> **MANDATORY** - This workflow REQUIRES source files as input.
> Cannot proceed without selecting source material.

**Purpose:** Select and load source research from workspace as input for content creation.

### 1.1 Scan Available Sources

- Scan outputs: `./workspaces/{workspace_id}/outputs/*/*.md`
- Scan documents: `./workspaces/{workspace_id}/documents/*`
- Filter: Exclude current workflow outputs (avoid recursion)
- Sort: By modification time (newest first)

### 1.2 Present Sources

Display outputs and documents separately, sorted by time (newest first):

```
Select source research for content creation:

OUTPUTS (previous workflow results):
1. {filename} ({workflow_type}, {date}, {word_count} words)
2. {filename} ({workflow_type}, {date}, {word_count} words)
3. {filename} ({workflow_type}, {date}, {word_count} words)
...

DOCUMENTS (user-provided materials):
4. {filename} ({file_type}, uploaded {date})
5. {filename} ({file_type}, uploaded {date})
...

Select source(s) (e.g., '1' or '1 3'): ___
```

### 1.3 Handle Selection

- If user enters valid numbers: Proceed to load
- If user presses Enter/skip: **STOP** - Source required. Cannot proceed without source material.
- If invalid: Retry once, then ask again

### 1.4 Load Selected Sources

- Read all selected files
- Verify files readable and non-empty
- Confirm loaded:

```
Sources loaded:
- {filename1} ({word_count1} words)
- {filename2} ({word_count2} words)

Proceeding to scope clarification...
```

---

## STEP 2: SCOPE CLARIFICATION

**RECALL & APPLY GUIDE:** `{scope-clarification}`

**Purpose:** Assess source material and determine requirements for successful content creation.

**Actions:**

1. Review source material and available context
2. Read MISSION and OBJECTIVES from objectives.md
3. Read TEMPLATE structure from selected template(s)
4. Identify key insights available for extraction
5. Determine gaps that need clarification with user
6. Gather complete requirements before proceeding

**Key Principles:**

- Source material determines what insights are available
- Template structure determines required output format
- Clarify target audience if not explicitly stated

---

## STEP 3: CONTENT DIRECTION ESTABLISHMENT

> **MANDATORY** - Must establish direction BEFORE creating content.
> Present proposal and wait for user confirmation.

**Purpose:** Define content strategy based on source analysis before execution begins.

### 3.1 Analyze Source & Propose Direction

Based on source material analysis, propose content direction:

```
CONTENT DIRECTION PROPOSAL:

1. CORE MESSAGE:
   "{ONE thing audience must understand}"

2. TARGET AUDIENCE:
   • Who: {specific audience}
   • Knowledge level: {beginner | intermediate | expert}
   • What they need: {specific needs}

3. NARRATIVE ANGLE:
   {Educational | Contrarian | Analysis | Story}
   Rationale: {why this angle fits the source material}

4. VALUE PROMISE:
   "{specific value audience will gain from this content}"

───────────────────────────────────────────────────
Confirm this direction? (Y/modify/N): ___
```

### 3.2 Handle Response

- If Y/yes/confirm → proceed to content creation
- If modify → adjust based on user feedback, re-confirm
- If N/no → ask user for their preferred direction

### 3.3 Lock Direction

Display:

```
Content direction confirmed. Proceeding to approach selection...
```

---

## STEP 4: APPROACH SELECTION

**Purpose:** User MUST select execution approach before content creation begins.

**Present options:**

- **1: AUTONOMOUS** - Independent execution, faster
- **2: COLLABORATIVE** - Validation checkpoints, interactive

Wait for user selection. **MANDATORY** - do not proceed without choice.

### AUTONOMOUS PATH

You have full autonomy to determine the optimal approach to achieve the mission and objectives. Execute independently without interruption. Choose content structure, narrative flow, and creative decisions. The success criteria define WHAT to achieve - HOW you achieve it is your decision.

### COLLABORATIVE PATH

Execute with user validation at key milestones. Maintain autonomy between checkpoints, present draft sections for direction validation.

**RECALL & APPLY GUIDE:** `{collaborative-research}`

---

## STEP 5: CONTENT CREATION

**RECALL & APPLY GUIDE:** `{content-style}`

**Purpose:** Transform source research into platform-optimized content following confirmed direction and template structure.

**Actions:**

1. Apply content-style guide transformation process
2. Execute following confirmed content direction
3. Achieve all OBJECTIVES from objectives.md
4. Follow TEMPLATE structure from selected template(s)
5. Apply platform-specific optimization
6. Map insights to template sections as you progress

### 4.1 Transformation Process

| Stage          | Action                          | Output                          |
| -------------- | ------------------------------- | ------------------------------- |
| **Extract**    | Identify key facts from source  | Data points, statistics, events |
| **Synthesize** | Connect facts to form patterns  | Trends, relationships, context  |
| **Interpret**  | Determine what patterns mean    | Analysis, implications          |
| **Deliver**    | Present insights audiences need | Actionable understanding        |

### 4.2 Platform-Specific Creation

For each selected template:

- Follow template structure exactly
- Apply platform-specific transformation (see content-style guide)
- Craft hook following content-style patterns
- Include CTA per template guidelines
- Respect output_type constraints

### 4.3 Output Type Constraints

| Template       | brief       | standard     | comprehensive |
| -------------- | ----------- | ------------ | ------------- |
| blog-article   | ~1-3k words | ~3-6k words  | ~10-15k words |
| x-thread       | ~5-8 tweets | ~8-12 tweets | ~12-18 tweets |
| tiktok-script  | ~30s        | ~1-2min      | ~2-3min       |
| youtube-script | ~5-10min    | ~10-20min    | ~20-30min     |

> Variance of ±30% is acceptable.

**Key Principles:**

- Focus on WHAT (objectives), maintain autonomy on HOW (methods)
- Core message must be clear throughout all content
- Every claim must be traceable to source research
- Ensure output aligns with template structure

---

## STEP 6: VALIDATION

**Purpose:** Validate completed content before delivery.

**Complete checklist:**

_Mission & Objectives:_

- [ ] Mission accomplished per objectives.md
- [ ] All objectives achieved per objectives.md

_Content Quality:_

- [ ] Core message clear and memorable (can state in one sentence)
- [ ] Hook captures attention (testable: would stop scroll/reading?)
- [ ] All claims traceable to source research (integrity maintained)

_Platform Optimization:_

- [ ] Meets platform constraints (character limits, duration, structure)
- [ ] Output within ±30% of output_type specification
- [ ] Engagement mechanics embedded (hooks, CTAs, value delivery)

_Style Compliance:_

- [ ] Guide `{content-style}` applied throughout
- [ ] Template structure followed correctly
- [ ] Language matches `{language_output}` with `{language_terminology}`
- [ ] No hype language, balanced perspective maintained

_Workflow-Specific:_

- [ ] VALIDATION CRITERIA checklist from objectives.md completed

**If fails:** Return to STEP 5 to address gaps.
**If passes:** Proceed to STEP 7.

---

## STEP 7: DELIVERY OUTPUT

**Purpose:** Generate and deliver final content outputs.

**Actions:**

1. Generate outputs per DELIVERABLES in objectives.md
2. Write files to output directory (silent, no console display)
3. Verify file write success (exist, readable, non-empty)

### 6.1 Output Path

For each selected template:

- Path: `./workspaces/{workspace_id}/outputs/create-content/{template_id}-{date}.md`
- Examples:
  - `blog-article-2024-01-15.md`
  - `x-thread-2024-01-15.md`
  - `tiktok-script-2024-01-15.md`
  - `youtube-script-2024-01-15.md`

### 6.2 Completion Message

Display:

- Workflow name
- Output file path(s)
- Content metrics (word count / tweet count / duration)
- Success status

```
Content created successfully:
- {template_id}-{date}.md ({word_count} words / {tweet_count} tweets / {duration})

Output path: ./workspaces/{workspace_id}/outputs/create-content/
```

---

## STEP 8: UPDATE WORKSPACE STATE

**Purpose:** Update workspace.yaml for workflow chaining and persistence.

**Actions:**

1. Read `./workspaces/{workspace_id}/workspace.yaml`
2. Update `workflows.create-content` section:
   - Create section if new workflow
   - Update metadata (last_executed, latest_output)
   - Append execution record to executions[] array
3. Update `workspace.metadata.last_updated`
4. Write workspace.yaml (silent, best-effort)
