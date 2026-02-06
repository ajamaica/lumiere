# Media Upload Guide

Complete guide for uploading images and videos to social platforms.

## Quick Start

Upload an image to Twitter:

```bash
node scripts/upload-media.js twitter config.json image.jpg
```

The script will return a media ID that you can use in your posts.

## Supported Platforms

### Twitter/X

- **Max file size**: 5 MB
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Video support**: Coming soon (requires special handling)

**Upload:**

```bash
node scripts/upload-media.js twitter twitter-config.json photo.jpg
```

**Use in post:**

```javascript
{
  text: "Check out this image!",
  media_ids: ["1234567890"]
}
```

### Mastodon

- **Max file size**: 8 MB
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Video support**: Yes (same limits)

**Upload:**

```bash
node scripts/upload-media.js mastodon mastodon-config.json photo.png
```

**Use in post:**

```javascript
{
  status: "Check out this image!",
  media_ids: ["1234567890"]
}
```

### Bluesky

- **Max file size**: 1 MB (strict!)
- **Supported formats**: JPEG, PNG only
- **Video support**: No

**Upload:**

```bash
node scripts/upload-media.js bluesky bluesky-config.json photo.jpg
```

**Use in post:**

```javascript
{
  text: "Check out this image!",
  embed: {
    $type: "app.bsky.embed.images",
    images: [{
      image: <blob>,  // The blob returned from upload
      alt: "Description of image"
    }]
  }
}
```

### Reddit

- **Max file size**: 20 MB
- **Supported formats**: JPEG, PNG, GIF
- **Video support**: Yes (MP4, MOV)

**Upload:**

```bash
node scripts/upload-media.js reddit reddit-config.json image.jpg
```

**Use in post:**

```javascript
{
  subreddit: "pics",
  title: "My Photo",
  url: "asset_id_from_upload"
}
```

### Discord

- **Max file size**: 8 MB (per file)
- **Supported formats**: Any (JPEG, PNG, GIF, WebP, MP4, etc.)
- **Video support**: Yes
- **Special note**: Discord uses direct file attachments, not pre-upload

**Post with attachment:**

```javascript
{
  content: "Check out this image!",
  file: "path/to/image.jpg"  // File path or URL
}
```

## Media Sources

The media module supports multiple input types:

### 1. Local File Path

```bash
node scripts/upload-media.js twitter config.json /path/to/image.jpg
```

### 2. HTTP(S) URL

```bash
node scripts/upload-media.js twitter config.json https://example.com/image.jpg
```

The image will be downloaded and then uploaded.

### 3. Base64 Data URI

```javascript
const dataUri = 'data:image/png;base64,iVBORw0KGgo...'
await media.loadMedia(dataUri)
```

### 4. Buffer

```javascript
const buffer = Buffer.from(imageData)
await media.loadMedia(buffer)
```

## Size Limits Summary

| Platform | Image Max | Video Max | Notes                       |
| -------- | --------- | --------- | --------------------------- |
| Twitter  | 5 MB      | 512 MB\*  | \*Requires special endpoint |
| Reddit   | 20 MB     | 1 GB\*    | \*Depends on subreddit      |
| Discord  | 8 MB      | 8 MB      | Per file, can send multiple |
| Mastodon | 8 MB      | 40 MB     | Instance-dependent          |
| Bluesky  | 1 MB      | N/A       | Strict limit, no video      |

## Programmatic Usage

### From Node.js

```javascript
const media = require('./scripts/media')
const { TwitterApi } = require('twitter-api-v2')

// Initialize Twitter client
const client = new TwitterApi({
  /* credentials */
})

// Upload image
const mediaId = await media.uploadToTwitter(client, 'image.jpg')

// Post with media
await client.v2.tweet({
  text: 'Check this out!',
  media: { media_ids: [mediaId] },
})
```

### From OpenClaw Agent

```javascript
// Upload media
const uploadResult = await exec({
  command: 'node',
  args: [
    'skills/social-scheduler/scripts/upload-media.js',
    'twitter',
    'twitter-config.json',
    'photo.jpg',
  ],
  workdir: process.env.WORKSPACE_ROOT,
})

// Extract media ID from output
const mediaId = extractMediaId(uploadResult.stdout)

// Schedule post with media
await exec({
  command: 'node',
  args: [
    'skills/social-scheduler/scripts/schedule.js',
    'add',
    'twitter',
    'twitter-config.json',
    JSON.stringify({
      text: 'Scheduled post with image!',
      media_ids: [mediaId],
    }),
    '2026-02-03T12:00:00',
  ],
  workdir: process.env.WORKSPACE_ROOT,
})
```

## Error Handling

### File Too Large

```
❌ Upload failed: File too large: 6.2MB (max 5.0MB for twitter)
```

**Solution**: Resize or compress the image before upload.

### Unsupported Format

```
❌ Upload failed: Unsupported format: image/bmp (twitter supports: image/jpeg, image/png, image/gif, image/webp)
```

**Solution**: Convert to a supported format (JPEG/PNG recommended).

### Rate Limit

```
❌ Upload failed: Twitter API error: Rate limit exceeded. Try again later.
```

**Solution**: Wait and retry. Twitter free tier has strict limits.

## Best Practices

### 1. Compress Images

Large files take longer to upload and may hit size limits. Use tools like:

- `imagemagick` - CLI image manipulation
- `sharp` - Node.js image processing
- Online tools - TinyPNG, Squoosh

### 2. Use Appropriate Formats

- **Photos**: JPEG (smaller files)
- **Graphics**: PNG (better quality)
- **Animations**: GIF (widely supported)
- **Modern**: WebP (best compression, not universal)

### 3. Add Alt Text

Always include alt text for accessibility:

```javascript
{
  text: "My post",
  media: {
    media_ids: ["123"],
    media_alt_text: ["A beautiful sunset over the ocean"]
  }
}
```

### 4. Pre-upload for Scheduling

Upload media first, then schedule posts with media IDs. This is more reliable than uploading at post time.

### 5. Handle Failures Gracefully

Media uploads can fail (network issues, API limits). Always implement retry logic.

## Advanced Features

### Multiple Images (Twitter/Mastodon)

```javascript
// Upload 4 images
const ids = await Promise.all([
  media.uploadToTwitter(client, 'img1.jpg'),
  media.uploadToTwitter(client, 'img2.jpg'),
  media.uploadToTwitter(client, 'img3.jpg'),
  media.uploadToTwitter(client, 'img4.jpg'),
])

// Post with all images
await client.v2.tweet({
  text: 'Photo album!',
  media: { media_ids: ids },
})
```

### Image Galleries (Bluesky)

```javascript
const blob1 = await media.uploadToBluesky(agent, 'img1.jpg')
const blob2 = await media.uploadToBluesky(agent, 'img2.jpg')

await agent.post({
  text: 'Gallery post',
  embed: {
    $type: 'app.bsky.embed.images',
    images: [
      { image: blob1, alt: 'First image' },
      { image: blob2, alt: 'Second image' },
    ],
  },
})
```

## Troubleshooting

### "Cannot find module 'form-data'"

```bash
cd skills/social-scheduler
npm install
```

### "ENOENT: no such file or directory"

Check your file path. Use absolute paths or relative to current directory.

### "Invalid data URI format"

Ensure base64 data URIs follow format:

```
data:image/jpeg;base64,/9j/4AAQSkZJRg...
```

### "Access token invalid"

Regenerate your access tokens from the platform's developer portal.

## Testing

Run media module tests:

```bash
node scripts/test-media.js
```

This validates:

- Media loading from different sources
- Platform-specific validation
- Size limit enforcement
- Format compatibility

---

**Built by Ori ✨ for the OpenClaw community**
