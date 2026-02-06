# CONTENT CREATION INITIALIZATION

> **Component** | Specific to create-content workflow
> Initialization sequence for content creation workflow.
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

### 1.2 Read Guides

- Read `content-style.md` - CORE guide for this workflow
- Read `scope-clarification.md` - for clarifying requirements

---

## STEP 2: TEMPLATE & OUTPUT TYPE SELECTION

> **CRITICAL:** User selects format(s) AND output type (length)

### 2.1 Present Options

Display:

```
Which format(s) do you want to create?

1. Blog Article
2. X Thread
3. TikTok Script
4. YouTube Script

Output type?
A. brief
B. standard
C. comprehensive

Examples:
• 1B → Blog Article, standard
• 2A → X Thread, brief
• 1B 3A → Blog (standard) + TikTok (brief)
• 4C → YouTube Script, comprehensive

Your selection (e.g., '1B' or '1B 3A'): ___
```

### 2.2 Handle Response

- Parse format: Extract numbers (1-4) and letters (A-C)
- If valid codes → apply selected configuration
- If 'default'/'skip'/Enter → use defaults (1B: Blog Article, standard)
- If invalid → retry once, then use defaults

### 2.3 Confirm Selection

Display:

```
Configuration locked:
• Format(s): {Blog Article, TikTok Script}
• Output type(s): {standard, brief}

Loading selected template(s)...
```

### 2.4 Read Selected Template(s)

- Read ONLY the template(s) user selected from `dependencies.templates`
- Map selection to template path:
  - 1 → blog-article
  - 2 → x-thread
  - 3 → tiktok-script
  - 4 → youtube-script

> **STOP** if template missing or corrupted → report error

---

## STEP 3: VALIDATE READINESS

Verify all requirements met before execution.

### 3.1 Dependency Checklist

- [ ] Objectives read and understood
- [ ] Template(s) read and understood
- [ ] Guides read successfully
- [ ] Configuration finalized (format + output type)

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

- Workflow: Content Creation
- Format(s): {template_name(s)}
- Output type(s): {output_type(s)}

Proceeding to execution phase...
```

### 4.2 End Initialization

- This initialization sequence ends here
- Control returns to `workflow.yaml` for execution phase
