---
name: newsletter-generator
description: Generate automated email newsletters with curated content, affiliate links, and personalized recommendations. Use when creating daily/weekly newsletters, building email lists, or monetizing subscriber engagement with affiliate content.
---

# Newsletter Generator

## Overview

Automate email newsletter creation with curated content, affiliate monetization, and personalized recommendations. Build and monetize email lists at scale.

## Core Capabilities

### 1. Content Curation

**Automatically:**

- Curate trending articles and blog posts
- Find relevant content based on keywords/topics
- Extract key points and summaries
- Categorize content by topic (tech, marketing, lifestyle, etc.)
- Filter for quality and relevance

### 2. Newsletter Templates

**Pre-built templates for:**

- Daily digest (5-10 links, brief summaries)
- Weekly roundup (deep dives, featured articles)
- Industry news (news-focused, time-sensitive)
- Tutorial series (educational, step-by-step)
- Product recommendations (affiliate-heavy, monetized)

### 3. Affiliate Integration

**Automatically includes:**

- Context-aware affiliate links
- Product recommendations matching newsletter theme
- FTC-compliant disclosures
- Trackable links for analytics
- Revenue optimization based on engagement

### 4. Personalization

**Personalize with:**

- Subscriber segments
- Past engagement data
- Time zones for optimal send times
- Custom sender info
- Dynamic content based on preferences

### 5. Analytics & Optimization

**Track and optimize:**

- Open rates and click-through rates
- Affiliate link performance
- Subscriber growth and churn
- Best-performing content types
- Send time optimization

## Quick Start

### Generate Daily Digest

```python
# Use scripts/generate_newsletter.py
python3 scripts/generate_newsletter.py \
  --type daily \
  --topic marketing \
  --articles 10 \
  --affiliate-links 3 \
  --output newsletter.md
```

### Generate Weekly Roundup

```python
python3 scripts/generate_newsletter.py \
  --type weekly \
  --topic tech \
  --articles 20 \
  --include-tutorials \
  --include-products \
  --output weekly.md
```

### Curate from RSS Feeds

```python
# Use scripts/curate_content.py
python3 scripts/curate_content.py \
  --rss-feeds https://feeds.feedburner.com/example1,https://example2.com/feed \
  --keywords marketing,seo,content \
  --articles 10 \
  --output curated_content.json
```

## Scripts

### `generate_newsletter.py`

Generate newsletter from curated content.

**Parameters:**

- `--type`: Newsletter type (daily, weekly, monthly, roundup, products)
- `--topic`: Primary topic/theme
- `--articles`: Number of articles to include
- `--affiliate-links`: Number of affiliate links to include
- `--include-tutorials`: Include educational content
- `--include-products`: Include product recommendations
- `--tone`: Newsletter tone (professional, casual, playful)
- `--output`: Output file

**Example:**

```bash
python3 scripts/generate_newsletter.py \
  --type daily \
  --topic digital-marketing \
  --articles 8 \
  --affiliate-links 3 \
  --tone conversational \
  --output newsletter.md
```

### `curate_content.py`

Curate content from RSS feeds or URLs.

**Parameters:**

- `--rss-feeds`: Comma-separated RSS feed URLs
- `--keywords`: Filter by keywords
- `--max-articles`: Maximum articles to curate
- `--min-relevance`: Minimum relevance score (0-1)
- `--output`: Output JSON file

**Example:**

```bash
python3 scripts/curate_content.py \
  --rss-feeds https://blog.example.com/feed,https://news.example.com/rss \
  --keywords "marketing,seo,growth" \
  --max-articles 15 \
  --output curated.json
```

### `add_affiliate_links.py`

Add affiliate links to existing newsletter.

**Parameters:**

- `--input`: Newsletter file
- `--network`: Affiliate network (amazon, shareasale, cj, impact)
- `--links`: Number of links to add
- `--disclosure-position`: Where to add disclosure (top, bottom, inline)

**Example:**

```bash
python3 scripts/add_affiliate_links.py \
  --input newsletter.md \
  --network amazon \
  --links 5 \
  --disclosure-position top
```

### `schedule_newsletter.py`

Schedule newsletter for sending (generates schedule data).

**Parameters:**

- `--newsletter`: Newsletter file
- `--send-time`: Optimal send time
- `--timezone`: Subscriber timezone
- `--segments`: Subscriber segments
- `--output`: Schedule file for ESP (Email Service Provider)

**Example:**

```bash
python3 scripts/schedule_newsletter.py \
  --newsletter newsletter.md \
  --send-time "09:00" \
  --timezone "America/Chicago" \
  --output schedule.json
```

### `analytics_report.py`

Generate analytics and optimization recommendations.

**Parameters:**

- `--metrics-file`: Metrics data from ESP
- `--period`: Time period (7d, 30d, 90d)
- `--output`: Report file

## Newsletter Templates

### Daily Digest Template

```
Subject: [Topic] Daily Digest - [Date]

---

## Today's Top Stories

[Article 1 Title]
[Summary]
[Read more →] [Affiliate Link if applicable]

[Article 2 Title]
[Summary]
[Read more →]

...

## Quick Tip
[Brief actionable tip with affiliate link]

## Featured Resource
[Product/Tool recommendation]
[Brief description]
[Get it here →] [Affiliate Link]

---

[FTC Disclosure]
```

### Weekly Roundup Template

```
Subject: [Topic] Weekly Roundup - Top [N] Stories

---

## This Week's Highlights

[Deep Dive Article 1]
[Comprehensive summary]
[Read the full article →]

[Deep Dive Article 2]
[Comprehensive summary]
[Read the full article →]

## Tutorial Corner
[Step-by-step tutorial]
[Product recommendations with affiliate links]

## Industry News
[3-5 key news stories]
[Brief updates]

## Recommended Resources
[Product recommendations with affiliate links]

---

[FTC Disclosure]
```

## Best Practices

### Subject Lines

- Keep under 50 characters for mobile
- Use numbers and brackets [Daily Digest], [Weekly]
- Include urgency or curiosity
- A/B test different subject lines

### Content Balance

- 70% value (educational content)
- 20% curation (other people's content)
- 10% promotion (affiliate/sales)

### Affiliate Links

- 1-3 links per newsletter
- Contextually relevant to content
- Clear disclosure at the top
- Trackable links for analytics

### Send Times

- **B2B:** Tuesday-Thursday, 9-11 AM
- **B2C:** Weekends, 6-8 PM
- **Newsletters:** Tuesday/Wednesday, 8-10 AM
- **Promotions:** Monday or Friday

## Automation

### Daily Newsletter Generation

```bash
# Generate daily newsletter at 8 AM
0 8 * * * /path/to/newsletter-generator/scripts/generate_newsletter.py \
  --type daily \
  --topic tech \
  --articles 10 \
  --affiliate-links 3 \
  --output /path/to/newsletters/daily_$(date +\%Y\%m\%d).md
```

### Weekly Roundup

```bash
# Generate weekly newsletter every Sunday at 9 AM
0 9 * * 0 /path/to/newsletter-generator/scripts/generate_newsletter.py \
  --type weekly \
  --topic marketing \
  --articles 20 \
  --include-tutorials \
  --output /path/to/newsletters/weekly_$(date +\%Y\%m\%d).md
```

## Integration Opportunities

### With Content Recycler

```bash
# 1. Recycle article to newsletter format
content-recycler/scripts/recycle_content.py \
  --input article.md \
  --platforms email

# 2. Add affiliate links
newsletter-generator/scripts/add_affiliate_links.py \
  --input email_version.md
```

### With SEO Article Generator

```bash
# 1. Generate SEO article
seo-article-gen --keyword "newsletter topic"

# 2. Curate related content
newsletter-generator/scripts/curate_content.py --keywords "newsletter topic"

# 3. Generate newsletter
newsletter-generator/scripts/generate_newsletter.py
```

## Revenue Impact

**Email Marketing Stats:**

- Average open rate: 20-30%
- Average CTR: 2-5%
- Affiliate conversion: 1-3%
- Revenue per 1,000 subscribers: $50-500/month

**Scaling Potential:**

- 1 newsletter/day × 1,000 subscribers = $50-500/day
- 1 newsletter/week × 10,000 subscribers = $500-5,000/week

---

**Build your list. Monetize automatically. Scale effortlessly.**
