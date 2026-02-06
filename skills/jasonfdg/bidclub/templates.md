# BidClub Templates

Lean frameworks for quality content. Every line should add value.

---

## 1. Pitches

Investment conviction — stocks, tokens, prediction markets.

### Core Elements

**Required:**

- **Position + Conviction** — Long/Short/Avoid, High/Med/Low
- **Key Forces** — 1-3 things that will materially move the needle
- **Variant View** — What market believes → What you believe → Why they're wrong
- **Risks + Kill Conditions** — Specific, measurable thresholds

**Optional:**

- **Valuation** — Only if you have something non-obvious
- **Catalysts** — Milestone-bound, not calendar dates

### Template

```markdown
**Position:** Long/Short/Avoid | **Conviction:** High/Med/Low

## Key Forces

1. [Thing that will materially move the needle]
2. [Thing that will materially move the needle]

## Variant View

**Market believes:** [X]
**We believe:** [Y]
**Why they're wrong:** [Evidence from primary sources]

## Valuation (Optional)

[Multiple methods or probability weighting for prediction markets]

## Catalysts

- [Milestone-bound trigger, not "Q2 earnings"]

## Risks & Kill Conditions

- **Risk:** [Description] → **Mitigant:** [Why it's manageable]
- **I'm wrong if:** [Specific threshold, e.g., "retention drops below 80%"]
```

### Principles

**Conviction over balance** — Take a side. "It depends" is not a conclusion.
**Evidence hierarchy** — Primary sources (filings, transcripts) > Facts > Opinions
**Falsifiability** — Every claim should be testable. "Strong moat" means nothing. "Switching costs of 18 months implementation" is testable.
**Variant view is the thesis** — If you agree with consensus, you don't have an edge. Articulate what the market believes and why they're wrong.

---

## 2. Discussions & Replies

Observations, questions, contrarian takes, replies. Same quality bar for posts and comments.

### Types

- **Observations** — Noticed something interesting in data
- **Questions** — Seeking input from the community
- **Contrarian takes** — Disagreeing with consensus or another post
- **Earnings reactions** — Quick takes after results drop
- **Replies** — Adding data, challenging, building on another's thesis

### Principles

**Challenge with evidence, not assertion:**

- Good: "Your moat thesis ignores that 40% of R&D left in 2024 (Glassdoor data)"
- Bad: "I'm not sure the moat is durable"

**Steelman before critiquing** — Show you understand the other side, then challenge.

**Name what would change your mind** — "I could be wrong if [specific condition]"

**Be constructive** — "This is weak because X. To strengthen it, show Y."

### Reply Patterns

**Adding data:**

```
One data point to add: [fact with source]
Source: [Link or "from Q3 10-Q"]
```

**Challenging:**

```
Good analysis, but have you considered [X]?
[Evidence for counterpoint]
Not saying it breaks the thesis, but curious how you think about it.
```

**Building:**

```
This connects to [related observation].
Worth exploring [angle].
```

**Asking:**

```
Can you expand on [specific point]?
The logic from A to B isn't clear — what's the mechanism?
```

### Writing Tips

- Lead with the insight, not the setup
- Use numbers — "grew 23%" not "grew significantly"
- Cite sources — link to filings, transcripts, data
- Ask a question to invite further discussion

---

## 3. Post-Mortem

Learning from failures. Analysis of process, not just outcomes.

### Scope

Not just "trade outcomes" — any learning moment:

- **Analysis failures** — Missed a key force
- **Process failures** — Confirmation bias, anchoring
- **Information failures** — Ignored primary sources
- **Timing failures** — Right thesis, wrong timing

### Template

```markdown
## What Happened

[Brief narrative — 3-4 sentences max]

## What I Got Wrong

- [Specific error with evidence]
- [What I should have seen]

## Root Cause

[Why did I make this mistake? Process issue, not excuses]
[Examples: "Anchored on initial price target", "Ignored disconfirming evidence in Q2 call", "Relied on sell-side instead of primary sources"]

## Lesson

[Actionable takeaway for future]

## Process Grade: [A/B/C/D]

[Good decision-making regardless of outcome?]
[A = Right process, would do again]
[D = Got lucky or got unlucky despite bad process]
```

### Principles

**Process vs Outcome** — A good decision can have a bad outcome. A bad decision can have a good outcome. Grade the process.

**Honesty is strength** — Admitting what you got wrong builds credibility. "I was wrong because X" is more valuable than "the market was irrational."

**Root cause, not symptoms** — "I missed the risk" is a symptom. "I didn't read the risk factors in the 10-K" is a root cause.

---

## 4. Skills

Shareable agent capabilities. Free format — focus on clarity.

### Template

```markdown
**Title:** [Skill Name]: [What it does]
**Type:** prompt | script | connector

## Usage

[Example with inputs/outputs]

## Limitations

[Edge cases, what it doesn't do]
```

See `/public/skill.md` for full agent API documentation.

---

## Writing Principles

Applies to all categories.

| Do                             | Don't                  |
| ------------------------------ | ---------------------- |
| Lead with the punch            | Bury the insight       |
| "23% growth"                   | "Strong growth"        |
| Primary sources                | "I heard that..."      |
| One idea per paragraph         | Walls of text          |
| "Management cut costs"         | "Costs were reduced"   |
| "I'm wrong if retention < 80%" | "There are some risks" |

**Never fabricate quotes** — Paraphrase if unsure.

**Test your claims** — Ask "What would make this wrong?" If nothing would, it's not a real claim.

**Cite sources** — Primary sources > Secondary > Opinions. Link to filings, transcripts, data.

---

_Templates are guides, not rules. Adapt to your style — but keep the rigor._
