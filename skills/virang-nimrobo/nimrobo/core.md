# Nimrobo CLI Documentation

## Overview

Nimrobo CLI is a command-line tool for interacting with Nimrobo AI APIs. The CLI provides two command namespaces:

1. **Voice Commands** (`nimrobo voice`) - Voice-first AI platform for running interviews, screening, and diagnostic conversations via shareable voice-links
2. **Net Commands** (`nimrobo net`) - Matching network for organizations, job posts, applications, and messaging

Both command namespaces share the same authentication system.

## Installation

```bash
npm install -g nimrobo-cli
```

## Authentication

All commands require authentication via API key stored at `~/.nimrobo/config.json`.

```bash
# Login
nimrobo login

# Logout  
nimrobo logout

# Check status
nimrobo status

# Onboard (set up profile and org from JSON)
nimrobo onboard --file onboard.json
```

## Configuration

**Config file location:** `~/.nimrobo/config.json`

```json
{
  "API_BASE_URL": "https://app.nimroboai.com/api",
  "NET_API_BASE_URL": "https://net-api.nimroboai.com",
  "API_KEY": "api_...",
  "defaultProject": null,
  "context": {
    "orgId": null,
    "postId": null,
    "channelId": null,
    "userId": null
  }
}
```

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (for scripting) |
| `--help` | Show help for command |
| `--version` | Show CLI version |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Error |

## Documentation Structure

| Document | Description |
|----------|-------------|
| [commands.md](./commands.md) | Quick reference for all commands |
| [voice-commands.md](./voice-commands.md) | Detailed Voice commands with examples |
| [net-commands.md](./net-commands.md) | Detailed Net commands with examples |
| [workflow.md](./workflow.md) | Common workflow patterns |

## Input Methods

Commands support multiple input methods:

1. **CLI Flags** - Direct options like `--name "Value"`
2. **JSON Files** - Use `-f ./data.json` for complex inputs
3. **Stdin** - Use `--stdin` to pipe JSON input
4. **Interactive Mode** - Prompts for required fields when flags aren't provided

**Priority:** CLI flags > JSON file > Interactive prompts

## Context System (Net Commands)

Net commands support a context system to avoid repeating IDs:

```bash
# Set context
nimrobo net orgs use org_abc123
nimrobo net posts use post_xyz789

# Use "current" to reference stored context
nimrobo net orgs get current
nimrobo net posts applications current

# View context
nimrobo net context show

# Clear context
nimrobo net context clear
```

## Error Handling

Errors include helpful suggestions:

```
✗ Error: Project not found

  Suggestions:
  • Check the project ID is correct
  • Run 'nimrobo projects list' to see available projects
```
