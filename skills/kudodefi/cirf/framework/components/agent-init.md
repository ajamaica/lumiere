# AGENT INITIALIZATION SEQUENCE

> **Component** | Shared across all agents
> Standardized initialization sequence for agent activation.
> Referenced by `agent.yaml` via `directive.initialization`

---

> **EXECUTE IMMEDIATELY UPON ACTIVATION**
>
> - Execute all steps sequentially - NEVER skip or reorder
> - STOP immediately if any dependency missing or corrupted
> - NEVER execute workflows without completing initialization

---

## STEP 1: READ CORE CONFIGURATIONS

> ⚠️ **CRITICAL:** Must read core config first

### 1.1 Read Core Config File

- Read: `./framework/core-config.yaml`
- MUST succeed before proceeding

### 1.2 Extract Session Variables (7 vars)

Extract from core config:

- `user_name`
- `user_date_format`
- `user_currency`
- `language_communication`
- `language_output`
- `language_terminology`
- `workflows`

### 1.3 Validation

- Verify ALL session variables extracted
- ⛔ If ANY missing → STOP and report error

---

## STEP 2: CHECK WORKSPACE SELECTION

> ⚠️ **CRITICAL:** Workspace required for execution

### 2.1 Check If Provided

- If workspace config WAS provided at activation → Read it (skip to 2.4)
- If workspace NOT provided → Ask user (proceed to 2.2)

### 2.2 Ask User for Workspace

List available from `./workspaces/`

Display:

```
Which workspace do you want to work with?

Available workspaces:
1. [workspace-id-1] - [workspace name]
2. [workspace-id-2] - [workspace name]

Or create new workspace by entering:
- New workspace ID (lowercase, hyphen-separated, e.g., 'bitcoin-analysis')
```

**WAIT** for user response:

- If existing workspace-id → proceed to 2.4
- If new workspace-id → proceed to 2.3

### 2.3 Create New Workspace (if requested)

**2.3.1 Create folders** (create `./workspaces/` first if not exists):

- `./workspaces/{workspace_id}/`
- `./workspaces/{workspace_id}/documents/`
- `./workspaces/{workspace_id}/outputs/`

**2.3.2 Generate workspace.yaml:**

- Use template from `./framework/_workspace.yaml`
- Populate minimal metadata (id, created date)

**2.3.3 Inform user:**

```
Workspace created. Run 'create-research-brief' workflow to complete setup.
```

### 2.4 Read Workspace Config

- Read: `./workspaces/{workspace_id}/workspace.yaml`

### 2.5 Extract Additional Session Variables (8 vars)

Extract from workspace config:

- `workspace_id`
- `workspace_name`
- `workspace_description`
- `workspace_created`
- `workspace_last_updated`
- `workspace_focus`
- `workspace_objectives`
- `workspace_scope`

### 2.6 Validation

- Verify ALL workspace session variables extracted
- ✓ Use defaults for missing optional fields (OK to proceed)

### 2.7 Update Session Variables Cache

**2.7.1** Compare current variables vs cached (`workspace.yaml` → `session_variables`)

**2.7.2** Conditional update:

- IF any variable differs OR cache missing:
  - Write `session_variables` section to workspace.yaml
  - ✓ Log: `Session cache updated (16 vars)`
- ELSE (all variables identical):
  - Skip write
  - Log: `Session cache fresh (last: {_cached_at} by {_cached_by_agent})`

---

## INITIALIZATION COMPLETE

Control returns to `agent.yaml` for:

- Embody persona
- Display greeting
- Handle workflow requests
