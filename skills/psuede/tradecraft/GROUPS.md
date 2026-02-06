# Tradecraft Groups API

Create and manage collaborative trading groups.

**Main Documentation:** [skills.md](https://tradecraft.finance/skills.md)

---

## List My Groups

Get all groups you are a member of.

**Endpoint:** `GET /groups`

**Scopes:** `groups:read`

```bash
curl -X GET "https://api.tradecraft.finance/v1/groups" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": 1,
        "name": "Alpha Traders",
        "description": "Private trading group",
        "isPublic": false,
        "tradingEnabled": true,
        "positionsVisible": true,
        "memberCount": 12,
        "maxMembers": 50,
        "avatarUrl": "https://...",
        "ownerId": 100,
        "role": "owner",
        "joinedAt": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

---

## Create Group

**Endpoint:** `POST /groups`

**Scopes:** `groups:write`

**Request Body:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Group name |
| `description` | string | No | - | Group description |
| `isPublic` | boolean | No | false | Public visibility |
| `tradingEnabled` | boolean | No | true | Enable trading |
| `positionsVisible` | boolean | No | true | Share positions |
| `maxMembers` | integer | No | 50 | Max members (2-50) |
| `avatarUrl` | string | No | - | Group avatar URL |

```bash
curl -X POST "https://api.tradecraft.finance/v1/groups" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Trading Group",
    "description": "A group for discussing trades",
    "tradingEnabled": true,
    "positionsVisible": true,
    "maxMembers": 25
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "group": {
      "id": 2,
      "name": "My Trading Group",
      "inviteCode": "abc123xyz456",
      "isPublic": false,
      "tradingEnabled": true,
      "positionsVisible": true,
      "memberCount": 1,
      "maxMembers": 25,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Get Group Details

**Endpoint:** `GET /groups/:groupId`

**Scopes:** `groups:read`

```bash
curl -X GET "https://api.tradecraft.finance/v1/groups/1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Update Group

**Endpoint:** `PATCH /groups/:groupId`

**Scopes:** `groups:write` (owner only)

---

## Delete Group

**Endpoint:** `DELETE /groups/:groupId`

**Scopes:** `groups:write` (owner only)

---

## Join Group

**Endpoint:** `POST /groups/join`

**Scopes:** `groups:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inviteCode` | string | Yes | 12-character invite code |

```bash
curl -X POST "https://api.tradecraft.finance/v1/groups/join" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "abc123xyz456"
  }'
```

---

## Leave Group

**Endpoint:** `POST /groups/:groupId/leave`

**Scopes:** `groups:write`

---

## Get/Regenerate Invite Code

**Get:** `GET /groups/:groupId/invite` (members)
**Regenerate:** `POST /groups/:groupId/invite` (owner only)

---

## Get Group Members

**Endpoint:** `GET /groups/:groupId/members`

**Scopes:** `groups:read`

---

## Remove/Ban Member

**Endpoint:** `DELETE /groups/:groupId/members/:userId`

**Scopes:** `groups:write` (owner only)

---

## Update Member

**Endpoint:** `PATCH /groups/:groupId/members/:userId`

**Scopes:** `groups:write`

Mute/unmute (owner) or update own settings (self).

---

## Get/Unban Banned Users

**Get bans:** `GET /groups/:groupId/bans` (owner)
**Unban:** `DELETE /groups/:groupId/bans/:userId` (owner)

---

## Get Group Messages

**Endpoint:** `GET /groups/:groupId/messages`

**Scopes:** `groups:read`

**Note:** Fetching messages automatically marks them as read (when not paginating with `before` cursor). This simplifies API usage - no need to separately call `/read`.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max: 100) |
| `before` | string | - | Message ID cursor for pagination |

```bash
curl -X GET "https://api.tradecraft.finance/v1/groups/1/messages?limit=50" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": 100,
        "username": "trader_alice",
        "content": "Just bought some SOL!",
        "messageType": "text",
        "metadata": {},
        "edited": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "replyTo": null
      }
    ],
    "pagination": {
      "hasMore": true,
      "nextCursor": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

---

## Send Message

**Endpoint:** `POST /groups/:groupId/messages`

**Scopes:** `groups:write`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Message content |
| `messageType` | string | No | Default: "text" |
| `metadata` | object | No | Additional data |
| `replyToId` | string | No | ID of message to reply to |

```bash
curl -X POST "https://api.tradecraft.finance/v1/groups/1/messages" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello everyone!"
  }'
```

---

## Toggle Message Reaction

Add or remove an emoji reaction on a message (toggle behavior).

**Endpoint:** `POST /groups/:groupId/messages/:messageId/reactions`

**Scopes:** `groups:write`

**Allowed Emojis:** `👍`, `❤️`, `🔥`, `😂`, `🚀`, `😮`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `emoji` | string | Yes | One of the allowed emojis |

```bash
curl -X POST "https://api.tradecraft.finance/v1/groups/1/messages/550e8400-e29b-41d4-a716-446655440000/reactions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": "👍"
  }'
```

**Response (reaction added):**

```json
{
  "success": true,
  "data": {
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "emoji": "👍",
    "action": "added",
    "reactions": {
      "👍": {
        "count": 3,
        "users": [
          { "userId": 100, "username": "trader_alice" },
          { "userId": 101, "username": "trader_bob" }
        ]
      }
    }
  }
}
```

**Response (reaction removed - same request again):**

```json
{
  "success": true,
  "data": {
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "emoji": "👍",
    "action": "removed",
    "reactions": {
      "👍": {
        "count": 2,
        "users": [{ "userId": 100, "username": "trader_alice" }]
      }
    }
  }
}
```

---

## Get Message Reactions

**Endpoint:** `GET /groups/:groupId/messages/:messageId/reactions`

**Scopes:** `groups:read`

```bash
curl -X GET "https://api.tradecraft.finance/v1/groups/1/messages/550e8400-e29b-41d4-a716-446655440000/reactions" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Mark Messages as Read (Optional)

**Endpoint:** `POST /groups/:groupId/read`

**Scopes:** `groups:write`

**Note:** This endpoint is optional. Messages are automatically marked as read when you fetch them via `GET /messages`. Use this only if you need to mark messages as read without fetching them.

---

## Get Unread Count

**Endpoint:** `GET /groups/:groupId/unread`

**Scopes:** `groups:read`

---

## Get Group Positions

Get shared positions from group members.

**Endpoint:** `GET /groups/:groupId/positions`

**Scopes:** `groups:read`, `trade:read`

```bash
curl -X GET "https://api.tradecraft.finance/v1/groups/1/positions" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Note:** `userId` is only shown for your own positions. Others show `userId: null` for privacy.

---

## Error Codes

| Code                  | HTTP | Description                           |
| --------------------- | ---- | ------------------------------------- |
| `NOT_A_MEMBER`        | 403  | Not a member of this group            |
| `NOT_GROUP_MEMBER`    | 403  | Not a member of the specified group   |
| `INVALID_INVITE_CODE` | 400  | Invalid or malformed invite code      |
| `FORBIDDEN`           | 403  | Banned or insufficient permissions    |
| `BAD_REQUEST`         | 400  | Already a member or group is full     |
| `USER_MUTED`          | 403  | You are muted in this group           |
| `MESSAGE_BLOCKED`     | 400  | Message content was blocked           |
| `MESSAGE_NOT_FOUND`   | 404  | Message doesn't exist or not in group |
| `INVALID_EMOJI`       | 400  | Emoji not in allowed set              |
