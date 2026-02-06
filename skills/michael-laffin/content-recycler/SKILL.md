---
name: content-recycler
description: Transform and repurpose content across multiple platforms including Twitter, LinkedIn, Facebook, Instagram, TikTok, and email. Use when adapting long-form content for social media, creating platform-specific variations, building content calendars, or maintaining consistent messaging across channels.
---

# Content Recycler

## Overview

Transform existing content into optimized variations for multiple platforms while maintaining brand voice and message consistency. Turn one blog post into a week's worth of social media content, newsletter copy, and cross-platform engagement.

## Core Capabilities

### 1. Long-Form to Micro-Content

**Transform blog posts into:**

- Twitter/X threads (280 char limits per tweet)
- LinkedIn posts (professional tone, character optimized)
- Facebook posts (conversational, community-focused)
- Instagram captions (emoji-rich, hashtag-optimized)
- TikTok/YouTube Shorts scripts (60-90 second scripts)
- Email newsletter summaries

**Example Request:**
"Take this 2000-word blog post about '10 Productivity Hacks' and create: (1) A Twitter thread, (2) LinkedIn post, (3) Facebook post, (4) Instagram caption, (5) TikTok script, and (6) Email teaser."

### 2. Platform-Specific Adaptation

**Optimize for each platform's unique characteristics:**

**Twitter/X:**

- Character limit: 280 per tweet
- Thread structure for longer content
- Hashtags: 1-3 per tweet
- Tone: Conversational, snappy, value-focused

**LinkedIn:**

- Character limit: 3,000
- Professional but conversational tone
- Data and statistics perform well
- Use line breaks and emojis strategically

**Facebook:**

- Character limit: 63,206
- Conversational, community-oriented
- Ask questions to drive engagement
- Include images/videos

**Instagram:**

- Character limit: 2,200
- Emoji-heavy
- Hashtags: 5-30 (optimal: 11)
- Aesthetic formatting, line breaks

**TikTok/Reels:**

- Scripts: 60-90 seconds (150-250 words)
- Hook in first 3 seconds
- Clear CTA
- Trending sounds/music suggestions

### 3. Content Calendar Generation

**From single content to multi-day schedule:**

Take one comprehensive piece (blog, video, guide) and generate a content calendar with:

- Day 1: Teaser (Twitter, Instagram Story)
- Day 2: Main content release (LinkedIn, Facebook)
- Day 3: Follow-up thread (Twitter/X)
- Day 4: Behind-the-scenes (Instagram, TikTok)
- Day 5: Q&A or poll (Facebook, Instagram)
- Day 6: Summary/stats (LinkedIn)
- Day 7: Call-to-action/next steps (Email newsletter)

**Example Request:**
"Create a 7-day content calendar from this blog post about 'Remote Work Tips' with daily posts for Twitter, LinkedIn, Instagram, and Facebook."

### 4. SEO & Hashtag Optimization

**Generate platform-appropriate tags:**

- **LinkedIn:** Tags in content, professional industry tags
- **Instagram:** 5-30 hashtags (mix of high, medium, low volume)
- **Twitter:** 1-3 hashtags per tweet
- **Facebook:** Minimal hashtags, more conversational tags
- **TikTok:** Trending sounds, challenge tags

**Example Request:**
"Generate optimized hashtags for Instagram and LinkedIn for this content about 'AI in Marketing'."

## Quick Start

### Transform Blog to All Platforms

```python
# Use scripts/recycle_content.py
python3 scripts/recycle_content.py \
  --input blog_post.md \
  --output-dir ./output \
  --platforms twitter,linkedin,facebook,instagram,tiktok,email \
  --format all
```

### Create Twitter Thread

```python
# Use scripts/to_twitter_thread.py
python3 scripts/to_twitter_thread.py \
  --input article.md \
  --max-tweets 10 \
  --hashtags 2 \
  --tone conversational
```

### Generate Content Calendar

```python
# Use scripts/generate_calendar.py
python3 scripts/generate_calendar.py \
  --input content.md \
  --days 7 \
  --platforms twitter,linkedin,facebook,instagram \
  --output calendar.md
```

## Scripts

### `recycle_content.py`

Transform content across multiple platforms.

**Parameters:**

- `--input`: Input file path (required)
- `--output-dir`: Output directory (default: ./output)
- `--platforms`: Comma-separated platforms (twitter,linkedin,facebook,instagram,tiktok,email)
- `--format`: Output format (all,threads,posts,captions,scripts)
- `--tone`: Tone preference (professional,conversational,playful)
- `--include-hashtags`: Include hashtag suggestions (true/false)
- `--cta`: Call-to-action to include

**Example:**

```bash
python3 scripts/recycle_content.py \
  --input blog_post.md \
  --output-dir ./output \
  --platforms twitter,linkedin,instagram \
  --tone professional \
  --include-hashtags \
  --cta "Read the full article at link in bio"
```

### `to_twitter_thread.py`

Convert long-form content to Twitter/X thread.

**Parameters:**

- `--input`: Input file path
- `--max-tweets`: Maximum number of tweets (default: 10)
- `--hashtags`: Number of hashtags per tweet (default: 2)
- `--tone`: Tone preference (default: conversational)
- `--include-cta`: Include CTA in final tweet

**Example:**

```bash
python3 scripts/to_twitter_thread.py \
  --input article.md \
  --max-tweets 8 \
  --hashtags 3 \
  --tone conversational \
  --include-cta
```

### `to_linkedin_post.py`

Create LinkedIn-optimized post from content.

**Parameters:**

- `--input`: Input file path
- `--max-length`: Max character length (default: 3000)
- `--tone`: Tone (professional,conversational,inspirational)
- `--include-stats`: Include statistics/data points
- `--formatting`: Use bolding, line breaks (true/false)

**Example:**

```bash
python3 scripts/to_linkedin_post.py \
  --input article.md \
  --tone professional \
  --include-stats \
  --formatting
```

### `generate_calendar.py`

Generate multi-day content calendar from source content.

**Parameters:**

- `--input`: Input file path
- `--days`: Number of days (default: 7)
- `--platforms`: Comma-separated platforms
- `--output`: Output file
- `--theme`: Daily themes (teaser,release,followup,behind_scenes,qa,summary,cta)

**Example:**

```bash
python3 scripts/generate_calendar.py \
  --input content.md \
  --days 7 \
  --platforms twitter,linkedin,facebook,instagram \
  --output calendar.md
```

### `optimize_hashtags.py`

Generate platform-optimized hashtags.

**Parameters:**

- `--input`: Input content or topic
- `--platforms`: Target platforms (instagram,linkedin,twitter,facebook,tiktok)
- `--count`: Number of hashtags per platform
- `--niche`: Industry/niche (tech,marketing,finance,health,etc.)

**Example:**

```bash
python3 scripts/optimize_hashtags.py \
  --input "AI in marketing automation" \
  --platforms instagram,linkedin,twitter \
  --count 15 \
  --niche marketing
```

## Content Adaptation Guidelines

### Twitter/X Best Practices

1. **Hook immediately** - First tweet is most important
2. **Number your threads** - 1/10, 2/10, etc.
3. **End with CTA** - Follow, like, share, link
4. **Use line breaks** - Every 2-3 sentences
5. **Add relevant images** - Between tweets

**Example Thread Structure:**

```
Tweet 1: Hook + what you'll learn + (1/X)
Tweet 2-8: Main points (one key insight per tweet)
Tweet 9: Bonus tip/counterintuitive point
Tweet 10: Summary + CTA + hashtags
```

### LinkedIn Best Practices

1. **First line matters** - 3-line hook with white space
2. **Use line breaks** - Every 1-2 sentences
3. **Add emojis strategically** - 1-2 per paragraph
4. **Include data/statistics** - Numbers perform well
5. **End with question** - Drive comments
6. **Tag relevant people** - 3-5 max

**Format Template:**

```
[Hook - 3 lines]

[White space]

[Key insight with data point]

[Personal story/example]

[Another key insight]

[Call to action or question]

#hashtags
```

### Instagram Best Practices

1. **Hook in first line** - Stop the scroll
2. **Use line breaks** - Every 1-2 sentences
3. **Emojis frequently** - But not spammy
4. **Hashtag strategy**:
   - 5-10: High volume
   - 5-10: Medium volume
   - 5-10: Niche/low volume
5. **End with CTA** - Link in bio, save, share

**Caption Template:**

```
[Hook - 2-3 lines with emojis]

[White space]

[Value/content]

[Another paragraph]

[CTA]

[Hashtags block]
```

### Facebook Best Practices

1. **Ask questions** - Drive engagement
2. **Use "You" language** - Personal connection
3. **Include media** - Image or video
4. **Keep it conversational** - Not too promotional
5. **Reply to comments** - Boost algorithm

### TikTok Scripts

1. **Hook in 3 seconds** - Value proposition
2. **Keep it short** - 60-90 seconds
3. **Use trends** - Music, sounds, formats
4. **Clear CTA** - Follow, link in bio
5. **Text overlay** - Key points on screen

**Script Structure:**

```
0-3s: Hook
3-45s: Main content (3-5 points)
45-55s: Call to action
55-60s: Outro
```

## Tone Guidelines

### Professional

- LinkedIn, email newsletters
- Data-driven, authoritative
- "We see...", "Research shows..."
- Avoid: Slang, excessive emojis

### Conversational

- Twitter, Facebook
- Personal stories, "I've found..."
- Emojis: 1-2 per post
- Casual but value-focused

### Playful

- Instagram, TikTok
- Trending language, emojis
- "Here's a secret...", "Guess what?"
- Memes, humor when appropriate

## Automation Integration

### Weekly Content Recycling Pipeline

```bash
# Weekly cron job - Sunday at 9 AM
0 9 * * 0 /path/to/content-recycler/scripts/recycle_content.py \
  --input ~/blog/posts/$(date +\%Y\%m\%d).md \
  --output-dir ~/content/calendar/$(date +\%Y\%m\%d) \
  --platforms all \
  --include-hashtags \
  --cta "Read more at blog.example.com"
```

### Auto-Publish to Social Media

Integrate with social media scheduling tools:

- Buffer
- Hootsuite
- Later
- SocialPilot

Output from content-recycler can be piped directly to their APIs or uploaded via CSV.

## Best Practices

### 1. Maintain Consistent Brand Voice

- Define brand voice guidelines in brand guide
- Adapt tone, don't change message
- Keep key phrases, mission statements consistent

### 2. Platform-First Thinking

Don't just copy-paste. Adapt to:

- Character limits
- Audience expectations
- Format conventions
- Engagement patterns

### 3. Test and Iterate

- Track engagement metrics
- A/B test different variations
- Learn what works on each platform
- Refine templates based on performance

### 4. Timing Matters

- **Twitter:** High engagement during work hours
- **LinkedIn:** Best Tue-Thu, 8-10 AM
- **Instagram:** 7-9 PM, 12-3 PM on weekends
- **Facebook:** 1-4 PM on weekdays
- **TikTok:** 7-11 PM, weekends

### 5. Visual Content

- Twitter: 1 image per 3 tweets
- Instagram: Every post needs image/video
- LinkedIn: Document carousels perform well
- Facebook: Image or video required
- TikTok: Video only

---

**Work smarter, not harder. One piece, ten platforms.**
