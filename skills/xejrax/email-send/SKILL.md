---
name: email-send
description: "Send a quick email via SMTP using `msmtp` without opening a full mail client."
metadata:
  {
    "openclaw":
      {
        "emoji": "📧",
        "requires": { "bins": ["msmtp"] },
        "install":
          [
            {
              "id": "dnf",
              "kind": "dnf",
              "package": "msmtp",
              "bins": ["msmtp"],
              "label": "Install msmtp (dnf)",
            },
          ],
      },
  }
---

# Email Send Skill

Send a quick email via SMTP without opening the full himalaya client. Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars.

## Sending Email

Send a basic email:

```bash
echo "Meeting at 3pm tomorrow." | msmtp recipient@example.com
```

Send with subject and headers:

```bash
printf "To: recipient@example.com\nSubject: Quick update\n\nHey, the deploy is done." | msmtp recipient@example.com
```

## Options

- `--cc` -- carbon copy recipients
- `--bcc` -- blind carbon copy recipients
- `--attach <file>` -- attach a file

## Install

```bash
sudo dnf install msmtp
```
