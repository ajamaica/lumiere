# RESEARCH BRIEF INITIALIZATION

> **Component** | Specific to create-research-brief workflow
> Initialization sequence for research brief creation workflow.
> Referenced by `workflow.yaml` via `directive.initialization`

---

> **EXECUTE IMMEDIATELY UPON WORKFLOW START**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if any dependency missing or corrupted
> - NEVER proceed without completing all reading steps

---

## STEP 1: READ DEPENDENCIES

> **CRITICAL:** All dependencies must read successfully

### 1.1 Read Objectives

- Read `objectives.md` from workflow folder
- Understand: MISSION, OBJECTIVES, VALIDATION CRITERIA, DELIVERABLES
- Note: Decision Tree for template selection (Sector vs Project vs Investment)

### 1.2 Read All Templates

Read all templates from `templates/` folder:

| Template                 | Purpose                           | Decision Context                  |
| ------------------------ | --------------------------------- | --------------------------------- |
| `sector-research.md`     | Sector/market/ecosystem analysis  | Sector allocation, market entry   |
| `project-research.md`    | Focused project analysis          | Whether to pursue deeper research |
| `investment-research.md` | Comprehensive investment analysis | Investment committee decision     |

Understand structure of each template for later selection.

### 1.3 Read Guides

- Read `scope-clarification.md` - CORE guide for this workflow
- Read `research-methodology.md` - Research principles
- Read `collaborative-research.md` - For collaborative approach
- Read `output-standards.md` - Output formatting

---

## STEP 2: VALIDATE READINESS

Verify all requirements met before execution.

### 2.1 Dependency Checklist

- [ ] Objectives read and understood
- [ ] All 3 templates read and understood
- [ ] Decision Tree understood
- [ ] All required guides read successfully

### 2.2 Ready for Execution

- [ ] All dependencies available
- [ ] Workflow context clear
- [ ] Ready to proceed

---

## STEP 3: INITIALIZATION COMPLETE

Handoff to execution phase.

### 3.1 Confirm Ready

Display:

```
Initialization complete. Ready for execution.

- Workflow: Create Research Brief
- Templates available: sector-research, project-research, investment-research
- Template selection: After scope clarification (Decision Tree)

Proceeding to execution phase...
```

### 3.2 End Initialization

- This initialization sequence ends here
- Control returns to `workflow.yaml` for execution phase
