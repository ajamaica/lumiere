---
name: gog-advanced
description: Reliable Google Workspace CLI skill (gogcli). Defaults to all-calendars for agenda queries; JSON-first; safe writes.
metadata:
  {
    'clawdbot':
      {
        'emoji': '🗂️',
        'requires': { 'bins': ['gog'] },
        'install':
          [
            {
              'id': 'brew',
              'kind': 'brew',
              'formula': 'steipete/tap/gogcli',
              'bins': ['gog'],
              'label': 'Install gogcli (brew)',
            },
          ],
      },
  }
---

# gog-advanced

Use `gog` (gogcli) for Google Workspace: Gmail, Calendar, Drive, Contacts, Sheets, Docs.

This skill is optimized for **agent reliability**:

- Prefer **list/inspect first**, don’t assume resource IDs.
- Prefer **`--json`** for parsing; treat human tables as fallback.
- For “agenda / today / tomorrow / this week” questions: **search across ALL calendars by default**.
- For write actions (send email, create/update events, modify Drive/Sheets/Docs): **confirm intent** and summarize the exact action first.

## Prereqs / Setup (once)

1. Store OAuth client credentials:

- `gog auth credentials /path/to/client_secret.json`

2. Add an account (request only needed services):

- `gog auth add you@gmail.com --services gmail,calendar,drive,contacts,sheets,docs`

3. Make account default to avoid repeating flags:

- `export GOG_ACCOUNT=you@gmail.com`

Notes:

- CLI help is discoverable: `gog --help`, `gog calendar --help`, etc.
- `gog` supports multiple accounts; use `--account` or `GOG_ACCOUNT`. (Prefer env var.)

## Global agent rules (non-negotiable)

1. **Calendar agenda queries**
   - If user asks “what’s on my calendar today / tomorrow / this week / next N days”:
     - Run: `gog calendar events --all --today|--tomorrow|--week|--days N --json`
     - If results are empty, only then troubleshoot (timezone, account, auth status).
   - Only use a specific calendarId if the user explicitly asks for a specific calendar or name.

2. **Calendar identification**
   - If you need a calendarId (because the user wants a specific calendar):
     - Run: `gog calendar calendars --json`
     - Match by calendar name/summary and then query that calendarId.

3. **Timezone**
   - For date-scoped queries, be explicit with `--today/--tomorrow/--week/--days` when possible.
   - If user’s timezone matters or results look off, check with:
     - `gog calendar time --timezone <IANA_TZ>`
   - Prefer returning times in user-local timezone if JSON includes localized fields.

4. **Writes require confirmation**
   - Before:
     - `gog gmail send ...`
     - `gog calendar create ...`
     - `gog calendar update ...`
     - any Sheets update/append/clear
   - Do a “plan” message: recipients/calendar, subject/summary, time range, and ask for “yes”.

## High-signal command recipes

### Calendar: “What’s on my calendar today?”

Default: all calendars.

- `gog calendar events --all --today --json`

Tomorrow / week / next 3 days:

- `gog calendar events --all --tomorrow --json`
- `gog calendar events --all --week --json`
- `gog calendar events --all --days 3 --json`

Search events across time window (keyword):

- `gog calendar search "standup" --days 30 --json`
- `gog calendar search "meeting" --from 2026-02-01T00:00:00Z --to 2026-03-01T00:00:00Z --max 50 --json`

Specific calendar (only when asked):

1. Find calendarId:

- `gog calendar calendars --json`

2. Query it:

- `gog calendar events <calendarId> --today --json`

### Gmail: search + read + send (confirm sends)

Search:

- `gog gmail search 'newer_than:7d' --max 10 --json`
- `gog gmail search 'from:boss@example.com newer_than:30d' --max 20 --json`

Send (REQUIRES CONFIRMATION FIRST):

- `gog gmail send --to a@b.com --subject "Hi" --body "Hello"`

### Drive: find files

- `gog drive search "invoice" --max 10 --json`

### Contacts: list/search

- `gog contacts list --max 50 --json`

### Sheets: safe read/write (confirm writes)

Read:

- `gog sheets get <sheetId> "Tab!A1:D10" --json`

Update (REQUIRES CONFIRMATION FIRST):

- `gog sheets update <sheetId> "Tab!A1:B2" --values-json '[["A","B"],["1","2"]]' --input USER_ENTERED`

Append (REQUIRES CONFIRMATION FIRST):

- `gog sheets append <sheetId> "Tab!A:C" --values-json '[["x","y","z"]]' --insert INSERT_ROWS`

Clear (REQUIRES CONFIRMATION FIRST):

- `gog sheets clear <sheetId> "Tab!A2:Z"`

### Docs: export/cat

- `gog docs export <docId> --format txt --out /tmp/doc.txt`
- `gog docs cat <docId>`

## Troubleshooting checklist (fast)

If calendar results look wrong or empty:

1. Confirm account:

- `gog auth status`

2. List calendars to confirm visibility:

- `gog calendar calendars --json`

3. Ensure you used all-calendars for agenda:

- `gog calendar events --all --today --json`

4. If still empty, verify timezone assumptions:

- `gog calendar time --timezone <IANA_TZ>`
