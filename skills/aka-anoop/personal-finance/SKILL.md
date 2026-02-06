---
name: personal-finance
description: Manage personal finances, track spending by category, set budgets, and receive reminders for EMIs and one-time annual expenses. Use for logging expenses, checking budget status, or setting up financial reminders.
---

# Personal Finance

Track spending, manage budgets, and stay on top of recurring payments (EMIs) and one-time annual expenses using a local SQLite backend.

## Preset Categories

The skill starts with: `Food`, `Rent`, `Utilities`, `Travel`, `Entertainment`, `Shopping`, `Health`, `Misc`.

## Core Features

- **Categorized Tracking**: Log expenses into preset or custom categories.
- **Dynamic Categories**: Add new categories on the fly.
- **SQLite Backend**: All data is stored in `finance.db`.

## Setup

1. Run `scripts/init_db.py` to initialize the database (already done).
2. Ask the user if they want to add custom categories or set budgets for the presets.

## Logging Expenses

Record spends into `finance.db`.
Example: "Spent 500 on Food for lunch" -> Insert into transactions table.

## Scheduled Tasks

- **Weekly Digest**: Summarize SQLite `transactions` table.
- **Reminders**: Check `schedules` table for EMIs and One-time spends.
