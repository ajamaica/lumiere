---
name: send-email
description: Use when sending simple transactional emails or notifications via the SendGrid v3 Mail Send API.
---

# Send Email with SendGrid

## Overview

SendGrid provides a single **Mail Send** endpoint for sending email via the v3 API. The Node SDK (`@sendgrid/mail`) is the recommended integration for JavaScript/TypeScript.

**Use this skill when:**
- Sending transactional emails (welcome, password reset, receipts)
- Sending simple notifications
- You need basic text/HTML emails with optional attachments

## Quick Start

1. **Detect project language** (package.json, requirements.txt, go.mod, etc.)
2. **Install SDK** (preferred) or use cURL - See [references/installation.md](references/installation.md)
3. **Prepare message** with `from`, `to`, `subject`, and `text` or `html`
4. **Send and handle errors** (retry on 429/5xx)

## Required Parameters

| Parameter | Type | Description |
|----------|------|-------------|
| `from` | string | Sender email (must be verified) |
| `to` | string or string[] | Recipient email(s) |
| `subject` | string | Email subject |
| `text` or `html` | string | Email body content |

## Optional Parameters

| Parameter | Type | Description |
|----------|------|-------------|
| `cc` | string or string[] | CC recipients |
| `bcc` | string or string[] | BCC recipients |
| `reply_to` | string | Reply-to address |
| `attachments` | array | Base64-encoded attachments |
| `template_id` | string | Dynamic template ID (if using templates) |
| `dynamic_template_data` | object | Template data (if using templates) |

## Minimal Example (Node.js)

```ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  from: 'Support <support@winkintel.com>',
  to: 'vince@winkintel.com',
  subject: 'Hello from SendGrid',
  text: 'This is a test email.',
  html: '<p>This is a test email.</p>',
});
```

## Templates (Dynamic Templates)

If using SendGrid Dynamic Templates, supply `template_id` and `dynamic_template_data` instead of `html`/`text`.

```ts
await sgMail.send({
  from: 'Support <support@winkintel.com>',
  to: 'vince@winkintel.com',
  templateId: 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  dynamicTemplateData: { first_name: 'Vince' },
});
```

## Best Practices (Short)

- Always set **both** `text` and `html` when possible (deliverability + accessibility).
- Retry **only** on 429 or 5xx errors with exponential backoff.
- Use verified senders; unverified domains will fail.
- Avoid fake addresses at real providers; test with addresses you control.

For deeper details, see:
- [references/best-practices.md](references/best-practices.md)
- [references/single-email-examples.md](references/single-email-examples.md)
