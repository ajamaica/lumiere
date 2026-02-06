# Arya Reminders

Workspace skill for natural-language reminders in Spanish, timezone-safe for America/Bogota.

Files:

- SKILL.md: usage
- create-reminder.sh: wrapper
- parse_time.py: NL time parsing
- schedule_cron.py: emits cron job JSON for OpenClaw cron tool

TODO:

- recurring reminders
- Sheets logging via gog
- better Spanish NLP ("pasado mañana", "en la tarde", etc.)
