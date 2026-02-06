# feishu-task

Manage Feishu (Lark) Tasks. Use this for multi-person collaboration and prioritized work items.

## Usage

### Create Task

Create a task and assign it to users.

```bash
node skills/feishu-task/create.js --summary "Task Title" --desc "Details" --due "2026-02-04 10:00" --assignees "ou_1,ou_2"
```

### List Tasks

List recent tasks to check status.

```bash
node skills/feishu-task/list.js --limit 10
```

## Protocol

- **When to use**: Multi-person collaboration, high-priority tracking, or workflow dependencies.
- **Vs Calendar**: Tasks allow "Check-off" status and multiple assignees. Calendar is for time-blocking.
