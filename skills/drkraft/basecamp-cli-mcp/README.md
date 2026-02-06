# @drkraft/basecamp-cli

A comprehensive command-line interface and MCP server for Basecamp 4. Manage projects, to-dos, messages, schedules, kanban boards, and more from your terminal or AI assistant.

[![npm version](https://badge.fury.io/js/%40drkraft%2Fbasecamp-cli.svg)](https://www.npmjs.com/package/@drkraft/basecamp-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/drkraft/basecamp-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/drkraft/basecamp-cli)

## Features

- **Full CLI** - 21 command groups covering the complete Basecamp 4 API
- **MCP Server** - 76 tools for AI assistant integration (Claude, etc.)
- **Multiple Output Formats** - Table or JSON output for all commands
- **Pagination & Retry** - Automatic handling of large datasets and rate limits
- **OAuth 2.0** - Secure authentication via browser

## Installation

```bash
npm install -g @drkraft/basecamp-cli
```

Or with bun:

```bash
bun add -g @drkraft/basecamp-cli
```

## Requirements

- Node.js >= 20

## Quick Start

### 1. Create a Basecamp Integration

1. Go to [Basecamp Integrations](https://launchpad.37signals.com/integrations)
2. Click "Register another application"
3. Fill in the details:
   - **Name**: Your app name
   - **Company**: Your company
   - **Website**: Your website
   - **Redirect URI**: `http://localhost:9292/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Configure Credentials

```bash
export BASECAMP_CLIENT_ID="your-client-id"
export BASECAMP_CLIENT_SECRET="your-client-secret"
```

Or configure via CLI:

```bash
basecamp auth configure --client-id "your-client-id"
```

### 3. Login

```bash
basecamp auth login
```

This opens your browser for OAuth authentication.

## CLI Reference

### Authentication

```bash
basecamp auth login          # Login via OAuth
basecamp auth status         # Check auth status
basecamp auth logout         # Logout
```

### Accounts

```bash
basecamp accounts            # List available accounts
basecamp account set <id>    # Set current account
basecamp account current     # Show current account
```

### Projects

```bash
basecamp projects list                                    # List all projects
basecamp projects get <id>                                # Get project details
basecamp projects create --name "Project" --description "Desc"  # Create project
basecamp projects archive <id>                            # Archive project
```

### To-do Lists & To-dos

```bash
# To-do lists
basecamp todolists list --project <id>
basecamp todolists create --project <id> --name "Tasks"
basecamp todolists delete <id> --project <project-id>

# To-dos
basecamp todos list --project <id> --list <list-id>
basecamp todos list --project <id> --list <list-id> --completed
basecamp todos get <id> --project <project-id>
basecamp todos create --project <id> --list <list-id> --content "Task"
basecamp todos create --project <id> --list <list-id> --content "Task" \
  --due "2025-12-31" --assignees "123,456"
basecamp todos update <id> --project <project-id> --content "Updated"
basecamp todos complete <id> --project <project-id>
basecamp todos uncomplete <id> --project <project-id>
basecamp todos delete <id> --project <project-id>
basecamp todos move <id> --project <project-id> --list <target-list-id>

# To-do groups
basecamp todogroups list --project <id>
basecamp todogroups create --project <id> --name "Sprint 1"
```

### Messages

```bash
basecamp messages list --project <id>
basecamp messages get <id> --project <project-id>
basecamp messages create --project <id> --subject "Subject" --content "<p>HTML</p>"
```

### Campfires (Chat)

```bash
basecamp campfires list --project <id>
basecamp campfires lines --project <id> --campfire <campfire-id>
basecamp campfires send --project <id> --campfire <campfire-id> --message "Hello!"
```

### Comments

```bash
basecamp comments list --project <id> --recording <recording-id>
basecamp comments get <id> --project <project-id>
basecamp comments create --project <id> --recording <recording-id> --content "<p>Comment</p>"
basecamp comments update <id> --project <project-id> --content "<p>Updated</p>"
basecamp comments delete <id> --project <project-id>
```

### Documents & Vaults

```bash
# Vaults (folders)
basecamp vaults list --project <id>
basecamp vaults get <id> --project <project-id>
basecamp vaults create --project <id> --vault <parent-vault-id> --title "Folder Name"

# Documents
basecamp documents list --project <id> --vault <vault-id>
basecamp documents get <id> --project <project-id>
basecamp documents create --project <id> --vault <vault-id> --title "Doc" --content "<p>...</p>"
basecamp documents update <id> --project <project-id> --title "New Title"

# Uploads
basecamp uploads list --project <id> --vault <vault-id>
basecamp uploads get <id> --project <project-id>
```

### Schedules

```bash
basecamp schedules get --project <id>
basecamp schedules entries --project <id>
basecamp schedules entries --project <id> --status upcoming
basecamp schedules create-entry --project <id> --summary "Meeting" \
  --starts-at "2025-02-15T10:00:00" --ends-at "2025-02-15T11:00:00"
basecamp schedules update-entry <id> --project <project-id> --summary "Updated"
basecamp schedules delete-entry <id> --project <project-id>
```

### Card Tables (Kanban)

```bash
basecamp cardtables get --project <id>
basecamp cardtables columns --project <id>
basecamp cardtables create-column --project <id> --title "In Progress"
basecamp cardtables cards --project <id> --column <column-id>
basecamp cardtables create-card --project <id> --column <column-id> --title "Card"
basecamp cardtables move-card <card-id> --project <id> --column <new-column-id>
```

### Webhooks

```bash
basecamp webhooks list --project <id>
basecamp webhooks get <id> --project <project-id>
basecamp webhooks create --project <id> --payload-url "https://..."
basecamp webhooks update <id> --project <project-id> --active false
basecamp webhooks delete <id> --project <project-id>
```

### Recordings & Events

```bash
# Recordings (cross-project content)
basecamp recordings list --type Todo
basecamp recordings list --type Message --status archived
basecamp recordings archive <id> --project <project-id>
basecamp recordings restore <id> --project <project-id>
basecamp recordings trash <id> --project <project-id>

# Events (activity feed)
basecamp events list --project <id> --recording <recording-id>
```

### Subscriptions

```bash
basecamp subscriptions list --project <id> --recording <recording-id>
basecamp subscriptions subscribe --project <id> --recording <recording-id>
basecamp subscriptions unsubscribe --project <id> --recording <recording-id>
```

### Search

```bash
basecamp search "keyword"
basecamp search "keyword" --type Todo
basecamp search "keyword" --project <id>
```

### People

```bash
basecamp people list
basecamp people list --project <id>
basecamp people get <id>
basecamp people me
```

## Output Formats

All commands support `--format` flag:

```bash
basecamp projects list --format table   # Default, human-readable
basecamp projects list --format json    # JSON for scripting
```

## Global Options

```bash
basecamp --verbose projects list   # Enable debug output
basecamp -v people me              # Short form
```

## MCP Server

The CLI includes an MCP (Model Context Protocol) server for AI assistant integration.

### Starting the Server

```bash
basecamp-mcp
# Or
bun run mcp
```

### Available Tools (76)

| Category      | Tools                                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Projects      | `basecamp_list_projects`, `basecamp_get_project`, `basecamp_create_project`, `basecamp_archive_project`                                                                                                                                                                  |
| Todo Lists    | `basecamp_list_todolists`, `basecamp_get_todolist`, `basecamp_create_todolist`, `basecamp_delete_todolist`                                                                                                                                                               |
| Todo Groups   | `basecamp_list_todolist_groups`, `basecamp_create_todolist_group`                                                                                                                                                                                                        |
| Todos         | `basecamp_list_todos`, `basecamp_get_todo`, `basecamp_create_todo`, `basecamp_update_todo`, `basecamp_complete_todo`, `basecamp_uncomplete_todo`, `basecamp_delete_todo`, `basecamp_move_todo`                                                                           |
| Messages      | `basecamp_list_messages`, `basecamp_get_message`, `basecamp_create_message`                                                                                                                                                                                              |
| People        | `basecamp_list_people`, `basecamp_get_person`, `basecamp_get_me`                                                                                                                                                                                                         |
| Comments      | `basecamp_list_comments`, `basecamp_get_comment`, `basecamp_create_comment`, `basecamp_update_comment`, `basecamp_delete_comment`                                                                                                                                        |
| Vaults        | `basecamp_list_vaults`, `basecamp_get_vault`, `basecamp_create_vault`, `basecamp_update_vault`                                                                                                                                                                           |
| Documents     | `basecamp_list_documents`, `basecamp_get_document`, `basecamp_create_document`, `basecamp_update_document`                                                                                                                                                               |
| Uploads       | `basecamp_list_uploads`, `basecamp_get_upload`, `basecamp_create_upload`, `basecamp_update_upload`                                                                                                                                                                       |
| Schedules     | `basecamp_get_schedule`, `basecamp_list_schedule_entries`, `basecamp_get_schedule_entry`, `basecamp_create_schedule_entry`, `basecamp_update_schedule_entry`, `basecamp_delete_schedule_entry`                                                                           |
| Card Tables   | `basecamp_get_card_table`, `basecamp_get_column`, `basecamp_create_column`, `basecamp_update_column`, `basecamp_delete_column`, `basecamp_list_cards`, `basecamp_get_card`, `basecamp_create_card`, `basecamp_update_card`, `basecamp_move_card`, `basecamp_delete_card` |
| Search        | `basecamp_search`                                                                                                                                                                                                                                                        |
| Recordings    | `basecamp_list_recordings`, `basecamp_archive_recording`, `basecamp_restore_recording`, `basecamp_trash_recording`                                                                                                                                                       |
| Subscriptions | `basecamp_list_subscriptions`, `basecamp_subscribe`, `basecamp_unsubscribe`                                                                                                                                                                                              |
| Webhooks      | `basecamp_list_webhooks`, `basecamp_get_webhook`, `basecamp_create_webhook`, `basecamp_update_webhook`, `basecamp_delete_webhook`, `basecamp_test_webhook`                                                                                                               |
| Events        | `basecamp_list_events`                                                                                                                                                                                                                                                   |
| Campfires     | `basecamp_list_campfires`, `basecamp_get_campfire_lines`, `basecamp_send_campfire_line`                                                                                                                                                                                  |

### Using with OpenCode/Claude

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "basecamp": {
      "command": "basecamp-mcp",
      "env": {
        "BASECAMP_CLIENT_ID": "<your-client-id>",
        "BASECAMP_CLIENT_SECRET": "<your-client-secret>"
      }
    }
  }
}
```

Or with explicit path:

```json
{
  "mcpServers": {
    "basecamp": {
      "command": "node",
      "args": ["/path/to/node_modules/@drkraft/basecamp-cli/dist/mcp.js"]
    }
  }
}
```

## Environment Variables

| Variable                 | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `BASECAMP_CLIENT_ID`     | OAuth Client ID (required)                                     |
| `BASECAMP_CLIENT_SECRET` | OAuth Client Secret (required)                                 |
| `BASECAMP_REDIRECT_URI`  | OAuth Redirect URI (default: `http://localhost:9292/callback`) |

## API Coverage

This CLI covers the complete Basecamp 4 API Tier 1 domains:

| Domain          | Status   |
| --------------- | -------- |
| Projects        | Complete |
| Todolists       | Complete |
| Todos           | Complete |
| Todolist Groups | Complete |
| Messages        | Complete |
| Campfires       | Complete |
| Comments        | Complete |
| Vaults          | Complete |
| Documents       | Complete |
| Uploads         | Complete |
| Schedules       | Complete |
| Card Tables     | Complete |
| Webhooks        | Complete |
| Recordings      | Complete |
| Events          | Complete |
| Search          | Complete |
| Subscriptions   | Complete |
| People          | Complete |

## Development

```bash
# Clone the repo
git clone https://github.com/drkraft/basecamp-cli
cd basecamp-cli

# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Run validation against real Basecamp
bun run scripts/validate.ts
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.

## Credits

Originally forked from [@emredoganer/basecamp-cli](https://github.com/emredoganer/basecamp-cli).
