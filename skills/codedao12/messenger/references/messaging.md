# Messaging (Send API)

## 1) Send message

- Endpoint: `POST /me/messages`
- Required fields:
  - `recipient` (id)
  - `message` (text or attachment)

## 2) Common message types

- Text: `message.text`
- Attachment: `message.attachment` (image, video, file)
- Quick replies: `message.quick_replies`

## 3) Messaging UX

- Keep messages short.
- Use quick replies for common choices.
- Include fallback text for attachments.

## 4) Read receipts and typing

- `sender_action`: `typing_on`, `typing_off`, `mark_seen`.
