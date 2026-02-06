---
name: omi-me
description: Complete Omi.me integration for memories, action items (tasks), and conversations. Full CRUD + sync capabilities for OpenClaw.
homepage: https://omi.me
metadata:
  openclaw:
    emoji: '🧠'
    requires:
      bins: ['omi', 'omi-token']
      env: ['OMI_API_TOKEN']
---

# Omi.me Integration for OpenClaw

Complete integration with Omi.me to sync and manage memories, action items (tasks), and conversations. Provides CLI tools.

## Table of Contents

- [Setup](#setup)
- [Token Management](#token-management)
- [CLI Commands](#cli-commands)
  - [Memories](#memories)
  - [Action Items / Tasks](#action-items--tasks)
  - [Conversations](#conversations)
  - [Sync](#sync)
- [Usage Examples](#usage-examples)

## Setup

### Automated Setup

```bash
# Run the setup script
bash /home/ubuntu/.openclaw/workspace/skills/omi-me/scripts/setup.sh
```

The setup script will:

1. Create config directory `~/.config/omi-me/`
2. Guide you to configure your API token
3. Create symlinks for `omi` and `omi-token` commands

### Manual Setup

```bash
# Create config directory
mkdir -p ~/.config/omi-me

# Save your API token
echo "omi_dev_your_token_here" > ~/.config/omi-me/token
chmod 600 ~/.config/omi-me/token
```

### Get API Token

1. Visit https://docs.omi.me/doc/developer/api/overview
2. Generate a developer API key
3. Configure using:

```bash
# Interactive (recommended)
omi-token.sh set

# Or manually
echo "your-token" > ~/.config/omi-me/token
```

## Token Management

```bash
omi-token.sh set    # Configure API token interactively
omi-token.sh get    # Print current token
omi-token.sh test   # Test connection to Omi.me
```

### Token File

Default location: `~/.config/omi-me/token`

You can also set via environment variable:

```bash
export OMI_API_TOKEN="your-token"
```

### Files

- `~/.config/omi-me/token` - API token storage

## CLI Commands

### Token Management

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `omi-token.sh set`  | Configure API token interactively |
| `omi-token.sh get`  | Print current API token           |
| `omi-token.sh test` | Test connection to Omi.me         |

### Memories

| Command                                           | Description           |
| ------------------------------------------------- | --------------------- |
| `omi memories list`                               | List all memories     |
| `omi memories get <id>`                           | Get specific memory   |
| `omi memories create "content"`                   | Create new memory     |
| `omi memories create "content" --type preference` | Create with type      |
| `omi memories update <id> "new content"`          | Update memory content |
| `omi memories delete <id>`                        | Delete a memory       |
| `omi memories search "query"`                     | Search memories       |

### Action Items / Tasks

| Command                                                            | Description           |
| ------------------------------------------------------------------ | --------------------- |
| `omi tasks list`                                                   | List all action items |
| `omi tasks get <id>`                                               | Get specific task     |
| `omi tasks create "title"`                                         | Create new task       |
| `omi tasks create "title" --desc "description" --due "2024-01-15"` | Create with details   |
| `omi tasks update <id> --title "new title"`                        | Update task           |
| `omi tasks complete <id>`                                          | Mark as completed     |
| `omi tasks pending <id>`                                           | Mark as pending       |
| `omi tasks delete <id>`                                            | Delete a task         |

### Conversations

| Command                                                                    | Description                 |
| -------------------------------------------------------------------------- | --------------------------- |
| `omi conversations list`                                                   | List all conversations      |
| `omi conversations get <id>`                                               | Get specific conversation   |
| `omi conversations create --title "My Chat" --participants "user1,user2"`  | Create conversation         |
| `omi conversations create --participants "user1,user2" --message "Hello!"` | Create with initial message |
| `omi conversations add-message <id> user "Hello world"`                    | Add message to conversation |
| `omi conversations delete <id>`                                            | Delete a conversation       |
| `omi conversations search "query"`                                         | Search conversations        |

### Sync

| Command                  | Description                    |
| ------------------------ | ------------------------------ |
| `omi sync memories`      | Sync memories from Omi.me      |
| `omi sync tasks`         | Sync action items from Omi.me  |
| `omi sync conversations` | Sync conversations from Omi.me |
| `omi sync all`           | Sync all data                  |

## Usage Examples

### Token Configuration

**Interactive setup:**

```bash
omi-token.sh set
```

**Test connection:**

```bash
omi-token.sh test
```

**Get current token:**

```bash
omi-token.sh get
```

### CLI Examples

**List memories:**

```bash
omi memories list
```

**Create a memory:**

```bash
omi memories create "Caio prefers working in English" --type preference
```

**Create a task:**

```bash
omi tasks create "Review Omi integration" --desc "Check if sync is working" --due "2024-02-01"
```

**Mark task complete:**

```bash
omi tasks complete <task-id>
```

**Create conversation:**

```bash
omi conversations create --title "Team Sync" --participants "alice,bob" --message "Let's discuss the project"
```

**Add message:**

```bash
omi conversations add-message <conv-id> user "I agree!"
```

**Sync all data:**

```bash
omi sync all
```

## Rate Limits

Omi.me API rate limits:

- 100 requests per minute per API key
- 10,000 requests per day per user

The client automatically tracks rate limit headers and handles 429 responses.

## Troubleshooting

### "Token not configured"

```bash
# Configure interactively
omi-token.sh set

# Or check manually
cat ~/.config/omi-me/token

# If empty, add your token
echo "omi_dev_your_token" > ~/.config/omi-me/token
```

### "Connection failed" or 401 error

```bash
# Test connection
omi-token.sh test

# Reconfigure if needed
omi-token.sh set
```

### Permission denied for symlink

```bash
# Use full path instead
bash /home/ubuntu/.openclaw/workspace/skills/omi-me/scripts/omi-cli.sh memories list
```

---
