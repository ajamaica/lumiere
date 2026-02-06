# Send Email Skill

OpenClaw skill for sending emails via SMTP using the Python script. Credentials are read from `openclaw.json` → `skills.entries.send-email.env` (no ~/.msmtprc required).

## Features

- ✅ Support for 163, Gmail, QQ, and other SMTP providers
- ✅ Python script with env from openclaw.json
- ✅ Attachment support
- ✅ No ~/.msmtprc or manual SMTP file config needed

## Installation

Place this skill in `workspace/skills/send-email/`. It is then available to the agent.

## Configuration

Configure SMTP in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "send-email": {
        "enabled": true,
        "env": {
          "EMAIL_SMTP_SERVER": "smtp.163.com",
          "EMAIL_SMTP_PORT": "465",
          "EMAIL_SENDER": "your-email@163.com",
          "EMAIL_SMTP_PASSWORD": "YOUR_AUTH_CODE"
        }
      }
    }
  }
}
```

The agent runs `python3 {baseDir}/send_email.py`; OpenClaw injects these env vars at runtime.

## Usage

The agent sends mail by running:

```bash
python3 {baseDir}/send_email.py "recipient@example.com" "Subject" "Body text"
```

With attachment:

```bash
python3 {baseDir}/send_email.py "recipient@example.com" "Subject" "Body" "/path/to/file.pdf"
```

Example prompts:

- "Send an email to user@example.com with subject 'Hello' and body 'Test message'"
- "Email the report.pdf to manager@company.com"
