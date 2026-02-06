# Content Store API

The Content Store module provides hash-addressed content storage with visibility controls.

## Overview

The content store enables:

- **Content-Addressed Storage**: Store any content, retrieve by hash
- **Automatic Deduplication**: Identical content uses same storage
- **Visibility Controls**: Public, friends-only, private, or unlisted
- **Content Discovery**: Search and browse public content

## Visibility Levels

| Level      | Description                                   |
| ---------- | --------------------------------------------- |
| `public`   | Anyone can access and discover                |
| `friends`  | Only friends can access                       |
| `private`  | Only owner can access                         |
| `unlisted` | Anyone with hash can access, not discoverable |

## Content Types

| Type       | MIME Type                | Description   |
| ---------- | ------------------------ | ------------- |
| `text`     | text/plain               | Plain text    |
| `json`     | application/json         | JSON data     |
| `markdown` | text/markdown            | Markdown text |
| `html`     | text/html                | HTML content  |
| `image`    | image/\*                 | Image files   |
| `audio`    | audio/\*                 | Audio files   |
| `video`    | video/\*                 | Video files   |
| `binary`   | application/octet-stream | Binary data   |

## Classes

### ContentStore

Main class for content storage.

```javascript
const { ContentStore, getContentStore } = require('@sschepis/alephnet-node/lib/content-store')
```

#### Constructor

```javascript
new ContentStore(options)
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `basePath` | string | './data/content' | Storage directory |
| `nodeId` | string | 'local' | Owner node ID |
| `maxSize` | number | 104857600 | Max storage (100MB) |

**Example:**

```javascript
const store = new ContentStore({
  basePath: './data/content',
  nodeId: identity.nodeId,
  maxSize: 500 * 1024 * 1024, // 500MB
})
```

#### Methods

##### `store(content, [options])`

Store content and get its hash.

```javascript
store.store(content, options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string \| Buffer \| Object | Yes | Content to store |
| `type` | string | No | Content type |
| `visibility` | string | No | Visibility level |
| `mimeType` | string | No | Custom MIME type |
| `metadata` | Object | No | Custom metadata |

**Returns:** `Object`

```javascript
{
  hash: string,           // SHA-256 hash
  duplicate: boolean,     // True if content already existed
  size: number,           // Size in bytes
  type: string,           // Content type
  visibility: string,     // Visibility level
  createdAt: number       // Creation timestamp
}
```

**Example:**

```javascript
// Store text
const textResult = store.store('Hello, AlephNet!', {
  type: 'text',
  visibility: 'public',
  metadata: { tag: 'greeting' },
})
console.log(`Stored at: ${textResult.hash}`)

// Store JSON
const jsonResult = store.store(
  { key: 'value' },
  {
    type: 'json',
    visibility: 'friends',
  },
)

// Store binary
const buffer = fs.readFileSync('image.png')
const imageResult = store.store(buffer, {
  type: 'image',
  mimeType: 'image/png',
  visibility: 'public',
  metadata: { name: 'profile-pic', width: 200, height: 200 },
})
```

---

##### `retrieve(hash, [options])`

Retrieve content by hash.

```javascript
store.retrieve(hash, options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `hash` | string | Content hash |
| `requesterId` | string | Requester's node ID |
| `requesterFriends` | Set<string> | Requester's friend IDs |

**Returns:** `Object | null`

```javascript
{
  hash: string,
  content: string | Object | Buffer,  // Parsed based on type
  type: string,
  mimeType: string,
  size: number,
  owner: string,
  metadata: Object,
  createdAt: number
}
```

**Access Denied Response:**

```javascript
{
  error: 'access_denied',
  hash: string,
  visibility: string
}
```

**Example:**

```javascript
// Retrieve as owner
const content = store.retrieve(hash)

// Retrieve with access check
const content = store.retrieve(hash, {
  requesterId: 'other-node-id',
  requesterFriends: friends.getFriendIds(),
})

if (content.error === 'access_denied') {
  console.log('Cannot access this content')
} else {
  console.log(content.content)
}
```

---

##### `has(hash)`

Check if content exists.

```javascript
store.has(hash)
```

**Returns:** `boolean`

---

##### `getMetadata(hash)`

Get content metadata without retrieving content.

```javascript
store.getMetadata(hash)
```

**Returns:** `Object | null`

```javascript
{
  hash: string,
  type: string,
  mimeType: string,
  size: number,
  owner: string,
  visibility: string,
  metadata: Object,
  createdAt: number,
  accessCount: number,
  lastAccessed: number
}
```

---

##### `setVisibility(hash, visibility)`

Update content visibility.

```javascript
store.setVisibility(hash, visibility)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `hash` | string | Content hash |
| `visibility` | string | New visibility level |

**Returns:** `boolean` - Success (only owner can update)

---

##### `updateMetadata(hash, metadata)`

Update content metadata.

```javascript
store.updateMetadata(hash, metadata)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `hash` | string | Content hash |
| `metadata` | Object | Metadata to merge |

**Returns:** `boolean` - Success

---

##### `delete(hash)`

Delete content.

```javascript
store.delete(hash)
```

**Returns:** `boolean` - Success (only owner can delete)

---

##### `listByOwner([ownerId], [options])`

List content by owner.

```javascript
store.listByOwner(ownerId, options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `ownerId` | string | Owner node ID (defaults to self) |
| `visibility` | string | Filter by visibility |
| `type` | string | Filter by content type |
| `limit` | number | Maximum results (default: 50) |
| `offset` | number | Pagination offset |

**Returns:** `Array<Object>` - Content entries

**Example:**

```javascript
// List all my content
const myContent = store.listByOwner()

// List only my public images
const publicImages = store.listByOwner(null, {
  visibility: 'public',
  type: 'image',
})
```

---

##### `listPublic([options])`

List public content (for discovery).

```javascript
store.listPublic(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `type` | string | Filter by content type |
| `limit` | number | Maximum results (default: 50) |
| `offset` | number | Pagination offset |

**Returns:** `Array<Object>` - Content entries sorted by popularity

---

##### `search(query, [options])`

Search content by metadata.

```javascript
store.search(query, options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `metadata` | Object | Metadata key-value filters |
| `type` | string | Filter by type |
| `owner` | string | Filter by owner |
| `requesterId` | string | For access control |
| `requesterFriends` | Set<string> | For access control |
| `sortBy` | string | Sort field |
| `sortOrder` | string | 'asc' or 'desc' |
| `limit` | number | Maximum results |
| `offset` | number | Pagination offset |

**Returns:** `Array<Object>` - Matching entries

**Example:**

```javascript
// Search by tag
const results = store.search({
  metadata: { tag: 'tutorial' },
})

// Search my markdown files
const docs = store.search({
  type: 'markdown',
  owner: identity.nodeId,
})
```

---

##### `getStats()`

Get storage statistics.

```javascript
store.getStats()
```

**Returns:** `Object`

```javascript
{
  totalEntries: number,
  totalSize: number,         // Bytes used
  maxSize: number,           // Maximum bytes
  usagePercent: number,      // Usage percentage
  byType: {                  // Count by type
    text: number,
    json: number,
    ...
  },
  byVisibility: {            // Count by visibility
    public: number,
    private: number,
    ...
  },
  owners: number             // Unique owner count
}
```

---

##### `gc()`

Garbage collect orphaned blobs.

```javascript
store.gc()
```

**Returns:** `Object`

```javascript
{
  cleaned: number,    // Files removed
  freedBytes: number  // Bytes freed
}
```

---

### ContentEntry

Represents a stored content item.

```javascript
const { ContentEntry } = require('@sschepis/alephnet-node/lib/content-store')
```

#### Properties

| Property       | Type   | Description           |
| -------------- | ------ | --------------------- |
| `hash`         | string | SHA-256 hash          |
| `type`         | string | Content type          |
| `mimeType`     | string | MIME type             |
| `size`         | number | Size in bytes         |
| `owner`        | string | Owner node ID         |
| `visibility`   | string | Visibility level      |
| `metadata`     | Object | Custom metadata       |
| `createdAt`    | number | Creation timestamp    |
| `accessCount`  | number | Times accessed        |
| `lastAccessed` | number | Last access timestamp |

#### Methods

##### `canAccess(requesterId, requesterFriends)`

Check if a user can access this content.

**Returns:** `boolean`

---

## Utility Functions

### `computeHash(content)`

Compute SHA-256 hash of content.

```javascript
const { computeHash } = require('@sschepis/alephnet-node/lib/content-store')

const hash = computeHash('Hello, AlephNet!')
console.log(hash) // "abc123..."
```

---

### `getContentStore(options)`

Get or create the default singleton store.

```javascript
const { getContentStore } = require('@sschepis/alephnet-node/lib/content-store')

const store = getContentStore({ nodeId: identity.nodeId })
```

---

## Events

The ContentStore emits:

| Event                | Payload                            | Description        |
| -------------------- | ---------------------------------- | ------------------ |
| `stored`             | `{ hash, size, type, visibility }` | Content stored     |
| `deleted`            | `{ hash, size }`                   | Content deleted    |
| `visibility-changed` | `{ hash, visibility }`             | Visibility updated |

---

## Storage Structure

Content is stored in a content-addressed filesystem:

```
data/content/
├── index.json          # Content index
└── blobs/
    ├── a1/
    │   └── a1b2c3...   # Content file (hash as filename)
    ├── b2/
    │   └── b2c3d4...
    └── ...
```

The first 2 characters of the hash are used as subdirectories to avoid filesystem limits on directory entries.

---

## Usage Patterns

### Profile Avatar

```javascript
// Store avatar
const avatar = fs.readFileSync('avatar.png')
const result = store.store(avatar, {
  type: 'image',
  mimeType: 'image/png',
  visibility: 'public',
})

// Update profile
profiles.updateProfile({ avatarHash: result.hash })
```

### Blog Posts

```javascript
// Store markdown post
const post = '# My Post\n\nContent here...'
const result = store.store(post, {
  type: 'markdown',
  visibility: 'public',
  metadata: {
    title: 'My First Post',
    tags: ['intro', 'alephnet'],
    publishedAt: Date.now(),
  },
})

// Add to profile links
profiles.addLink({
  type: 'content',
  contentHash: result.hash,
  title: 'My First Post',
})
```

### Private Notes

```javascript
// Store private note
const result = store.store('Secret notes...', {
  type: 'text',
  visibility: 'private',
  metadata: { category: 'personal' },
})
```

### Friends-Only Media

```javascript
// Store for friends only
const result = store.store(imageBuffer, {
  type: 'image',
  visibility: 'friends',
  metadata: { event: 'meetup-2026' },
})
```
