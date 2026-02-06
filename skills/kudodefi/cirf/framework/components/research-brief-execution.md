# RESEARCH BRIEF EXECUTION

> **Component** | Specific to create-research-brief workflow
> Execution sequence for research brief creation workflow.
> Referenced by `workflow.yaml` via `directive.execution`

---

> **EXECUTE AFTER INITIALIZATION COMPLETES**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if validation fails
> - Return to previous step if gaps identified

---

## STEP 1: SOURCE SELECTION

**Purpose:** Select and load user-provided context or documents (optional enhancement).

### 1.1 Scan Available Sources

- Scan documents: `./workspaces/{workspace_id}/documents/*`
- Sort: By modification time (newest first)

### 1.2 Present Sources

Display if documents exist:

```
Available context documents (optional):

DOCUMENTS:
1. {filename} ({file_type}, uploaded {date})
2. {filename} ({file_type}, uploaded {date})
...

Select numbers to include (e.g., '1 2'), or Enter to skip: ___
```

### 1.3 Handle Selection

- If user enters numbers: Load selected documents
- If user presses Enter/skip: Proceed without additional context
- If no documents exist: Skip this step silently

### 1.4 Load Selected Sources

- Read all selected files
- Verify files readable and non-empty
- Confirm loaded or proceed without sources

---

## STEP 2: SCOPE CLARIFICATION

**RECALL & APPLY GUIDE:** `{scope-clarification}`

**Purpose:** Understand user's research need and determine appropriate template.

**Actions:**

1. Review user request and any loaded context
2. Understand what decision user needs to make
3. Identify research subject and boundaries
4. Determine template using Decision Tree

### 2.1 Understand Research Need

Gather through dialogue or context:

- What decision needs to be made?
- What is the research subject?
- What knowledge is needed?
- What boundaries exist?

### 2.2 Template Decision

Apply Decision Tree from objectives.md:

```
1. INVESTMENT CONTEXT?
   - Explicit: "invest", "allocation", "BUY/SELL", "portfolio"
     → Investment Research
   - Implicit: "opportunity evaluation" + capital allocation context
     → Investment Research

2. NO INVESTMENT → PROJECT OR SECTOR?
   - Single project focus + NO capital investment context
     → Project Research
   - Sector/market/multiple projects
     → Sector Research
```

### 2.3 Confirm Template Selection

Display:

```
Based on your research need:

Selected Template: {template_name}
Rationale: {why this template fits}

Confirm? (Y/change): ___
```

- If confirmed: Proceed with selected template
- If change requested: Present all 3 options for manual selection

---

## STEP 3: APPROACH SELECTION

**Purpose:** User MUST select execution approach before brief creation begins.

**Present options:**

- **1: AUTONOMOUS** - Fill brief independently based on provided context
- **2: COLLABORATIVE** - Dialogue through each section interactively

Wait for user selection. **MANDATORY** - do not proceed without choice.

### AUTONOMOUS PATH

Fill brief sections independently based on:

- User's initial request
- Loaded source documents
- Context gathered during scope clarification

Present completed draft for review.

### COLLABORATIVE PATH

**RECALL & APPLY GUIDE:** `{collaborative-research}`

Guide user through each template section:

- Ask targeted questions per section
- Confirm understanding before moving to next
- Build brief iteratively through dialogue

---

## STEP 4: EXECUTION

**Purpose:** Fill selected template sections to create complete research brief.

**Actions:**

1. Execute following selected approach philosophy
2. Fill all template sections systematically
3. Ensure each section has sufficient detail
4. Map user requirements to template structure

### 4.1 Template Sections to Fill

**For all templates:**

| Section                 | Content to Gather                      |
| ----------------------- | -------------------------------------- |
| **1. CONTEXT**          | Decision to make, Current position     |
| **2. RESEARCH PURPOSE** | Primary goal, Completion criteria      |
| **3. RESEARCH SUBJECT** | Subject, Category, Background          |
| **4. RESEARCH SCOPE**   | Priority focus, In-scope, Out-of-scope |

### 4.2 Section Completion

For each section:

- Gather required information (autonomous or collaborative)
- Validate completeness before proceeding
- Flag any gaps for clarification

### 4.3 Brief Assembly

- Compile all sections into template structure
- Ensure consistency across sections
- Prepare for validation

---

## STEP 5: VALIDATION

**Purpose:** Validate completed brief before delivery.

**Complete checklist:**

_Mission & Objectives:_

- [ ] Mission accomplished per objectives.md
- [ ] All objectives achieved per objectives.md

_Brief Quality (from VALIDATION CRITERIA):_

- [ ] **Decision-Enabling:** Decision context provides clear evaluation criteria
- [ ] **Scope Clarity:** Boundaries prevent both over-research and under-research
- [ ] **Template Appropriateness:** Selected template matches decision type

_Template-Specific:_

- [ ] [Investment] Portfolio context and position sizing documented
- [ ] [Sector] Market structure vs strategic recommendation clarity
- [ ] [Project] Focused analysis scope, NOT investment decision

_Completeness:_

- [ ] All 4 sections filled with sufficient detail
- [ ] No placeholder text remaining
- [ ] Brief is self-sufficient for downstream execution

**If fails:** Return to STEP 4 to address gaps.
**If passes:** Proceed to STEP 6.

---

## STEP 6: DELIVERY OUTPUT

**Purpose:** Generate and deliver final research brief.

**Actions:**

1. Generate output following selected template structure
2. Write file to output directory (silent, no console display)
3. Verify file write success (exist, readable, non-empty)

### 6.1 Output Path

- Path: `./workspaces/{workspace_id}/outputs/create-research-brief/research-brief-{date}.md`
- Example: `research-brief-2024-01-15.md`

### 6.2 Completion Message

Display:

```
Research brief created successfully:
- research-brief-{date}.md

Template used: {template_name}
Output path: ./workspaces/{workspace_id}/outputs/create-research-brief/

Brief ready for downstream workflow execution.
```

---

## STEP 7: UPDATE WORKSPACE STATE

**Purpose:** Update workspace.yaml for workflow chaining and persistence.

**Actions:**

1. Read `./workspaces/{workspace_id}/workspace.yaml`
2. Update `workflows.create-research-brief` section:
   - Create section if new workflow
   - Update metadata (last_executed, latest_output)
   - Append execution record to executions[] array
3. Update `workspace.metadata.last_updated`
4. Write workspace.yaml (silent, best-effort)
