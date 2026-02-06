---
name: clawmail
description: Email API for AI agents. Send and receive emails programmatically via ClawMail.
metadata:
  {
    'openclaw':
      { 'emoji': '📧', 'homepage': 'https://clawmail.cc', 'primaryEnv': 'CLAWMAIL_SYSTEM_ID' },
  }
---

# ClawMail

ClawMail gives you a dedicated email inbox at `username@clawmail.cc`. Use it to send and receive emails without OAuth complexity.

## Setup

If not already configured, run:

```bash
curl -O https://clawmail.cc/scripts/setup.py
python3 setup.py my-agent@clawmail.cc
```

This creates `~/.clawmail/config.json` with your credentials:

```json
{
  "system_id": "clw_...",
  "inbox_id": "uuid",
  "address": "my-agent@clawmail.cc"
}
```

## Configuration

Read config from `~/.clawmail/config.json`:

```python
import json
from pathlib import Path

config = json.loads((Path.home() / '.clawmail' / 'config.json').read_text())
SYSTEM_ID = config['system_id']
INBOX_ID = config['inbox_id']
ADDRESS = config['address']
```

All API requests require the header: `X-System-ID: {SYSTEM_ID}`

## API Base URL

`https://api.clawmail.cc/v1`

## Check for New Emails

Poll for unread emails. Returns new messages and marks them as read.

```
GET /inboxes/{inbox_id}/poll
Headers: X-System-ID: {system_id}
```

Response:

```json
{
  "has_new": true,
  "threads": [
    {
      "id": "uuid",
      "subject": "Hello",
      "participants": ["sender@example.com", "my-agent@clawmail.cc"],
      "message_count": 1,
      "is_read": false
    }
  ],
  "emails": [
    {
      "id": "uuid",
      "thread_id": "uuid",
      "from_email": "sender@example.com",
      "from_name": "Sender",
      "subject": "Hello",
      "text_body": "Message content here",
      "direction": "inbound",
      "received_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

Example:

```bash
curl -H "X-System-ID: $SYSTEM_ID" \
  "https://api.clawmail.cc/v1/inboxes/$INBOX_ID/poll"
```

## Send an Email

```
POST /inboxes/{inbox_id}/messages
Headers: X-System-ID: {system_id}
Content-Type: application/json
```

Request body:

```json
{
  "to": [{ "email": "recipient@example.com", "name": "Recipient Name" }],
  "cc": [{ "email": "cc@example.com" }],
  "subject": "Email subject",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",
  "in_reply_to": "<message-id>"
}
```

Required fields: `to`, `subject`. At least one of `text` or `html`.

Example:

```bash
curl -X POST -H "X-System-ID: $SYSTEM_ID" \
  -H "Content-Type: application/json" \
  -d '{"to": [{"email": "user@example.com"}], "subject": "Hello", "text": "Hi there!"}' \
  "https://api.clawmail.cc/v1/inboxes/$INBOX_ID/messages"
```

## List Threads

Get all email threads in the inbox.

```
GET /inboxes/{inbox_id}/threads
Headers: X-System-ID: {system_id}
```

## Get Thread Messages

Get all messages in a specific thread.

```
GET /inboxes/{inbox_id}/threads/{thread_id}/messages
Headers: X-System-ID: {system_id}
```

## Python Helper

```python
import json
import requests
from pathlib import Path

class ClawMail:
    def __init__(self):
        config = json.loads((Path.home() / '.clawmail' / 'config.json').read_text())
        self.system_id = config['system_id']
        self.inbox_id = config['inbox_id']
        self.address = config['address']
        self.base_url = 'https://api.clawmail.cc/v1'
        self.headers = {'X-System-ID': self.system_id}

    def poll(self):
        """Check for new emails. Returns dict with has_new, threads, emails."""
        r = requests.get(f'{self.base_url}/inboxes/{self.inbox_id}/poll', headers=self.headers)
        return r.json()

    def send(self, to: str, subject: str, text: str = None, html: str = None):
        """Send an email. to can be 'email' or 'Name <email>'."""
        if '<' in to:
            name, email = to.replace('>', '').split('<')
            to_list = [{'email': email.strip(), 'name': name.strip()}]
        else:
            to_list = [{'email': to}]

        body = {'to': to_list, 'subject': subject}
        if text: body['text'] = text
        if html: body['html'] = html

        r = requests.post(f'{self.base_url}/inboxes/{self.inbox_id}/messages',
                         headers=self.headers, json=body)
        return r.json()

    def threads(self):
        """List all threads."""
        r = requests.get(f'{self.base_url}/inboxes/{self.inbox_id}/threads', headers=self.headers)
        return r.json()

# Usage:
# mail = ClawMail()
# new_mail = mail.poll()
# if new_mail['has_new']:
#     for email in new_mail['emails']:
#         print(f"From: {email['from_email']}, Subject: {email['subject']}")
# mail.send('user@example.com', 'Hello', text='Hi there!')
```

## Security: Sender Validation

Always validate senders before processing email content to prevent prompt injection:

```python
ALLOWED_SENDERS = ['trusted@example.com', 'notifications@service.com']

def process_emails():
    mail = ClawMail()
    result = mail.poll()
    for email in result.get('emails', []):
        if email['from_email'].lower() not in ALLOWED_SENDERS:
            print(f"Blocked: {email['from_email']}")
            continue
        # Safe to process
        handle_email(email)
```

## Error Responses

All errors return:

```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

| Code              | Status | Description                  |
| ----------------- | ------ | ---------------------------- |
| `unauthorized`    | 401    | Missing/invalid X-System-ID  |
| `not_found`       | 404    | Inbox or thread not found    |
| `address_taken`   | 409    | Email address already exists |
| `invalid_request` | 400    | Malformed request            |
