# Agent usage note (Arya)

When the user asks for a reminder:

1. Derive MESSAGE and WHEN from the user's text.
2. Run:

```bash
bash skills/arya-reminders/create-reminder.sh "<MESSAGE>" "<WHEN>"
```

This prints a JSON job request.

3. Call the `cron` tool with `action=add` and `job=<that JSON object>`.

4. Log to `memory/reminders.md` with job id and human time.

Notes:

- Timezone parsing defaults to America/Bogota.
- Delivery: Telegram chat id 5028608085.
