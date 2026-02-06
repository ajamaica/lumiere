---
name: sansfiction-library
description: Authorized SansFiction library manager. Adds books to your library, updates reading status, logs progress, and can schedule a daily “how much did you read today?” check-in. Requires a SansFiction personal token (read/write).
homepage: https://sansfiction.com
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': '📚',
        'homepage': 'https://sansfiction.com',
        'requires': { 'bins': ['curl'] },
        'primaryEnv': 'SANSFICTION_TOKEN',
      },
  }
---

# SansFiction Library (Authorized)

## What this skill does

- **Library management (auth required):** add/remove books, set reading status, log progress, view “currently reading”, and reading stats.
- **Daily check-in:** schedule a reminder that asks “How much did you read today?” and then logs what the user reports.

## Hard rules

- **Never ask for or store passwords.** Use a SansFiction token only.
- **Never echo the token back** to the user or write it into chat logs.
- **No side effects without confirmation** when the target book is ambiguous (multiple matches).

---

## Setup (one-time) — get the token

If `SANSFICTION_TOKEN` is missing, do this immediately:

1. Tell the user to open **SansFiction → Connect AI Agents** and use **Manual Token**:
   - Go to: https://sansfiction.com/docs/agents
   - In **Manual Token**, click **Generate token**
   - Copy the token

2. Ask the user to paste the token **once** in this chat.

3. Persist it (recommended):

- In `~/.openclaw/openclaw.json`:
  - `skills.entries.sansfiction-library.apiKey: "<TOKEN>"`
  - (this maps to env var `SANSFICTION_TOKEN`)
- Or set:
  - `skills.entries.sansfiction-library.env.SANSFICTION_TOKEN: "<TOKEN>"`

If you can’t edit config automatically, give the user the exact snippet to paste.

---

## How to talk to SansFiction (MCP over HTTP)

Endpoint:

- `https://sansfiction.com/api/mcp`

Use JSON-RPC with Bearer auth.

### 1) List available tools (discover exact tool names)

```bash
curl -s https://sansfiction.com/api/mcp \
  -H "Authorization: Bearer $SANSFICTION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

2) Call a tool

Replace TOOL_NAME and ARGS with what tools/list returns.

curl -s https://sansfiction.com/api/mcp \
  -H "Authorization: Bearer $SANSFICTION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"TOOL_NAME","arguments":ARGS}}'

Error handling
	•	If you get 401 Unauthorized, auth is missing/invalid. Ask user to regenerate token and update config.
	•	If tools/list is empty, verify the URL is exactly /api/mcp and auth header is present.

⸻

Library management playbook (what to do for each request)

A) Add a book to the user’s library

When user says: “add X” / “put X in my library”
	1.	Use MCP search tools (discover name via tools/list). Prefer search by:
	•	ISBN (best) → exact match
	•	Title + author
	2.	If multiple plausible matches:
	•	Show up to 5 options with distinguishing details (author, year, edition, pages/publisher if available).
	•	Ask the user to pick one.
	3.	Call the “add to library” tool.
	4.	Confirm:
	•	Book added
	•	Current status (ask if they want “to-read” vs “reading”)

B) Set reading status

When user says: “mark as reading/finished/paused/abandoned”
	1.	Resolve the book (same matching rules as above).
	2.	Call the “set status” tool with the exact status enum required by SansFiction.
	•	If the server rejects your status string, use the allowed values from the error/tool schema and retry.
	3.	Confirm the new status.

C) Log progress

When user says: “I read 20 pages” / “I’m at page 150” / “read 30 minutes”
	1.	Ask which book if not explicitly stated AND they have more than one active book.
	2.	Call the “log progress” / “update progress” tool.
	•	Prefer page number if provided.
	•	Otherwise log pages read or minutes read, whichever the tool supports.
	3.	Confirm what was recorded (book + new page/progress + date).

D) List currently reading

When user says: “what am I reading?” / “list currently reading”
	1.	Call the “list library” tool filtered to “currently reading”.
	2.	Return:
	•	Title + author
	•	Current progress (page/% if available)

E) Stats

When user asks: “monthly stats”, “how many books this year”
	1.	Call the “stats” tool(s).
	2.	Summarize clearly (books finished, pages/minutes, streak if available).

⸻

Daily reading reminder (cron)

Goal: once per day, ask:

“How much did you read today? Reply with: book (optional), pages or minutes, and current page if you know it.”

Turn it on

If the user asks for the reminder (or says “enable daily check-in”):
	1.	Schedule a cron job (timezone: Europe/Warsaw) at a reasonable default (21:00 local), unless the user specifies a time.

CLI example:

openclaw cron add \
  --name "SansFiction reading check-in" \
  --cron "0 21 * * *" \
  --tz "Europe/Warsaw" \
  --session isolated \
  --message "Reading check-in: how much did you read today? Reply with pages/minutes and (optionally) which book + your current page." \
  --deliver \
  --channel last

What to do when the user replies

Treat their reply as a progress log:
	•	Parse pages/minutes and optional book/current page.
	•	If book is missing/ambiguous, ask one quick follow-up.
	•	Then log progress via MCP and confirm.

Turn it off

If the user says “disable reading reminder”:
	•	Remove the cron job named SansFiction reading check-in.

⸻

User-facing examples (how users can invoke this skill)
	•	“/sansfiction-library add Project Hail Mary”
	•	“/sansfiction-library mark Dune finished”
	•	“/sansfiction-library log Dune page 150”
	•	“/sansfiction-library what am I currently reading?”
	•	“/sansfiction-library enable daily reading reminder at 20:30”

Sources used: SansFiction MCP endpoint + token flow  [oai_citation:0‡SansFiction](https://sansfiction.com/docs/agents),
OpenClaw skill frontmatter/metadata + config injection  [oai_citation:1‡OpenClaw](https://docs.openclaw.ai/tools/skills),
OpenClaw cron scheduling (for the daily reminder)  [oai_citation:2‡OpenClaw](https://docs.openclaw.ai/automation/cron-jobs).
```
