# Scripture-Curated Skill Documentation

## Overview

**Scripture-Curated** connects God's Word to your world. It searches current events—both global and personal—and finds relevant Scripture with theological depth, historical context, and reading plans that draw you into the biblical narrative.

## Theological Foundation

This skill operates within **Nicene Christianity**:

- **Trinity**: One God—Father, Son, Holy Spirit—coequal, coeternal
- **Christ**: Fully God, fully man; born of Mary; crucified; raised bodily; ascended; returning
- **Scripture**: Authoritative, inspired, sufficient
- **Salvation**: By grace through faith in Christ alone
- **Church**: One, holy, catholic, apostolic
- **Last Things**: Resurrection, judgment, new heavens and earth

See `config/nicene-creed.md` for the full theological framework.

## What It Does

### 1. Event-Based Scripture Matching

Searches current news and matches it to relevant Scripture:

> **World Event**: Conflict in the Middle East  
> **Scripture**: Matthew 5:9 — "Blessed are the peacemakers..."  
> **Connection**: Christ's kingdom brings peace; peacemaking reflects God's children  
> **Context**: The Beatitudes describe kingdom ethics; peace is not passive but active

### 2. Personal Context Integration

Combines world events with your local context:

> **Global**: Economic uncertainty  
> **Personal**: (You mentioned work stress)  
> **Scripture**: Philippians 4:6-7 — "Do not be anxious..."  
> **Reading Plan**: 3-day peace focus → John 14:27, Isaiah 26:3, Psalm 46:10

### 3. Reading Plans

Generates connected verse journeys:

- **3-Day Plans**: Quick thematic dives (Peace, Hope, Suffering)
- **7-Day Plans**: Weekly spiritual disciplines (Prayer, Faith, Love)
- **30-Day Plans**: Month-long explorations (Redemption, The Life of Christ, End Times)

Each plan builds connections: verses echo, amplify, and complete each other.

### 4. Contextual Depth

Ready to answer:

- _"Why this verse?"_ — Historical and literary context
- _"What does this mean?"_ — Theological significance
- _"How do I apply this?"_ — Practical application
- _"What comes before/after?"_ — Canonical context

## File Structure

```
scripture-curated/
├── SKILL.md                    # This documentation
├── README.md                   # User guide
├── .env.example                # Configuration template
├── config/
│   ├── verses.json             # 75+ verses organized by theme
│   ├── nicene-creed.md         # Theological framework
│   └── reading-plans/          # Pre-built plans
├── scripts/
│   ├── scripture-curated.js    # Main orchestrator
│   ├── news-search.js          # Event detection
│   ├── verse-matcher.js        # Scripture matching
│   └── reading-plan.js         # Plan generation
└── lib/
    └── bible-api.js            # Scripture lookup utilities
```

## Usage

### Daily Verse

```javascript
// Get verse based on today's news
const curated = require('./scripture-curated')
const verse = await curated.dailyVerse()
// Returns: { verse, connection, context, readingPlan }
```

### Search by Event

```javascript
// Ask about specific event or topic
const result = await curated.search('What does the Bible say about war?')
// Returns: { verses, explanation, readingPlan }
```

### Reading Plans

```javascript
// Generate a reading plan
const plan = await curated.readingPlan({
  topic: 'hope',
  days: 7,
})
// Returns: 7 connected verses with daily context
```

### API Integration

```javascript
// Match event to Scripture
const match = await curated.matchEvent({
  event: 'Natural disaster',
  location: 'Global',
  severity: 'high',
})
// Returns: { verse, connection, application }
```

## Scripture Database

**75+ verses** organized by 16 themes:

1. **Creation** — God as Creator, goodness of creation
2. **Fall** — Sin, brokenness, human condition
3. **Redemption** — Salvation through Christ
4. **Faith** — Trust, doubt, assurance
5. **Suffering** — Pain, trials, finding hope
6. **Hope** — Future glory, eschatological assurance
7. **Peace** — Peace with God, inner peace, peacemaking
8. **Prayer** — Communion with God
9. **Love** — God's love, love for God, love for neighbor
10. **Resurrection** — Christ's resurrection, our future resurrection
11. **Second Coming** — Christ's return, judgment, consummation
12. **Holy Spirit** — The Spirit's work in believers
13. **Church** — Community, mission, sacraments
14. **Wisdom** — Knowledge, discernment, understanding
15. **Restoration** — New creation, final hope
16. **Nicene Themes** — Trinity, Incarnation, Atonement

Each verse includes:

- Full text (ESV/NIV)
- Historical context
- Theological significance
- Event mappings (what news topics it addresses)
- Canonical connections (related passages)

## Event Mappings

The skill maps real-world events to relevant themes:

| Event Type       | Relevant Themes                   |
| ---------------- | --------------------------------- |
| Conflict/War     | Peace, Suffering, Hope            |
| Economic Crisis  | Faith, Hope, Wisdom               |
| Natural Disaster | Suffering, Hope, Creation         |
| Death            | Resurrection, Hope, Peace         |
| Political        | Wisdom, Church, Second Coming     |
| Injustice        | Church, Wisdom, Restoration       |
| Celebration      | Love, Church, Creation            |
| New Beginning    | Creation, Redemption, Restoration |
| Loss             | Suffering, Hope, Peace            |
| Anxiety          | Peace, Prayer, Faith              |

## Reading Plans

### Example: 7-Day Peace Plan

**Day 1**: Romans 5:1 — Peace with God (justification)  
**Day 2**: John 14:27 — Christ's peace (His legacy)  
**Day 3**: Philippians 4:6-7 — Peace that guards (prayer)  
**Day 4**: Isaiah 26:3 — Perfect peace (trust)  
**Day 5**: Psalm 46:10 — Be still (God's sovereignty)  
**Day 6**: Matthew 5:9 — Peacemakers (blessing)  
**Day 7**: Revelation 21:4 — No more tears (consummation)

Each day includes context, connections to previous days, and application questions.

## Theological Commitments

### Hermeneutics (How We Interpret)

1. **Christocentric**: All Scripture points to Christ
2. **Contextual**: Verses read in literary and historical context
3. **Canonical**: Individual verses interpreted by the whole Bible
4. **Traditional**: Historic Christian interpretation has weight
5. **Doctrinal**: Scripture doesn't contradict itself
6. **Devotional**: Scripture transforms, not merely informs

### What We Avoid

- Proof-texting (taking verses out of context)
- Speculative interpretations
- Novel teachings without historic precedent
- Psychological reduction ("it's all about feelings")
- Political co-option (using Scripture for partisan ends)

## News Search Strategy

The skill uses web search to find relevant current events:

```javascript
// Example search queries
'major world news today'
'conflict breaking news'
'natural disaster today'
'economic news'
'political developments'
```

Results are filtered for:

- Significance (not every minor story)
- Relevance (connects to biblical themes)
- Recency (within last 24-48 hours)

## Local Context Integration

The skill can incorporate personal context (when available):

- Recent conversations
- Expressed concerns
- Season of life (if known)
- Geographic location (if relevant to news)

**Privacy note**: Personal context is used ephemerally—not stored, not analyzed for patterns beyond immediate relevance.

## Configuration

```bash
# Required
BRAVE_API_KEY=your_brave_search_key

# Optional
DEFAULT_VERSION=ESV           # or NIV, NLT
THEOLOGY=nicene               # theological framework
MAX_VERSES_PER_RESULT=5       # limit matches
READING_PLAN_DAYS=7           # default plan length
```

## API Reference

### `dailyVerse(options)`

Returns a verse connected to today's events.

```javascript
{
  verse: { reference, text, version },
  connection: "Why this verse fits today",
  context: { historical, theological, canonical },
  readingPlan: { days, verses, theme },
  events: [ "news items that triggered this" ]
}
```

### `search(query, options)`

Search Scripture by topic or question.

```javascript
{
  verses: [ { reference, text, relevance } ],
  explanation: "How these verses address the query",
  readingPlan: { ... },
  followUp: [ "suggested next questions" ]
}
```

### `readingPlan(options)`

Generate a connected reading plan.

```javascript
{
  theme: "peace",
  days: 7,
  verses: [
    { day: 1, reference, text, context, application }
  ],
  overview: "How this plan develops the theme"
}
```

### `matchEvent(event, options)`

Match a specific event to Scripture.

```javascript
{
  verse: { ... },
  connection: "Why this verse fits",
  application: "How to respond to this event",
  related: [ "other relevant verses" ],
  prayers: [ "suggested prayers based on this" ]
}
```

## Examples

### Example 1: War Breaking Out

**Search**: "Russia Ukraine conflict escalation"

**Result**:

> **Isaiah 2:4** — "They shall beat their swords into plowshares..."
>
> **Connection**: War is not God's final plan. The prophet envisions disarmament—swords becoming tools for cultivation. This hope is eschatological (end-times) but also a call to pursue peace now.
>
> **Context**: Isaiah writes during Assyrian threat, offering hope that empires fall but God's kingdom stands. Micah 4:3 repeats this prophecy, emphasizing the hope is grounded in God's instruction.
>
> **Application**: Pray for peace. Support relief efforts. Resist the temptation to glorify conflict. Remember that Christ's kingdom advances through love, not force.
>
> **3-Day Plan**: Day 1 (Isaiah 2), Day 2 (Matthew 5:9), Day 3 (Revelation 21:4)

### Example 2: Economic Uncertainty

**Search**: "Stock market crash recession fears"

**Result**:

> **Matthew 6:19-21** — "Do not lay up for yourselves treasures on earth..."
>
> **Connection**: Markets crash; treasure in heaven doesn't. Jesus' Sermon on the Mount addresses anxiety about provision. The command is not asceticism but proper valuation.
>
> **Context**: Jesus speaks to peasants under Roman occupation. "Treasures on earth" could be seized by soldiers or lost to decay. "Treasures in heaven" are secure because God keeps them.
>
> **Application**: Check your anxiety level about finances. Is your security in your portfolio or in God's provision? Give generously—the only investment with guaranteed returns.
>
> **7-Day Plan**: Faith Over Fear

### Example 3: Natural Disaster

**Search**: "Earthquake destruction thousands dead"

**Result**:

> **Nahum 1:7** — "The LORD is good, a stronghold in the day of trouble..."
>
> **Connection**: Disaster reveals the fragility of human structures. God's goodness doesn't prevent disaster but provides refuge within it. This is not "everything happens for a reason" but "God is with you in the ruins."
>
> **Context**: Nahum prophesies against Nineveh, but this verse is a universal declaration of God's character. The Psalms repeat this theme (Psalm 46, 62). God's strength is available to those who trust Him.
>
> **Application**: Grieve without despair. Help practically. Point to the God who is near to the brokenhearted. Long for the new heavens and earth where there are no more tears.
>
> **Prayers**: "Lord, be a stronghold for those who have lost everything..."

## Error Handling

If news search fails:

- Fall back to rotating daily themes
- Use calendar-based selections (liturgical year)
- Gracefully degrade with pre-curated verses

If Scripture lookup fails:

- Return local verse database
- Provide reference for manual lookup
- Never return empty

## Development

To extend the skill:

1. Add verses to `config/verses.json`
2. Update event mappings for new themes
3. Create reading plans in `config/reading-plans/`
4. Adjust theological weights in `verse-matcher.js`

All contributions must align with the Nicene Creed.

## Troubleshooting

**"No relevant verse found"**

- Check event mappings in verses.json
- Verify news search is returning results
- Fallback to thematic rotation

**"Verse seems disconnected from event"**

- Review the connection explanation
- Check that context is being provided
- User can request alternate verse

**"Reading plan seems random"**

- Verify plan generation logic
- Check that verses are thematically connected
- Ensure progression makes sense

## Limitations

- News search depends on external APIs
- Scripture lookup depends on Bible API availability
- Personal context requires recent conversation history
- Theological matching is algorithmic, not infallible

The skill aims for wisdom, not perfection. Always points to Scripture as authoritative, not its own selections.

## License

MIT — Use freely, modify thoughtfully, keep the faith.

---

_"Your word is a lamp to my feet and a light to my path." — Psalm 119:105_
