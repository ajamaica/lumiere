# Feishu Memory Recall Skill

## Overview

This skill allows the agent to recover "lost" context by searching for a specific user's recent messages across **multiple channels** (Direct Messages and Groups).

## Usage

### 1. Find User's Recent Messages (Global Search)

```bash
node skills/feishu-memory-recall/index.js recall --user <open_id> --hours <24>
```

- Scans the DM channel with the user.
- Scans a pre-configured list of "Active Groups".
- Returns a time-sorted list of messages from that user.

### 2. Update Active Group List

The skill maintains a list of groups to scan in `memory/active_groups.json`.

```bash
node skills/feishu-memory-recall/index.js add-group --id <chat_id> --name "Group Name"
```

## Dependencies

- Requires `memory/feishu_token.json` or standard `.env` configuration.
- Shares authentication logic with `feishu-message`.
