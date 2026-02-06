# Friends API

The Friends module manages social relationships between AlephNet nodes.

## Overview

The friends system enables:

- **Friend Requests**: Send, accept, or reject connection requests
- **Relationship Status**: Track the state of relationships
- **Blocking**: Block unwanted contacts
- **Social Graph**: Build a network of trusted connections

## Relationship Status

| Status             | Description                   |
| ------------------ | ----------------------------- |
| `none`             | No relationship exists        |
| `pending_sent`     | You sent a friend request     |
| `pending_received` | You received a friend request |
| `friends`          | Mutual friendship established |
| `blocked`          | You have blocked this user    |

## Classes

### FriendsManager

Main class for managing friend relationships.

```javascript
const { FriendsManager, getFriendsManager } = require('@sschepis/alephnet-node/lib/friends')
```

#### Constructor

```javascript
new FriendsManager(options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nodeId` | string | Yes | Your node ID |
| `storagePath` | string | No | Path to store friends data |

**Example:**

```javascript
const friends = new FriendsManager({
  nodeId: identity.nodeId,
  storagePath: './data/friends.json',
})
```

#### Methods

##### `getRelationship(nodeId)`

Get the relationship status with a node.

```javascript
friends.getRelationship(nodeId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `nodeId` | string | Target node ID |

**Returns:** `string` - One of: `'none'`, `'pending_sent'`, `'pending_received'`, `'friends'`, `'blocked'`, `'self'`

**Example:**

```javascript
const status = friends.getRelationship('other-node-id')
switch (status) {
  case 'friends':
    console.log('Already connected!')
    break
  case 'pending_sent':
    console.log('Waiting for them to accept...')
    break
  case 'none':
    console.log('No relationship yet')
    break
}
```

---

##### `isFriend(nodeId)`

Check if a node is a friend.

```javascript
friends.isFriend(nodeId)
```

**Returns:** `boolean`

---

##### `isBlocked(nodeId)`

Check if a node is blocked.

```javascript
friends.isBlocked(nodeId)
```

**Returns:** `boolean`

---

##### `sendRequest(toNodeId, [message])`

Send a friend request.

```javascript
friends.sendRequest(toNodeId, message)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `toNodeId` | string | Yes | Target node ID |
| `message` | string | No | Optional message with request |

**Returns:** `FriendRequest`

**Throws:**

- `Error` if trying to add yourself
- `Error` if target is blocked
- `Error` if already friends
- `Error` if request already pending

**Example:**

```javascript
try {
  const request = friends.sendRequest('other-node-id', "Hey, let's connect!")
  console.log(`Request sent: ${request.id}`)
} catch (e) {
  console.error(e.message)
}
```

---

##### `acceptRequest(requestId)`

Accept a friend request.

```javascript
friends.acceptRequest(requestId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `requestId` | string | The request ID to accept |

**Returns:** `Friend` - The new friend entry

**Example:**

```javascript
const friend = friends.acceptRequest('req_abc123')
console.log(`Now friends with ${friend.displayName}!`)
```

---

##### `rejectRequest(requestId)`

Reject a friend request.

```javascript
friends.rejectRequest(requestId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `requestId` | string | The request ID to reject |

---

##### `cancelRequest(requestId)`

Cancel a sent friend request.

```javascript
friends.cancelRequest(requestId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `requestId` | string | The request ID to cancel |

---

##### `removeFriend(nodeId)`

Remove a friend.

```javascript
friends.removeFriend(nodeId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `nodeId` | string | Friend's node ID |

**Returns:** `boolean` - Success

---

##### `block(nodeId)`

Block a user.

```javascript
friends.block(nodeId)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `nodeId` | string | Node ID to block |

Blocking a user will:

- Remove them from friends (if applicable)
- Cancel any pending requests
- Prevent future friend requests from them

---

##### `unblock(nodeId)`

Unblock a user.

```javascript
friends.unblock(nodeId)
```

**Returns:** `boolean` - Whether the user was previously blocked

---

##### `setNickname(nodeId, nickname)`

Set a local nickname for a friend.

```javascript
friends.setNickname(nodeId, nickname)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `nodeId` | string | Friend's node ID |
| `nickname` | string | Local nickname |

**Throws:** `Error` if not a friend

---

##### `setFavorite(nodeId, favorite)`

Mark a friend as favorite.

```javascript
friends.setFavorite(nodeId, favorite)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `nodeId` | string | Friend's node ID |
| `favorite` | boolean | Favorite status |

---

##### `list([options])`

Get the friend list.

```javascript
friends.list(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `favoritesFirst` | boolean | Sort favorites to top |
| `onlineFirst` | boolean | Sort by last seen time |

**Returns:** `Array<Object>` - Friend objects

**Example:**

```javascript
const friendList = friends.list({ favoritesFirst: true })
for (const f of friendList) {
  console.log(`${f.nickname || f.displayName} - Last seen: ${f.lastSeen}`)
}
```

---

##### `getPendingRequests()`

Get received pending friend requests.

```javascript
friends.getPendingRequests()
```

**Returns:** `Array<Object>` - Pending requests

**Example:**

```javascript
const pending = friends.getPendingRequests()
console.log(`You have ${pending.length} pending requests`)
for (const req of pending) {
  console.log(`From: ${req.from}, Message: ${req.message}`)
}
```

---

##### `getSentRequests()`

Get sent pending friend requests.

```javascript
friends.getSentRequests()
```

**Returns:** `Array<Object>` - Sent requests

---

##### `getBlocked()`

Get list of blocked user IDs.

```javascript
friends.getBlocked()
```

**Returns:** `Array<string>` - Blocked node IDs

---

##### `getFriend(nodeId)`

Get friend details by node ID.

```javascript
friends.getFriend(nodeId)
```

**Returns:** `Object | null` - Friend data or null

---

##### `getFriendIds()`

Get set of friend node IDs (useful for access checks).

```javascript
friends.getFriendIds()
```

**Returns:** `Set<string>` - Set of friend node IDs

---

##### `getStats()`

Get friendship statistics.

```javascript
friends.getStats()
```

**Returns:** `Object`

```javascript
{
  totalFriends: number,
  favorites: number,
  pendingReceived: number,
  pendingSent: number,
  blocked: number
}
```

---

### FriendRequest

Represents a pending friend request.

#### Properties

| Property      | Type   | Description                                          |
| ------------- | ------ | ---------------------------------------------------- |
| `id`          | string | Unique request ID                                    |
| `from`        | string | Sender node ID                                       |
| `to`          | string | Recipient node ID                                    |
| `message`     | string | Optional message                                     |
| `status`      | string | 'pending' \| 'accepted' \| 'rejected' \| 'cancelled' |
| `createdAt`   | number | Creation timestamp                                   |
| `respondedAt` | number | Response timestamp                                   |

---

### Friend

Represents a friend relationship.

#### Properties

| Property      | Type    | Description                  |
| ------------- | ------- | ---------------------------- |
| `nodeId`      | string  | Friend's node ID             |
| `displayName` | string  | Their display name           |
| `publicKey`   | string  | Their public key             |
| `fingerprint` | string  | Key fingerprint              |
| `addedAt`     | number  | When friendship started      |
| `lastSeen`    | number  | Last activity timestamp      |
| `lastMessage` | number  | Last message timestamp       |
| `nickname`    | string  | Your local nickname for them |
| `notes`       | string  | Private notes                |
| `favorite`    | boolean | Favorite status              |

---

## Events

The FriendsManager emits the following events:

| Event               | Payload               | Description             |
| ------------------- | --------------------- | ----------------------- |
| `request_sent`      | `FriendRequest`       | You sent a request      |
| `request_received`  | `FriendRequest`       | You received a request  |
| `request_accepted`  | `{ request, friend }` | You accepted a request  |
| `request_rejected`  | `FriendRequest`       | You rejected a request  |
| `request_cancelled` | `FriendRequest`       | You cancelled a request |
| `friend_added`      | `Friend`              | New friend added        |
| `friend_removed`    | `Friend`              | Friend removed          |
| `blocked`           | `nodeId`              | User blocked            |
| `unblocked`         | `nodeId`              | User unblocked          |

**Example:**

```javascript
friends.on('request_received', (request) => {
  console.log(`New friend request from ${request.from}: "${request.message}"`)
})

friends.on('friend_added', (friend) => {
  console.log(`Now friends with ${friend.displayName}!`)
})
```

---

## Access Control

The friends list is often used for access control in other modules:

```javascript
// Check if sender can access friends-only content
const friendIds = friends.getFriendIds()
const canAccess = friendIds.has(senderNodeId)

// Use with ContentStore
const content = store.retrieve(hash, {
  requesterId: senderNodeId,
  requesterFriends: friends.getFriendIds(),
})

// Use with MessageManager
const messages = new MessageManager({
  nodeId: identity.nodeId,
  friendsManager: friends, // Enables friend-only DMs
})
```
