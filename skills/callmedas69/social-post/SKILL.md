---
name: social-post
version: 1.0.0
description: Post to Twitter and Farcaster with text and images. Handles character limits, image uploads, and cross-platform posting.
author: 0xdas
license: MIT
tags: [twitter, farcaster, social, posting, automation, threads]
metadata:
  openclaw:
    requires:
      bins: [bash, curl, jq, python3]
      env: [X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET]
---

# Social Post

Post to Twitter and/or Farcaster with automatic character limit validation and image upload handling.

## Features

- ✅ Post to Twitter only
- ✅ Post to Farcaster only
- ✅ Post to both platforms simultaneously
- ✅ Character/byte limit validation
- ✅ Image upload support
- ✅ **Thread support** - automatically split long text into numbered posts
- ✅ **Link shortening** - compress URLs using TinyURL (saves characters)
- ✅ Auto-truncate on overflow (optional)

## Platform Limits

- **Twitter:** 252 characters (280 with 10% safety buffer)
- **Farcaster:** 288 bytes (320 with 10% safety buffer)

## Usage

### Text only

```bash
# Post to both platforms
scripts/post.sh "Your message here"

# Twitter only
scripts/post.sh --twitter "Your message"

# Farcaster only
scripts/post.sh --farcaster "Your message"
```

### With image

```bash
# Post to both platforms with image
scripts/post.sh --image /path/to/image.jpg "Your caption"

# Twitter only with image
scripts/post.sh --twitter --image /path/to/image.jpg "Caption"

# Farcaster only with image
scripts/post.sh --farcaster --image /path/to/image.jpg "Caption"
```

### Options

- `--twitter` - Post to Twitter only
- `--farcaster` - Post to Farcaster only
- `--image <path>` - Attach image
- `--thread` - Split long text into numbered thread
- `--shorten-links` - Shorten URLs to save characters
- `--truncate` - Auto-truncate if over limit
- `--dry-run` - Preview without posting

## Examples

```bash
# Quick post to both
scripts/post.sh "gm! Building onchain 🦞"

# Twitter announcement with image
scripts/post.sh --twitter --image ~/screenshot.png "New feature shipped! 🚀"

# Farcaster only
scripts/post.sh --farcaster "Just published credential-manager to ClawHub!"

# Long text as thread (auto-numbered)
scripts/post.sh --thread "This is a very long announcement that exceeds the character limit. It will be automatically split into multiple numbered posts. Each part will be posted sequentially to create a thread. (1/3), (2/3), (3/3)"

# Shorten URLs to save characters
scripts/post.sh --shorten-links "Check out this amazing project: https://github.com/very-long-organization-name/very-long-repository-name"

# Combine thread + link shortening
scripts/post.sh --thread --shorten-links "Long text with multiple links that will be shortened and split into a thread if needed"

# Both platforms, auto-truncate long text
scripts/post.sh --truncate "Very long message that might exceed limits..."
```

## Requirements

- Twitter credentials in `.env` (X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)
- Farcaster credentials in `/home/phan_harry/.openclaw/farcaster-credentials.json`
- For images: `curl`, `jq`

## Image Hosting

- **Twitter:** Direct upload via Twitter API
- **Farcaster:** Uploads to imgur for public URL (embeds automatically)

## Error Handling

- Shows character/byte count before posting
- Warns if exceeding limits
- Option to truncate or abort
- Validates credentials before attempting post
