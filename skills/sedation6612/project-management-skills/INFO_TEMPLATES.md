# Templates (Copy/Paste)

## Recon Summary (Short)

- Observed files/logs:
- Gaps/unknowns:
- Immediate risks:

## Spec (Acceptance Criteria)

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Prompt Frame (Use for Intake or Clarifications)

- context:
- goal:
- constraints:
- assumptions_to_confirm:
- desired_output_format: (bullets, table, checklist, etc.)

## Onboarding Prompt (Permission + Choices)

Ask exactly in this order:

1. Permission gate:
   - “May I edit your OpenClaw workspace files to force-wire this skill? I need to update AGENTS.md, SOUL.md, TOOLS.md, and MEMORY.MD. Without this, I must stop.”
2. Model strategy:
   - “Choose models: cheap/fast for orchestrator and strong for subagents. Stronger subagent model → better quality; cheaper → cheaper parallelism. Please provide exact model slugs from `openclaw models list`.”
3. Dangerous-action policy:
   - “Choose subagent policy: (a) Full autonomy (dangerous), or (b) Confirm-risky (subagents must ask ‘ARE YOU SURE’ before risky/irreversible actions).”

## Model Slug Validation Prompt

- “Please provide the exact model slug as shown by `openclaw models list`. If it’s not in that list, it won’t work as intended. If you want to proceed anyway, say: ‘Use fallback model’ and I’ll log a WARNING.”

## Project Creation Prompt

- “Do you want to make this a Project with its own dedicated subagent session?”

## HEARTBEAT Conflict Check Prompt

- “How often should I check `LOG_CONFLICTS.md` for unresolved conflicts? (Default: daily; more frequent checks use more tokens.)”

## Status Output (Every Run)

```
[Project Status]
Subagent spawned: YES|NO
Project ID: <project-id>
Active model: <model-slug|fallback>
Active childSessionKey: <key|unknown>
runId: <runId|pending>
Note: You’ll get a message back when the subagent finishes; it may ask follow-up questions.
```

## Subagent Payload (Minimal Context Bundle)

```
[Project Payload]
Project ID: <project-id>
Model: <model-slug|fallback>
Dangerous-action policy: <full-autonomy|confirm-risky>
Child session: <new|existing>
User prompt (verbatim):
<user prompt>

Context Digest:
<context digest from LOG_CACHES.md>

Minimal excerpts (only if needed):
- <excerpt 1>
- <excerpt 2>

Logging requirements:
- Log actions/decisions/outputs to LOG_ACTIVITY.md
- Log decisions to LOG_DECISIONS.md when applicable
- Update LOG_PROJECTS.md roster/runId if session changes

Instruction:
Do not assume any other conversation context. Do not use session tools. Do not spawn subagents.
```

## Project Record (LOG_PROJECTS.md)

```
| Project ID | Project Name | Status | Charter | Model | Active childSessionKey | Last runId | Roster | Notes |
| <id> | <name> | <status> | <charter anchor> | <model-slug|fallback> | <childSessionKey> | <runId> | <roster anchor> | <notes> |
```

## Subagent Roster Entry (LOG_PROJECTS.md)

```
### <Project ID> — Subagent Roster
- active:
  - childSessionKey:
  - model:
  - started_at:
  - last_runId:
- archived:
  - childSessionKey:
    model:
    started_at:
    archived_at:
    reason:
    last_runId:
```

## Context Digest Entry (LOG_CACHES.md)

```
### <Project ID> — Context Digest
- updated_at:
- summary:
- pointers:
  - LOG_ACTIVITY.md:<anchor>
  - LOG_DECISIONS.md:<anchor>
```

## Activity Log Entry (LOG_ACTIVITY.md)

```
### <timestamp> — <Project ID>
- action:
- summary:
- subagent:
  - childSessionKey:
  - model:
  - runId:
- logs_updated:
- next_step:
```

## Rotation Log Entry (LOG_ACTIVITY.md)

```
### <timestamp> — <Project ID> — Subagent Rotation
- previous_childSessionKey:
- new_childSessionKey:
- reason:
- previous_last_runId:
- new_model:
```

## Memory Summary (Concise Reference)

- project_id (or non-project):
- summary:
- link_to_verbose_log_entry:
- next_step:
