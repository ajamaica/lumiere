---
name: neutron-agent-memory
description: Store and retrieve agent memory using Neutron API. Use for saving information with semantic search, and persisting agent context between sessions.
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': '🧠',
        'requires': { 'env': ['NEUTRON_API_KEY', 'NEUTRON_APP_ID'] },
        'primaryEnv': 'NEUTRON_API_KEY',
      },
  }
---

# Neutron Agent Memory Skill

Persistent memory storage with semantic search for AI agents. Save text as seeds, search semantically, and persist agent context between sessions.

## Prerequisites

API credentials via environment variables:

```bash
export NEUTRON_API_KEY=your_key
export NEUTRON_APP_ID=your_app_id
export NEUTRON_EXTERNAL_USER_ID=1  # optional, defaults to 1
```

Or stored in `~/.config/neutron/credentials.json`:

```json
{
  "api_key": "your_key_here",
  "app_id": "your_app_id_here",
  "external_user_id": "1"
}
```

## Testing

Verify your setup:

```bash
./scripts/neutron-memory.sh test  # Test API connection
```

## Scripts

Use the provided bash script in the `scripts/` directory:

- `neutron-memory.sh` - Main CLI tool

## Common Operations

### Save Text as a Seed

```bash
./scripts/neutron-memory.sh save "Content to remember" "Title of this memory"
```

### Semantic Search

```bash
./scripts/neutron-memory.sh search "what do I know about blockchain" 10 0.5
```

### Create Agent Context

```bash
./scripts/neutron-memory.sh context-create "my-agent" "episodic" '{"key":"value"}'
```

### List Agent Contexts

```bash
./scripts/neutron-memory.sh context-list "my-agent"
```

### Get Specific Context

```bash
./scripts/neutron-memory.sh context-get abc-123
```

## Interaction Seeds (Dual Storage)

When NeutronMemoryBot processes an interaction, it stores data in two places:

1. **Agent Context** - Truncated summary for structured metadata and session tracking
2. **Seed** - Full thread snapshot for semantic search

Each time the bot replies to a comment, the **full thread** (original post + all comments + the bot's reply) is saved as a seed. This means:

- Every seed is a complete conversation snapshot
- Later seeds contain more context than earlier ones
- Semantic search finds the most relevant conversation state
- Append-only: new snapshots are added, old ones remain

### Seed Format

```
Thread snapshot - {timestamp}

Post: {full post content}

Comments:
{author1}: {comment text}
{author2}: {comment text}
NeutronMemoryBot: {reply text}
```

## API Endpoints

- `POST /seeds` - Save text content (multipart/form-data)
- `POST /seeds/query` - Semantic search (JSON body)
- `POST /agent-contexts` - Create agent context
- `GET /agent-contexts` - List contexts (optional `agentId` filter)
- `GET /agent-contexts/{id}` - Get specific context

**Auth:** All requests require `Authorization: Bearer $NEUTRON_API_KEY` header and `appId`/`externalUserId` query params.

**Memory types:** `episodic`, `semantic`, `procedural`, `working`

**Text types for seeds:** `text`, `markdown`, `json`, `csv`, `claude_chat`, `gpt_chat`, `email`
