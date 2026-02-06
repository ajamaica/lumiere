---
name: remindme
description: ⏰ Fast Telegram reminders for OpenClaw.
tags: [telegram, cron, reminders, productivity, schedule]
metadata:
  {
    'openclaw':
      {
        'summary': '🚀 **Global Reminders Pro:** Ultra-robust multilingual scheduling with Neural-Bridge parsing. Supports 12+ locales, holidays, and verbal shorthand with 100% logic accuracy.',
        'emoji': '⏰',
      },
  }
user-invocable: true
command-dispatch: tool
command_tool: exec
command_template: 'node --import tsx skills/remindme/src/index.ts {args}'
---

# ⏰ Remind Me

The fastest way to schedule Telegram reminders. Precise, reliable.

## 🚀 Quick Usage

- `/remindme call Mom in 5m` (Native shorthand)
- `/remindme tomorrow at 10am meeting` (Standard NLP)
- `/remindme next monday interview at 10` (Contextual morning)
- `/remindme in 1.5 hours stop cooking` (Decimal support)
- `/remindme in year visit London` (Singular unit support)

## ✨ Features

- **Lightning Fast:** Natural language scheduling (in 5m, at 15:00).
- **Deadlock Free:** Optimized specifically for Windows and Telegram gateway.
- **Reliable:** Uses OpenClaw native cron for precision timing.
- **Isolated Sessions:** Reminders won't get lost in busy group chats.

## 🛠️ Details

This skill uses a detached background process to interface with the OpenClaw cron system
