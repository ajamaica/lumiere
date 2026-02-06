---
name: local-approvals
description: Local approval system for managing agent permissions. Use CLI to approve/deny requests, view history, and manage auto-approved categories.
---

# Local Approvals Skill

A local approval system that manages agent permissions with auto-approve lists and approval history tracking.

## Quick Start

```bash
# List pending requests
python C:\Users\Shai\.openclaw\skills\local-approvals\cli.py list

# Approve a request
python C:\Users\Shai\.openclaw\skills\local-approvals\cli.py approve abc123

# Deny a request
python C:\Users\Shai\.openclaw\skills\local-approvals\cli.py deny abc123

# Show approval history
python C:\Users\Shai\.openclaw\skills\local-approvals\cli.py history

# Reset an agent's categories
python C:\Users\Shai\.openclaw\skills\local-approvals\cli.py reset assistant
```

## Commands

### approve(id)

Approve a pending request by ID.

```bash
python cli.py approve <request_id> [--learn] [--reviewer <name>]
```

**Options:**

- `--learn`: Add the category to the agent's auto-approve list
- `--reviewer`: Who is approving (default: "user")

**Example:**

```bash
python cli.py approve abc123 --learn
```

### deny(id)

Deny a pending request by ID.

```bash
python cli.py deny <request_id> [--reviewer <name>]
```

**Options:**

- `--reviewer`: Who is denying (default: "user")

**Example:**

```bash
python cli.py deny abc123
```

### list_pending()

List all pending requests, optionally filtered by agent.

```bash
python cli.py list [--agent <agent_id>]
```

**Options:**

- `--agent`: Filter requests by agent ID

**Example:**

```bash
python cli.py list --agent assistant
```

### show_history()

Show approval history from state.json.

```bash
python cli.py history [--limit <number>]
```

**Options:**

- `--limit`: Maximum number of entries to show (default: 20)

**Example:**

```bash
python cli.py history --limit 50
```

### reset_categories(agent)

Reset an agent's auto-approved categories list.

```bash
python cli.py reset <agent_id>
```

**Example:**

```bash
python cli.py reset assistant
```

## Additional Commands

### categories

Show auto-approved categories for one or all agents.

```bash
python cli.py categories [--agent <agent_id>]
```

**Options:**

- `--agent`: Show categories for specific agent

**Example:**

```bash
python cli.py categories --agent planner
```

## State Files

The skill maintains two JSON files in the state directory:

- **state.json**: Auto-approve lists and approval history
- **pending.json**: Pending approval requests

Location: `~/.openclaw/skills/local-approvals/`

## Core Functions

The `core.py` module provides the underlying functionality:

- `check_auto_approve(agent, category)` - Check if a category is auto-approved
- `submit_request(agent, category, operation, reasoning)` - Submit a pending request
- `learn_category(agent, category)` - Add category to auto-approve list
- `get_request(request_id)` - Retrieve a request by ID
- `update_request(request_id, decision, reviewer)` - Update request with decision
- `list_pending(agent)` - List pending requests
- `get_agent_approvals(agent)` - Get agent's auto-approved categories

## Best Practices

1. **Review before approving**: Always check the operation and reasoning before approving
2. **Use auto-learn carefully**: Only use `--learn` for trusted categories that you want to auto-approve
3. **Check history regularly**: Review `history` to understand approval patterns
4. **Reset when needed**: Use `reset` to clear an agent's auto-approve list if you suspect issues

## Examples

### Complete Workflow

```bash
# 1. Check what's pending
python cli.py list

# 2. Review the request details (output shows agent, category, operation, reasoning)
# ID: abc123
#   Agent:     assistant
#   Category:  file_write
#   Operation: Create config file
#   Reasoning: Setting up new environment

# 3. Approve and auto-learn this category for future
python cli.py approve abc123 --learn

# 4. Verify it was approved
python cli.py list  # Should show no pending requests

# 5. Check history
python cli.py history

# 6. View auto-approved categories
python cli.py categories
```

### Managing Categories

```bash
# View all auto-approved categories
python cli.py categories

# View categories for a specific agent
python cli.py categories --agent assistant

# Reset an agent's categories (clear all auto-approvals)
python cli.py reset assistant
```

## Integration

The CLI is designed to be used both interactively and programmatically. Exit codes:

- `0`: Success
- `1`: Error (request not found, agent not found, etc.)

## Files

- `cli.py` - Command-line interface (this file)
- `core.py` - Core approval functions
- `schemas/` - JSON schema definitions
- `schemas/state.json` - State schema template
- `schemas/pending.json` - Pending requests schema template
