# Logs & Caches Index

This file is a **thin index** so OpenClaw can load only the log it needs without pulling the entire history into context.

## Log Files (Separated)

- `LOG_PROJECTS.md` — Project registry and active focus
- `LOG_CHARTERS.md` — Charter records
- `LOG_CONFLICTS.md` — Conflicts, gates, and routing
- `LOG_DECISIONS.md` — Decision history
- `LOG_ACTIVITY.md` — Detailed activity log

## Context Digests (Per Project)

Maintain a short digest per Project ID to reduce token use. Update when significant milestones occur.

### <Project ID> — Context Digest

- updated_at:
- summary:
- pointers:
  - LOG_ACTIVITY.md:<anchor>
  - LOG_DECISIONS.md:<anchor>

## Read Guidance

- Load only the specific log file and section required for the task.
- Avoid loading all logs at once.
- Use Context Digests to build minimal subagent payloads.
