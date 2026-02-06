---
name: todo
description: |
  **macOS Only** - Manage macOS Reminders app via AppleScript.
  Full-featured reminder management: add, list, complete, delete, search, create lists, and more.

  **Note: This skill is macOS-only**, requiring the native Reminders app.

  Use cases:
  - Create reminders with due dates and priorities
  - List reminders from specific lists or incomplete ones
  - Mark reminders as complete/uncomplete
  - Delete reminders
  - Search reminders by title or content
  - Create new reminder lists
  - View today's due reminders
---

# To Do List (Mac)

## ⚠️ System Requirements

**This skill is macOS-only**, requiring the native Reminders app. It will not work on non-Mac systems.

## Feature Overview

This skill bridges macOS Reminders via AppleScript, supporting full reminder lifecycle management:

| Feature           | Command            |
| ----------------- | ------------------ |
| Add reminder      | `todo add`         |
| List reminders    | `todo list`        |
| Mark complete     | `todo complete`    |
| Unmark complete   | `todo uncomplete`  |
| Delete reminder   | `todo delete`      |
| Search reminders  | `todo search`      |
| View lists        | `todo lists`       |
| Create list       | `todo create-list` |
| Today's reminders | `todo today`       |

## Usage

All operations are executed via the `scripts/todo.sh` script:

```bash
./scripts/todo.sh <action> [args...]
```

### 1. Add Reminder

```bash
# Basic usage
./scripts/todo.sh add "title" "notes" "date" "list" "priority" "recur"

# Example: Simple reminder
./scripts/todo.sh add "Buy milk" "" "" "" 0 ""

# Example: With due date
./scripts/todo.sh add "Submit report" "Q4 summary" "2025-02-10 14:00" "" 1 ""

# Example: Add to specific list
./scripts/todo.sh add "Buy eggs" "Buy 12" "" "Shopping" 5 ""

# Example: High priority + list + date
./scripts/todo.sh add "Important meeting" "Client call" "2025-02-05 10:00" "Work" 1 ""
```

**Priority levels:**

- `0` = No priority
- `1` = High (🔴)
- `5` = Medium (🟡)
- `9` = Low (🔵)

### 2. List Reminders

```bash
# List incomplete reminders from default list
./scripts/todo.sh list

# List from specific list
./scripts/todo.sh list "Shopping"

# Include completed reminders
./scripts/todo.sh list "" true

# List all from specific list (including completed)
./scripts/todo.sh list "Work" true
```

### 3. Mark Complete/Uncomplete

```bash
# Mark complete (supports fuzzy matching)
./scripts/todo.sh complete "Buy milk"

# Unmark complete
./scripts/todo.sh uncomplete "Buy milk"
```

### 4. Delete Reminder

```bash
# Delete reminder (supports fuzzy matching)
./scripts/todo.sh delete "Buy milk"
```

⚠️ Deletion is irreversible. Use with caution.

### 5. Search Reminders

```bash
# Search by keyword in title or content
./scripts/todo.sh search "meeting"
```

### 6. Manage Lists

```bash
# View all lists with stats
./scripts/todo.sh lists

# Create new list
./scripts/todo.sh create-list "Study Plan"
```

### 7. Today's Due Reminders

```bash
# View today's incomplete due reminders
./scripts/todo.sh today
```

## Full Example Workflow

```bash
# 1. Create a work list
./scripts/todo.sh create-list "Work"

# 2. Add work tasks
./scripts/todo.sh add "Finish Q4 report" "Compile data" "2025-02-05 17:00" "Work" 1 ""
./scripts/todo.sh add "Reply to client email" "" "" "Work" 5 ""
./scripts/todo.sh add "Team weekly" "Prepare slides" "2025-02-06 10:00" "Work" 1 ""

# 3. View work list
./scripts/todo.sh list "Work"

# 4. Complete a task
./scripts/todo.sh complete "Reply to client email"

# 5. Check today's todos
./scripts/todo.sh today
```

## User Interaction Tips

When users want to manage todos:

1. **Clarify intent** - Ask what they want to do (add, view, complete, etc.)
2. **Offer shortcuts** - For common actions like "remind me to...", directly call add
3. **Show results** - Display operation results and current list status
4. **Support fuzzy matching** - complete/delete/search all support fuzzy matching

## Notes

1. **Date format** - Supports natural formats like "2025-02-05", "Feb 5, 2025", "tomorrow"
2. **Fuzzy matching** - complete/delete/search use contains matching, no need for full titles
3. **Permissions** - macOS may request permission to control Reminders on first run, click Allow
4. **Sync** - Changes sync to iCloud and appear on other Apple devices
5. **Recurring reminders** - Due to AppleScript limitations, complex recurring settings should be configured manually in the app
