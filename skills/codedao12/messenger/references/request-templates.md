# HTTP Request Templates (Send API)

## Send text message

POST `/me/messages`

```json
{
  "recipient": { "id": "PSID" },
  "message": { "text": "Hello from the bot" }
}
```

## Send attachment (image)

POST `/me/messages`

```json
{
  "recipient": { "id": "PSID" },
  "message": {
    "attachment": {
      "type": "image",
      "payload": { "url": "https://example.com/image.jpg" }
    }
  }
}
```

## Quick replies

POST `/me/messages`

```json
{
  "recipient": { "id": "PSID" },
  "message": {
    "text": "Choose one",
    "quick_replies": [
      { "content_type": "text", "title": "A", "payload": "A" },
      { "content_type": "text", "title": "B", "payload": "B" }
    ]
  }
}
```

## Sender actions

POST `/me/messages`

```json
{
  "recipient": { "id": "PSID" },
  "sender_action": "typing_on"
}
```
