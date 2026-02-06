# Communities Venue

Search strategy for discovering connection opportunities in online communities.

## Overview

Online communities are high-signal discovery venues because:

- Active participation indicates engagement
- Questions reveal needs and pain points
- Discussions show expertise and credibility
- Community membership implies shared interests

## Target Community Types

### Professional Communities

- Slack workspaces (public channels)
- Discord servers
- LinkedIn groups
- Industry-specific forums

### Developer/Builder Communities

- GitHub discussions
- Dev.to / Hashnode
- Hacker News
- Product Hunt discussions
- IndieHackers

### Social Communities

- Twitter/X (industry hashtags)
- Reddit (industry subreddits)
- Threads
- Mastodon instances

## Search Query Templates

### Slack/Discord Discovery

```
site:join.slack.com "{vertical}"
site:discord.gg "{vertical}" + community
"{vertical}" + "slack community" + "join"
"{vertical}" + "discord server" + "invite"
```

### Reddit Discovery

```
site:reddit.com/r "{vertical}" + "looking for"
site:reddit.com "{vertical}" + "seeking recommendations"
site:reddit.com "{vertical}" + "need help with" + "{ask}"
```

### Twitter/X Discovery

```
site:twitter.com "{vertical}" + "excited to announce"
site:twitter.com "{vertical}" + "looking for" + partner
"{vertical}" + twitter + "building in public"
```

### IndieHackers / Product Hunt

```
site:indiehackers.com "{vertical}" + "launched"
site:producthunt.com "{vertical}" + "2026"
site:indiehackers.com "looking for" + "{ask}"
```

### GitHub Discovery

```
site:github.com "{vertical}" + "discussions"
site:github.com/discussions "{vertical}"
```

## Community-Specific Strategies

### Reddit

**Subreddits to scan:**

- r/{vertical} (direct match)
- r/startups
- r/SaaS
- r/marketing
- r/entrepreneur

**High-value post types:**

- "Looking for feedback"
- "Just launched"
- "Seeking co-founder/partner"
- "Hiring for"

### Twitter/X

**Search patterns:**

- Hashtag monitoring: #{vertical}
- Bio searches: "founder" + {vertical}
- Recent posts with partnership language

**High-value signals:**

- Building in public threads
- Launch announcements
- Seeking advice posts
- Industry commentary

### IndieHackers

**Valuable sections:**

- Product launches
- Milestone posts
- "Ask IH" questions
- Group discussions

### Hacker News

**Search:**

- Show HN posts
- Ask HN: "looking for"
- Launch announcements

## Extraction Strategy

### Community Profile

Extract:

- Username/handle
- Profile bio
- Activity level
- Karma/reputation
- Recent posts

### Post Content

Extract:

- Post title and body
- Author information
- Timestamp
- Engagement (upvotes, comments)
- Links shared
- Intent signals

## Quality Indicators

### High Quality ✅

- Active community member
- Consistent posting history
- Positive engagement/karma
- Clear identity (real name or consistent handle)
- Recent activity (< 14 days)

### Warning Signs ⚠️

- Brand new account
- Low engagement/karma
- Only promotional posts
- Inconsistent activity
- Anonymous with no history

## Cross-Reference Strategy

For community-discovered candidates:

1. Find username/handle
2. Search for same handle on other platforms
3. Look for linked website or email
4. Verify consistent identity across sources

## Evidence Requirements

For community candidates:

1. Primary: Community profile/post URL
2. Secondary: External website or verified social profile

## Privacy Considerations

- Only use publicly visible information
- Respect community rules and norms
- Don't scrape private/closed communities
- Honor do-not-contact preferences

## Rate Limiting

- Maximum 10 searches per community type
- Respect site-specific rate limits
- Use delays between fetches
- Avoid patterns that look automated
