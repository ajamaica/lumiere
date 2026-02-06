---
name: wordpress-publisher
description: Publish content directly to WordPress sites via REST API with full Gutenberg block support. Create and publish posts/pages, auto-load and select categories from website, generate SEO-optimized tags, preview articles before publishing, and generate Gutenberg blocks for tables, images, lists, and rich formatting. Use when user wants to publish to WordPress, post to blog, create WordPress article, update WordPress post, or convert markdown to Gutenberg blocks.
author: xCloud
version: 1.0.0
---

# WordPress Publisher

Publish content directly to WordPress sites using the REST API with full Gutenberg block formatting, automatic category selection, SEO tag generation, and preview capabilities.

## Complete Workflow Overview

```
1. CONNECT    → Authenticate with WordPress site
2. ANALYZE    → Load categories from site, analyze content for best match
3. GENERATE   → Create SEO-optimized tags based on content
4. CONVERT    → Transform markdown/HTML to Gutenberg blocks
5. PREVIEW    → Create draft and verify rendering
6. PUBLISH    → Publish or schedule the post
7. VERIFY     → Confirm live post renders correctly
```

---

## Step 1: Connection Setup

### Get Credentials

Ask user for:

- WordPress site URL (e.g., `https://example.com`)
- WordPress username
- Application password (NOT regular password)

### How to Create Application Password

Guide user:

1. Go to **Users → Profile** in WordPress admin
2. Scroll to **Application Passwords** section
3. Enter name: `Claude Publisher`
4. Click **Add New Application Password**
5. Copy the generated password (shown only once, with spaces)

### Test Connection

```python
from scripts.wp_publisher import WordPressPublisher

wp = WordPressPublisher(
    site_url="https://example.com",
    username="admin",
    password="xxxx xxxx xxxx xxxx xxxx xxxx"  # Application password
)

# Test connection
user_info = wp.test_connection()
print(f"Connected as: {user_info['name']}")
```

---

## Step 2: Load and Select Categories

### Auto-Load Categories from Site

```python
# Get all categories from the WordPress site
categories = wp.get_categories_with_details()

# Returns list like:
# [
#   {'id': 1, 'name': 'Uncategorized', 'slug': 'uncategorized', 'count': 5},
#   {'id': 2, 'name': 'Tutorials', 'slug': 'tutorials', 'count': 12},
#   {'id': 3, 'name': 'Cloud Hosting', 'slug': 'cloud-hosting', 'count': 8},
# ]
```

### Smart Category Selection

The system analyzes content and selects the most appropriate category:

```python
# Analyze content and suggest best category
suggested_category = wp.suggest_category(
    content=article_content,
    title=article_title,
    available_categories=categories
)

# Or let user choose from available options
print("Available categories:")
for cat in categories:
    print(f"  [{cat['id']}] {cat['name']} ({cat['count']} posts)")
```

### Category Selection Logic

1. **Exact match** - Title/content contains category name
2. **Keyword match** - Category slug matches topic keywords
3. **Parent category** - Fall back to broader parent if no match
4. **Create new** - Create category if none fit (with user approval)

---

## Step 3: Generate SEO-Optimized Tags

### Automatic Tag Generation

Generate tags that improve Google search visibility:

```python
# Generate tags based on content analysis
tags = wp.generate_seo_tags(
    content=article_content,
    title=article_title,
    max_tags=10
)

# Returns list like:
# ['n8n hosting', 'workflow automation', 'self-hosted n8n',
#  'affordable hosting', 'docker deployment', 'node.js hosting']
```

### Tag Generation Rules

1. **Primary keyword** - Always include as first tag
2. **Secondary keywords** - Include 2-3 related terms
3. **Long-tail keywords** - Include 3-4 specific phrases
4. **Entity tags** - Include product/brand names mentioned
5. **Topic tags** - Include broader category terms

### Create/Get Tags in WordPress

```python
# Get or create all tags, returns list of tag IDs
tag_ids = wp.get_or_create_tags(tags)
```

---

## Step 4: Convert Content to Gutenberg Blocks

### Markdown to Gutenberg

```python
from scripts.content_to_gutenberg import convert_to_gutenberg

# Convert markdown content
gutenberg_content = convert_to_gutenberg(markdown_content)
```

### Supported Conversions

| Markdown           | Gutenberg Block            |
| ------------------ | -------------------------- |
| `# Heading`        | `wp:heading`               |
| `**bold**`         | `<strong>` in paragraph    |
| `- list item`      | `wp:list`                  |
| `1. ordered`       | `wp:list {"ordered":true}` |
| `\`\`\`code\`\`\`` | `wp:code`                  |
| `> quote`          | `wp:quote`                 |
| `![alt](url)`      | `wp:image`                 |
| `\| table \|`      | `wp:table`                 |

### Table Conversion (Critical for AI Content)

Tables are converted with proper Gutenberg structure:

```python
# Input markdown:
| Feature | Plan A | Plan B |
|---------|--------|--------|
| Price   | $10    | $20    |

# Output Gutenberg:
<!-- wp:table -->
<figure class="wp-block-table"><table>
  <thead><tr><th>Feature</th><th>Plan A</th><th>Plan B</th></tr></thead>
  <tbody><tr><td>Price</td><td>$10</td><td>$20</td></tr></tbody>
</table></figure>
<!-- /wp:table -->
```

---

## Step 5: Preview Before Publishing

### Create Draft for Preview

```python
# Create as draft first
result = wp.create_draft(
    title="Article Title",
    content=gutenberg_content,
    categories=[category_id],
    tags=tag_ids,
    excerpt="Auto-generated or custom excerpt"
)

post_id = result['post_id']
preview_url = result['preview_url']
edit_url = result['edit_url']
```

### Verify Preview

```python
# Fetch preview page to verify rendering
preview_content = wp.fetch_preview(post_id)

# Check for issues
issues = wp.validate_rendered_content(preview_content)
if issues:
    print("Issues found:")
    for issue in issues:
        print(f"  - {issue}")
```

### Preview Checklist

- [ ] Title displays correctly
- [ ] All headings render (H2, H3, H4)
- [ ] Tables render with proper formatting
- [ ] Lists display correctly (bullet and numbered)
- [ ] Code blocks have syntax highlighting
- [ ] Images load (if any)
- [ ] Links are clickable
- [ ] Category shows correctly
- [ ] Tags display in post

---

## Step 6: Publish the Post

### Publish Draft

```python
# After preview approval, publish
result = wp.publish_post(post_id)
live_url = result['live_url']
```

### Or Create and Publish Directly

```python
# Full publish workflow in one call
result = wp.publish_content(
    title="Article Title",
    content=gutenberg_content,
    category_names=["Cloud Hosting"],  # By name, auto-resolves to ID
    tag_names=["n8n", "hosting", "automation"],
    status="publish",  # or "draft", "pending", "private", "future"
    excerpt="Custom excerpt for SEO",
    slug="custom-url-slug"
)
```

### Scheduling Posts

```python
# Schedule for future publication
from datetime import datetime, timedelta

publish_date = datetime.now() + timedelta(days=1)
result = wp.publish_content(
    title="Scheduled Post",
    content=content,
    status="future",
    date=publish_date.isoformat()
)
```

---

## Step 7: Verify Published Post

### Check Live Post

```python
# Verify the published post
verification = wp.verify_published_post(post_id)

print(f"Live URL: {verification['url']}")
print(f"Status: {verification['status']}")
print(f"Categories: {verification['categories']}")
print(f"Tags: {verification['tags']}")
```

### Common Issues and Fixes

| Issue                | Cause                      | Solution                                    |
| -------------------- | -------------------------- | ------------------------------------------- |
| Tables not rendering | Missing figure wrapper     | Use proper `wp:table` block structure       |
| Code not highlighted | Missing language attribute | Add `{"language":"python"}` to code block   |
| Images broken        | Wrong URL or missing media | Upload to WordPress first, use media ID     |
| Tags not showing     | Theme doesn't display tags | Check theme settings or use different theme |

---

## Complete Example Workflow

```python
from scripts.wp_publisher import WordPressPublisher
from scripts.content_to_gutenberg import convert_to_gutenberg

# 1. Connect
wp = WordPressPublisher(
    site_url="https://xcloud.host",
    username="admin",
    password="xxxx xxxx xxxx xxxx"
)

# 2. Load categories and select best match
categories = wp.get_categories_with_details()
best_category = wp.suggest_category(content, title, categories)

# 3. Generate SEO tags
tags = wp.generate_seo_tags(content, title, max_tags=10)

# 4. Convert to Gutenberg
gutenberg_content = convert_to_gutenberg(markdown_content)

# 5. Create draft and preview
draft = wp.create_draft(
    title="7 Best n8n Hosting Providers in 2026",
    content=gutenberg_content,
    categories=[best_category['id']],
    tags=wp.get_or_create_tags(tags)
)
print(f"Preview: {draft['preview_url']}")

# 6. After verification, publish
result = wp.publish_post(draft['post_id'])
print(f"Published: {result['live_url']}")
```

---

## Quick Reference

### API Endpoints

| Resource   | Endpoint                    |
| ---------- | --------------------------- |
| Posts      | `/wp-json/wp/v2/posts`      |
| Pages      | `/wp-json/wp/v2/pages`      |
| Categories | `/wp-json/wp/v2/categories` |
| Tags       | `/wp-json/wp/v2/tags`       |
| Media      | `/wp-json/wp/v2/media`      |

### Post Statuses

| Status    | Description            |
| --------- | ---------------------- |
| `publish` | Live and visible       |
| `draft`   | Saved but not visible  |
| `pending` | Awaiting review        |
| `private` | Only visible to admins |
| `future`  | Scheduled for later    |

### Required Files

- `scripts/wp_publisher.py` - Main publisher class
- `scripts/content_to_gutenberg.py` - Markdown/HTML converter
- `references/gutenberg-blocks.md` - Block format reference

---

## Error Handling

| Error Code | Meaning                  | Solution                                |
| ---------- | ------------------------ | --------------------------------------- |
| 401        | Invalid credentials      | Check username and application password |
| 403        | Insufficient permissions | User needs Editor or Admin role         |
| 404        | Endpoint not found       | Verify REST API is enabled              |
| 400        | Invalid data             | Check category/tag IDs exist            |
| 500        | Server error             | Retry or check WordPress error logs     |

---

## Best Practices

1. **Always preview first** - Create as draft, verify, then publish
2. **Use application passwords** - Never use regular WordPress password
3. **Select appropriate category** - Helps with site organization and SEO
4. **Generate relevant tags** - Improves Google discoverability
5. **Validate Gutenberg blocks** - Ensure proper block structure
6. **Keep excerpts under 160 chars** - Optimal for search snippets
7. **Use descriptive slugs** - Include primary keyword in URL
