---
name: Meta Tags - SEO Tag Generator
description: Generate HTML meta tags for SEO, Open Graph, Twitter Cards, JSON-LD. Copy-paste ready. Perfect for web developers. Free CLI tool.
---

# Meta Tags

Generate complete meta tags for SEO. HTML, Open Graph, Twitter Cards, JSON-LD schema.

## Installation

```bash
npm install -g @lxgicstudios/meta-tags
```

## Basic Usage

```bash
npx @lxgicstudios/meta-tags -t "Page Title" -d "Description" -u "https://example.com"
```

## Commands

### Generate All Tags

```bash
meta-tags -t "My Website" -d "Welcome to my site" -u "https://example.com"
```

### With Social Image

```bash
meta-tags -t "Blog Post" -d "Great article" -i "https://example.com/image.jpg"
```

### Article Type

```bash
meta-tags -t "How to Code" --type article --author "John Doe" --published "2024-01-15"
```

### From Config File

```bash
meta-tags --config seo.json -o head.html
```

## Options

| Option              | Description                        |
| ------------------- | ---------------------------------- |
| `-t, --title`       | Page title (required)              |
| `-d, --description` | Meta description                   |
| `-u, --url`         | Canonical URL                      |
| `-i, --image`       | OG/Twitter image                   |
| `-k, --keywords`    | Keywords (comma-separated)         |
| `--site-name`       | Website name                       |
| `--twitter`         | Twitter handle                     |
| `--type`            | OG type: website, article, product |
| `--format`          | html, json, react, vue             |

## Output Example

```html
<!-- Primary Meta Tags -->
<title>My Website</title>
<meta name="description" content="Welcome..." />
<link rel="canonical" href="https://example.com" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="My Website" />
<meta property="og:image" content="https://..." />

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:title" content="My Website" />

<!-- JSON-LD -->
<script type="application/ld+json">
  ...
</script>
```

## Output Formats

```bash
meta-tags -t "Title" --format html   # Default
meta-tags -t "Title" --format json   # JSON
meta-tags -t "Title" --format react  # React Helmet
meta-tags -t "Title" --format vue    # Vue useHead
```

## Common Use Cases

**Blog post tags:**

```bash
meta-tags -t "My Article" -d "Description" -i "cover.jpg" --type article --author "Me"
```

**Generate for Next.js:**

```bash
meta-tags -t "Page" --format react -o metadata.tsx
```

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/meta-tags) · [Twitter](https://x.com/lxgicstudios)
