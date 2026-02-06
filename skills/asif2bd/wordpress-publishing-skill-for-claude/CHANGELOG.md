# Changelog

All notable changes to the WordPress Publisher Skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Support for custom post types
- Bulk publishing capabilities
- Image optimization before upload
- Support for Yoast SEO meta fields
- Multi-site support

---

## [1.0.0] - 2026-01-20

### Added

- **Core Publishing Features**
  - WordPress REST API integration with authentication
  - Create, update, and delete posts
  - Create and manage pages
  - Support for all post statuses (draft, publish, pending, private, future)
  - Scheduled post publishing

- **Category Management**
  - Auto-load categories from WordPress site
  - Smart category suggestion based on content analysis
  - Create categories on-the-fly
  - Category caching for performance

- **Tag Management**
  - SEO tag generation from content
  - Entity extraction (brand names, products)
  - Key phrase detection
  - Get or create tags automatically

- **Gutenberg Block Support**
  - Full Markdown to Gutenberg conversion
  - HTML to Gutenberg conversion
  - Support for all core blocks:
    - Paragraphs
    - Headings (H1-H6)
    - Lists (ordered and unordered, with nesting)
    - Tables
    - Code blocks (with syntax highlighting)
    - Blockquotes
    - Images
    - Separators
  - Block validation

- **Content Conversion Utilities**
  - `convert_to_gutenberg()` - auto-detect and convert
  - `markdown_to_gutenberg()` - Markdown conversion
  - `html_to_gutenberg()` - HTML conversion
  - Helper functions for specific blocks:
    - `create_table_block()`
    - `create_image_block()`
    - `create_button_block()`
    - `create_columns_block()`

- **Media Management**
  - Upload images and files
  - Set featured images
  - Support for multiple file types (jpg, png, gif, webp, pdf)

- **Preview and Verification**
  - Create drafts for preview
  - Preview URL generation
  - Post verification after publishing

- **CLI Interface**
  - `wp_publisher.py` command-line tool
  - `content_to_gutenberg.py` conversion tool
  - Validation mode for Gutenberg content

- **Error Handling**
  - Custom exception classes
  - Retry logic for transient errors
  - Detailed error messages

- **Documentation**
  - Comprehensive SKILL.md for Claude
  - Gutenberg blocks reference
  - API documentation

### Technical Details

- Python 3.8+ compatible
- Single dependency: `requests`
- Stateless design for Claude skill integration

---

## Version History Format

Each version entry includes:

### Added

New features or capabilities

### Changed

Changes in existing functionality

### Deprecated

Features that will be removed in upcoming releases

### Removed

Features removed in this release

### Fixed

Bug fixes

### Security

Security-related changes

---

## Contributing to Changelog

When submitting a PR, please include a changelog entry under `[Unreleased]` section:

```markdown
### Added

- Brief description of new feature (#PR_NUMBER)

### Fixed

- Brief description of bug fix (#ISSUE_NUMBER)
```

The maintainers will move entries to the appropriate version section during releases.

---

## Links

- [GitHub Repository](https://github.com/yourusername/wordpress-publisher-skill)
- [Issue Tracker](https://github.com/yourusername/wordpress-publisher-skill/issues)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Gutenberg Block Reference](https://developer.wordpress.org/block-editor/reference-guides/core-blocks/)
