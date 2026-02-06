# PocketSmith Skill

> Manage PocketSmith transactions, categories, and financial data via the API.

**Repository:** https://github.com/lextoumbourou/pocketsmith-skill

## Features

- **Transactions** - List, view, create, update, and delete transactions
- **Categories** - Full CRUD for spending categories
- **User Info** - View authenticated user details
- **Write Protection** - Safe by default, write operations require explicit opt-in

## Installation

### Claude Code

Claude Code can automatically discover and use this skill. Install it as a personal skill (available across all projects) or a project skill (specific to one project).

**Personal skill** (recommended):

```bash
# Clone into your personal skills directory
mkdir -p ~/.claude/skills
cd ~/.claude/skills
git clone https://github.com/lextoumbourou/pocketsmith-skill.git pocketsmith

# Install dependencies
cd pocketsmith
uv sync
```

**Project skill** (for a specific project):

```bash
# Clone into your project's skills directory
mkdir -p .claude/skills
cd .claude/skills
git clone https://github.com/lextoumbourou/pocketsmith-skill.git pocketsmith

# Install dependencies
cd pocketsmith
uv sync
```

Once installed, Claude Code will automatically load the skill when relevant, or you can invoke it directly with `/pocketsmith`.

### OpenClaw

Install as a managed skill (available to all agents) or workspace skill (specific to one workspace).

**Managed skill** (recommended):

```bash
# Clone into your managed skills directory
mkdir -p ~/.openclaw/skills
cd ~/.openclaw/skills
git clone https://github.com/lextoumbourou/pocketsmith-skill.git pocketsmith

# Install dependencies
cd pocketsmith
uv sync
```

**Workspace skill** (for a specific workspace):

```bash
# Clone into your workspace's skills directory
mkdir -p ./skills
cd ./skills
git clone https://github.com/lextoumbourou/pocketsmith-skill.git pocketsmith

# Install dependencies
cd pocketsmith
uv sync
```

### Verify Installation

```bash
cd ~/.claude/skills/pocketsmith  # or respective directory for your setup
uv run pocketsmith --help
```

## Setup

### 1. Get PocketSmith Developer Key

1. Log in to [PocketSmith](https://my.pocketsmith.com/)
2. Go to **Settings** > **Security** > **Manage Developer Keys**
3. Create a new developer key and copy it

### 2. Set Environment Variables

**For Claude Code** (`~/.claude/settings.json`):

```json
{
  "env": {
    "POCKETSMITH_DEVELOPER_KEY": "your_developer_key"
  }
}
```

**For OpenClaw** (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "pocketsmith": {
        "enabled": true,
        "env": {
          "POCKETSMITH_DEVELOPER_KEY": "your_developer_key"
        }
      }
    }
  }
}
```

**For shell usage** (`~/.bashrc` or `~/.zshrc`):

```bash
export POCKETSMITH_DEVELOPER_KEY="your_developer_key"
```

### 3. Enable Write Operations (Optional)

Write operations (create, update, delete) are disabled by default for safety. To enable:

**For Claude Code** (`~/.claude/settings.json`):

```json
{
  "env": {
    "POCKETSMITH_DEVELOPER_KEY": "your_developer_key",
    "POCKETSMITH_ALLOW_WRITES": "true"
  }
}
```

**For OpenClaw** (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "pocketsmith": {
        "enabled": true,
        "env": {
          "POCKETSMITH_DEVELOPER_KEY": "your_developer_key",
          "POCKETSMITH_ALLOW_WRITES": "true"
        }
      }
    }
  }
}
```

**For shell**:

```bash
export POCKETSMITH_ALLOW_WRITES=true
```

### 4. Verify Authentication

```bash
uv run pocketsmith auth status
```

## Usage

### CLI Commands

```bash
# Get current user
uv run pocketsmith me

# List transactions for a user
uv run pocketsmith transactions list-by-user 123456

# Search transactions
uv run pocketsmith transactions list-by-user 123456 --search "coffee" --start-date 2024-01-01

# Get a specific transaction
uv run pocketsmith transactions get 987654

# Update a transaction (requires POCKETSMITH_ALLOW_WRITES=true)
uv run pocketsmith transactions update 987654 --category-id 28637787

# Create a transaction
uv run pocketsmith transactions create 456789 --payee "Coffee Shop" --amount -5.50 --date 2024-01-15

# List categories
uv run pocketsmith categories list 123456

# Create a category
uv run pocketsmith categories create 123456 --title "Subscriptions" --parent-id 28601039

# Get help
uv run pocketsmith --help
uv run pocketsmith transactions --help
uv run pocketsmith categories --help
```

### In Claude Code / OpenClaw

Once the skill is installed, Claude will automatically use it when relevant. Just ask naturally:

- "Show me my PocketSmith transactions from last month"
- "Find all transactions containing 'Netflix'"
- "Categorize transaction 123456 as Subscriptions"
- "Create a new category called 'Side Projects' under Entertainment"
- "List all my spending categories"

You can also invoke the skill directly with `/pocketsmith` to see available commands.

## API Reference

See [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) for implementation details and endpoint coverage.

## Output

All commands output JSON to stdout. Errors are written to stderr.

## Development

```bash
# Install dev dependencies
uv sync --extra dev

# Run tests
uv run pytest tests/ -v

# Run directly
uv run pocketsmith me
```

## Troubleshooting

| Error                                                        | Solution                            |
| ------------------------------------------------------------ | ----------------------------------- |
| `POCKETSMITH_DEVELOPER_KEY environment variable is required` | Set `POCKETSMITH_DEVELOPER_KEY`     |
| `Write operations are disabled`                              | Set `POCKETSMITH_ALLOW_WRITES=true` |
| `401 Unauthorized`                                           | Check your developer key is valid   |
| `404 Not Found`                                              | Check the resource ID exists        |

## License

MIT
