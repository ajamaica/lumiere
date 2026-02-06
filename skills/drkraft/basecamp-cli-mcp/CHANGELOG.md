# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-01

### Added

#### New Command Groups (12)

- **Comments**: List, get, create, update, delete comments on any recording
- **Vaults**: List, get, create folder hierarchies in Docs & Files
- **Documents**: List, get, create, update text documents
- **Uploads**: List, get uploaded files
- **Schedules**: Get schedule, list/create/update/delete schedule entries
- **Card Tables**: Full Kanban support - tables, columns, cards, card movement
- **Webhooks**: List, get, create, update, delete webhook subscriptions
- **Recordings**: Cross-project listing by type, archive/restore/trash
- **Events**: Activity feed per project
- **Search**: Global search with type/project/creator filters
- **Subscriptions**: List subscribers, subscribe/unsubscribe from recordings
- **Todo Groups**: List and create todolist groups
- **Delete commands**: `todos delete` and `todolists delete` (move to trash)
- **Move command**: `todos move` to move tasks between lists
- **Restore command**: `recordings restore` to restore from archive or trash

#### MCP Server

- New MCP (Model Context Protocol) server with 44 tools
- Full integration with AI assistants (Claude, OpenCode, etc.)
- All tools documented with JSON Schema

#### Infrastructure

- Automatic pagination with `fetchAllPages()` helper
- Retry logic with exponential backoff for 429/5xx errors
- Respects `Retry-After` header from Basecamp
- Test infrastructure with vitest and msw
- Validation script for manual testing

### Changed

- **BREAKING**: Rebranded from `@emredoganer/basecamp-cli` to `@drkraft/basecamp-cli`
- **BREAKING**: Updated User-Agent to `@drkraft/basecamp-cli (contact@drkraft.com)`
- Standardized CLI interface with `--format table|json` for all commands
- Added `--verbose` global flag for debugging
- Moved `basecamp me` to `basecamp people me` for consistency

### Migration from v1.x

1. Update your installation:

```bash
npm uninstall -g @emredoganer/basecamp-cli
npm install -g @drkraft/basecamp-cli
```

2. Update command aliases if you used `basecamp me`:

```bash
# Old
basecamp me

# New
basecamp people me
```

## [1.0.0] - 2024-XX-XX

### Added

- Initial release of Basecamp CLI
- OAuth 2.0 authentication support
- Project management commands
- To-do list and to-do management
- Message board support
- Campfire (chat) support
- People management
- JSON output format support
