# Cairn CLI Command Reference

Complete guide to all Cairn commands, optimized for AI agent workflows.

## Quick Start

```bash
# See what you're working on
cairn my

# Start a task
cairn start implement-auth

# Add a quick note
cairn note implement-auth "Found OAuth library: passport.js"

# Mark it done
cairn done implement-auth

# Check status
cairn status
```

## Workflow Commands

### `cairn start <task-slug>`

Start working on a task (sets status to `in_progress`)

```bash
cairn start implement-auth
cairn start build-api --project launch-app
```

### `cairn done <task-slug>`

Mark task as complete. Status depends on autonomy level:

- `autonomy: execute` → `done`
- `autonomy: draft` → `review` (requires approval)

```bash
cairn done implement-auth
```

### `cairn block <task-slug> <message>`

Mark task as blocked with explanation

```bash
cairn block implement-auth "Waiting for API credentials from client"
```

### `cairn unblock <task-slug> [message]`

Resume a blocked task (sets status back to `in_progress`)

```bash
cairn unblock implement-auth "Got credentials"
cairn unblock implement-auth
```

## Information Commands

### `cairn my`

Show all tasks assigned to you, grouped by status (in_progress, blocked, review, pending)

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

...
```

### `cairn active`

Show all tasks currently `in_progress` (across all assignees)

```bash
cairn active
```

### `cairn status`

Workspace overview with task counts

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
  Done:        1

My Tasks (pagoda)
  Pending:      8
  In Progress: 4
  ...
```

### `cairn view <task-slug>`

Display full task content

```bash
cairn view implement-auth
```

### `cairn search <query>`

Find tasks by keyword in title, description, or content

```bash
cairn search "authentication"
cairn search "oauth" --project launch-app
```

## Task Management Commands

### `cairn create task <slug>`

Create a new task (existing command, now with better defaults)

```bash
cairn create task implement-auth \
  --project launch-app \
  --assignee pagoda \
  --status pending \
  --autonomy draft \
  --description "Build OAuth2 authentication flow" \
  --objective "Implement secure authentication using OAuth2..."
```

### `cairn note <task-slug> <message>`

Add a quick note to task work log (lightweight alternative to `cairn log`)

```bash
cairn note implement-auth "Discovered passport.js library"
```

### `cairn log <task-slug> <message>`

Add a detailed work log entry

```bash
cairn log implement-auth "Implemented OAuth2 flow with GitHub provider"
```

### `cairn edit <task-slug>`

Open task in $EDITOR for manual editing

```bash
cairn edit implement-auth
```

### `cairn update <task-slug>`

Update task properties (artifacts, etc.)

```bash
cairn update implement-auth --add-artifact "../artifacts/auth-design.md"
cairn update implement-auth --remove-artifact "../artifacts/old-doc.md"
```

**Note:** Use `cairn artifact` to create and link artifacts automatically. Use `cairn update` only for manual adjustments.

## Artifact Management

### `cairn artifact <task-slug> <artifact-name>`

Create a project artifact and link it to the task

```bash
cairn artifact implement-auth "API Design Doc"
cairn artifact implement-auth "Test Plan" --description "OAuth test coverage"
cairn artifact implement-auth "Architecture Diagram" --open
```

This:

1. Creates `projects/{project}/artifacts/api-design-doc.md`
2. Links it to the task frontmatter with relative path `../artifacts/api-design-doc.md`
3. Supports custom descriptions with `--description`
4. Optionally opens it in your `$EDITOR` (with `--open`)

**Artifact structure:**

```
projects/
  launch-app/
    artifacts/
      api-design-doc.md
      test-plan.md
    tasks/
      implement-auth.md    # References: ../artifacts/api-design-doc.md
```

**Task frontmatter with artifacts:**

```yaml
artifacts:
  - path: ../artifacts/api-design-doc.md
    description: API Design Doc
```

## List & Filter Commands

### `cairn list tasks`

List and filter tasks

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

## Comparison: Old vs New Workflow

**Before (verbose, manual):**

```bash
# Start work
nano ~/pms/projects/launch-app/tasks/implement-auth.md
# ... manually change status: pending → status: in_progress ...

# Check what I'm working on
cairn list tasks --status in_progress --assignee pagoda

# Add a note
cairn log implement-auth "Found OAuth library"

# Finish
nano ~/pms/projects/launch-app/tasks/implement-auth.md
# ... manually change status: in_progress → status: review ...
```

**Now (simple, fast):**

```bash
# Start work
cairn start implement-auth

# Check what I'm working on
cairn my

# Add a note
cairn note implement-auth "Found OAuth library"

# Finish
cairn done implement-auth
```

## Tips for AI Agents

1. **Use `cairn my` to see your current workload** before starting new tasks
2. **Use `cairn note` for quick updates**, `cairn log` for detailed entries
3. **Always update status** - `start` when beginning, `done` when finishing, `block` when stuck
4. **Check `cairn status` periodically** to understand workspace health
5. **Use `cairn search`** to find related tasks before creating duplicates
6. **Create artifacts** using `cairn artifact` for design docs, proposals, and deliverables
7. **Verify tasks exist with `cairn view`** after creating them

## Shell Aliases (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias cm='cairn my'
alias cs='cairn status'
alias ca='cairn active'
```

## Common Workflows

### Starting a new task

```bash
cairn create task my-task --project my-project --assignee me
cairn start my-task
```

### Working on a task

```bash
cairn view my-task              # Review objective
cairn note my-task "Progress update"
cairn artifact my-task "Design Doc"
```

### Finishing a task

```bash
cairn done my-task              # Moves to review or done
```

### Getting unstuck

```bash
cairn block my-task "Need API access"
# ... later ...
cairn unblock my-task "Got access"
```

### Finding tasks

```bash
cairn search "authentication"
cairn my                        # Your tasks
cairn active                    # All active work
```

---

For more information, see the [main README](README.md) or run `cairn --help`.
