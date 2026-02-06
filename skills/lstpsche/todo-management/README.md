# todo-management (OpenClaw Skill)

A simple, **per-workspace** todo manager for OpenClaw that stores everything in a local **SQLite** DB (`./todo.db`) and is controlled via a single script (`todo.sh`).

- ✅ Groups (default: `Inbox`)
- ✅ Task statuses: `pending`, `in_progress`, `done`, `skipped`
- ✅ Deterministic CLI (no “creative” file writing)
- ✅ Designed to keep agent replies short (no auto-pasting the full list)

---

## Requirements

- `sqlite3` must be available in your `PATH`
  (Most macOS/Linux systems already have it; otherwise install via your package manager.)

---

## After installation: make the script executable

Depending on how you installed skills, your path may differ. The common one is:

```bash
chmod +x skills/todo-management/scripts/todo.sh
```

If your local setup uses a different skills directory, adjust the path accordingly.

Quick check (should print help text):

```bash
bash skills/todo-management/scripts/todo.sh --help
```

---

## How it works

- The skill ships with a CLI script inside the skill folder:
  - `.../skills/todo-management/scripts/todo.sh`

- The **data** lives in your current working directory (workspace):
  - default DB file: `./todo.db`
  - override location: `TODO_DB=/path/to/todo.db`

So: the script is global (skill asset), but the tasks are local to the project you’re working in.

---

## Examples (CLI)

### Add tasks

```bash
bash skills/todo-management/scripts/todo.sh entry create "Buy milk"
bash skills/todo-management/scripts/todo.sh entry create "Check image feature at work" --group="Work"
```

### List tasks (active by default)

```bash
bash skills/todo-management/scripts/todo.sh entry list
```

### Show everything (including done/skipped)

```bash
bash skills/todo-management/scripts/todo.sh entry list --all
```

### Edit / move / change status

```bash
bash skills/todo-management/scripts/todo.sh entry edit 1 "Buy oat milk"
bash skills/todo-management/scripts/todo.sh entry move 1 --group="Inbox"
bash skills/todo-management/scripts/todo.sh entry status 1 --status=done
```

### Groups

```bash
bash skills/todo-management/scripts/todo.sh group create "Work"
bash skills/todo-management/scripts/todo.sh group rename "Work" "Work (Project A)"
bash skills/todo-management/scripts/todo.sh group remove "Work"          # moves entries to Inbox
bash skills/todo-management/scripts/todo.sh group remove "Work" --delete-entries
```

---

## Example (how the agent should respond)

The skill is configured to be **concise** by default:

```
User: I need to buy milk, add it to my todo list
Agent: Done.

User: Oh, and I also need to clean the room
Agent: Added to the list.

User: Show my todos
Agent: (prints the list)
```

---

## Notes

- This skill intentionally **does not** write `todos.md` or any other files.
- The todo list is only printed when you explicitly ask to show/list it (or when the agent needs IDs to disambiguate a destructive action).
