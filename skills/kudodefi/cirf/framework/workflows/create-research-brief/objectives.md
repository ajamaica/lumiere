# CREATE RESEARCH BRIEF

> **CIRF - CRYPTO INTERACTIVE RESEARCH FRAMEWORK - WORKFLOW OBJECTIVES**
> **NAME:** Create Research Brief (create-research-brief)
> **PURPOSE:** Define WHAT this workflow must achieve (mission, objectives, validation, deliverables)

---

## MISSION

Through structured dialogue with user, establish unambiguous research requirements: what decision needs to be made, what knowledge is needed, what to analyze, and what boundaries to respect. Deliver self-sufficient scope definition that downstream agents can execute without further clarification.

---

## OBJECTIVES

1. **Decision Context** - Clarify what decision user needs to make and their current position/exposure

2. **Success Criteria** - Define research goal and how to measure when research delivers value

3. **Subject Identification** - Identify what to study with classification and background context

4. **Scope Boundaries** - Establish priority focus areas and what's included/excluded from analysis

---

## METHODOLOGY PRINCIPLES

**RECALL & APPLY GUIDE:** `{research-methodology}`

### STEP 0: TEMPLATE SELECTION (Before Standard Execution)

**Research Types:**

**SECTOR RESEARCH** (`templates/sector-research.md`)

- Focus: Sector/market/ecosystem analysis
- Examples: "Analyze DeFi Lending sector", "Ethereum vs Polkadot ecosystem comparison"
- Goal: Understand landscape with Sector Outlook (BULLISH / NEUTRAL / BEARISH)
- Decision: Sector allocation, market entry, ecosystem selection

**PROJECT RESEARCH** (`templates/project-research.md`)

- Focus: Focused project analysis (NOT comprehensive investment)
- Examples: "Understand Hyperliquid traction", "Evaluate Uniswap V4 architecture"
- Goal: Quick understanding with Recommendation (DEEP DIVE / MONITOR / PASS)
- Decision: Whether to pursue deeper research
- **NOT for investment decisions** (use Investment Research instead)

**INVESTMENT RESEARCH** (`templates/investment-research.md`)

- Focus: Comprehensive analysis from market → sector → project → investment decision
- Examples: "Should we invest in Uniswap?", "Full investment thesis for Hyperliquid"
- Goal: Investment committee decision with 3-dimensional assessment:
  - Outlook: BULLISH / NEUTRAL / BEARISH
  - Valuation: UNDERVALUED / FAIR VALUE / OVERVALUED
  - Decision: STRONG BUY / BUY / WATCH / SELL / STRONG SELL
- **Comprehensive, NOT focused**

**Selection Decision Tree:**

```
1. INVESTMENT CONTEXT?
   - Explicit: "invest", "allocation", "BUY/SELL", "portfolio"
     → Investment Research
   - Implicit: "opportunity evaluation" + capital allocation context
     → Investment Research

2. NO INVESTMENT → PROJECT OR SECTOR?
   - Single project focus + NO capital investment context
     → Project Research
   - Sector/market/multiple projects
     → Sector Research
```

---

## VALIDATION CRITERIA

- [ ] **Decision-Enabling:** Decision context provides clear evaluation criteria (not vague exploration; specific go/no-go decision articulated)
- [ ] **Scope Clarity:** Boundaries prevent both over-research and under-research (in-scope and out-scope explicit; priority focus areas have rationale)
- [ ] **Template Appropriateness:** Selected template matches decision type
  - [Investment] Portfolio context and position sizing criteria documented
  - [Sector] Market structure understanding vs strategic recommendation clarity
  - [Project] Research scope clear, focused analysis NOT investment decision

---

## DELIVERABLES

- **Primary output:**
  - Type: `{output_type}` (brief | standard | comprehensive)
  - Format: `{output_format}`
  - Path: `{output_path}`

---

_Philosophy: Lean scope definition - define WHAT to research and WHY, let workflows decide HOW to execute autonomously_
