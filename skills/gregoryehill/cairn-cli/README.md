# Cairn

[![npm version](https://img.shields.io/npm/v/cairn-work.svg)](https://www.npmjs.com/package/cairn-work)
[![GitHub Discussions](https://img.shields.io/github/discussions/letcairnwork/cairn-cli)](https://github.com/letcairnwork/cairn-cli/discussions)
[![Follow @letcairnwork](https://img.shields.io/twitter/follow/letcairnwork?style=social)](https://x.com/letcairnwork)

Project management for AI agents. Markdown files are the source of truth.

## Setup

```bash
npm install -g cairn-work
cairn onboard
```

This creates a workspace and writes two context files your agent reads automatically:

- **`AGENTS.md`** — Compact reference for day-to-day operations (statuses, CLI commands, autonomy rules)
- **`.cairn/planning.md`** — Full guide for creating projects and tasks with real content

No agent-specific configuration. Any AI agent that can read files is ready to go.

## Quick Start

```bash
# See what you're working on
cairn my

# Start a task
cairn start implement-auth

# Add notes as you work
cairn note implement-auth "Using passport.js for OAuth"

# Create an artifact (deliverable document, code, etc.)
cairn artifact implement-auth "API Design Doc"

# Mark it done
cairn done implement-auth

# Check workspace status
cairn status
```

For complete command reference, see [COMMANDS.md](COMMANDS.md).

## How it works

You and your AI agent share a folder of markdown files. Projects have charters. Tasks have objectives. Status fields track where everything stands — like a kanban board backed by text files.

```
~/cairn/
  AGENTS.md                        # Agent context (auto-generated)
  .cairn/planning.md               # Planning guide (auto-generated)
  projects/
    launch-app/
      charter.md                   # Why, success criteria, context
      artifacts/                   # Project deliverables
        api-design.md
        test-plan.md
      tasks/
        setup-database.md          # Individual task
        build-api.md
        deploy.md
  inbox/                           # Ideas to triage
```

### The workflow

1. **You create a project** — tell your agent what you want to build. It creates the project and tasks using `cairn create`, fills in real content (not placeholders), and sets everything to `pending`.

2. **You manage the board** — move tasks to `next_up` or `in_progress` when you're ready to start. Or tell your agent "work on the API task" and it picks it up.

3. **The agent keeps status updated** — when it starts a task, it moves to `in_progress`. When it finishes, it moves to `review` (so you can approve) or `completed` (if you gave it full autonomy). If it gets stuck, it moves to `blocked` and tells you what it needs.

4. **Artifacts live with the project** — use `cairn artifact` to create deliverables like design docs, proposals, or code snippets. They're stored in `projects/{project}/artifacts/` and automatically linked to the task.

5. **You always know where things stand** — statuses are the shared language. The agent is accountable for keeping them accurate.

### Statuses

`pending` · `next_up` · `in_progress` · `review` · `blocked` · `completed`

### Autonomy

Each task has an autonomy level that controls what the agent can do:

| Level     | Agent behavior                                 | Finishes as |
| --------- | ---------------------------------------------- | ----------- |
| `propose` | Plans the approach, doesn't do the work        | `review`    |
| `draft`   | Does the work, no irreversible actions         | `review`    |
| `execute` | Does everything, including deploy/publish/send | `completed` |

Default is `draft` — the agent works but you approve before anything ships.

## Commands

### `cairn onboard`

Set up workspace and write agent context files.

```bash
cairn onboard                  # Interactive setup
cairn onboard --path ./mywork  # Non-interactive, specific path
cairn onboard --force          # Re-run on existing workspace
```

### `cairn create`

Create projects and tasks. Always pass real content — the CLI enforces `--description` and `--objective`.

```bash
cairn create project "Launch App" \
  --description "Ship the MVP by March" \
  --objective "We need to validate the idea with real users" \
  --criteria "App live on production, 10 beta signups" \
  --context "React Native, Supabase backend, deploy to Vercel"

cairn create task "Set up database" \
  --project launch-app \
  --description "Configure Supabase tables and RLS policies" \
  --objective "Database schema matches the data model, RLS prevents cross-tenant access"
```

### `cairn artifact`

Create a project artifact (document, design, proposal) and link it to a task.

```bash
cairn artifact implement-auth "API Design Doc"
cairn artifact implement-auth "Test Plan" --description "Test coverage for OAuth flow"
cairn artifact implement-auth "Architecture Diagram" --open
```

This command:

1. Creates `projects/{project}/artifacts/{artifact-name}.md`
2. Automatically links it to the task's frontmatter using a relative path
3. Supports optional descriptions in the artifact metadata
4. Opens the artifact in your `$EDITOR` with the `--open` flag

**Artifact structure:**

```
projects/
  launch-app/
    artifacts/
      api-design-doc.md         # Created by cairn artifact
      test-plan.md
    tasks/
      implement-auth.md         # Links to ../artifacts/api-design-doc.md
```

**Task frontmatter with artifacts:**

```yaml
---
title: Implement authentication
artifacts:
  - path: ../artifacts/api-design-doc.md
    description: API Design Doc
  - path: ../artifacts/test-plan.md
    description: Test Plan
---
```

### `cairn my`

Show all tasks assigned to you, grouped by status.

```bash
cairn my
```

Output:

```
📋 My Tasks (pagoda)

🚀 In Progress
  implement-auth
    launch-app
    Build OAuth2 authentication flow

⚠️  Blocked
  deploy-api
    launch-app
    Need production credentials

📝 Review
  setup-database
    launch-app
    Waiting for approval
```

### `cairn start`

Start working on a task (sets status to `in_progress`).

```bash
cairn start implement-auth
cairn start build-api --project launch-app
```

### `cairn note`

Add a quick note to the task's work log.

```bash
cairn note implement-auth "Found OAuth library: passport.js"
cairn note implement-auth "Tests passing locally"
```

### `cairn done`

Mark task as complete. Status depends on autonomy level:

- `autonomy: execute` → `completed`
- `autonomy: draft` → `review` (requires approval)

```bash
cairn done implement-auth
```

### `cairn block` / `cairn unblock`

Mark a task as blocked with an explanation, or resume it.

```bash
cairn block implement-auth "Waiting for API credentials from client"
cairn unblock implement-auth "Got credentials"
```

### `cairn view`

Display full task content.

```bash
cairn view implement-auth
```

### `cairn active`

Show all tasks currently `in_progress` (across all assignees).

```bash
cairn active
```

### `cairn status`

Workspace overview with task counts.

```bash
cairn status
```

Output:

```
📊 Workspace Status

All Tasks
  Pending:      29
  In Progress: 5
  Blocked:     9
  Review:      10
  Completed:   1

My Tasks (pagoda)
  Pending:      8
  In Progress: 4
  ...
```

### `cairn search`

Find tasks by keyword in title, description, or content.

```bash
cairn search "authentication"
cairn search "oauth" --project launch-app
```

### `cairn edit`

Open task in `$EDITOR` for manual editing.

```bash
cairn edit implement-auth
```

### `cairn list`

List and filter tasks.

```bash
# Show all in-progress tasks
cairn list tasks --status in_progress

# Show my pending tasks
cairn list tasks --status pending --assignee pagoda

# Show overdue tasks
cairn list tasks --overdue

# Filter by project
cairn list tasks --project launch-app

# Multiple statuses
cairn list tasks --status pending,in_progress
```

### `cairn log`

Add a detailed work log entry to a task.

```bash
cairn log implement-auth "Implemented OAuth2 flow with GitHub provider"
cairn log implement-auth "Fixed edge case in token refresh" --title "Bug Fix"
```

### `cairn update`

Update task properties programmatically.

```bash
cairn update implement-auth --add-artifact "../artifacts/design-doc.md"
cairn update implement-auth --remove-artifact "../artifacts/old-doc.md"
```

**Note:** The `cairn artifact` command is the recommended way to create and link artifacts. Use `cairn update` for manual adjustments.

### `cairn triage`

Process inbox items interactively — create tasks, delete, or skip.

```bash
cairn triage
```

### `cairn doctor`

Check workspace health and diagnose issues.

```bash
cairn doctor
```

Validates:

- Workspace structure
- Context files (`AGENTS.md`, `.cairn/planning.md`)
- Task frontmatter format
- File organization

### `cairn update-skill`

Refresh `AGENTS.md` and `.cairn/planning.md` with the latest templates (e.g., after a CLI update).

```bash
cairn update-skill
```

### `cairn upgrade`

Check for a new CLI version and install it.

```bash
cairn upgrade
```

### `cairn learn`

Show Cairn system overview and available documentation.

```bash
cairn learn
```

## File format

All files use YAML frontmatter + markdown sections.

**Charter** (`charter.md`):

```yaml
---
title: Launch App
status: in_progress
priority: 1
default_autonomy: draft
---
## Why This Matters
## Success Criteria
## Context
## Work Log
```

**Task** (`tasks/setup-database.md`):

```yaml
---
title: Set up database
assignee: agent-name
status: pending
autonomy: draft
artifacts:
  - path: ../artifacts/schema-design.md
    description: Database schema design
---
## Objective
## Work Log
```

The agent logs all work in the `## Work Log` section with timestamps and its name.

## Artifacts

Artifacts are deliverables created during a task: design docs, proposals, diagrams, code snippets, test plans, etc.

### Creating artifacts

Use `cairn artifact` to create an artifact and link it to a task:

```bash
cairn artifact <task-slug> "<artifact-name>"
```

**Example:**

```bash
# Working on a task
cairn start implement-auth

# Create design document
cairn artifact implement-auth "OAuth Design"

# Create test plan
cairn artifact implement-auth "Test Plan" --description "End-to-end OAuth testing"

# Open artifact in editor immediately
cairn artifact implement-auth "Security Review" --open
```

### Artifact storage

Artifacts are stored in `projects/{project}/artifacts/` and referenced using relative paths:

```
projects/
  launch-app/
    charter.md
    artifacts/
      oauth-design.md          # Created by: cairn artifact
      test-plan.md
      security-review.md
    tasks/
      implement-auth.md        # References: ../artifacts/oauth-design.md
```

### Artifact frontmatter

Tasks reference artifacts in their frontmatter:

```yaml
---
title: Implement authentication
artifacts:
  - path: ../artifacts/oauth-design.md
    description: OAuth Design
  - path: ../artifacts/test-plan.md
    description: Test Plan
---
```

You can reference artifacts as:

- Simple path: `../artifacts/oauth-design.md`
- Object with description:
  ```yaml
  - path: ../artifacts/oauth-design.md
    description: OAuth Design
  ```

### When to create artifacts

Create artifacts when you need:

- Design documents or technical proposals
- Test plans or QA checklists
- Architecture diagrams or flow charts
- Research findings or analysis
- API specifications
- Meeting notes or decision records
- Code snippets or examples
- Any deliverable that complements the task

Artifacts stay with the project, making it easy to reference past decisions and share context across tasks.

## Workflow examples

### Starting a new project

```bash
# Create the project
cairn create project "Launch App" \
  --description "Ship the MVP by March" \
  --objective "Validate the idea with real users" \
  --criteria "App live on production, 10 beta signups"

# Create initial tasks
cairn create task "Set up database" \
  --project launch-app \
  --description "Configure Supabase tables" \
  --objective "Database schema matches data model"

cairn create task "Build API" \
  --project launch-app \
  --description "Create REST endpoints" \
  --objective "All CRUD operations working"

# Check status
cairn status
```

### Working on a task with artifacts

```bash
# Start the task
cairn start implement-auth

# Create design doc
cairn artifact implement-auth "OAuth Design" --open

# [Work on design doc in editor]

# Add progress notes
cairn note implement-auth "Decided on passport.js for OAuth"
cairn note implement-auth "GitHub and Google providers configured"

# Create test plan
cairn artifact implement-auth "Test Plan"

# [Implement the feature]

# Add final log entry
cairn log implement-auth "OAuth flow complete with GitHub and Google. Tests passing."

# Mark as done
cairn done implement-auth
```

### Managing your workload

```bash
# See what you're working on
cairn my

# Check workspace overview
cairn status

# Find related tasks
cairn search "authentication"

# See all active work
cairn active
```

### Getting unstuck

```bash
# Block a task
cairn block implement-auth "Waiting for API credentials from client"

# Later, when unblocked
cairn unblock implement-auth "Got credentials"
```

## Troubleshooting

```bash
cairn doctor              # Diagnose issues
cairn onboard --force     # Regenerate context files
cairn update-skill        # Refresh templates after CLI update
cairn upgrade             # Update to latest CLI version
```

Common issues:

**"Task not found"**

- Check slug format: lowercase, hyphens, no spaces
- Verify task exists: `cairn view <task-slug>`
- Specify project: `cairn start <task> --project <project>`

**"Workspace not found"**

- Run `cairn onboard` to set up workspace
- Or run `cairn doctor` to check configuration

**"Invalid frontmatter"**

- Run `cairn doctor` to validate all files
- Check for proper YAML format (no tabs, correct indentation)

## Best practices

### For humans

1. **Let the agent manage statuses** — ask it to start tasks (`cairn start`), finish them (`cairn done`), or block them (`cairn block`)
2. **Review artifacts** — when tasks move to `review`, check the linked artifacts for deliverables
3. **Use `cairn my`** to see the agent's current workload
4. **Set autonomy appropriately** — use `draft` for code changes, `execute` for direct actions

### For AI agents

1. **Always update status** — `start` when beginning, `done` when finishing, `block` when stuck
2. **Use `cairn note` frequently** — keep humans informed of progress
3. **Create artifacts for deliverables** — design docs, proposals, plans, etc.
4. **Check `cairn my` before starting new work** — understand your current workload
5. **Never manually edit status** — use CLI commands (`cairn start`, `cairn done`, etc.)
6. **Log decisions and blockers** — use the work log to explain what happened and why

## Integration with AI workflows

Cairn is designed to work with any AI agent that can:

- Read files (markdown with YAML frontmatter)
- Execute shell commands (`cairn` CLI)
- Follow a workflow (statuses, artifacts, logging)

**Context files:**

- `AGENTS.md` — Quick reference for the agent (statuses, commands, rules)
- `.cairn/planning.md` — Detailed guide for creating projects and tasks

These files are auto-generated during `cairn onboard` and updated with `cairn update-skill`.

**Agent workflow:**

1. Human: "Build an authentication system"
2. Agent: Creates project and tasks using `cairn create`
3. Agent: Starts task with `cairn start implement-auth`
4. Agent: Creates design doc with `cairn artifact implement-auth "OAuth Design"`
5. Agent: Works on implementation, logs progress with `cairn note`
6. Agent: Finishes and runs `cairn done implement-auth`
7. Task moves to `review` (if `autonomy: draft`) or `completed` (if `autonomy: execute`)
8. Human: Reviews artifacts and approves work

## Community & Support

- **[GitHub Discussions](https://github.com/letcairnwork/cairn-cli/discussions)** — Ask questions, share ideas, show what you're building, and give feedback. This is the best place to connect.
- **[GitHub Issues](https://github.com/letcairnwork/cairn-cli/issues)** — Bug reports only. For feature requests and questions, use Discussions.
- **[Twitter/X @letcairnwork](https://x.com/letcairnwork)** — Follow for updates, or drop a quick question.

New here? [Introduce yourself in Discussions](https://github.com/letcairnwork/cairn-cli/discussions/categories/introductions) — we'd love to hear what you're working on.

## Contributing

Contributions are welcome! If you have an idea for a feature or improvement, [start a discussion](https://github.com/letcairnwork/cairn-cli/discussions) first so we can talk through the approach before you invest time in a PR.

Found a bug? [Open an issue](https://github.com/letcairnwork/cairn-cli/issues).

## What's Next

The roadmap is shaped by community feedback. If there's something you'd like to see, [request it in Discussions](https://github.com/letcairnwork/cairn-cli/discussions/categories/ideas).

## License

MIT

## Worker Management

If your workspace includes a `workers/` folder with AI worker definitions, you can manage and view them using the `cairn worker` command:

```bash
# List all available workers
cairn worker list

# View a worker's full soul file
cairn worker view engineer

# List skills for a worker
cairn worker skills engineer

# View specific skill content
cairn worker skill engineer typescript
```

**Worker Structure:**
Workers are expected to follow the nested folder structure:

- `workers/{name}/{name}.md` - Main worker soul file with frontmatter
- `workers/{name}/skills/*.md` - Optional skills folder with specialized knowledge

The CLI will automatically discover workers in:

- `{workspace}/workers/` - Within your workspace
- `{workspace-parent}/workers/` - Adjacent to your workspace
