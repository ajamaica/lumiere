---
name: pinterest
description: Pinterest API v5 integration. Allows creating and reading pins, managing boards, retrieving profile data and analytics. Use this skill when the user needs to automate Pinterest tasks or access account data.
---

# Pinterest API v5 Skill

This skill provides tools and instructions for working with Pinterest API v5.

## Quick Start

1. **Create App**: Follow the guide in [references/setup_guide.md](references/setup_guide.md) to get your `App ID` and `App Secret`.
2. **Get Token**: Run the authorization script:
   ```bash
   python3 scripts/auth.py
   ```
   The script will open a browser, perform OAuth authorization, and output the `Access Token`.

## Core Features

### 1. Pin Management

- **Create Pin**: `POST /v5/pins`
- **Get Pin Info**: `GET /v5/pins/{pin_id}`
- **Delete Pin**: `DELETE /v5/pins/{pin_id}`

### 2. Board Management

- **Create Board**: `POST /v5/boards`
- **List Boards**: `GET /v5/boards`
- **Pins on Board**: `GET /v5/boards/{board_id}/pins`

### 3. Analytics

- **Account Analytics**: `GET /v5/user_account/analytics`
- **Pin Analytics**: `GET /v5/pins/{pin_id}/analytics`

See [references/api_reference.md](references/api_reference.md) for a detailed list of endpoints and request examples.

## Usage Examples

### Creating a Pin (Heuristics)

When creating a pin, you must specify `board_id` and `media_source`.
Request body example:

```json
{
  "title": "My Awesome Pin",
  "description": "Check this out!",
  "board_id": "123456789",
  "media_source": {
    "source_type": "image_url",
    "url": "https://example.com/image.jpg"
  }
}
```

### Getting All Boards

Use `GET /v5/boards` to find the required `board_id` before creating a pin.
