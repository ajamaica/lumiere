# WORKFLOW EXECUTION FRAMEWORK

> **Component** | Shared across all workflows
> Standardized execution sequence for all research workflows.
> Referenced by `workflow.yaml` via `directive.execution`

---

> **EXECUTE AFTER INITIALIZATION COMPLETES**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if validation fails
> - Return to previous step if gaps identified

---

## STEP 1: SCOPE CLARIFICATION

**RECALL & APPLY GUIDE:** `{scope-clarification}`

**Purpose:** Assess available information and determine requirements for successful execution.

**Actions:**

1. Review user request and available context
2. Read MISSION and OBJECTIVES from objectives.md
3. Read TEMPLATE structure from template.md
4. Evaluate confidence in delivering successful output
5. Apply appropriate path from scope-clarification guide
6. Gather complete requirements before proceeding

**Principle:** Requirements determined by MISSION + OBJECTIVES + TEMPLATE.

---

## STEP 2: SOURCE SELECTION

**Purpose:** Select and load additional context from workspace (optional enhancement).

### 2.1 Scan Available Sources

- Scan outputs: `./workspaces/{workspace_id}/outputs/*/*.md`
- Scan documents: `./workspaces/{workspace_id}/documents/*`
- Filter: Exclude current workflow outputs (avoid recursion)
- Sort: By modification time (newest first)
- Mark recommended sources based on confirmed scope (⭐)

### 2.2 Present Sources

Display outputs and documents separately, sorted by time (newest first):

```
Additional sources available (optional):

OUTPUTS (previous workflow results):
⭐ 1. {filename} ({workflow_type}, {date}, {word_count} words)
   2. {filename} ({workflow_type}, {date}, {word_count} words)
⭐ 3. {filename} ({workflow_type}, {date}, {word_count} words)
   ...

DOCUMENTS (user-provided materials):
   4. {filename} ({file_type}, uploaded {date})
⭐ 5. {filename} ({file_type}, uploaded {date})
   ...

⭐ = Recommended based on your scope

Select numbers to include (e.g., '1 3 5'), or Enter to skip: ___
```

### 2.3 Handle Selection

- If user enters numbers: Proceed to load
- If user presses Enter/skip: Proceed without additional sources
- If invalid: Retry once, then proceed without sources

### 2.4 Load Selected Sources

- Read all selected files
- Verify files readable and non-empty
- Confirm loaded:

```
Sources loaded:
- {filename1} ({word_count1} words)
- {filename2} ({word_count2} words)

Proceeding to approach selection...
```

Or if no sources:

```
No additional sources selected. Proceeding...
```

---

## STEP 3: APPROACH SELECTION

**Purpose:** User MUST select execution approach before work begins.

**Present options:**

- **1: AUTONOMOUS** - Independent execution, faster
- **2: COLLABORATIVE** - Validation checkpoints, interactive

Wait for user selection. **MANDATORY** - do not proceed without choice.

### AUTONOMOUS PATH

You have full autonomy to determine the optimal approach to achieve the mission and objectives. Execute independently without interruption. Choose methods, information sources, analysis frameworks, and execution strategies. The success criteria define WHAT to achieve - HOW you achieve it is your decision.

### COLLABORATIVE PATH

Execute with user validation at key milestones. Maintain autonomy between checkpoints, present findings for direction validation.
**RECALL & APPLY GUIDE:** `{collaborative-research}`

---

## STEP 4: EXECUTION

**Purpose:** Execute work to achieve MISSION and OBJECTIVES, following TEMPLATE structure, using selected APPROACH.

**Actions:**

1. Execute following selected approach philosophy
2. Apply METHODOLOGY PRINCIPLES from objectives.md throughout
3. Achieve all OBJECTIVES from objectives.md
4. Follow TEMPLATE structure from template.md
5. Accumulate findings continuously
6. Map findings to template sections as you progress

**Key Principles:**

- Focus on WHAT (objectives), maintain autonomy on HOW (methods)
- Apply methodology principles consistently throughout
- Ensure output aligns with template structure

---

## STEP 5: VALIDATION

**Purpose:** Validate completed work before delivery.

**Complete checklist:**

_Mission & Objectives:_

- [ ] Mission accomplished per objectives.md
- [ ] All objectives achieved per objectives.md

_Quality Standards:_

- [ ] Guide `{output-standards}` applied
- [ ] Template structure followed correctly
- [ ] Language matches `{language_output}` with `{language_terminology}`
- [ ] Output complies with `{output_type}` specifications (±30% variance)

_Workflow-Specific:_

- [ ] VALIDATION CRITERIA checklist from objectives.md completed

**If fails:** Return to STEP 4 to address gaps.
**If passes:** Proceed to STEP 6.

---

## STEP 6: DELIVERY OUTPUT

**Purpose:** Generate and deliver final outputs.

**Actions:**

1. Generate outputs per DELIVERABLES in objectives.md
2. Write files to output directory (silent, no console display)
3. Verify file write success (exist, readable, non-empty)

**Completion Message:**

- Workflow name
- Output file path(s)
- Success status

---

## STEP 7: UPDATE WORKSPACE STATE

**Purpose:** Update workspace.yaml for workflow chaining and persistence.

**Actions:**

1. Read `./workspaces/{workspace_id}/workspace.yaml`
2. Update `workflows.{workflow_id}` section:
   - Create section if new workflow
   - Update metadata (last_executed, latest_output)
   - Append execution record to executions[] array
3. Update `workspace.metadata.last_updated`
4. Write workspace.yaml (silent, best-effort)
