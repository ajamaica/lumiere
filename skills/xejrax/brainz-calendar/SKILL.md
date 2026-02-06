---
name: calendar
description: "Manage Google Calendar events using `gcalcli`. Create, list, and delete calendar events from the CLI."
metadata:
  {
    "openclaw":
      {
        "emoji": "📅",
        "requires": { "bins": ["gcalcli"] },
        "install":
          [
            {
              "id": "pip",
              "kind": "pip",
              "package": "gcalcli",
              "bins": ["gcalcli"],
              "label": "Install gcalcli (pip)",
            },
          ],
      },
  }
---

# Calendar Skill

Use `gcalcli` to interact with Google Calendar. Requires `GOOGLE_CALENDAR_API_KEY` (or `CALDAV_URL`/`CALDAV_USER`/`CALDAV_PASS` for CalDAV).

## Listing Events

List upcoming events in a date range:

```bash
gcalcli agenda "2026-02-03" "2026-02-10"
```

## Creating Events

Add a new calendar event:

```bash
gcalcli add --title "Team sync" --when "2026-02-04 10:00" --duration 30
```

## Deleting Events

Delete an event by search term:

```bash
gcalcli delete "Team sync"
```

## Install

```bash
pip install gcalcli
```
