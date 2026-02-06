# Calendar Skill Usage Guide

## Getting Started

Once installed, you can immediately start using the calendar skill to manage your events and schedule.

## Basic Operations

### Creating Events

To create a new event, specify at least the title, date, and time:

```bash
calendar create --title "My Event" --date 2026-02-15 --time 10:00
```

You can also add optional details:

```bash
calendar create \
  --title "Project Meeting" \
  --date 2026-02-15 \
  --time 14:30 \
  --duration 90 \
  --location "Conference Room B" \
  --description "Quarterly project review" \
  --reminder 30
```

### Listing Events

View upcoming events for the next 7 days:

```bash
calendar list
```

Or specify a custom range:

```bash
calendar list --days 30
calendar list --from 2026-02-01 --to 2026-02-28
```

### Managing Events

View details of a specific event:

```bash
calendar get --id EVENT_ID
```

Update an existing event:

```bash
calendar update --id EVENT_ID --title "Updated Title" --location "New Location"
```

Delete an event:

```bash
calendar delete --id EVENT_ID
```

## Reminders

Set a reminder by specifying the number of minutes before the event:

```bash
calendar create --title "Appointment" --date 2026-02-20 --time 09:00 --reminder 60
```

This will trigger a reminder 60 minutes before the event.

## Best Practices

1. Use descriptive titles for easier searching
2. Always include a location if the event has one
3. Set reminders for important events
4. Regularly clean up old events if needed