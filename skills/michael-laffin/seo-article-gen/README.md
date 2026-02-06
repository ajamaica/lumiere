# SEO-Article-Gen

**Generate ranking content with automatic affiliate monetization.**

## Quick Start

```bash
# Install
clawhub install seo-article-gen

# Generate an article
cd ~/.openclaw/skills/seo-article-gen
node index.js generateArticle '{"keyword":"best wireless headphones","type":"product-review","wordCount":2000,"affiliate":true}'
```

## Features

- **Keyword Research** - Find low-competition, high-volume keywords
- **AI Writing** - Generate full articles from keywords
- **SEO Optimization** - Title tags, meta descriptions, headings, schema markup
- **Affiliate Integration** - Automatic link insertion with FTC disclosures
- **Multiple Article Types** - Product reviews, how-to guides, listicles, comparisons

## Usage Examples

### Generate a Product Review

```javascript
const article = generateArticle({
  keyword: 'best wireless headphones 2026',
  type: 'product-review',
  wordCount: 2000,
  affiliate: true,
  network: 'amazon',
})
```

### Find Keywords

```javascript
const keywords = findKeywords({
  seed: 'wireless headphones',
  intent: 'transactional',
  difficulty: 'medium',
})
```

### Generate Different Article Types

- **Product Reviews**: Comprehensive analysis of products
- **How-To Guides**: Step-by-step tutorials
- **Listicles**: "Top 10 X" style articles
- **Comparisons**: Head-to-head product comparisons

## Output Format

Each article includes:

- **Metadata**: Title, meta description, URL slug
- **Content**: Full article in Markdown and HTML
- **SEO Score**: Breakdown of optimization factors
- **Schema Markup**: JSON-LD for search engines
- **Affiliate Data**: Links and compliance info

## Configuration

Edit `config.json` to customize:

```json
{
  "seo": {
    "defaultWordCount": 2000,
    "keywordDensity": 1.5
  },
  "affiliate": {
    "enabled": true,
    "maxLinksPerArticle": 5
  }
}
```

## Test

```bash
node test.js
```

## Pricing

- **Free**: 5 articles/month (1,500 words max)
- **Pro ($15/month)**: 50 articles, full features
- **Unlimited ($49/month)**: Unlimited articles, API access

## License

MIT

---

**Generate ranking content. Monetize automatically.** 🔮
