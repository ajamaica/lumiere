---
name: basecamp-cli
description: CLI and MCP server for Basecamp 4. Use when you need to interact with Basecamp projects, todos, messages, schedules, kanban cards, documents, or campfires. Provides 76 MCP tools for AI-driven project management workflows.
mcp: true
metadata:
  {
    'openclaw':
      {
        'emoji': '🏕️',
        'homepage': 'https://github.com/drkraft/basecamp-cli',
        'primaryEnv': 'BASECAMP_CLIENT_SECRET',
        'requires':
          { 'bins': ['basecamp-mcp'], 'env': ['BASECAMP_CLIENT_ID', 'BASECAMP_CLIENT_SECRET'] },
        'install':
          [
            {
              'id': 'npm',
              'kind': 'node',
              'package': '@drkraft/basecamp-cli',
              'bins': ['basecamp', 'basecamp-mcp'],
              'label': 'Install @drkraft/basecamp-cli (npm)',
              'global': true,
            },
          ],
      },
  }
---

# Basecamp CLI

Full-featured CLI and MCP server for Basecamp 4 API.

## Features

- **21 CLI command groups** covering all Basecamp 4 domains
- **76 MCP tools** for AI assistant integration
- Automatic pagination and retry with exponential backoff
- OAuth 2.0 authentication with PKCE

## Installation

```bash
npm install -g @drkraft/basecamp-cli
```

## Requirements

- Node.js >= 20

## Authentication Setup

1. Create an OAuth app at https://launchpad.37signals.com/integrations
   - Set redirect URI to `http://localhost:9292/callback`
2. Configure credentials:

```bash
basecamp auth configure --client-id <your-client-id>
export BASECAMP_CLIENT_SECRET="<your-client-secret>"
export BASECAMP_CLIENT_ID="<your-client-id>"
```

3. Login:

```bash
basecamp auth login
```

## MCP Server Configuration

Add to your MCP config (e.g., `~/.config/claude/claude_desktop_config.json`):

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

## Available MCP Tools (76)

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

## CLI Quick Reference

```bash
# Projects
basecamp projects list
basecamp projects get <id>

# Todos
basecamp todolists list --project <id>
basecamp todos list --project <id> --list <list-id>
basecamp todos create --project <id> --list <list-id> --content "Task"
basecamp todos complete <id> --project <id>
basecamp todos delete <id> --project <id>
basecamp todos move <id> --project <id> --list <target-list-id>

# Messages
basecamp messages list --project <id>
basecamp messages create --project <id> --subject "Title" --content "<p>Body</p>"

# Kanban
basecamp cardtables get --project <id>
basecamp cardtables cards --project <id> --column <col-id>
basecamp cardtables create-card --project <id> --column <col-id> --title "Card"

# Search
basecamp search "keyword"
basecamp search "keyword" --type Todo --project <id>
```

All commands support `--format json` for JSON output.

## Links

- [Full Documentation](https://github.com/drkraft/basecamp-cli)
- [npm Package](https://www.npmjs.com/package/@drkraft/basecamp-cli)
- [Basecamp API Reference](https://github.com/basecamp/bc3-api)
