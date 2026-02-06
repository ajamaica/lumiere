# RESEARCH METHODOLOGY

> **CIRF - CRYPTO INTERACTIVE RESEARCH FRAMEWORK - GUIDE**
> **TYPE:** Methodology Guide
> **PURPOSE:** Guide systematic, iterative research execution with quality practices
> **USAGE:** Apply throughout research execution to ensure comprehensive findings

---

## PURPOSE

This guide defines HOW to conduct iterative research effectively **during research execution**.

**Scope:** DURING research only (not output validation - see output-standards.md for BEFORE DELIVERY)

**What This Guide Provides:**

- **Research Depth Configuration** - Understanding execution rigor levels
- **Core Research Principles** - Four foundational principles for systematic research
- **Crypto Research Considerations** - Domain-specific guidance for cryptocurrency markets

**Core Principle:** Quality research requires systematic execution with built-in quality practices. Assess source credibility, verify claims, and communicate uncertainty clearly—enabling users to make informed risk decisions.

---

## RESEARCH DEPTH CONFIGURATION

The `{research_depth}` parameter determines research thoroughness, modulating how rigorously you apply the four core research principles below.

**Note:** Research depth controls investigation thoroughness, NOT output presentation (length, structure, style) - that is determined by `{output_type}`.

### The Three Depth Levels

#### Quick Depth (`research_depth: quick`)

**Outcome:** Sufficient understanding for basic context and direction

**Execution approach:**

- Adequate source coverage for essential insights
- Basic verification of critical claims
- Core gaps identified and addressed
- Stop when fundamentals are clear

**Use when:** Time-sensitive needs, exploratory research, basic context needed

#### Standard Depth (`research_depth: standard`) - Recommended

**Outcome:** Well-validated findings with balanced comprehensiveness

**Execution approach:**

- Comprehensive source coverage with diversity
- Multi-source verification of important claims
- Major gaps filled, minor gaps documented
- Stop when analysis is defensible

**Use when:** Most research tasks, balanced quality and thoroughness

#### Deep Depth (`research_depth: deep`)

**Outcome:** High-confidence findings with exhaustive coverage

**Execution approach:**

- Exhaustive source coverage across all relevant angles
- Rigorous multi-source verification of all significant claims
- All identifiable gaps addressed or explicitly documented
- Stop when analysis withstands expert scrutiny

**Use when:** Critical decisions, complex analysis, high-stakes research

---

## RESEARCH PRINCIPLES

Execute research guided by these four principles. Your configured `{research_depth}` determines how rigorously to apply each principle.

### 1. Iterative Exploration Over Single-Pass

- Execute research in multiple rounds, letting each round inform the next
- Initial exploration reveals gaps, gaps drive additional research
- Continue until additional research yields minimal new insights (diminishing returns)

### 2. Source Diversity Over Single-Source Reliance

- Consult multiple source types (primary + secondary, official + independent, promotional + critical)
- Cross-verify critical claims from multiple independent sources
- Seek alternative perspectives (critics, competitors, alternatives)
- Balance insider (project) and outsider (independent) viewpoints

### 3. Verification Over Assumption

- Cross-check important facts from multiple independent sources
- Document sources with dates immediately
- Communicate uncertainty clearly when verification is incomplete
- Fill gaps with research, not assumptions

### 4. Diminishing Returns as Stopping Criterion

- Stop when additional research yields only minor refinements, not arbitrary limits
- Validate: Can answer critical questions? Major gaps filled? Claims verified? Source diversity achieved?
- If additional research reveals major new insights → continue
- Quality of coverage matters more than quantity of sources

---

## CRYPTO RESEARCH CONSIDERATIONS

Domain-specific guidance for cryptocurrency research challenges.

### Distinguishing Research from Marketing

In cryptocurrency, marketing often masquerades as research. Assess sources using these indicators:

**Credible Research Signals:**

- ✅ Multi-source data verification with citations
- ✅ Balanced analysis (strengths AND weaknesses discussed)
- ✅ Methodology transparency (explains how conclusions reached)
- ✅ Risk acknowledgment and limitations disclosed
- ✅ Independent authorship (no direct project affiliation)
- ✅ Evidence-based claims with specific data/examples
- ✅ Critical questions asked, not just praise

**Marketing/PR Red Flags:**

- 🚩 Single-source claims without verification
- 🚩 One-sided narrative (only positives, no risks)
- 🚩 Vague claims without specific evidence ("revolutionary," "game-changing")
- 🚩 Excessive superlatives and hype language
- 🚩 Project-affiliated authorship without disclosure
- 🚩 Focus on token price potential over fundamentals
- 🚩 Comparisons highlighting only strengths vs competitors

**Common ambiguous sources:**

- Paid research (may be quality but has bias—disclose this clearly)
- Influencer analyses (quality varies—assess on merits, note credibility)
- Project-sponsored content (may contain facts but selective—verify independently)
- Anonymous researchers (evaluate methodology, not identity)

**Execution guidance:**

Internally assess source credibility considering:

1. Author/publisher track record and conflicts of interest
2. Evidence quality (specific data vs vague claims)
3. Perspective balance (trade-offs acknowledged or only positives?)
4. Verification status (can key claims be independently verified?)

You don't need to label every source explicitly, but weight information appropriately and make credibility transparent through how you communicate findings.

---

### Data Freshness in Fast-Moving Markets

Cryptocurrency markets and technology evolve extremely rapidly. Data currency significantly affects analysis validity—weeks-old information can be materially outdated.

**Why freshness matters in crypto:**

- **Market velocity:** Prices, TVL, market share shift in hours/days, not months
- **Technology evolution:** Protocol upgrades, new features deploy continuously (not annually)
- **Competitive dynamics:** New protocols launch weekly; market leaders change in months
- **Time-sensitive catalysts:** Partnerships, regulations, unlocks have immediate impact

**Assess freshness by topic volatility:**

- **High volatility** (prices, TVL, market share, trending narratives)
  - Recent data critical; weeks-old may be misleading
  - Flag if data >1-2 weeks old for active markets

- **Medium volatility** (roadmaps, partnerships, team changes, ecosystem growth)
  - Moderate recency needed; months-old may miss key developments
  - Flag if data >1-2 months old for evolving projects

- **Low volatility** (technical architecture, token distribution, founding team)
  - Older data acceptable; fundamentals change slowly
  - Even 6-12 month data may be valid if fundamentals stable

**Credibility-First Principle:**

Data freshness is important, but credibility takes priority. When facing trade-offs:

- ✅ **Recent credible data** > Stale credible data (ideal scenario)
- ✅ **Stale credible data** > Recent questionable data (credibility wins)
- ⚠️ If only stale data available → Use it, but flag staleness clearly

**Example trade-off:**

- Official announcement from 2 weeks ago > Twitter rumor from today
- But flag: "Per official announcement (Dec 1), TVL was $2.4B—current metrics may differ"

**Execution guidance:**

- Include data dates with all sources: `(Source, YYYY-MM-DD)`
- Flag stale data when it may affect accuracy: `⚠️ Data from [date] - may not reflect recent changes`
- Acknowledge gaps: "Most recent available data is from [date]; current metrics may differ"
- Never fabricate freshness or omit dates

---

### Handling Unverified Information

Cryptocurrency rumors and unverified information can signal valuable opportunities (early partnerships, protocol upgrades, market catalysts). **Include, don't exclude**—communicate uncertainty clearly.

**Why rumors matter in crypto:**

- Early-stage signals often emerge from community channels before official announcements
- Speculative information helps users assess risk:reward for time-sensitive opportunities
- Filtering out uncertainty removes potentially valuable alpha

**How to handle unverified information:**

✅ **DO:**

- Include rumors when potentially relevant to investment thesis
- Clearly communicate they are unverified: "Unconfirmed reports suggest..." or "Community speculation indicates..."
- Provide context: Where did it originate? Source credibility? Supporting indicators?
- Let users assess risk:reward with full information

❌ **DON'T:**

- Present rumors as verified facts
- Exclude potentially valuable signals just because unverified
- Mix verified data and rumors without distinction

**Communicate uncertainty through language choices:**

**High confidence (verified data):**

- "Data shows...", "Protocol has...", "Team announced..."
- Example: "Protocol has $2.4B TVL (DeFiLlama, Dec 2025)"

**Medium-high confidence (credible sources, single verification):**

- "According to [source]...", "Reports indicate...", "[Analyst] found..."
- Example: "According to Messari analysis (Dec 2025), daily users increased 40% QoQ"

**Medium confidence (analysis, inference, limited data):**

- "Analysis suggests...", "Available evidence indicates...", "Based on [reasoning]..."
- Example: "Based on GitHub activity patterns, development appears active, though team size is unclear"

**Low confidence (rumors, unverified claims):**

- "Unconfirmed reports suggest...", "Community speculation indicates...", "Rumors suggest..."
- Example: "Unconfirmed community reports (Crypto Twitter, Dec 10) suggest a major CEX listing is imminent. While unverified, this aligns with the team's stated Q4 exchange strategy and increased marketing activity. Users should weigh this speculative information accordingly when assessing near-term catalysts."

**Key Principle:** Users make better decisions when they understand information quality. Your job is awareness and clear communication, not filtering out uncertainty.

---

**End of Research Methodology Guide**
