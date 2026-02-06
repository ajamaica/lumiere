# Asana skill (PAT) for OpenClaw / Clawdbot

A dependency-free **AgentSkill** that integrates **Asana** via the **Asana REST API (v1)** using a **Personal Access Token (PAT)**.

- No npm dependencies
- Node.js 18+ (uses built-in `fetch`, `FormData`, `Blob`)
- JSON-only output (designed for agent tool calls)
- Supports both:
  - Personal task management (My Tasks / triage)
  - Project manager workflows (briefs, status updates, timelines, custom fields, blockers, stakeholder comments)

## Repo layout

- `SKILL.md` — skill instructions for the agent runtime
- `README.md` — human-facing quickstart (this file)
- `scripts/asana.mjs` — CLI (the only executable)
- `references/REFERENCE.md` — implementation notes and API links
- `LICENSE`

## Prerequisites

- Node.js **18+**
- An Asana account
- An Asana **Personal Access Token** (PAT)

## Setup (PAT)

1. Create a PAT: Asana → Developer App / PAT settings (see Asana docs: Personal access token).
2. Provide it to the runtime as `ASANA_PAT`.

### Recommended: store the PAT in OpenClaw config (non-interactive)

This keeps secrets out of prompts and reduces accidental token leakage.

**Recommended (apiKey → ASANA_PAT):**

```bash
openclaw config set skills.entries.asana.enabled true
openclaw config set skills.entries.asana.apiKey "ASANA_PAT_HERE"
```

**Alternative (explicit env):**

```bash
openclaw config set skills.entries.asana.enabled true
openclaw config set skills.entries.asana.env.ASANA_PAT "ASANA_PAT_HERE"
```

**Verify what is stored:**

```bash
openclaw config get skills.entries.asana
openclaw config get skills.entries.asana.enabled
openclaw config get skills.entries.asana.apiKey
```

**Remove a stored token:**

```bash
openclaw config unset skills.entries.asana.apiKey
# or
openclaw config unset skills.entries.asana.env.ASANA_PAT
```

#### Important: sandboxed runs

When a session is sandboxed, skills run inside Docker and do **not** inherit the host environment.
Set Docker env via `agents.defaults.sandbox.docker.env` (or per-agent `agents.list[].sandbox.docker.env`).

### Local smoke test

```bash
export ASANA_PAT="YOUR_TOKEN"
node scripts/asana.mjs me
```

## Common workflows

### 1) Set a default workspace once (recommended)

```bash
node scripts/asana.mjs workspaces
node scripts/asana.mjs set-default-workspace --workspace <workspace_gid>
```

After this, commands that require a workspace can omit `--workspace`.

### 2) List projects in a workspace

```bash
node scripts/asana.mjs projects --workspace <workspace_gid> --all
```

(or omit `--workspace` if you set a default)

### 3) Personal productivity: tasks assigned to me

```bash
node scripts/asana.mjs tasks-assigned --assignee me --workspace <workspace_gid> --all
```

### 4) Project: list tasks in project

```bash
node scripts/asana.mjs tasks-in-project --project <project_gid> --all
```

### 5) Search tasks (Advanced Search)

This is the canonical primitive for “search within a project” (and many other filters):

```bash
node scripts/asana.mjs search-tasks --workspace <gid> --project <project_gid> --text "invoice" --all
```

### 6) Create / update a task

Create:

```bash
node scripts/asana.mjs create-task   --workspace <workspace_gid>   --name "TEST - Asana formatting"   --projects <project_gid>   --assignee me
```

Update:

```bash
node scripts/asana.mjs update-task <task_gid> --due_on 2026-02-01
```

### 7) Add/remove a task to/from a project

Add:

```bash
node scripts/asana.mjs add-task-to-project <task_gid> --project <project_gid>
```

Add with section placement:

```bash
node scripts/asana.mjs add-task-to-project <task_gid> --project <project_gid>   --section <section_gid> --insert_before null --insert_after null
```

Remove:

```bash
node scripts/asana.mjs remove-task-from-project <task_gid> --project <project_gid>
```

### 8) Rich text + mentions (reliable pattern)

Asana rich text must be **XML-valid** and wrapped in `<body>...</body>`. Avoid unsupported tags like `<p>` / `<br>`. Use literal newlines and `<hr/>` separators.

Task description (rich):

```bash
node scripts/asana.mjs update-task <task_gid> --html_notes '<body>Rich description: <a data-asana-gid="USER_GID"/>
<hr/>
Plain-ish description: @Lucky</body>'
```

Comment (rich) with reliable notification delivery:

```bash
node scripts/asana.mjs comment <task_gid>   --html_text '<body>Rich comment: <a data-asana-gid="USER_GID"/> hello from rich text.</body>'   --ensure_followers USER_GID   --wait_ms 2500
```

Plain text comments (`--text`) do **not** create real @mentions via the API; they remain plain text.

### 9) Upload a file and embed an inline image

Upload:

```bash
node scripts/asana.mjs upload-attachment --parent <task_gid> --file ./screenshot.png
```

Embed inline (tasks + project briefs only):

```bash
node scripts/asana.mjs append-inline-image --attachment <attachment_gid> --task <task_gid>
```

## Install as a local skill

OpenClaw loads skills from (highest precedence first):

1. `<workspace>/skills`
2. `~/.openclaw/skills`
3. bundled skills

Copy this folder into your workspace skills directory, e.g.:

`<your_openclaw_workspace>/skills/asana/`

## Publishing to ClawHub

You can publish directly from a local folder; a GitHub repo is optional.

### Install the CLI

```bash
npm i -g clawhub
clawhub --help
```

### First-time publish (run from this folder)

```bash
clawhub publish . --slug asana --name "Asana" --version 1.0.0 --tags latest --changelog "Initial release (PAT)"
```

Notes:

- `--slug` must be unique on ClawHub. If `asana` is taken, use something like `asana-pat` or `asana-skill`.
- To publish an update, bump `--version` (semver) and publish again.

## Troubleshooting

- **401 Unauthorized**: PAT missing/invalid. Verify `ASANA_PAT` is set and has not been revoked.
- **400 xml_parsing_error**: invalid rich text XML or unsupported tags. Use `<body>...</body>`, avoid `<p>`/`<br>`, and keep markup minimal.
- **Mention didn’t notify**: ensure the mentioned user is assigned or a follower before posting the comment (and add a short wait after adding followers).

See `references/REFERENCE.md` for links and implementation notes.
