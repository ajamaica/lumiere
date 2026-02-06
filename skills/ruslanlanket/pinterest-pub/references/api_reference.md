# Pinterest API v5 Reference

## Аутентификация

Все запросы должны содержать заголовок:
`Authorization: Bearer <ACCESS_TOKEN>`

## Основные Эндпоинты

### Пользователь

- **Профиль**: `GET /v5/user_account`
  Возвращает информацию о текущем аккаунте.

### Доски (Boards)

- **Список досок**: `GET /v5/boards`
- **Создать доску**: `POST /v5/boards`
  ```json
  {
    "name": "Название доски",
    "description": "Описание",
    "privacy": "PUBLIC"
  }
  ```
- **Удалить доску**: `DELETE /v5/boards/{board_id}`

### Пины (Pins)

- **Список пинов**: `GET /v5/pins`
- **Создать пин**: `POST /v5/pins`
  ```json
  {
    "board_id": "ID_ДОСКИ",
    "title": "Заголовок",
    "description": "Описание",
    "media_source": {
      "source_type": "image_url",
      "url": "https://example.com/image.jpg"
    }
  }
  ```
- **Удалить пин**: `DELETE /v5/pins/{pin_id}`

### Аналитика

- **Аналитика аккаунта**: `GET /v5/user_account/analytics`
- **Аналитика пина**: `GET /v5/pins/{pin_id}/analytics`
  Требуются параметры `start_date` и `end_date` (формат YYYY-MM-DD).

## Области видимости (Scopes)

- `user_accounts:read`
- `boards:read`
- `boards:write`
- `pins:read`
- `pins:write`
- `ads:read` (для аналитики)
