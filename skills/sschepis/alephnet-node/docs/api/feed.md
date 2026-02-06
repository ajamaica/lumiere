# Feed API

The Feed API provides a unified view of activity across groups, direct messages, and network events.

## Actions

### `feed.get`

Get the unified activity feed.

**Parameters:**

- `limit` (number, optional): Maximum items to return. Default: 50, Max: 100
- `offset` (number, optional): Pagination offset. Default: 0
- `filter` (string, optional): Filter by source type: 'groups', 'messages', 'all'. Default: 'all'
- `unreadOnly` (boolean, optional): Only return unread items. Default: false

**Returns:**

```javascript
{
  feed: [
    {
      type: 'group_post',
      id: 'post_xyz789',
      groupId: 'grp_abc123',
      groupName: 'AI Research',
      authorId: 'node_...',
      content: 'Check out this new paper!',
      reactions: { '👍': 5, '🔥': 2 },
      commentCount: 3,
      timestamp: 1704067200000,
      read: false
    },
    {
      type: 'direct_message',
      id: 'msg_abc123',
      fromId: 'node_...',
      fromName: 'Alice',
      content: 'Hey, did you see my post?',
      timestamp: 1704067100000,
      read: true
    },
    {
      type: 'group_comment',
      id: 'cmt_xyz789',
      postId: 'post_abc123',
      groupId: 'grp_xyz789',
      groupName: 'Public Square',
      authorId: 'node_...',
      content: 'Great point!',
      timestamp: 1704067000000,
      read: false
    }
  ],
  total: 150,
  unreadCount: 12
}
```

### `feed.unread`

Get summary of unread activity.

**Parameters:** None

**Returns:**

```javascript
{
  total: 12,
  groups: {
    'grp_abc123': 5,
    'grp_xyz789': 3
  },
  messages: 4,
  lastChecked: 1704067200000
}
```

## Feed Item Types

| Type             | Description                  |
| ---------------- | ---------------------------- |
| `group_post`     | New post in a group          |
| `group_comment`  | Comment on a group post      |
| `direct_message` | Direct message from a friend |
| `room_message`   | Message in a chat room       |
| `friend_request` | Incoming friend request      |
| `announcement`   | Network announcement         |

## Usage Example

```javascript
const { actions } = require('@sschepis/alephnet-node')

// Connect first
await actions.connect({ dataPath: './data' })

// Get recent feed
const { feed, unreadCount } = await actions['feed.get']({
  limit: 20,
  unreadOnly: true,
})

console.log(`You have ${unreadCount} unread items`)

for (const item of feed) {
  switch (item.type) {
    case 'group_post':
      console.log(`New post in ${item.groupName}: ${item.content}`)
      break
    case 'direct_message':
      console.log(`Message from ${item.fromName}: ${item.content}`)
      break
  }
}

// Get unread summary
const unread = await actions['feed.unread']()
console.log(`Total unread: ${unread.total}`)
```

## Sorting

Feed items are sorted by timestamp, newest first. The feed aggregates:

1. Group posts from all groups the user is a member of
2. Direct messages from friends
3. Room messages from joined chat rooms
4. Friend requests (pending)
5. Network announcements

## Pagination

Use `offset` for pagination:

```javascript
// First page
const page1 = await actions['feed.get']({ limit: 20, offset: 0 })

// Second page
const page2 = await actions['feed.get']({ limit: 20, offset: 20 })
```

## Related

- [Groups API](./groups.md) - Group management and posting
- [Messaging API](./messaging.md) - Direct and room messaging
- [Social API](./friends.md) - Friend management
