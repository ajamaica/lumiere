# Briefing Preferences

Customize your daily briefing by editing this file.

---

## Time Settings

```yaml
work_start: 9:00 AM
work_end: 6:00 PM
timezone: PST
```

---

## Briefing Sections

Toggle sections on/off:

```yaml
sections:
  overdue: true
  priorities: true
  calendar: true
  context: true
  focus: true
  weather: false
  quote: false
  tomorrow_preview: false
```

---

## Priority Rules

What should be prioritized first?

```yaml
priority_order:
  1: overdue_items
  2: meetings_today
  3: deadlines_today
  4: blocked_tasks
  5: quick_wins
```

---

## Categories to Highlight

Always boost these categories:

```yaml
highlight_categories:
  - health
  - family
  - client_deadlines
  - revenue_tasks
```

---

## Max Items Per Section

```yaml
limits:
  overdue: 5
  priorities: 5
  context: 5
  calendar: unlimited
```

---

## Tone

```yaml
tone: professional # options: professional, casual, motivational, minimal
```

---

## Custom Additions

Add custom sections or reminders:

```yaml
custom:
  - '💧 Drink water'
  - '🏃 Movement break at 2pm'
```

---

## Weekend Mode

Different briefing for weekends:

```yaml
weekend:
  enabled: true
  lighter_format: true
  include_personal: true
  skip_work_calendar: true
```

---

_Part of AI Daily Briefing by Jeff J Hunter — https://jeffjhunter.com_
