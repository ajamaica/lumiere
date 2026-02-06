# WordPress Publisher Skill for Claude

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Claude Skill](https://img.shields.io/badge/Claude-Skill-blueviolet)](https://claude.ai)
[![SkillsMP](https://img.shields.io/badge/SkillsMP-Listed-blue)](https://skillsmp.com)
[![WordPress](https://img.shields.io/badge/WordPress-REST%20API-21759B)](https://developer.wordpress.org/rest-api/)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude/releases)

A Claude skill that enables direct publishing to WordPress sites via the REST API with full Gutenberg block support, automatic category selection, SEO tag generation, and preview capabilities.

## Features

- **Direct WordPress Publishing**: Create, update, and manage posts via REST API
- **Gutenberg Block Support**: Full conversion of Markdown/HTML to WordPress Gutenberg blocks
- **Smart Category Selection**: Auto-load categories from your site and intelligently match content
- **SEO Tag Generation**: Automatically generate relevant tags for better discoverability
- **Preview Workflow**: Create drafts, preview, then publish with confidence
- **Media Management**: Upload and attach featured images
- **Scheduled Publishing**: Schedule posts for future publication
- **CLI Support**: Use from command line for automation

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Workflow Overview](#workflow-overview)
- [Usage Guide](#usage-guide)
  - [Connection Setup](#connection-setup)
  - [Category Management](#category-management)
  - [Tag Generation](#tag-generation)
  - [Content Conversion](#content-conversion)
  - [Publishing Posts](#publishing-posts)
  - [Preview and Verification](#preview-and-verification)
- [API Reference](#api-reference)
- [Gutenberg Blocks Reference](#gutenberg-blocks-reference)
- [CLI Usage](#cli-usage)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Installation

### Via Claude Code Marketplace (Recommended)

```bash
# Add the marketplace
/plugin marketplace add Asif2BD/WordPress-Publishing-Skill-For-Claude

# Install the skill
/plugin install wordpress-publisher@wordpress-publisher-marketplace
```

### Via SkillsMP

Search for "wordpress-publisher" on [SkillsMP](https://skillsmp.com) and follow the installation instructions.

### Manual Installation

<details>
<summary><strong>For Claude Code</strong></summary>

```bash
# Clone to your skills directory
git clone https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude.git ~/.claude/skills/wordpress-publisher
```

</details>

<details>
<summary><strong>For Claude.ai (Web)</strong></summary>

1. Download this repository as ZIP
2. Extract and upload the skill folder via **Claude.ai → Settings → Skills → Upload custom skill**
</details>

<details>
<summary><strong>For Codex CLI</strong></summary>

```bash
# Clone to Codex skills directory
git clone https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude.git ~/.codex/skills/wordpress-publisher
```

</details>

### Standalone Python Usage

```bash
# Clone the repository
git clone https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude.git
cd WordPress-Publishing-Skill-For-Claude

# Install dependencies
pip install requests

# Test the installation
python scripts/wp_publisher.py --help
```

## Configuration

### WordPress Requirements

1. **WordPress Version**: 5.0+ (Gutenberg editor required)
2. **REST API**: Must be enabled (enabled by default)
3. **User Role**: Editor or Administrator
4. **Application Password**: Required for authentication

### Creating an Application Password

1. Log into your WordPress admin panel
2. Go to **Users → Profile**
3. Scroll to **Application Passwords** section
4. Enter a name: `Claude Publisher`
5. Click **Add New Application Password**
6. Copy the generated password (shown only once, spaces are optional)

> **Note**: Application passwords are different from your regular WordPress password. They provide API access without exposing your main credentials.

## Quick Start

```python
from scripts.wp_publisher import WordPressPublisher
from scripts.content_to_gutenberg import convert_to_gutenberg

# 1. Connect to WordPress
wp = WordPressPublisher(
    site_url="https://yoursite.com",
    username="your_username",
    password="xxxx xxxx xxxx xxxx xxxx xxxx"  # Application password
)

# 2. Test connection
user = wp.test_connection()
print(f"Connected as: {user['name']}")

# 3. Convert your content to Gutenberg
markdown_content = """
# My Article Title

This is a **bold** statement with *italic* text.

## Features

- Feature one
- Feature two
- Feature three

| Column A | Column B |
|----------|----------|
| Data 1   | Data 2   |
"""

gutenberg_content = convert_to_gutenberg(markdown_content)

# 4. Publish
result = wp.publish_content(
    title="My Article Title",
    content=gutenberg_content,
    category_names=["Tutorials"],
    auto_generate_tags=True,
    status="draft"  # Start with draft to preview
)

print(f"Preview URL: {result['preview_url']}")
print(f"Edit URL: {result['edit_url']}")
```

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    WordPress Publishing Workflow                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONNECT    ─→  Authenticate with WordPress site             │
│       │                                                         │
│       ▼                                                         │
│  2. ANALYZE    ─→  Load categories, analyze content for match   │
│       │                                                         │
│       ▼                                                         │
│  3. GENERATE   ─→  Create SEO-optimized tags from content       │
│       │                                                         │
│       ▼                                                         │
│  4. CONVERT    ─→  Transform Markdown/HTML to Gutenberg blocks  │
│       │                                                         │
│       ▼                                                         │
│  5. PREVIEW    ─→  Create draft and verify rendering            │
│       │                                                         │
│       ▼                                                         │
│  6. PUBLISH    ─→  Publish or schedule the post                 │
│       │                                                         │
│       ▼                                                         │
│  7. VERIFY     ─→  Confirm live post renders correctly          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Guide

### Connection Setup

```python
from scripts.wp_publisher import WordPressPublisher

wp = WordPressPublisher(
    site_url="https://yoursite.com",
    username="admin",
    password="xxxx xxxx xxxx xxxx xxxx xxxx"
)

# Test and verify connection
user_info = wp.test_connection()
print(f"Connected as: {user_info['name']}")
print(f"Role: {user_info.get('roles', ['unknown'])[0]}")
```

### Category Management

#### List All Categories

```python
categories = wp.get_categories_with_details()
for cat in categories:
    print(f"[{cat['id']}] {cat['name']} ({cat['count']} posts)")
```

#### Smart Category Selection

The system analyzes your content and suggests the best matching category:

```python
# Get categories from site
categories = wp.get_categories_with_details()

# Let the system suggest the best match
best_category = wp.suggest_category(
    content=article_content,
    title=article_title,
    available_categories=categories
)

print(f"Suggested: {best_category['name']}")
```

**Category Matching Logic:**

1. **Exact match**: Title/content contains category name (highest priority)
2. **Keyword match**: Category slug matches topic keywords
3. **Parent category**: Falls back to broader parent if no match
4. **Create new**: Creates category if none fit (with user approval)

#### Create a New Category

```python
new_cat = wp.create_category(
    name="Cloud Hosting",
    description="Articles about cloud hosting services",
    slug="cloud-hosting"
)
```

### Tag Generation

#### Automatic SEO Tags

```python
tags = wp.generate_seo_tags(
    content=article_content,
    title=article_title,
    max_tags=10
)
# Returns: ['n8n hosting', 'workflow automation', 'self-hosted', ...]
```

**Tag Generation Rules:**

1. **Primary keyword**: Always includes main topic from title
2. **Entity extraction**: Identifies brand names, products mentioned
3. **Key phrases**: Extracts 2-3 word combinations that appear multiple times
4. **Topic patterns**: Matches against common industry terms

#### Get or Create Tags

```python
# Automatically creates tags if they don't exist
tag_ids = wp.get_or_create_tags(['hosting', 'automation', 'tutorial'])
```

### Content Conversion

#### Markdown to Gutenberg

```python
from scripts.content_to_gutenberg import convert_to_gutenberg

markdown = """
# Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

| Header A | Header B |
|----------|----------|
| Cell 1   | Cell 2   |
"""

gutenberg_content = convert_to_gutenberg(markdown)
```

#### Supported Conversions

| Markdown      | Gutenberg Block            |
| ------------- | -------------------------- |
| `# Heading`   | `wp:heading`               |
| `**bold**`    | `<strong>` in paragraph    |
| `*italic*`    | `<em>` in paragraph        |
| `[link](url)` | `<a href>` in paragraph    |
| `- list item` | `wp:list`                  |
| `1. ordered`  | `wp:list {"ordered":true}` |
| `` `code` ``  | `wp:code`                  |
| `> quote`     | `wp:quote`                 |
| `![alt](url)` | `wp:image`                 |
| `\| table \|` | `wp:table`                 |
| `---`         | `wp:separator`             |

#### Create Specific Blocks

```python
from scripts.content_to_gutenberg import (
    create_table_block,
    create_image_block,
    create_button_block,
    create_columns_block
)

# Create a table
table = create_table_block(
    headers=['Plan', 'Price', 'Features'],
    rows=[
        ['Basic', '$10', '5GB Storage'],
        ['Pro', '$25', '50GB Storage'],
    ],
    striped=True
)

# Create a button
button = create_button_block(
    text="Get Started",
    url="https://example.com/signup",
    style="fill",
    align="center"
)
```

### Publishing Posts

#### Create a Draft

```python
draft = wp.create_draft(
    title="My Article",
    content=gutenberg_content,
    categories=[category_id],
    tags=tag_ids,
    excerpt="A brief description for SEO"
)

print(f"Preview: {draft['preview_url']}")
print(f"Edit: {draft['edit_url']}")
```

#### Publish Directly

```python
result = wp.publish_content(
    title="My Article",
    content=gutenberg_content,
    category_names=["Tutorials"],
    tag_names=["python", "automation"],
    status="publish",
    excerpt="A brief description",
    slug="my-custom-url-slug"
)

print(f"Live URL: {result['live_url']}")
```

#### Schedule for Later

```python
from datetime import datetime, timedelta

publish_date = datetime.now() + timedelta(days=7)

result = wp.publish_content(
    title="Scheduled Post",
    content=content,
    status="future",
    date=publish_date.isoformat()
)
```

### Preview and Verification

#### Preview Checklist

Before publishing, verify:

- [ ] Title displays correctly
- [ ] All headings render (H2, H3, H4)
- [ ] Tables render with proper formatting
- [ ] Lists display correctly (bullet and numbered)
- [ ] Code blocks have syntax highlighting
- [ ] Images load properly
- [ ] Links are clickable
- [ ] Category shows correctly
- [ ] Tags display in post

#### Publish After Preview

```python
# After previewing and approving the draft
result = wp.publish_post(draft['post_id'])
print(f"Published: {result['live_url']}")
```

#### Verify Published Post

```python
verification = wp.verify_published_post(post_id)
print(f"Status: {verification['status']}")
print(f"URL: {verification['url']}")
print(f"Categories: {verification['categories']}")
print(f"Tags: {verification['tags']}")
```

## API Reference

### WordPressPublisher Class

#### Connection Methods

| Method              | Description            | Returns        |
| ------------------- | ---------------------- | -------------- |
| `test_connection()` | Verify API credentials | User info dict |

#### Category Methods

| Method                                             | Description                | Returns                         |
| -------------------------------------------------- | -------------------------- | ------------------------------- |
| `get_categories(per_page=100)`                     | Get all categories         | List of category dicts          |
| `get_categories_with_details()`                    | Get categories with counts | List with id, name, slug, count |
| `create_category(name, slug, description, parent)` | Create new category        | Category dict                   |
| `get_or_create_category(name)`                     | Get or create by name      | Category ID                     |
| `suggest_category(content, title, categories)`     | AI-powered suggestion      | Best matching category          |

#### Tag Methods

| Method                                           | Description            | Returns             |
| ------------------------------------------------ | ---------------------- | ------------------- |
| `get_tags(per_page=100)`                         | Get all tags           | List of tag dicts   |
| `create_tag(name, slug, description)`            | Create new tag         | Tag dict            |
| `get_or_create_tags(names)`                      | Get or create multiple | List of tag IDs     |
| `generate_seo_tags(content, title, max_tags=10)` | Generate SEO tags      | List of tag strings |

#### Post Methods

| Method                                                       | Description              | Returns                |
| ------------------------------------------------------------ | ------------------------ | ---------------------- |
| `create_post(title, content, status, categories, tags, ...)` | Create post              | Post dict              |
| `update_post(post_id, **kwargs)`                             | Update existing post     | Updated post dict      |
| `get_post(post_id)`                                          | Get post by ID           | Post dict              |
| `delete_post(post_id, force=False)`                          | Delete post              | Deletion result        |
| `create_draft(...)`                                          | Create draft for preview | Dict with preview URLs |
| `publish_post(post_id)`                                      | Publish a draft          | Dict with live URL     |
| `publish_content(...)`                                       | High-level publish       | Complete result dict   |

#### Media Methods

| Method                                              | Description    | Returns                    |
| --------------------------------------------------- | -------------- | -------------------------- |
| `upload_media(file_path, title, alt_text, caption)` | Upload media   | Media dict with ID and URL |
| `get_media(media_id)`                               | Get media item | Media dict                 |

### WordPress REST API Endpoints

| Resource   | Endpoint                    |
| ---------- | --------------------------- |
| Posts      | `/wp-json/wp/v2/posts`      |
| Pages      | `/wp-json/wp/v2/pages`      |
| Categories | `/wp-json/wp/v2/categories` |
| Tags       | `/wp-json/wp/v2/tags`       |
| Media      | `/wp-json/wp/v2/media`      |
| Users      | `/wp-json/wp/v2/users`      |

### Post Statuses

| Status    | Description               |
| --------- | ------------------------- |
| `publish` | Live and visible to all   |
| `draft`   | Saved but not visible     |
| `pending` | Awaiting editorial review |
| `private` | Only visible to admins    |
| `future`  | Scheduled for later       |

## Gutenberg Blocks Reference

### Basic Blocks

**Paragraph:**

```html
<!-- wp:paragraph -->
<p>Your paragraph text here.</p>
<!-- /wp:paragraph -->
```

**Heading (H2 default):**

```html
<!-- wp:heading -->
<h2 class="wp-block-heading">Heading Text</h2>
<!-- /wp:heading -->
```

**Heading (other levels):**

```html
<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">H3 Heading</h3>
<!-- /wp:heading -->
```

### List Blocks

**Unordered:**

```html
<!-- wp:list -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
<!-- /wp:list -->
```

**Ordered:**

```html
<!-- wp:list {"ordered":true} -->
<ol>
  <li>First</li>
  <li>Second</li>
</ol>
<!-- /wp:list -->
```

### Table Block

```html
<!-- wp:table -->
<figure class="wp-block-table">
  <table>
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Cell 1</td>
        <td>Cell 2</td>
      </tr>
    </tbody>
  </table>
</figure>
<!-- /wp:table -->
```

> **Important**: Tables must be wrapped in `<figure class="wp-block-table">` or they won't render correctly.

### Code Block

```html
<!-- wp:code {"language":"python"} -->
<pre class="wp-block-code"><code lang="python">def hello():
    print("Hello World")</code></pre>
<!-- /wp:code -->
```

### Image Block

```html
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large">
  <img src="https://example.com/image.jpg" alt="Description" />
</figure>
<!-- /wp:image -->
```

### Quote Block

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>Quote text here.</p>
  <cite>— Attribution</cite>
</blockquote>
<!-- /wp:quote -->
```

For complete block reference, see [references/gutenberg-blocks.md](references/gutenberg-blocks.md).

## CLI Usage

### Test Connection

```bash
python scripts/wp_publisher.py \
  --url https://yoursite.com \
  --user admin \
  --password "xxxx xxxx xxxx xxxx" \
  --test
```

### List Categories

```bash
python scripts/wp_publisher.py \
  --url https://yoursite.com \
  --user admin \
  --password "xxxx" \
  --list-categories
```

### Publish Article

```bash
python scripts/wp_publisher.py \
  --url https://yoursite.com \
  --user admin \
  --password "xxxx" \
  --publish article.html \
  --title "My Article" \
  --category "Tutorials" \
  --auto-tags \
  --status draft
```

### Convert Markdown to Gutenberg

```bash
python scripts/content_to_gutenberg.py article.md article.html
```

### Validate Gutenberg Content

```bash
python scripts/content_to_gutenberg.py --validate article.html
```

## Error Handling

### Common Errors

| Error Code | Meaning               | Solution                                |
| ---------- | --------------------- | --------------------------------------- |
| 401        | Authentication failed | Check username and application password |
| 403        | Permission denied     | User needs Editor or Admin role         |
| 404        | Not found             | Verify REST API is enabled              |
| 400        | Invalid data          | Check category/tag IDs exist            |
| 500        | Server error          | Check WordPress error logs              |

### Error Classes

```python
from scripts.wp_publisher import (
    APIError,
    AuthenticationError,
    PermissionError,
    NotFoundError,
    ServerError
)

try:
    wp.publish_content(...)
except AuthenticationError:
    print("Check your credentials")
except PermissionError:
    print("User needs higher privileges")
except NotFoundError:
    print("Resource not found")
except ServerError:
    print("WordPress server error")
except APIError as e:
    print(f"API error: {e}")
```

## Best Practices

1. **Always preview first** - Create as draft, verify rendering, then publish
2. **Use application passwords** - Never use your regular WordPress password
3. **Select appropriate categories** - Helps with site organization and SEO
4. **Generate relevant tags** - Improves search engine discoverability
5. **Validate Gutenberg blocks** - Ensure proper block structure before publishing
6. **Keep excerpts under 160 chars** - Optimal for search snippets
7. **Use descriptive slugs** - Include primary keyword in URL
8. **Test tables carefully** - Tables are most prone to rendering issues

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude.git
cd WordPress-Publishing-Skill-For-Claude
pip install -r requirements-dev.txt
```

### Running Tests

```bash
pytest tests/
```

### Code Style

We follow PEP 8. Format your code with:

```bash
black scripts/
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Asif2BD/WordPress-Publishing-Skill-For-Claude/discussions)

## Author

**M Asif Rahman**

- Website: [MAsifRahman.com](https://MAsifRahman.com)
- GitHub: [@Asif2BD](https://github.com/Asif2BD)

## Acknowledgments

- WordPress REST API Team
- Gutenberg Block Editor Team
- Claude AI by Anthropic

---

<p align="center">
  Made with ❤️ by <a href="https://MAsifRahman.com">M Asif Rahman</a>
</p>
