# CLI Reference

Complete command documentation for the proactive-tasks skill.

## add-goal

Create a new goal.

```bash
python3 scripts/task_manager.py add-goal <title> [options]
```

**Options:**

- `--priority <low|medium|high>` - Goal priority (default: medium)
- `--context <text>` - Why this goal matters, background info
- `--status <active|paused|completed>` - Initial status (default: active)

**Example:**

```bash
python3 scripts/task_manager.py add-goal "Learn Rust programming" \
  --priority medium \
  --context "Want to build performant CLI tools"
```

## add-task

Add a task to a goal.

```bash
python3 scripts/task_manager.py add-task <goal-title> <task-title> [options]
```

**Options:**

- `--priority <low|medium|high>` - Task priority (default: inherits from goal)
- `--depends-on <task-id>` - Task ID this depends on
- `--estimate <minutes>` - Estimated time to complete

**Example:**

```bash
python3 scripts/task_manager.py add-task "Learn Rust" \
  "Complete Rust Book chapters 1-5" \
  --priority high \
  --estimate 120
```

## next-task

Get the next task to work on (highest priority, no blockers).

```bash
python3 scripts/task_manager.py next-task [options]
```

**Options:**

- `--goal <goal-id>` - Only consider tasks from this goal
- `--max-estimate <minutes>` - Only tasks under this time estimate

**Returns:** JSON with task details or null if nothing to do.

## complete-task

Mark a task as completed.

```bash
python3 scripts/task_manager.py complete-task <task-id> [options]
```

**Options:**

- `--notes <text>` - Completion notes, findings, outcomes

**Example:**

```bash
python3 scripts/task_manager.py complete-task task_001 \
  --notes "Completed chapters 1-5. Ownership model is tricky but makes sense."
```

## update-task

Update task status or properties.

```bash
python3 scripts/task_manager.py update-task <task-id> [options]
```

**Options:**

- `--status <pending|in_progress|blocked|needs_input|completed|cancelled>`
- `--priority <low|medium|high>`
- `--notes <text>` - Add notes

**Example:**

```bash
python3 scripts/task_manager.py update-task task_002 \
  --status needs_input \
  --notes "Need to decide: focus on web dev or systems programming?"
```

## list-goals

List all goals.

```bash
python3 scripts/task_manager.py list-goals [options]
```

**Options:**

- `--status <active|paused|completed>` - Filter by status
- `--priority <low|medium|high>` - Filter by priority

## list-tasks

List tasks for a goal.

```bash
python3 scripts/task_manager.py list-tasks <goal-title> [options]
```

**Options:**

- `--status <pending|in_progress|blocked|needs_input|completed|cancelled>`
- `--priority <low|medium|high>`

## status

Show overall status and stats.

```bash
python3 scripts/task_manager.py status
```

**Output:**

- Active goals count
- Tasks by status
- Recent completions
- Next recommended task
