# VK API & CLI Guide

This reference explains how to use the `vk_cli.js` script and the VK API for community management.

## Типы токенов (User Token vs. Community Token)

Для полноценной работы навыка рекомендуется использовать **User Token (Токен пользователя)**.

### В чем разница:

- **Community Token (Токен сообщества):** Имеет много ограничений. Не может удалять записи со стены, ограничен в методах загрузки медиа. Подходит только для простых ботов в сообщениях.
- **User Token (Токен пользователя):** Дает полные права администратора. Позволяет загружать контент любым способом, редактировать и удалять любые записи.

### Как получить правильный токен:

Токен должен иметь следующие права (scope): `wall,groups,photos,video,messages,offline`.

- `wall, groups, photos, video, messages` — для публикации и управления контентом и сообщениями.
- `offline` — чтобы токен не истекал и его не нужно было обновлять.

**Где взять:**
Используйте [VK Host](https://vkhost.github.io/) или создайте свое приложение на [dev.vk.com](https://dev.vk.com).

## Setup

To use this skill, you need a VK Access Token with the following scopes:

- `wall`
- `groups`
- `photos`
- `video`
- `messages`

## CLI Usage

The CLI is located at `scripts/vk_cli.js`.

### Posting to Wall

```bash
node scripts/vk_cli.js post <token> <owner_id> "Message text" [attachments]
```

- `owner_id`: For communities, this is `-GROUP_ID` (e.g., `-123456`).

### Uploading Photos

```bash
node scripts/vk_cli.js upload-photo <token> <group_id> <file_path>
```

Returns an attachment string like `photo-123456_789012`.

### Uploading Videos

```bash
node scripts/vk_cli.js upload-video <token> <group_id> <file_path> "Title" "Description"
```

Returns an attachment string like `video-123456_789012`.

### Messaging

```bash
node skills/vk/scripts/vk_cli.js message <token> <peer_id> "Hello!" [group_id]
node skills/vk/scripts/vk_cli.js get-messages <token> <peer_id> [count] [group_id]
```

- `group_id`: Optional. Use this to send/read messages as a community when using a User Token.

### Real-time Monitoring (Long Poll)

To receive messages instantly, you must enable Long Poll API in your VK community settings.

#### How to enable Long Poll:

1. Go to your VK Community page.
2. Navigate to **Manage (Управление)** → **API Interaction (Работа с API)** → **Long Poll API**.
3. Set status to **Enabled (Включен)**.
4. Go to **Event Types (Типы событий)** tab.
5. Check **Incoming messages (Входящие сообщения)** and any other events you want to track (e.g., comments).
6. Click **Save**.

#### Using the CLI for Polling:

```bash
node scripts/vk_cli.js poll <token> <group_id> [mark_read] [wait_seconds]
```

- `mark_read`: Set to `1` to automatically mark incoming messages as read.
- `wait_seconds`: Optional limit for the polling session.

## VK API Methods

If the CLI doesn't support a specific method, you can use `fetch` in Node.js or `curl`:

```bash
curl "https://api.vk.com/method/METHOD_NAME?access_token=TOKEN&v=5.131&PARAM1=VALUE1"
```
