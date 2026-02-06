---
name: ghost
description: Manage Ghost CMS blog posts via Admin API. Supports creating, updating, deleting, and listing posts. NEW: Upload images and set feature images for posts. Use when the user needs to programmatically manage Ghost blog content. Requires GHOST_API_URL and GHOST_ADMIN_API_KEY environment variables.
---

# Ghost CMS Admin API

Manage your Ghost blog posts programmatically through the Admin API.

## Features

- 📝 **Create/Update/Delete posts** - Full CRUD operations
- 🖼️ **Upload images** - Upload images to Ghost and get URL
- 🎨 **Feature images** - Set cover images for posts
- 📊 **List posts** - View recent posts with status
- 🏷️ **Tags support** - Add tags to posts

## Prerequisites

### 1. Get Admin API Key

1. Log in to your Ghost Admin panel (`https://your-blog.com/ghost/`)
2. Go to **Settings** → **Integrations**
3. Click **"Add custom integration"**
4. Copy the **Admin API Key** (format: `id:secret`)

### 2. Configure Credentials

Create config file:

```bash
mkdir -p ~/.config/ghost
```

Add to `~/.config/ghost/credentials`:

```bash
export GHOST_API_URL="https://your-blog.com/ghost/api/admin/"
export GHOST_ADMIN_API_KEY="your-id:your-secret"
```

Set permissions:

```bash
chmod 600 ~/.config/ghost/credentials
```

### 3. Install Dependencies

```bash
pip3 install requests pyjwt --user
```

## Python API Usage

### Basic Setup

```python
import sys
import os
sys.path.insert(0, os.path.expanduser("~/.openclaw/workspace/ghost/scripts"))
import ghost

config = ghost.get_config()
```

### Create a Post

```python
# Create post with HTML content
result = ghost.create_post(
    config=config,
    title="My Article Title",
    content="<h1>Title</h1><p>Content...</p>",  # HTML format
    status="published",  # or "draft"
    tags=["tech", "news"]
)
```

### Upload Image

```python
# Upload image and get URL
image_url = ghost.upload_image(config, "/path/to/image.jpg")
print(f"Image URL: {image_url}")
```

### Create Post with Feature Image

```python
# Upload cover image first
cover_image_url = ghost.upload_image(config, "cover.jpg")

# Create post with feature image
result = ghost.create_post(
    config=config,
    title="Article with Cover",
    content="<p>Article content...</p>",
    status="published",
    feature_image=cover_image_url,  # Set cover image
    tags=["featured"]
)
```

### List Posts

```python
posts = ghost.list_posts(config, limit=20)
for post in posts:
    print(f"{post['title']} - {post['status']}")
```

### Update Post

```python
ghost.update_post(
    config=config,
    post_id="post-id-here",
    title="New Title",
    status="published"
)
```

## CLI Usage

### Setup

```bash
# Install dependencies
pip3 install requests pyjwt --user

# Source credentials
source ~/.config/ghost/credentials
```

### Create a Post

**As draft (default):**

```bash
python3 scripts/ghost.py create "My Article Title" "<p>Article content in HTML</p>"
```

**Publish immediately:**

```bash
python3 scripts/ghost.py create "Breaking News" "<p>Content here</p>" --status published
```

**With tags:**

```bash
python3 scripts/ghost.py create "Tech News" "<p>Content</p>" --status published --tags "tech,news,ai"
```

### Update a Post

```bash
# Update title
python3 scripts/ghost.py update 5f8c3c2e8c3d2e1f3a4b5c6d --title "New Title"

# Update content
python3 scripts/ghost.py update 5f8c3c2e8c3d2e1f3a4b5c6d --content "<p>New content</p>"

# Publish a draft
python3 scripts/ghost.py update 5f8c3c2e8c3d2e1f3a4b5c6d --status published
```

### Delete a Post

```bash
python3 scripts/ghost.py delete 5f8c3c2e8c3d2e1f3a4b5c6d
```

### List Posts

```bash
# List 10 most recent posts (default)
python3 scripts/ghost.py list

# List 20 posts
python3 scripts/ghost.py list 20
```

## Common Workflows

### Publish with Cover Image

```python
import ghost

config = ghost.get_config()

# Upload cover image
image_url = ghost.upload_image(config, "/path/to/cover.jpg")

# Create post with cover
result = ghost.create_post(
    config=config,
    title="Featured Article",
    content="<p>Article content...</p>",
    status="published",
    feature_image=image_url,
    tags=["featured", "tech"]
)

print(f"Published: {result['url']}")
```

### Batch Operations

```bash
# List all drafts
python3 scripts/ghost.py list 100 | grep "🟡"

# Update specific post
python3 scripts/ghost.py update <id> --tags "featured"
```

## API Reference

### ghost.create_post(config, title, content, status='draft', tags=None, feature_image=None)

Create a new post.

**Parameters:**

- `config` - Configuration dict with api_url and admin_api_key
- `title` - Post title
- `content` - HTML content
- `status` - 'draft' or 'published'
- `tags` - List of tag names
- `feature_image` - URL of cover image (optional)

**Returns:** Post dict with id, url, status

### ghost.upload_image(config, image_path)

Upload an image to Ghost.

**Parameters:**

- `config` - Configuration dict
- `image_path` - Local path to image file

**Returns:** Image URL string

### ghost.list_posts(config, limit=10)

List recent posts.

**Returns:** List of post dicts

### ghost.update_post(config, post_id, \*\*kwargs)

Update existing post.

**Parameters:**

- `post_id` - Post ID to update
- `title` - New title (optional)
- `content` - New content (optional)
- `status` - New status (optional)
- `tags` - New tags (optional)

### ghost.delete_post(config, post_id)

Delete a post.

## Troubleshooting

**Error: No module named 'jwt'**
→ Install: `pip3 install pyjwt --user`

**Error: 401 Unauthorized**
→ Check your Admin API Key is correct and not expired

**Error: 404 Not Found**
→ Verify GHOST_API_URL ends with `/ghost/api/admin/`

**Image upload fails**
→ Check image file exists and is under 10MB
→ Supported formats: JPG, PNG, GIF

## References

- API Documentation: [references/api.md](references/api.md)
- Ghost Official Docs: https://ghost.org/docs/admin-api/
