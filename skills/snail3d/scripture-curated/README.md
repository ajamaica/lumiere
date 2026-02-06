# Scripture-Curated

> "Your word is a lamp to my feet and a light to my path." — Psalm 119:105

**Connect God's Word to your world.** Scripture-Curated searches current events—global and personal—and finds relevant Scripture with theological depth, historical context, and reading plans that draw you into the biblical narrative.

## What It Does

### Daily Verse from the News

Every day, the skill searches current events and finds a Scripture that speaks to what's happening:

> **World Event**: Conflict escalating in the Middle East  
> **Scripture**: Isaiah 2:4 — "They shall beat their swords into plowshares..."  
> **Why**: The prophet envisions disarmament—war is not God's final plan

### Reading Plans That Connect

Not random verses—thematic journeys:

**7-Day Peace Plan:**

- Day 1: Romans 5:1 — Peace with God
- Day 2: John 14:27 — Christ's legacy
- Day 3: Philippians 4:6-7 — Peace that guards
- Day 4: Isaiah 26:3 — Perfect peace
- Day 5: Psalm 46:10 — Be still
- Day 6: Matthew 5:9 — Peacemakers
- Day 7: Revelation 21:4 — No more tears

### Context You Can Trust

Every verse includes:

- **Historical context** — When was this written? To whom?
- **Theological significance** — What does this mean?
- **Practical application** — How do I live this?
- **Canonical connections** — What else does Scripture say?

## Quick Start

```bash
# Install
cp -r scripture-curated ~/clawd/skills/
cd ~/clawd/skills/scripture-curated

# Configure
cp .env.example .env
# Add your Brave Search API key

# Run
node scripts/scripture-curated.js
```

## Usage

### Get Today's Verse

```javascript
const scripture = require('./scripts/scripture-curated')

const today = await scripture.dailyVerse()
console.log(today.verse.text)
console.log(today.connection) // Why this verse fits today
console.log(today.readingPlan) // Connected 3-day plan
```

### Search by Topic

```javascript
const result = await scripture.search('What does the Bible say about anxiety?')
// Returns verses, explanation, and reading plan
```

### Match a Specific Event

```javascript
const match = await scripture.matchEvent({
  event: 'Economic uncertainty',
  context: 'Job loss concerns',
})
// Returns verse, connection, application, prayers
```

## Theological Foundation

**Nicene Christianity** — The skill operates within historic Christian orthodoxy:

- Trinity: Father, Son, Holy Spirit—one God
- Christ: Fully God, fully man; crucified; risen; returning
- Scripture: Authoritative, inspired, sufficient
- Salvation: By grace through faith in Christ alone
- Church: One, holy, catholic, apostolic

See `config/nicene-creed.md` for the full framework.

## How It Works

### 1. News Search

Searches current events using Brave Search API:

- Major world news
- Breaking developments
- Significant trends

### 2. Scripture Matching

Maps events to themes:

- Conflict → Peace, Hope, Suffering
- Economic crisis → Faith, Wisdom, Trust
- Natural disaster → Refuge, Hope, New Creation
- Political → Wisdom, Justice, Kingdom

### 3. Context Generation

For each match, provides:

- **Connection**: Why this verse fits
- **Historical context**: Original setting
- **Theological depth**: What it means
- **Application**: How to respond
- **Reading plan**: Connected verses

### 4. Local Context (Optional)

Can incorporate personal context:

- Recent conversation topics
- Expressed concerns
- Season of life

_Privacy note_: Personal context is used ephemerally—not stored or analyzed beyond immediate relevance.

## Scripture Database

**75+ verses** across 16 themes:

| Theme         | Count | Description                                    |
| ------------- | ----- | ---------------------------------------------- |
| Creation      | 5     | God as Creator; goodness of creation           |
| Fall          | 5     | Sin, brokenness, human condition               |
| Redemption    | 7     | Salvation through Christ                       |
| Faith         | 5     | Trust, doubt, assurance                        |
| Suffering     | 6     | Pain, trials, finding hope                     |
| Hope          | 4     | Future glory, eschatological assurance         |
| Peace         | 5     | Peace with God, inner peace, peacemaking       |
| Prayer        | 4     | Communion with God                             |
| Love          | 4     | God's love, love for God, love for neighbor    |
| Resurrection  | 4     | Christ's resurrection, our future resurrection |
| Second Coming | 4     | Christ's return, judgment, consummation        |
| Holy Spirit   | 4     | The Spirit's work in believers                 |
| Church        | 4     | Community, mission, sacraments                 |
| Wisdom        | 3     | Knowledge, discernment, understanding          |
| Restoration   | 3     | New creation, final hope                       |

Each verse includes full text, context, theology, and event mappings.

## Examples

### War Breaking Out

**Input**: "Russia Ukraine conflict escalation"

**Output**:

> **Isaiah 2:4** — "They shall beat their swords into plowshares..."
>
> **Connection**: War is not God's final plan. The prophet envisions disarmament.
>
> **Context**: Isaiah writes during Assyrian threat, offering hope that empires fall but God's kingdom stands.
>
> **Application**: Pray for peace. Resist glorifying conflict. Christ's kingdom advances through love, not force.
>
> **Plan**: Isaiah 2 → Matthew 5:9 → Revelation 21:4

### Economic Anxiety

**Input**: "Recession fears, job loss concerns"

**Output**:

> **Matthew 6:19-21** — "Do not lay up for yourselves treasures on earth..."
>
> **Connection**: Markets crash; treasure in heaven doesn't.
>
> **Context**: Jesus speaks to peasants under Roman occupation. Earthly treasure can be seized; heavenly treasure is secure.
>
> **Application**: Check your security—is it in your portfolio or God's provision? Give generously.

### Personal Loss

**Input**: "Dealing with grief, lost a loved one"

**Output**:

> **1 Thessalonians 4:13-14** — "We do not grieve as those who have no hope..."
>
> **Connection**: Christians grieve, but not without hope.
>
> **Context**: Paul comforts believers about deceased loved ones. The resurrection changes death's sting.
>
> **Application**: Grieve fully. Hope boldly. Christ's resurrection guarantees ours.

## Configuration

```bash
# Required
BRAVE_API_KEY=your_brave_api_key

# Optional
DEFAULT_VERSION=ESV          # ESV, NIV, NLT
MAX_VERSES_PER_RESULT=5      # Limit matches
DEFAULT_PLAN_DAYS=7          # Default reading plan length
```

## Reading Plans

### 3-Day Plans

- **Peace**: Rest in God (Rom 5, John 14, Phil 4)
- **Hope**: Future glory (Rom 8, 2 Cor 4, Rev 21)
- **Suffering**: Finding purpose (Rom 8, 2 Cor 1, 1 Pet 4)

### 7-Day Plans

- **Faith**: Trusting God (Heb 11, Rom 4, Mark 9)
- **Prayer**: Drawing near (Matt 6, John 17, Heb 4)
- **Love**: The greatest (1 Cor 13, 1 John 4, John 15)

### 30-Day Plans

- **Redemption**: From Fall to Restoration
- **The Life of Christ**: From Incarnation to Return
- **End Times**: Hope for Christ's Coming

## Command Line

```bash
# Daily verse
node scripts/scripture-curated.js daily

# Search topic
node scripts/scripture-curated.js search "peace"

# Reading plan
node scripts/scripture-curated.js plan --topic hope --days 7

# Match event
node scripts/scripture-curated.js match "economic crisis"
```

## Why This Exists

In a world of endless news and constant anxiety, Scripture offers:

- **Perspective**: God's view on human events
- **Hope**: Not naive optimism, but grounded eschatology
- **Wisdom**: How to live faithfully in difficult times
- **Peace**: Christ's peace, not the world's

This skill doesn't replace Bible reading—it curates entry points. The goal is always to send you deeper into Scripture, not to be a substitute.

## Theological Notes

### How We Interpret

1. **Christocentric**: All Scripture points to Christ
2. **Contextual**: Verses in literary and historical context
3. **Canonical**: Whole Bible interprets individual verses
4. **Traditional**: Historic Christian interpretation matters
5. **Doctrinal**: Scripture doesn't contradict itself
6. **Devotional**: Scripture transforms, not merely informs

### What We Avoid

- Proof-texting (verses out of context)
- Speculative interpretations
- Novel teachings without historic precedent
- Political co-option (partisan use of Scripture)
- Psychological reduction ("it's all about feelings")

## Limitations

- News search requires internet and API access
- Scripture matching is algorithmic, not infallible
- Personal context requires recent conversation
- Always points to Scripture as authoritative, not the skill's selections

## Contributing

To add verses or plans:

1. Edit `config/verses.json`
2. Follow existing format
3. Include context and theology
4. Ensure Nicene alignment
5. Test connections

## Credits

- Scripture: English Standard Version (ESV), New International Version (NIV)
- Theology: Nicene-Constantinopolitan Creed (381 AD)
- News: Brave Search API

## License

MIT — Use freely, keep the faith.

---

_"Sanctify them in the truth; your word is truth." — John 17:17_
