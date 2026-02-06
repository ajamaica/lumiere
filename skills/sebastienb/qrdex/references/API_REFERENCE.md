# QRdex API Reference

Base URL: `https://qrdex.io/api/v1`

## Authentication

All requests require: `Authorization: Bearer YOUR_API_KEY`

API keys are scoped to a team. All QR codes created with a key belong to that team.

## Endpoints

### POST /qr_codes — Create

Request body (nested in `qr_code` object):

| Parameter          | Type    | Required                       | Description                                            |
| ------------------ | ------- | ------------------------------ | ------------------------------------------------------ |
| `title`            | string  | Yes                            | Display name                                           |
| `qr_type`          | string  | Yes                            | `url`, `email`, `telephone`, `sms`, `whatsapp`, `wifi` |
| `url`              | string  | If type=url                    | Target URL                                             |
| `telephone_number` | string  | If type=telephone/sms/whatsapp | Phone number                                           |
| `email_address`    | string  | If type=email                  | Email address                                          |
| `email_subject`    | string  | No                             | Subject for email type                                 |
| `message`          | string  | No                             | Body for sms/whatsapp/email                            |
| `wifi_ssid`        | string  | If type=wifi                   | Network name                                           |
| `wifi_encryption`  | string  | No                             | `WPA`, `WEP`, or `nopass`                              |
| `wifi_password`    | string  | No                             | WiFi password                                          |
| `wifi_hidden`      | boolean | No                             | Hidden network flag                                    |
| `foreground_color` | string  | No                             | Hex color (default: `#000000`)                         |
| `background_color` | string  | No                             | Hex color (default: `#FFFFFF`)                         |
| `shape`            | string  | No                             | QR shape (default: `rounded`)                          |
| `track_scans`      | boolean | No                             | Enable tracking (default: `true`)                      |

Response (201):

```json
{
  "data": {
    "id": 123,
    "title": "My QR",
    "qr_type": "url",
    "short_url": "abc12xyz",
    "full_short_url": "https://qrdex.io/abc12xyz",
    "scans_count": 0,
    "track_scans": true,
    "foreground_color": "#000000",
    "background_color": "#FFFFFF",
    "shape": "rounded",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "image_url": "https://qrdex.io/api/v1/qr_codes/123/image",
    "url": "https://example.com",
    "redirect_url": "https://example.com",
    "has_logo": false
  }
}
```

### GET /qr_codes — List

Query params:

| Parameter  | Type    | Default | Description                                                    |
| ---------- | ------- | ------- | -------------------------------------------------------------- |
| `page`     | integer | 1       | Page number                                                    |
| `per_page` | integer | 25      | Results per page (max 100)                                     |
| `qr_type`  | string  | —       | Filter: `url`, `email`, `telephone`, `sms`, `whatsapp`, `wifi` |

Response includes `meta` with pagination: `page`, `per_page`, `total`, `total_pages`.

### GET /qr_codes/:id — Get Single

Returns full QR code object including all type-specific fields.

### GET /qr_codes/:id/image — SVG Image

Returns `image/svg+xml`. Respects foreground/background color settings.

### PATCH /qr_codes/:id — Update

Same body params as Create, all optional. Only provided fields are updated.

### DELETE /qr_codes/:id — Soft Delete

Returns `{"data": {"id": 123, "deleted": true}}`.

## Error Responses

```json
{ "error": "Description of what went wrong." }
```

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| 200  | OK                                                                |
| 201  | Created                                                           |
| 401  | Invalid or missing API key                                        |
| 403  | No permission                                                     |
| 404  | QR code not found                                                 |
| 422  | Validation error or plan limit reached                            |
| 429  | Rate limited (100 req/min). Check `X-RateLimit-Remaining` header. |
