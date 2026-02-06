# Web Venue

General web search strategy for discovering connection opportunities.

## Overview

The open web is the broadest discovery surface. Use it for:

- Company websites and about pages
- Blog posts and thought leadership
- News mentions and press releases
- Job postings (indicate growth/needs)
- Public directories and listings

## Search Query Templates

### Partnership Intent

```
"{vertical}" + "looking for partners"
"{vertical}" + "seeking agencies"
"{vertical}" + "partner program"
"{vertical}" + "agency partners wanted"
```

### Hiring/Growth Signals

```
"{vertical}" + "we're hiring" + "{role_type}"
"{vertical}" + "growing team" + "{ask_keyword}"
"{vertical}" + "series A" OR "series B" + "{vertical}"
```

### Content Signals

```
"{vertical}" + "how we scaled"
"{vertical}" + "our journey building"
"{vertical}" + "looking ahead to 2026"
```

### Specific Platform Searches

```
site:linkedin.com/posts "{vertical}" + "excited to announce"
site:medium.com "{vertical}" + "lessons learned"
site:substack.com "{vertical}" + "building in public"
```

## Page Types to Prioritize

### High Value Pages

1. **About/Team pages** - Company context, key people
2. **Blog posts** - Thought leadership, recent updates
3. **Careers pages** - Growth indicators, team needs
4. **Partner pages** - Existing partner programs
5. **Press releases** - Recent announcements

### Lower Value Pages

- Generic directory listings
- News articles (prefer primary sources)
- Aggregator sites
- Outdated content (> 6 months)

## Extraction Strategy

### Company Pages

Extract:

- Company name and description
- Key team members (name, role, photo)
- Recent news/updates
- Contact information
- Social links

### Blog Posts

Extract:

- Author name and role
- Publication date
- Key topics discussed
- Intent signals in content
- Author bio/contact

### Job Postings

Extract:

- Company name
- Role being hired
- Growth indicators
- Technology stack (if relevant)
- Company culture signals

## Quality Indicators

### High Quality ✅

- Recent publication date (< 30 days)
- Clear authorship
- Professional presentation
- Consistent company branding
- Working contact methods

### Warning Signs ⚠️

- No publication date
- Anonymous content
- Excessive promotional language
- Dead links or outdated info
- Suspicious domain age

## Search Operators

Use these Google search operators:

| Operator    | Purpose         | Example                  |
| ----------- | --------------- | ------------------------ |
| `site:`     | Limit to domain | `site:linkedin.com`      |
| `"..."`     | Exact phrase    | `"looking for partners"` |
| `OR`        | Either term     | `agency OR partner`      |
| `-`         | Exclude term    | `-job -careers`          |
| `after:`    | Date filter     | `after:2025-12-01`       |
| `filetype:` | File type       | `filetype:pdf`           |

## Rate Limiting

- Maximum 20 searches per run
- Maximum 50 page fetches per run
- Respect robots.txt
- Add delays between fetches

## Evidence Requirements

For web-discovered candidates:

1. Primary: Company or personal website
2. Secondary: Social profile or news mention

## Browser Fallback

Use `browser` tool instead of `web_fetch` when:

- Page returns empty or minimal content
- JavaScript-rendered content
- Single-page applications
- Content behind "load more" buttons
