---
name: review-summarizer
description: Scrape, analyze, and summarize product reviews from multiple platforms (Amazon, Google, Yelp, TripAdvisor). Extract key insights, sentiment analysis, pros/cons, and recommendations. Use when researching products for arbitrage, creating affiliate content, or making purchasing decisions.
---

# Review Summarizer

## Overview

Automatically scrape and analyze product reviews from multiple platforms to extract actionable insights. Generate comprehensive summaries with sentiment analysis, pros/cons identification, and data-driven recommendations.

## Core Capabilities

### 1. Multi-Platform Review Scraping

**Supported Platforms:**

- Amazon (product reviews)
- Google (Google Maps, Google Shopping)
- Yelp (business and product reviews)
- TripAdvisor (hotels, restaurants, attractions)
- Custom platforms (via URL pattern matching)

**Scrape Options:**

- All reviews or specific time ranges
- Verified purchases only
- Filter by rating (1-5 stars)
- Include images and media
- Max review count limits

### 2. Sentiment Analysis

**Analyzes:**

- Overall sentiment score (-1.0 to +1.0)
- Sentiment distribution (positive/neutral/negative)
- Key sentiment drivers (what causes positive/negative reviews)
- Trend analysis (sentiment over time)
- Aspect-based sentiment (battery life, quality, shipping, etc.)

### 3. Insight Extraction

**Automatically identifies:**

- Top pros mentioned in reviews
- Common complaints and cons
- Frequently asked questions
- Use cases and applications
- Competitive comparisons mentioned
- Feature-specific feedback

### 4. Summary Generation

**Output formats:**

- Executive summary (150-200 words)
- Detailed breakdown by category
- Pros/cons lists with frequency counts
- Statistical summary (avg rating, review count, etc.)
- CSV export for analysis
- Markdown report for documentation

### 5. Recommendation Engine

**Generates recommendations based on:**

- Overall sentiment score
- Review quantity and recency
- Verified purchase ratio
- Aspect-based ratings
- Competitive comparison

## Quick Start

### Summarize Amazon Product Reviews

```python
# Use scripts/scrape_reviews.py
python3 scripts/scrape_reviews.py \
  --url "https://amazon.com/product/dp/B0XXXXX" \
  --platform amazon \
  --max-reviews 100 \
  --output amazon_summary.md
```

### Compare Reviews Across Platforms

```python
# Use scripts/compare_reviews.py
python3 scripts/compare_reviews.py \
  --product "Sony WH-1000XM5" \
  --platforms amazon,google,yelp \
  --output comparison_report.md
```

### Generate Quick Summary

```python
# Use scripts/quick_summary.py
python3 scripts/quick_summary.py \
  --url "https://amazon.com/product/dp/B0XXXXX" \
  --brief \
  --output summary.txt
```

## Scripts

### `scrape_reviews.py`

Scrape and analyze reviews from a single URL.

**Parameters:**

- `--url`: Product or business review URL (required)
- `--platform`: Platform (amazon, google, yelp, tripadvisor) (auto-detected if omitted)
- `--max-reviews`: Maximum reviews to fetch (default: 100)
- `--verified-only`: Filter to verified purchases only
- `--min-rating`: Minimum rating to include (1-5)
- `--time-range`: Time filter (7d, 30d, 90d, all) (default: all)
- `--output`: Output file (default: summary.md)
- `--format`: Output format (markdown, json, csv)

**Example:**

```bash
python3 scripts/scrape_reviews.py \
  --url "https://amazon.com/dp/B0XXXXX" \
  --platform amazon \
  --max-reviews 200 \
  --verified-only \
  --format markdown \
  --output product_summary.md
```

### `compare_reviews.py`

Compare reviews for a product across multiple platforms.

**Parameters:**

- `--product`: Product name or keyword (required)
- `--platforms`: Comma-separated platforms (default: all)
- `--max-reviews`: Max reviews per platform (default: 50)
- `--output`: Output file
- `--format`: Output format (markdown, json)

**Example:**

```bash
python3 scripts/compare_reviews.py \
  --product "AirPods Pro 2" \
  --platforms amazon,google,yelp \
  --max-reviews 75 \
  --output comparison.md
```

### `sentiment_analysis.py`

Analyze sentiment of review text.

**Parameters:**

- `--input`: Input file or text (required)
- `--type`: Input type (file, text, url)
- `--aspects`: Analyze specific aspects (comma-separated)
- `--output`: Output file

**Example:**

```bash
python3 scripts/sentiment_analysis.py \
  --input reviews.txt \
  --type file \
  --aspects battery,sound,quality \
  --output sentiment_report.md
```

### `quick_summary.py`

Generate a brief executive summary.

**Parameters:**

- `--url`: Review URL (required)
- `--brief`: Brief summary only (no detailed breakdown)
- `--words`: Summary word count (default: 150)
- `--output`: Output file

**Example:**

```bash
python3 scripts/quick_summary.py \
  --url "https://yelp.com/biz/example-business" \
  --brief \
  --words 100 \
  --output summary.txt
```

### `export_data.py`

Export review data for further analysis.

**Parameters:**

- `--input`: Summary file or JSON data (required)
- `--format`: Export format (csv, json, excel)
- `--output`: Output file

**Example:**

```bash
python3 scripts/export_data.py \
  --input product_summary.json \
  --format csv \
  --output reviews_data.csv
```

## Output Format

### Markdown Summary Structure

```markdown
# Product Review Summary: [Product Name]

## Overview

- **Platform:** Amazon
- **Reviews Analyzed:** 247
- **Average Rating:** 4.3/5.0
- **Overall Sentiment:** +0.72 (Positive)

## Key Insights

### Top Pros

1. Excellent sound quality (89 reviews)
2. Great battery life (76 reviews)
3. Comfortable fit (65 reviews)

### Top Cons

1. Expensive (34 reviews)
2. Connection issues (22 reviews)
3. Limited color options (18 reviews)

## Sentiment Analysis

- **Positive:** 78% (193 reviews)
- **Neutral:** 15% (37 reviews)
- **Negative:** 7% (17 reviews)

## Recommendation

✅ **Recommended** - Strong positive sentiment with high customer satisfaction.
```

## Best Practices

### For Arbitrage Research

1. **Compare across platforms** - Check Amazon vs eBay seller ratings
2. **Look for red flags** - High return rates, quality complaints
3. **Check authenticity** - Verified purchases only
4. **Analyze trends** - Recent review sentiment vs older reviews

### For Affiliate Content

1. **Extract real quotes** - Use actual customer feedback
2. **Identify use cases** - How people use the product
3. **Find pain points** - Problems the product solves
4. **Build credibility** - Use data from many reviews

### For Purchasing Decisions

1. **Check recent reviews** - Last 30-90 days
2. **Look at 1-star reviews** - Understand worst-case scenarios
3. **Consider your needs** - Match features to your use case
4. **Compare alternatives** - Use compare_reviews.py

## Integration Opportunities

### With Price Tracker

Use review summaries to validate arbitrage opportunities:

```bash
# 1. Find arbitrage opportunity
price-tracker/scripts/compare_prices.py --keyword "Sony WH-1000XM5"

# 2. Validate with reviews
review-summarizer/scripts/scrape_reviews.py --url [amazon_url]
review-summarizer/scripts/scrape_reviews.py --url [ebay_url]

# 3. Make informed decision
```

### With Content Recycler

Generate content from review insights:

```bash
# 1. Summarize reviews
review-summarizer/scripts/scrape_reviews.py --url [amazon_url]

# 2. Use insights in article
seo-article-gen --keyword "[product name] review" --use-insights review_summary.json

# 3. Recycle across platforms
content-recycler/scripts/recycle_content.py --input article.md
```

## Automation

### Weekly Review Monitoring

```bash
# Monitor competitor products
0 9 * * 1 /path/to/review-summarizer/scripts/compare_reviews.py \
  --product "competitor-product" \
  --platforms amazon,google \
  --output /path/to/competitor_analysis.md
```

### Alert on Negative Trends

```bash
# Check for sentiment drops below threshold
if [ $(grep -o "Sentiment: -" summary.md | wc -l) -gt 0 ]; then
  echo "Negative sentiment alert" | mail -s "Review Alert" user@example.com
fi
```

## Data Privacy & Ethics

- Only scrape publicly available reviews
- Respect robots.txt and rate limits
- Don't store PII (personal information)
- Aggregate data, don't expose individual reviewers
- Follow platform terms of service

## Limitations

- Rate limiting on some platforms
- Cannot access verified purchase status on all platforms
- Fake reviews may skew analysis
- Language support varies by platform
- Some platforms block scraping

---

**Make data-driven decisions. Automate research. Scale intelligence.**
