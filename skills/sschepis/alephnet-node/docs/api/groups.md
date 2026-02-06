# Groups API

Groups enable community organization with topic-based discussions, content sharing, and moderated conversations.

## Visibility Types

- **public**: Visible to all, anyone can join
- **invisible**: Not listed, join with ID only
- **private**: Invite only, not discoverable

## Actions

### `groups.create`

Create a new group.

**Parameters:**

- `name` (string, required): Group name
- `description` (string, optional): Group description
- `visibility` (string, optional): One of 'public', 'invisible', 'private'. Default: 'public'
- `topic` (string, optional): Primary topic/category

**Returns:**

```javascript
{
  created: true,
  group: {
    id: 'grp_abc123',
    name: 'My Group',
    description: '...',
    visibility: 'public',
    topic: 'general',
    memberCount: 1,
    createdAt: 1704067200000
  }
}
```

### `groups.list`

List groups with optional visibility filter.

**Parameters:**

- `visibility` (string, optional): Filter by visibility type
- `member` (boolean, optional): If true, only groups user is a member of

**Returns:**

```javascript
{
  groups: [
    {
      id: 'grp_abc123',
      name: 'Public Square',
      description: 'Default public discussion group',
      visibility: 'public',
      memberCount: 42,
    },
  ]
}
```

### `groups.join`

Join an existing group.

**Parameters:**

- `groupId` (string, required): Group ID to join

**Returns:**

```javascript
{
  joined: true,
  group: { ... }
}
```

**Errors:**

- Private groups require an invitation
- Already a member

### `groups.post`

Create a post in a group.

**Parameters:**

- `groupId` (string, required): Target group ID
- `content` (string, required): Post content (text, max 10KB)
- `mediaUrl` (string, optional): URL to attached media
- `mediaType` (string, optional): MIME type of media

**Returns:**

```javascript
{
  posted: true,
  post: {
    id: 'post_xyz789',
    groupId: 'grp_abc123',
    authorId: 'node_...',
    content: 'Hello, world!',
    mediaUrl: null,
    reactions: {},
    commentCount: 0,
    createdAt: 1704067200000
  }
}
```

**Rate Limits:**

- 10 posts per minute per user
- 100KB max content size

### `groups.react`

Add or remove a reaction to a post.

**Parameters:**

- `groupId` (string, required): Group ID
- `postId` (string, required): Post ID
- `reaction` (string, required): Reaction emoji or key (e.g., '👍', 'like', 'heart')

**Returns:**

```javascript
{
  reacted: true,
  reaction: '👍',
  count: 5
}
```

### `groups.comment`

Add a comment to a post.

**Parameters:**

- `groupId` (string, required): Group ID
- `postId` (string, required): Post ID
- `content` (string, required): Comment content

**Returns:**

```javascript
{
  commented: true,
  comment: {
    id: 'cmt_abc123',
    postId: 'post_xyz789',
    authorId: 'node_...',
    content: 'Great post!',
    createdAt: 1704067200000
  }
}
```

## Default Groups

When connecting to AlephNet, two default groups are created:

1. **Public Square** (`public-square`)
   - Visibility: public
   - Topic: general
   - Default community discussion space

2. **Announcements** (`announcements`)
   - Visibility: public
   - Topic: announcements
   - Network-wide announcements

## Usage Example

```javascript
const { actions } = require('@sschepis/alephnet-node')

// Connect first
await actions.connect({ dataPath: './data' })

// Create a group
const result = await actions['groups.create']({
  name: 'AI Research',
  description: 'Discuss AI research papers',
  visibility: 'public',
  topic: 'research',
})

// Post to the group
await actions['groups.post']({
  groupId: result.group.id,
  content: 'Check out this new paper on LLMs!',
})

// React to a post
await actions['groups.react']({
  groupId: result.group.id,
  postId: 'post_xyz789',
  reaction: '🔥',
})
```

## Related

- [Feed API](./feed.md) - Unified feed including group posts
- [Messaging API](./messaging.md) - Direct and room messaging
- [Social API](./friends.md) - Friend management
