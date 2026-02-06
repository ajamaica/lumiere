---
name: seo-article-gen
description: SEO-optimized article generator with automatic affiliate link integration. Generate high-ranking content with keyword research, structured data, and monetization built-in.
metadata:
  {
    'openclaw':
      {
        'version': '1.0.0',
        'author': 'Vernox',
        'license': 'MIT',
        'tags': ['seo', 'content', 'affiliate', 'writing', 'automation'],
        'category': 'marketing',
      },
  }
---

# SEO-Article-Gen - SEO-Optimized Content Generator

**Generate ranking content with affiliate monetization built-in.**

## Overview

SEO-Article-Gen creates SEO-optimized articles that actually rank. It combines keyword research, AI writing, structured data generation, and automatic affiliate link insertion - all in one tool.

## Features

### ✅ Keyword Research

- Find low-competition, high-volume keywords
- Analyze search intent (informational, transactional, navigational)
- Get keyword difficulty scores
- Find related questions (People Also Ask)
- Generate long-tail keyword variations

### ✅ AI-Powered Writing

- Generate full articles from keywords
- Natural language optimization
- Proper heading structure (H1, H2, H3)
- Readable, engaging content
- Word count optimization (1,500-2,500 words)

### ✅ SEO Optimization

- Optimized title tags & meta descriptions
- Proper URL slug generation
- Image alt text suggestions
- Internal link suggestions
- External link opportunities
- Schema markup (Article, FAQ, HowTo)

### ✅ Affiliate Integration

- Automatic affiliate link insertion
- Context-aware product recommendations
- FTC-compliant disclosures
- Link optimization for CTR
- Revenue tracking ready

### ✅ Content Templates

- Product reviews
- How-to guides
- Comparison articles
- Listicles ("Top 10 X")
- Ultimate guides
- Case studies

## Installation

```bash
clawhub install seo-article-gen
```

## Quick Start

### Generate an Article

```javascript
const article = await generateArticle({
  keyword: 'best wireless headphones 2026',
  type: 'product-review',
  wordCount: 2000,
  affiliate: true,
  network: 'amazon',
})

console.log(article)
```

### Keyword Research

```javascript
const keywords = await findKeywords({
  seed: 'wireless headphones',
  intent: 'transactional',
  difficulty: 'low',
  volume: 500,
})

// Returns: [
//   { keyword: "best wireless headphones for gaming", volume: 1200, difficulty: 15 },
//   { keyword: "budget wireless noise cancelling", volume: 800, difficulty: 12 }
// ]
```

## Tool Functions

### `generateArticle`

Generate a full SEO-optimized article.

**Parameters:**

- `keyword` (string, required): Target keyword
- `type` (string): Article type (product-review, how-to, comparison, listicle)
- `wordCount` (number): Target word count (default: 2000)
- `affiliate` (boolean): Insert affiliate links (default: true)
- `network` (string): Affiliate network to use
- `includeImages` (boolean): Generate image suggestions

**Returns:**

- Title, meta description, URL slug
- Full article content with headings
- Keyword density report
- Affiliate links inserted
- Schema markup (JSON-LD)
- SEO score

### `findKeywords`

Research keywords for content opportunities.

**Parameters:**

- `seed` (string, required): Seed keyword
- `intent` (string): Filter by intent (informational, transactional, navigational)
- `difficulty` (string): Filter by difficulty (low, medium, high)
- `volume` (number): Minimum search volume
- `limit` (number): Maximum results (default: 20)

**Returns:**

- Array of keyword objects with volume, difficulty, CPC data

### `optimizeContent`

Optimize existing content for SEO.

**Parameters:**

- `content` (string, required): Content to optimize
- `keyword` (string, required): Target keyword
- `options` (object):
  - `addStructure` (boolean): Add proper headings
  - `addMeta` (boolean): Generate title/meta
  - `addInternalLinks` (boolean): Suggest internal links

**Returns:**

- Optimized content
- SEO improvement suggestions
- Before/after comparison

### `generateSchema`

Generate structured data markup.

**Parameters:**

- `type` (string, required): Schema type (Article, FAQ, HowTo, Product)
- `content` (object, required): Content data

**Returns:**

- JSON-LD schema markup
- Validation results

### `analyzeCompetitors`

Analyze top-ranking competitors for a keyword.

**Parameters:**

- `keyword` (string, required): Target keyword
- `topN` (number): Number of competitors (default: 5)

**Returns:**

- Competitor URLs
- Word count analysis
- Heading structure
- Common keywords
- Content gaps to exploit

## Use Cases

### Product Review Articles

Generate comprehensive product reviews with affiliate links:

- Pros/cons sections
- Comparison tables
- Buying guides
- User testimonials

### How-To Guides

Create helpful how-to content that ranks:

- Step-by-step instructions
- Expert tips
- Required tools/products (affiliate links)
- Common mistakes

### Listicles

Generate "Best X for Y" articles:

- Product recommendations
- Comparison tables
- Pricing info
- Affiliate links for each item

### Case Studies

Build authority with real examples:

- Before/after results
- Methodology explained
- Tools used (monetized)
- Expert quotes

## Article Structure

All generated articles follow SEO best practices:

```
H1: Optimized Title
- Meta Description (155-160 chars)
- Featured Image Alt Text

H2: Introduction
- Hook paragraph
- Problem statement
- What readers will learn

H2: [Main Content Section]
- In-depth explanation
- Bullet points for readability
- Statistics/data where applicable

H2: [Affiliate Product Recommendation]
- Product description
- Key features
- Pros/cons
- CTA with affiliate link
- FTC disclosure

H2: Comparison (optional)
- Side-by-side comparison
- Pricing table
- Use cases

H2: FAQ
- 5-7 common questions
- Concise answers
- Schema markup

H2: Conclusion
- Key takeaways
- Final recommendation
- CTA

Schema: Article + FAQ
```

## SEO Score Calculation

Generated articles are scored on:

- **Title Optimization** (20pts): Keyword placement, length, appeal
- **Meta Description** (15pts): Keyword inclusion, CTR potential
- **Heading Structure** (15pts): H2/H3 hierarchy, keyword usage
- **Content Quality** (25pts): Readability, depth, originality
- **Keyword Usage** (15pts): Density, natural placement
- **Internal/External Links** (5pts): Link placement, relevance
- **Schema Markup** (5pts): Proper JSON-LD implementation

**Score Guide:**

- 90-100: Excellent (likely to rank)
- 80-89: Good (minor improvements needed)
- 70-79: Decent (needs optimization)
- <70: Poor (significant improvements needed)

## Affiliate Integration

Articles automatically include:

1. **Product Recommendations**
   - Context-aware product suggestions
   - Price comparisons
   - Feature highlights

2. **Strategic Link Placement**
   - Above-fold for high-CTR products
   - In-product comparison sections
   - Call-to-action paragraphs

3. **FTC Disclosures**
   - Automatic disclosure injection
   - Platform-appropriate placement
   - Compliant with FTC guidelines

## Pricing

- **Free**: 5 articles/month (1,500 words max)
- **Pro ($15/month)**: 50 articles, full features
- **Unlimited ($49/month)**: Unlimited articles, API access, priority generation

## Roadmap

- [ ] Integration with SEO tools (Ahrefs, SEMrush, Moz)
- [ ] Auto-publishing to CMS (WordPress, Ghost, Medium)
- [ ] Multi-language support
- [ ] Image generation (DALL-E, Midjourney)
- [ ] Content scheduling
- [ ] Team collaboration features

## Best Practices

### Keyword Selection

- Target long-tail keywords with low difficulty
- Match search intent with article type
- Balance volume vs. competition

### Content Quality

- Write for humans first, search engines second
- Use natural language, avoid keyword stuffing
- Include original insights, not just summaries
- Update regularly to stay fresh

### Affiliate Links

- Don't over-link (3-5 per 2,000 words)
- Make links contextually relevant
- Add value, don't just monetize
- Always disclose clearly

## License

MIT

---

**Generate ranking content. Monetize automatically.** 🔮
