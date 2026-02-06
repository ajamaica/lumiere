# Gork Legacy Skill

Replication of the "Gork" assistant functionality within OpenClaw.

## Features

- **Task Management**: AI-powered task extraction from notes and Slack.
- **Daily Note Automation**: Automated rollover of incomplete tasks and template generation.
- **Sync Integrations**:
  - **Slack**: Sync DMs and mentions into the vault.
  - **Strava**: Sync fitness activities and HR zone metrics.
  - **Harvest**: Start/stop timers and summarize billable hours.

## Configuration (TOOLS.md)

Add these to your `TOOLS.md`:

```markdown
### Gork Skill

- SLACK_USER_TOKEN: xoxp-...
- STRAVA_CLIENT_ID: ...
- STRAVA_CLIENT_SECRET: ...
- STRAVA_REFRESH_TOKEN: ...
- HARVEST_ACCESS_TOKEN: ...
- HARVEST_ACCOUNT_ID: ...
- OBSIDIAN_VAULT_PATH: /home/adam/.openclaw/workspace/vault
```

## Database Schema (SQL)

The skill uses a local SQLite database `gork.db` with the following tables:

- `tasks`: Centralized task store.
- `strava_activities`: Fitness history.
- `note_processing_log`: Audit trail for vault changes.

## Logic Implementation

### Task Rollover

Instead of modifying files directly via shell scripts, the OpenClaw agent uses the `read` and `write` tools to:

1. Identify the previous day's daily note.
2. Extract lines matching `- [ ]`.
3. Prepend them to the "Overdue" section of today's note.

### Sync Logic

- **Slack**: Periodic poll via `web_fetch` or a dedicated Python script (as seen in legacy).
- **Strava/Harvest**: REST API calls to fetch data and update the local DB.

## File Conflict Resolution

To avoid Obsidian sync conflicts:

1. **Atomic Writes**: Always read the current file content before writing.
2. **Buffer Scratch**: Users write to a "Scratch" section; OpenClaw clears it only after successful processing and commit.
3. **External DB**: Tasks are mirrored in SQLite to ensure no loss if a file sync fails.
