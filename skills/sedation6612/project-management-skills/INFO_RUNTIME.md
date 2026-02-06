# Runtime Integration (OpenClaw Workspace)

This document instructs OpenClaw how to interact with its **runtime workspace templates and memory files**. It does **not** include those files.

**This project management skill references runtime workspace templates; it does not contain them.**
**Codex authors this skill; OpenClaw executes it at runtime.**

## A) Boot Read Order (OpenClaw Action List)

On boot, open these workspace files and read in this order (note: `MEMORY.MD` is a single Markdown file in the workspace):

1. `~/.openclaw/workspace/SOUL.md`
2. `~/.openclaw/workspace/USER.md`
3. `~/.openclaw/workspace/MEMORY.MD` (main session only)
4. If present, read `~/.openclaw/workspace/AGENTS.md`, `~/.openclaw/workspace/TOOLS.md`, `~/.openclaw/workspace/HEARTBEAT.md`.

Then load skill cache files in the project management skill:

- `LOG_CACHES.md` (index + context digests)
- Load only the specific log file needed: `LOG_PROJECTS.md`, `LOG_CHARTERS.md`, `LOG_CONFLICTS.md`, `LOG_DECISIONS.md`, `LOG_ACTIVITY.md`

## B) Boot Write Actions (Workspace-Only)

- If `BOOT.md` is missing or stale in `~/.openclaw/workspace/`, write a **minimal BOOT.md** that performs the boot read order above and restores **Active Project Focus**.
- BOOT rule: **If BOOT sends a message, use the message tool then reply NO_REPLY.**
- IMPORTANT: **Do not create BOOT.md inside the project management skill; only write it in the OpenClaw workspace path.**

## C) Onboarding Wiring (Permissioned + Forced)

Before first governed action, request permission to edit:

- `~/.openclaw/workspace/AGENTS.md`
- `~/.openclaw/workspace/SOUL.md`
- `~/.openclaw/workspace/TOOLS.md`
- `~/.openclaw/workspace/MEMORY.MD`

If denied: **HARD STOP**. Explain wiring is required for enforcement and keep prompting.
If granted: write the short delimited blocks from `SKILL.md` exactly once.

## D) Model Strategy + Dangerous-Action Policy (Global Defaults)

Capture and store the onboarding choices in `MEMORY.MD`:

- **Orchestrator model slug** (cheap/fast recommended)
- **Default subagent model slug** (strong recommended)
- **Dangerous-action policy** (full autonomy vs confirm-risky)

Per-project overrides are stored in `LOG_PROJECTS.md`.

## E) Model Slug Validation (Hard Stop)

- Require the user-provided model slug to exactly match `openclaw models list` output.
- If invalid/missing, do not proceed; prompt again.
- Offer fallback: proceed using gateway default subagent model; log **WARNING** and mark project with `fallback_model: true`.

## F) Context Bundle + Token Discipline

- Subagent context is **blank** by default; only AGENTS.md + TOOLS.md are injected.
- Therefore, include all needed context explicitly in the payload.
- Build a **Context Digest** per project and store it in `LOG_CACHES.md`.
- Send only:
  - Current user prompt (verbatim)
  - Context Digest + minimal excerpts if needed
  - Governance rules + output requirements
  - Project ID, model slug, dangerous-action policy
  - Logging requirements and pointers

## G) Subagent Lifecycle

### New Project (Spawn)

- `sessions_spawn` with: `task=<payload>`, `label=<project-id>`, `model=<project model>`, set timeout/cleanup.
- Persist `childSessionKey` + `runId` to `LOG_PROJECTS.md` and `LOG_ACTIVITY.md`.

### Continuing Project (Send)

- Use `sessions_send` to **active** `childSessionKey`.
- Persist returned `runId` if available.
- Results arrive later via **announce**.

### Rotate/Replace Subagent (Required)

- Spawn a new subagent session.
- Archive the old active session (timestamp, reason, last runId).
- Update `LOG_PROJECTS.md` roster and activity logs.

## H) Dangerous-Action Policy Enforcement

If policy is **Confirm-risky**, require the exact phrase “ARE YOU SURE” before:

- account creation
- payments
- destructive filesystem operations
- credential handling
- system-wide installs or privileged commands

## I) Sandboxing Preference

- Prefer sandboxed tool execution.
- If sandboxing is not enabled, warn explicitly in the response.

## J) Stop-Work Integration

- If Project ID is missing, **ask the user** whether to create a project with a specialized sub-agent.
- If declined, proceed as non-project work and write a concise MEMORY note into `~/.openclaw/workspace/MEMORY.MD` that links to the verbose log entry.
- If severity is **block/reject/critical**: update `LOG_CONFLICTS.md` **Conflicts** INBOX + write `~/.openclaw/workspace/MEMORY.MD` reminder: “Ask user to resolve conflict <anchor>”.
- Regardless of outcome, **sync logs and memory** (even for small tasks or early stops).

## K) HEARTBEAT Conflict Checks (Default Daily)

On setup and first call of this skill, ask the user how often to run conflict checks via HEARTBEAT, and state that more frequent checks consume more tokens. Default to **daily** if they do not choose. Write a HEARTBEAT task that reads `LOG_CONFLICTS.md` and informs the user about any unresolved conflicts.

## L) Unprompted Work Logging (User-Only Project Classification)

To ensure project classification only occurs for user-prompted work:

- For any **unprompted** action (heartbeat/autonomous tasks), log each action into a temporary file: `~/.openclaw/workspace/TEMP_UNPROMPTED_LOG.md` with timestamp, action summary, and any artifacts.
- Do **not** open or update projects for these actions until a user prompt arrives.
- On the next user prompt, read the temporary log and inform the user what was done. Ask whether each item should be classified under an existing project, a new project, or no project at all.
- After classification, move the relevant entries into the appropriate project log(s) and clear the temporary file.

## M) Explicit Project Management Skill/Non-Skill Boundary

- **This project management skill references runtime workspace templates; it does not contain them.**
- **Codex authors this skill; OpenClaw executes it at runtime.**
