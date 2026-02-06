# Arbiter Skill

Agent-side CLI for pushing decisions to [Arbiter Zebu](https://github.com/5hanth/arbiter-zebu). Works with Clawdbot/OpenClaw agents or standalone.

## Install

**Via ClawHub (for Clawdbot/OpenClaw):**

```bash
clawhub install arbiter
```

**Via npm/bun (standalone CLI):**

```bash
bun add -g arbiter-skill
```

## Prerequisites

- [Arbiter Zebu](https://github.com/5hanth/arbiter-zebu) bot running (`bunx arbiter-zebu`)
- `~/.arbiter/queue/` directory (created automatically by the bot)

## CLI Commands

### arbiter-push

Push a decision plan for human review:

```bash
arbiter-push '{
  "title": "API Design Decisions",
  "tag": "my-project",
  "priority": "high",
  "notify": "agent:swe1:main",
  "decisions": [
    {
      "id": "auth",
      "title": "Auth Method",
      "context": "How to authenticate users",
      "options": [
        {"key": "jwt", "label": "JWT tokens"},
        {"key": "session", "label": "Server sessions"},
        {"key": "oauth", "label": "OAuth provider"}
      ]
    },
    {
      "id": "database",
      "title": "Database Choice",
      "context": "Primary datastore",
      "options": [
        {"key": "pg", "label": "PostgreSQL"},
        {"key": "mongo", "label": "MongoDB"}
      ]
    }
  ]
}'
```

Returns:

```json
{
  "planId": "abc123",
  "file": "~/.arbiter/queue/pending/ceo-api-design-abc123.md",
  "total": 2,
  "status": "pending"
}
```

### arbiter-status

Check plan status:

```bash
arbiter-status '{"planId": "abc123"}'
# or by tag
arbiter-status '{"tag": "my-project"}'
```

### arbiter-get

Get answers from a completed plan:

```bash
arbiter-get '{"planId": "abc123"}'
```

Returns:

```json
{
  "planId": "abc123",
  "status": "completed",
  "answers": {
    "auth": "jwt",
    "database": "pg"
  }
}
```

## How It Works

```
arbiter-push writes markdown → ~/.arbiter/queue/pending/
                                      ↓
                    Arbiter Zebu bot detects new file
                                      ↓
                    Human reviews & answers in Telegram
                                      ↓
                    On completion, notification written to
                    ~/.arbiter/queue/notify/
                                      ↓
                    Agent picks up answers (heartbeat or poll)
```

## JSON Fields

### Push args

| Field       | Required | Description                          |
| ----------- | -------- | ------------------------------------ |
| `title`     | Yes      | Plan title                           |
| `tag`       | No       | Project tag for filtering            |
| `context`   | No       | Background for the reviewer          |
| `priority`  | No       | `low` / `normal` / `high` / `urgent` |
| `notify`    | No       | Session key to notify on completion  |
| `decisions` | Yes      | Array of decision objects            |

### Decision object

| Field         | Required | Description                  |
| ------------- | -------- | ---------------------------- |
| `id`          | Yes      | Unique ID within the plan    |
| `title`       | Yes      | Human-readable title         |
| `context`     | No       | Explanation for the reviewer |
| `options`     | Yes      | Array of `{key, label}`      |
| `allowCustom` | No       | Allow free-text answers      |

## Usage with Clawdbot

See [SKILL.md](./SKILL.md) for full agent integration docs.

## License

MIT
