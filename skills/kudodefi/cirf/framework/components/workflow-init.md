# WORKFLOW INITIALIZATION SEQUENCE

> **Component** | Shared across all workflows
> Standardized initialization sequence before workflow execution.
> Referenced by `workflow.yaml` via `directive.initialization`

---

> **EXECUTE IMMEDIATELY UPON WORKFLOW START**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if any dependency missing or corrupted
> - NEVER proceed without completing all reading steps

---

## STEP 1: READ DEPENDENCIES

> ⚠️ **CRITICAL:** All dependencies must read successfully

### 1.1 Read Objectives

- Read `objectives.md` from workflow folder
- Understand: MISSION, OBJECTIVES, VALIDATION CRITERIA, DELIVERABLES

### 1.2 Template Selection

**Single template workflow:**

- Read `template.md` from workflow folder
- Understand output structure requirements

**Multi-template workflow (has `templates/` subfolder):**

1. List available templates from `templates/` folder
2. Present options to user:

   ```
   Available templates:
   1. {template-name-1} - {description}
   2. {template-name-2} - {description}
   ...

   Select template: ___
   ```

3. Read selected template
4. Understand output structure requirements

### 1.3 Read Guides

- Read all guides referenced in `objectives.md`

---

## STEP 2: CONFIGURATION SELECTION

Allow user to customize research depth and output type.

### 2.1 Present Options

Display:

```
1. RESEARCH DEPTH (how thoroughly to research):
   A: quick - Essential sources only
   B: standard - Multiple sources, cross-validation (recommended)
   C: deep - Comprehensive sources, rigorous validation

   Current default: {research_depth}

2. OUTPUT TYPE (how to present findings):
   A: brief - Executive summary style
   B: standard - Balanced report (recommended)
   C: comprehensive - Detailed report with full evidence

   Current default: {output_type}
```

### 2.2 Request Selection

Display:

```
Select configuration (e.g., 1B 2B for standard research + standard output)
or press Enter for default:

Your choice: ___
```

### 2.3 Handle Response

- If user enters valid codes (1A-1C 2A-2C): Apply selected configuration
- If 'default'/'skip'/Enter: Use workflow defaults
- If invalid: Retry once, then use defaults
- Confirm final configuration to user clearly

---

## STEP 3: VALIDATE READINESS

Verify all requirements met before execution.

### 3.1 Dependency Checklist

- [ ] Objectives read and understood
- [ ] Template read and understood (selected if multi-template)
- [ ] All required guides read successfully
- [ ] Configuration finalized (selected or defaults)

### 3.2 Ready for Execution

- [ ] All dependencies available
- [ ] Session variables from agent available
- [ ] Workflow context clear
- [ ] Ready to proceed

---

## STEP 4: INITIALIZATION COMPLETE

Handoff to execution phase.

### 4.1 Confirm Ready

Display:

```
Initialization complete. Ready for execution.

- Workflow: {workflow_name}
- Template: {template_name}
- Research depth: {research_depth}
- Output type: {output_type}

Proceeding to execution phase...
```

### 4.2 End Initialization

- This initialization sequence ends here
- Control returns to `workflow.yaml` for execution phase
