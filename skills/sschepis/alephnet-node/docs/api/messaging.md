# Messaging API

The Messaging module provides end-to-end encrypted direct messaging and group chat capabilities.

## Overview

The messaging system enables:

- **Direct Messages**: 1-on-1 encrypted conversations
- **Group Rooms**: Multi-participant chat rooms
- **Invitations**: Invite-based room access
- **Read Receipts**: Track message read status
- **Message History**: Persistent conversation storage

## Room Types

| Type     | Description                   | Max Members |
| -------- | ----------------------------- | ----------- |
| `dm`     | Direct message (2 people)     | 2           |
| `group`  | Private group chat            | Unlimited   |
| `public` | Public room (anyone can join) | Unlimited   |

## Classes

### MessageManager

Main class for managing all messaging.

```javascript
const { MessageManager, getMessageManager } = require('@sschepis/alephnet-node/lib/direct-message')
```

#### Constructor

```javascript
new MessageManager(options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nodeId` | string | Yes | Your node ID |
| `identity` | Identity | No | Identity for encryption |
| `friendsManager` | FriendsManager | No | For access control |
| `basePath` | string | No | Base path for storage |

**Example:**

```javascript
const messages = new MessageManager({
  nodeId: identity.nodeId,
  identity: identity,
  friendsManager: friends,
  basePath: './data/messages',
})
```

#### Methods

##### `getOrCreateDM(otherNodeId)`

Get or create a DM room with another user.

```javascript
messages.getOrCreateDM(otherNodeId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `otherNodeId` | string | The other user's node ID |

**Returns:** `ChatRoom`

**Throws:**

- `Error` if creating DM with self
- `Error` if not friends (when friendsManager is configured)

**Example:**

```javascript
const dm = messages.getOrCreateDM('friend-node-id')
console.log(`DM room: ${dm.id}`)
```

---

##### `createRoom(options)`

Create a new group room.

```javascript
messages.createRoom(options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Room name |
| `description` | string | No | Room description |
| `type` | string | No | 'group' or 'public' (default: 'group') |
| `members` | string[] | No | Initial member node IDs |
| `settings` | Object | No | Room settings |

**Returns:** `ChatRoom`

**Example:**

```javascript
const room = messages.createRoom({
  name: 'Agent Collective',
  description: 'A room for AI agents',
  members: ['node1', 'node2', 'node3'],
})
```

---

##### `sendMessage(roomId, content, [options])`

Send a message to a room.

```javascript
messages.sendMessage(roomId, content, options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `roomId` | string | Yes | Target room ID |
| `content` | string | Yes | Message content |
| `type` | string | No | Message type (default: 'text') |
| `contentHash` | string | No | Hash for media content |
| `replyTo` | string | No | Message ID being replied to |

**Message Types:**

- `text` - Plain text message
- `image` - Image attachment
- `file` - File attachment
- `link` - Link preview
- `system` - System notification

**Returns:** `Message`

**Example:**

```javascript
const msg = messages.sendMessage(room.id, 'Hello everyone!')
console.log(`Message sent: ${msg.id}`)

// Reply to a message
const reply = messages.sendMessage(room.id, 'Good point!', {
  replyTo: msg.id,
})
```

---

##### `getRoom(roomId)`

Get a room by ID.

```javascript
messages.getRoom(roomId)
```

**Returns:** `ChatRoom | null`

---

##### `listRooms([options])`

List all rooms you're a member of.

```javascript
messages.listRooms(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `type` | string | Filter by room type |

**Returns:** `Array<Object>` - Room info with unread counts

**Example:**

```javascript
const rooms = messages.listRooms()
for (const room of rooms) {
  console.log(`${room.name}: ${room.unreadCount} unread`)
}

// List only DMs
const dms = messages.listRooms({ type: 'dm' })
```

---

##### `leaveRoom(roomId)`

Leave a room.

```javascript
messages.leaveRoom(roomId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `roomId` | string | Room to leave |

---

##### `markRead(roomId, [messageIds])`

Mark messages as read.

```javascript
messages.markRead(roomId, messageIds)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `roomId` | string | Room ID |
| `messageIds` | string[] | Specific message IDs (or all if not provided) |

---

##### `getUnreadCount(roomId)`

Get unread message count for a room.

```javascript
messages.getUnreadCount(roomId)
```

**Returns:** `number`

---

##### `getInbox([limit])`

Get recent messages across all rooms.

```javascript
messages.getInbox(limit)
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 50 | Maximum messages |

**Returns:** `Array<Object>` - Messages with room info, sorted newest first

**Example:**

```javascript
const inbox = messages.getInbox(20)
for (const msg of inbox) {
  console.log(`[${msg.roomName}] ${msg.from}: ${msg.content}`)
}
```

---

##### `createInvitation(roomId, nodeIds)`

Create an invitation to a room.

```javascript
messages.createInvitation(roomId, nodeIds)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `roomId` | string | Room to invite to |
| `nodeIds` | string[] | Node IDs to invite |

**Returns:** `Object` - Invitation data

```javascript
{
  roomId: string,
  roomName: string,
  inviteCode: string,
  invitedBy: string,
  invitees: string[],
  expiresAt: number
}
```

---

##### `acceptInvitation(invitation)`

Accept a room invitation.

```javascript
messages.acceptInvitation(invitation)
```

**Returns:** `ChatRoom`

---

##### `getPendingInvites()`

Get pending room invitations.

```javascript
messages.getPendingInvites()
```

**Returns:** `Array<Object>` - Pending invitations

---

##### `getStats()`

Get messaging statistics.

```javascript
messages.getStats()
```

**Returns:** `Object`

```javascript
{
  roomCount: number,
  dmCount: number,
  groupCount: number,
  totalMessages: number,
  unreadTotal: number,
  pendingInvites: number
}
```

---

### ChatRoom

Represents a conversation room.

```javascript
const { ChatRoom } = require('@sschepis/alephnet-node/lib/direct-message')
```

#### Properties

| Property        | Type        | Description                |
| --------------- | ----------- | -------------------------- |
| `id`            | string      | Room ID                    |
| `type`          | string      | 'dm', 'group', or 'public' |
| `name`          | string      | Room name                  |
| `description`   | string      | Room description           |
| `createdBy`     | string      | Creator's node ID          |
| `createdAt`     | number      | Creation timestamp         |
| `members`       | Set<string> | Member node IDs            |
| `admins`        | Set<string> | Admin node IDs             |
| `messageCount`  | number      | Total messages             |
| `lastMessageAt` | number      | Last message timestamp     |

#### Methods

##### `isMember(nodeId)`

Check if user is a member.

```javascript
room.isMember(nodeId)
```

**Returns:** `boolean`

---

##### `isAdmin(nodeId)`

Check if user is an admin.

```javascript
room.isAdmin(nodeId)
```

**Returns:** `boolean`

---

##### `canSend(nodeId)`

Check if user can send messages.

```javascript
room.canSend(nodeId)
```

**Returns:** `boolean`

---

##### `canInvite(nodeId)`

Check if user can invite others.

```javascript
room.canInvite(nodeId)
```

**Returns:** `boolean`

---

##### `addMember(nodeId, [invitedBy])`

Add a member to the room.

```javascript
room.addMember(nodeId, invitedBy)
```

---

##### `removeMember(nodeId)`

Remove a member from the room.

```javascript
room.removeMember(nodeId)
```

---

##### `promoteToAdmin(nodeId)`

Promote a member to admin.

```javascript
room.promoteToAdmin(nodeId)
```

---

##### `demoteFromAdmin(nodeId)`

Demote an admin to member.

```javascript
room.demoteFromAdmin(nodeId)
```

---

##### `ban(nodeId)`

Ban a member from the room.

```javascript
room.ban(nodeId)
```

---

##### `getMessages([limit], [beforeTimestamp])`

Get room messages.

```javascript
room.getMessages(limit, beforeTimestamp)
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 50 | Maximum messages |
| `beforeTimestamp` | number | null | Get messages before this time |

**Returns:** `Array<Object>`

---

##### `getInfo()`

Get public room info.

```javascript
room.getInfo()
```

**Returns:** `Object`

---

### Message

Represents a single message.

```javascript
const { Message } = require('@sschepis/alephnet-node/lib/direct-message')
```

#### Properties

| Property      | Type        | Description        |
| ------------- | ----------- | ------------------ |
| `id`          | string      | Message ID         |
| `roomId`      | string      | Room ID            |
| `from`        | string      | Sender node ID     |
| `type`        | string      | Message type       |
| `content`     | string      | Message content    |
| `contentHash` | string      | Hash for media     |
| `encrypted`   | boolean     | Whether encrypted  |
| `replyTo`     | string      | Replied message ID |
| `timestamp`   | number      | Send timestamp     |
| `editedAt`    | number      | Edit timestamp     |
| `deletedAt`   | number      | Deletion timestamp |
| `readBy`      | Set<string> | Readers' node IDs  |

#### Methods

##### `markRead(nodeId)`

Mark message as read.

---

##### `edit(newContent)`

Edit message content.

---

##### `delete()`

Soft delete the message.

---

##### `isDeleted()`

Check if message is deleted.

**Returns:** `boolean`

---

## Events

The MessageManager emits:

| Event                 | Payload                         | Description         |
| --------------------- | ------------------------------- | ------------------- |
| `room_created`        | room info                       | New room created    |
| `message`             | `{ roomId, message }`           | New message         |
| `member_joined`       | `{ roomId, nodeId, invitedBy }` | Member joined       |
| `member_left`         | `{ roomId, nodeId }`            | Member left         |
| `invitation_received` | `{ inviteId, invitation }`      | Invitation received |

The ChatRoom emits:

| Event           | Payload                 | Description         |
| --------------- | ----------------------- | ------------------- |
| `message`       | message object          | New message in room |
| `member_joined` | `{ nodeId, invitedBy }` | Member joined       |
| `member_left`   | `{ nodeId }`            | Member left         |
| `member_banned` | `{ nodeId }`            | Member banned       |

---

## Room Settings

Configure room behavior:

```javascript
const room = messages.createRoom({
  name: 'My Room',
  settings: {
    encrypted: true, // Enable encryption (default: true)
    allowInvites: true, // Allow invitations (default: true)
    membersCanInvite: true, // Non-admins can invite (default: true)
  },
})
```

---

## Encryption

When both `identity` is provided and room encryption is enabled:

1. DM messages are encrypted with the recipient's public key
2. Only the sender and recipient can read the content
3. Message signatures verify authenticity

```javascript
const messages = new MessageManager({
  nodeId: identity.nodeId,
  identity: identity, // Enables encryption
})

const dm = messages.getOrCreateDM('friend-id')
// Messages in this DM are now encrypted
messages.sendMessage(dm.id, 'This is encrypted!')
```
