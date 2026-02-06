# NewsAPI Search Examples

Common workflows and search patterns for research and monitoring.

## Table of Contents

- [Research Workflows](#research-workflows)
- [Source Filtering](#source-filtering)
- [Time-Based Searches](#time-based-searches)
- [Headlines Monitoring](#headlines-monitoring)
- [Advanced Query Patterns](#advanced-query-patterns)

---

## Research Workflows

### Track a Topic Over Time

Paginate through results to build a comprehensive dataset:

```bash
# Get first page
node scripts/search.js "climate summit" --weeks 2 --limit 100 --page 1 > page1.json

# Get second page
node scripts/search.js "climate summit" --weeks 2 --limit 100 --page 2 > page2.json

# Sort by date for chronological analysis
node scripts/search.js "climate summit" --weeks 2 --sort date --limit 100
```

### Monitor Breaking Developments

Check last 24 hours for new stories:

```bash
node scripts/search.js "product launch" --hours 24 --sort date
```

### Historical Analysis

Search specific date ranges:

```bash
# Specific event period
node scripts/search.js "olympics" --from 2024-07-26 --to 2024-08-11

# Year-long study
node scripts/search.js "electric vehicles" --from 2025-01-01 --to 2025-12-31 --limit 100
```

---

## Source Filtering

### Quality News Only

Filter to major reputable outlets:

```bash
node scripts/search.js "technology" --days 7 \
  --sources bbc-news,reuters,associated-press,al-jazeera-english,the-guardian-uk
```

### Regional Focus

UK sources only:

```bash
# Method 1: Source IDs
node scripts/search.js "business" --sources bbc-news,the-guardian-uk,daily-mail

# Method 2: Domain filtering
node scripts/search.js "business" --domains bbc.co.uk,theguardian.com

# Method 3: List UK sources first
node scripts/sources.js --country gb
```

### Exclude Low-Quality Sources

Remove tabloids, gossip, and aggregators:

```bash
node scripts/search.js "finance" --days 7 \
  --exclude tmz.com,radaronline.com,dailystar.co.uk
```

### Academic/Policy Sources

Search think tanks and policy publications:

```bash
node scripts/search.js "economics" --domains brookings.edu,cfr.org,foreignpolicy.com
```

---

## Time-Based Searches

### Recency Levels

```bash
# Breaking (last hour)
node scripts/search.js "superbowl" --hours 1

# Recent (today)
node scripts/search.js "superbowl" --hours 24

# This week
node scripts/search.js "superbowl" --days 7

# This month
node scripts/search.js "superbowl" --weeks 4

# Quarter
node scripts/search.js "superbowl" --months 3
```

### Date Ranges for Studies

```bash
# Specific event period
node scripts/search.js "world cup" --from 2022-11-20 --to 2022-12-18

# Annual comparison
node scripts/search.js "electric vehicles" --from 2024-01-01 --to 2024-12-31

# Pre/post event analysis
node scripts/search.js "stock market" --from 2025-06-01 --to 2025-07-01
```

---

## Headlines Monitoring

### Current Breaking News

```bash
# US breaking news
node scripts/search.js --headlines --country us --limit 20

# With keyword filter
node scripts/search.js "elon musk" --headlines --country us

# By category
node scripts/search.js --headlines --country us --category business
node scripts/search.js --headlines --country gb --category technology
```

### International Headlines

```bash
node scripts/search.js --headlines --country de  # Germany
node scripts/search.js --headlines --country fr  # France
node scripts/search.js --headlines --country au  # Australia
```

### Source-Specific Headlines

```bash
# BBC headlines only
node scripts/search.js --headlines --sources bbc-news

# Multiple sources
node scripts/search.js --headlines --sources bbc-news,cnn,reuters
```

---

## Advanced Query Patterns

### Precise Term Matching

```bash
# Exact phrase in title (high precision)
node scripts/search.js '"climate change"' --title-only

# Multiple required terms
node scripts/search.js '+apple +iphone +review' --days 7

# Phrase with exclusions
node scripts/search.js '"superbowl halftime" -commercial -ads' --days 7
```

### Concept Expansion

```bash
# Synonym expansion with OR
node scripts/search.js '(electric OR ev OR battery) AND (car OR vehicle)' --days 7

# Different actor types
node scripts/search.js '(government OR federal OR state) AND policy' --days 7

# Geographic variations
node scripts/search.js 'summit AND (London OR Paris OR Berlin OR Madrid)' --weeks 2
```

### Boolean Logic

```bash
# Complex grouping
node scripts/search.js '(sports OR athletics OR competition) AND (olympics OR world cup) NOT (video OR game)'

# Multiple conditions
node scripts/search.js '(+tesla +elon) OR (+spacex +rocket)' --days 7
```

---

## Language & Region Patterns

### Non-English Sources

```bash
# Spanish language
node scripts/search.js "fútbol" --lang es --days 7

# German language
node scripts/search.js "bundesliga" --lang de --days 7

# French language
node scripts/search.js "coupe du monde" --lang fr --days 7

# All languages (no filter)
node scripts/search.js "climate" --lang any --days 7
```

### Regional by Domain

```bash
# UK press
node scripts/search.js "business" --domains bbc.co.uk,theguardian.com,dailymail.co.uk

# US press
node scripts/search.js "business" --domains nytimes.com,cnn.com,foxnews.com

# International mix
node scripts/search.js "business" --domains bbc.co.uk,aljazeera.com,reuters.com
```

---

## Sorting Strategies

### By Relevance (Default)

Best for focused research on specific topics:

```bash
node scripts/search.js '"artificial intelligence"' --sort relevancy --limit 20
```

### By Date

Best for tracking chronology:

```bash
# Newest first (breaking news)
node scripts/search.js "product launch" --sort date --hours 24

# For historical timeline analysis
node scripts/search.js "product launch" --sort date --weeks 4
```

### By Popularity

Best for finding "most discussed" stories:

```bash
node scripts/search.js "celebrity news" --sort popularity --days 7
```

---

## Discovery Workflows

### Find Related Sources

```bash
# 1. Search broadly
node scripts/search.js "technology" --days 1 --limit 100 > results.json

# 2. Extract unique sources from results
# (Use jq: cat results.json | jq -r '.results[].source' | sort | uniq)

# 3. Get source IDs
node scripts/sources.js --country us --category general

# 4. Re-search with specific sources
node scripts/search.js "technology" --sources source-id-1,source-id-2
```

### Source Quality Assessment

```bash
# List sources in a country
node scripts/sources.js --country us

# Test each major source
node scripts/search.js "test" --sources bbc-news --limit 1
node scripts/search.js "test" --sources cnn --limit 1
```

---

## Research Output Workflows

### Save Results for Analysis

```bash
# JSON for programmatic analysis
node scripts/search.js "electric vehicles" --weeks 2 --limit 100 > ev_articles.json

# View with jq
# cat ev_articles.json | jq '.results[] | {title, source, date: .publishedAt}'

# Extract URLs for archiving
# cat ev_articles.json | jq -r '.results[].url'
```

### Comparative Searches

```bash
# Compare coverage of different terms
node scripts/search.js "iphone" --weeks 1 > term1.json
node scripts/search.js "android" --weeks 1 > term2.json

# Compare counts
# jq '.totalResults' term1.json term2.json
```

---

## Common Research Scenarios

### Scenario: Market Research

```bash
# Comprehensive search across quality sources
node scripts/search.js "product launch" --months 6 \
  --sources bbc-news,reuters,associated-press,techcrunch,the-verge \
  --sort date \
  --limit 100
```

### Scenario: Media Monitoring

```bash
# Daily check for new stories
node scripts/search.js "company OR brand" --hours 24 --sort date

# Exclude entertainment/gaming false positives
node scripts/search.js "apple" --hours 24 --exclude polygon.com,kotaku.com,ign.com
```

### Scenario: Event Tracking

```bash
# During active event (every few hours)
node scripts/search.js "superbowl 2026" --hours 6 --sort date

# After event (daily digest)
node scripts/search.js "superbowl recap" --hours 24 --sort relevancy
```

### Scenario: Comparative Regional Study

```bash
# Same topic, different countries
node scripts/search.js "electric vehicles" --headlines --country us > us_headlines.json
node scripts/search.js "electric vehicles" --headlines --country gb > uk_headlines.json
node scripts/search.js "electric vehicles" --headlines --country de > de_headlines.json

# Compare volume
# jq '.totalResults' *_headlines.json
```
