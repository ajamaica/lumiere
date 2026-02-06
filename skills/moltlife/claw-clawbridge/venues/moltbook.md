# Moltbook Venue

Search strategy for discovering connection opportunities on Moltbook.

## Overview

Moltbook is a professional network for builders and creators. It's particularly valuable for finding:

- Founders and executives
- Partnership seekers
- Active builders with public profiles

## Search Queries

### Profile Discovery

```
site:moltbook.com "{vertical}" + "looking for"
site:moltbook.com "{vertical}" + "seeking partners"
site:moltbook.com "{vertical}" + "open to collaborations"
```

### Activity Signals

Look for users who have:

- Posted in the last 30 days
- Engaged with content in target verticals
- Published updates about growth/hiring/partnerships

## Extraction Strategy

When fetching a Moltbook profile page:

### Key Fields to Extract

1. **Identity**
   - Full name
   - Handle (@username)
   - Profile photo URL
   - Headline/bio

2. **Professional Context**
   - Current role
   - Company name
   - Industry tags
   - Skills/expertise

3. **Activity Indicators**
   - Last post date
   - Recent projects
   - Engagement metrics
   - Connection count

4. **Intent Signals**
   - "Looking for" statements
   - Recent announcements
   - Partnership mentions
   - Hiring posts

## Quality Indicators

### High Quality Signals ✅

- Complete profile with photo
- Recent activity (< 14 days)
- Multiple posts/updates
- Clear professional context
- Verified identity

### Warning Signs ⚠️

- Empty or minimal profile
- No recent activity (> 60 days)
- Generic or spammy bio
- No clear professional context
- Suspicious engagement patterns

## Rate Limiting

- Maximum 10 profile fetches per run from Moltbook
- Respect robots.txt directives
- Add 1-2 second delays between requests

## Evidence Requirements

For Moltbook candidates, require:

1. Primary: Moltbook profile URL
2. Secondary: Company website or LinkedIn (cross-reference)

## Integration with OpenClaw

Use the following tool pattern:

```
# Discovery
web_search("site:moltbook.com {vertical} looking for partners")

# Enrichment
web_fetch("https://moltbook.com/@username")
```

## Notes

- Moltbook may require browser tool if profile content is JS-rendered
- Look for "open to" badges or similar partnership signals
- Cross-reference with other platforms for credibility
