# Mailgun API Reference

## Authentication

All API requests use HTTP Basic Authentication with the API key as the username.

```
Authorization: Basic api:YOUR_API_KEY
```

## Endpoints

### Send Message

**URL**: `POST https://api.mailgun.net/v3/{domain}/messages`

**Parameters**:

- `from` (required): Sender email address
- `to` (required): Recipient email address
- `subject` (required): Email subject
- `text` (optional): Plain text body
- `html` (optional): HTML body
- `cc` (optional): CC recipients
- `bcc` (optional): BCC recipients
- `attachment` (optional): File attachments

**Example Response (200)**:

```json
{
  "id": "<20240203123456.123456789@mg.yourdomain.com>",
  "message": "Queued. Thank you."
}
```

## Rate Limits

Free tier: 100 emails/hour
Paid tiers: Higher limits based on plan

## Pricing

- Free: 5,000 emails/month for 3 months, then 1,000/month
- Foundation: $15/month for 10,000 emails
- Growth: $65/month for 50,000 emails

See https://www.mailgun.com/pricing/ for current rates.
