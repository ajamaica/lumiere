# SCOPE CLARIFICATION

> **CIRF - CRYPTO INTERACTIVE RESEARCH FRAMEWORK - GUIDE**
> **TYPE:** Methodology Guide
> **PURPOSE:** Guide initial scope assessment and selective user interaction
> **USAGE:** Apply at workflow start to clarify requirements before execution

---

## CORE PHILOSOPHY

**Only interact when necessary, but ALWAYS ensure complete information before executing.**

Assess information completeness FIRST → Choose appropriate interaction level → Present scope for confirmation → Hand off to execution mode after user confirms.

**Three Paths:** Fast / Selective / Full

---

## TWO GUIDING PRINCIPLES

### Principle 1: Assess FIRST, Then Decide

Don't blindly follow "always ask" or "never ask" - intelligently evaluate completeness.

**Assessment Sources:**

- User request (explicit requirements)
- Input files (briefs, documents, previous outputs)
- Context (conversation history, project background)

**Evaluation Approach:**
Assess whether you have sufficient information to execute confidently. Consider what's needed to deliver the right output - avoid both under-clarifying (guessing) and over-clarifying (asking unnecessarily).

**Decision Logic:**

- ALL clear + very high confidence → **Fast Path**
- PARTIAL info + 1-3 gaps → **Selective Path**
- MINIMAL info + significant ambiguity → **Full Path**

**Critical Rule:** When uncertain which path → Choose LONGER path (conservative bias)

---

### Principle 2: Conservative Approach

**Better to ask and be certain than to guess and deliver wrong output.**

**Cost/Benefit Analysis:**

- Cost of asking unnecessarily: Minor interaction overhead
- Cost of NOT asking when needed: Failed deliverable (catastrophic)

**Decision Heuristic:** When confidence is not very high → ASK

---

## THE THREE PATHS

### Fast Path

**When to use:**
The user's request is complete and clear. You understand what they want, why they want it, and what success looks like. Very high confidence you can deliver the right output.

**Execution:**

1. Acknowledge request
2. Present understood scope
3. Wait for user confirmation
4. Proceed after confirmation

**Example 1: Research Workflow (competitive-analysis)**

```
User: "Compare Aave vs Compound vs Morpho for investment decision,
       focus on competitive moats and efficiency, standard depth"

Agent: "Got it. Here's what I understand:

        📋 SCOPE SUMMARY:
        • Workflow: competitive-analysis
        • Projects: Aave vs Compound vs Morpho
        • Purpose: Investment decision
        • Focus: Competitive moats + efficiency
        • Research Depth: Standard
        • Output Type: Standard

        Does this match your needs?"

User: "Yes, proceed."

Agent: "Perfect. Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

---

### Selective Path

**When to use:**
You have partial information but need to fill specific gaps. The request provides some direction, but 1-3 critical details are missing before you can proceed confidently.

**Execution:**

1. Acknowledge what you have
2. Ask ONLY for missing critical information needed to achieve MISSION and OBJECTIVES
3. Present complete scope
4. Wait for user confirmation
5. Proceed after confirmation

**Example 1: Research Workflow (product-analysis)**

```
User: "Analyze Uniswap V4 product"

Agent: "Got it - Uniswap V4 product analysis.
        Quick clarification:
        1. Purpose? (investment decision / understanding / competitive positioning)
        2. Focus areas? (protocol mechanics / PMF signals / innovation / comprehensive)
        3. Scope level? (quick / standard / deep)"

User: "Investment. PMF signals + competitive differentiation. Standard."

Agent: "Perfect. Here's the scope:

        📋 SCOPE SUMMARY:
        • Workflow: product-analysis
        • Project: Uniswap V4
        • Purpose: Investment decision
        • Focus: PMF signals + competitive differentiation
        • Research Depth: Standard
        • Output Type: Standard

        Confirm to proceed?"

User: "Confirmed."

Agent: "Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

**Example 2: Non-Research Workflow (create-content)**

```
User: "Turn my Morpho analysis into social content"

Agent: "Got it - content creation from Morpho analysis.
        Quick clarification:
        1. Which formats? (Twitter thread / LinkedIn post / Blog article / Newsletter / All)
        2. Brand voice? (Professional / Educational / Bold / Technical)
        3. Launch timing? (Immediate / Coordinated sequence)"

User: "Twitter thread + blog article. Professional. Launch next week."

Agent: "Perfect. Here's the scope:

        📋 SCOPE SUMMARY:
        • Workflow: create-content
        • Input: Morpho product analysis
        • Formats: Twitter thread + Blog article
        • Brand Voice: Professional
        • Distribution: Coordinated launch next week

        Confirm to proceed?"

User: "Yes."

Agent: "Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

---

### Full Path

**When to use:**
The request is vague, open-ended, or ambiguous. Multiple interpretations are possible. You need comprehensive clarification to understand what the user truly needs.

**Framework - Ask comprehensively:**

1. **Intent:** What decision does this inform? How will you use this?
2. **Scope & Focus:** Which aspects matter most? [Provide options based on workflow MISSION and OBJECTIVES]
3. **Configuration:** Gather workflow-specific parameters (depth/formats/variants/etc.)
4. **Success Criteria:** What makes this valuable? Specific questions to answer?

**Example 1: Research Workflow (sector-overview)**

```
User: "Research DeFi Lending"

Agent: "I'll help research DeFi Lending. Clarifying scope:

        1. Intent: What decision is this informing?
           (sector allocation / market entry / understanding / competitive intelligence)

        2. Focus areas most important?
           • Sector structure and taxonomy
           • Growth drivers and trends
           • Competitive dynamics (leaders vs challengers)
           • Innovation and opportunities
           • Comprehensive (all above)

        3. Coverage scope?
           • Quick: Essential elements, top players only
           • Standard: Balanced coverage, key players detailed
           • Deep: Comprehensive exploration, all active players

        4. Output format preference? (brief / standard / comprehensive)"

User: "Sector allocation decision. Structure + competitive dynamics + growth drivers.
       Standard coverage. Standard output."

Agent: "Understood. Here's the complete scope:

        📋 SCOPE SUMMARY:
        • Workflow: sector-overview
        • Sector: DeFi Lending
        • Purpose: Sector allocation decision
        • Focus: Structure + competitive dynamics + growth drivers
        • Research Depth: Standard
        • Output Type: Standard

        Ready to proceed?"

User: "Yes, go ahead."

Agent: "Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

**Example 2: Non-Research Workflow (qa-review)**

```
User: "Review my tokenomics research"

Agent: "I'll review your tokenomics research. Clarifying scope:

        1. Which research output?
           (Please specify file path or workflow that produced the output)

        2. Review focus?
           • Completeness (all sections covered?)
           • Accuracy (claims verified, sources valid?)
           • Logic & assumptions (reasoning sound, biases identified?)
           • Comprehensive (all aspects above)

        3. Severity threshold?
           • Critical issues only (deal-breakers, invalidating flaws)
           • All issues (critical + medium + minor)

        4. Review rigor?
           • Quick: Major gaps and critical flaws
           • Standard: Thorough review with constructive feedback
           • Deep: Adversarial stress-test with devil's advocate"

User: "./workspaces/morpho/outputs/tokenomics-analysis/output-2025-12-09.md
       Comprehensive focus. All issues. Standard rigor."

Agent: "Understood. Here's the complete scope:

        📋 SCOPE SUMMARY:
        • Workflow: qa-review
        • Input: Morpho tokenomics analysis (2025-12-09)
        • Review Focus: Comprehensive (completeness + accuracy + logic)
        • Severity: All issues (critical + medium + minor)
        • Review Rigor: Standard

        Ready to proceed?"

User: "Yes."

Agent: "Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

**Example 3: Planning Workflow (create-research-brief)**

```
User: "I want to research Hyperliquid"

Agent: "I'll help you plan research on Hyperliquid. First, I need to understand
        the research type to select the right template.

        1. What decision is this research informing?
           • Investment decision (portfolio allocation, position sizing)
           • Project evaluation (UNDERVALUED / FAIR VALUE / OVERVALUED)
           • Competitive intelligence (benchmarking, positioning)
           • Sector understanding (market landscape, opportunities)
           • Technical analysis (architecture, mechanism study)

        2. Current context?
           • Do you have existing exposure/position?
           • What's driving this research need?
           • Any specific concerns or focus areas?"

User: "I'm considering investing. No current exposure. Want to understand
       if it's a good opportunity and what position size makes sense."

Agent: "Got it - investment decision context. A few more clarifications:

        Research Template: INVESTMENT RESEARCH
        (Comprehensive analysis from market → sector → project → investment thesis)

        Now let's define scope:

        1. Investment criteria priorities?
           • Competitive moats and sustainability
           • Tokenomics and value accrual
           • Team execution quality
           • Market opportunity size
           • Technical architecture
           • All above (comprehensive)

        2. Portfolio context?
           • What's your current exposure to DEX sector?
           • Target allocation range? (helps with position sizing guidance)
           • Risk tolerance for this investment?

        3. Coverage scope?
           • Quick: High-level thesis, key signals only
           • Standard: Balanced analysis, main competitors detailed
           • Deep: Exhaustive research, all aspects validated

        4. Time horizon? (helps frame growth projections and valuation)"

User: "Comprehensive focus on all criteria. Currently 10% in DEX (Uniswap),
       can allocate 5-8% more. Moderate risk tolerance. Standard coverage.
       18-24 month horizon."

Agent: "Perfect. Here's the complete scope:

        📋 SCOPE SUMMARY:
        • Workflow: create-research-brief
        • Template: Investment Research
        • Subject: Hyperliquid (Perpetual DEX)
        • Decision: Investment recommendation with position sizing
        • Portfolio Context: 10% DEX exposure, 5-8% additional allocation
        • Focus: Comprehensive (moats, tokenomics, team, market, technical)
        • Time Horizon: 18-24 months
        • Coverage: Standard (balanced analysis, key competitors)
        • Risk Profile: Moderate tolerance

        This will create a research brief that downstream workflows
        will use to execute:
        ✓ Sector overview (Perpetual DEX landscape)
        ✓ Competitive analysis (vs GMX, dYdX, others)
        ✓ Product analysis (protocol mechanics, PMF)
        ✓ Team analysis
        ✓ Tokenomics analysis
        ✓ Investment thesis with scenarios and position sizing

        Ready to proceed?"

User: "Yes, let's do it."

Agent: "Proceeding now."

→ SCOPE CLARIFIED → PROCEED TO EXECUTION
```

---

## EDGE CASE HANDLING

### When User Won't Cooperate

**Principle: Explicit assumptions are better than implicit guesses**

If user deflects clarification (e.g., "Just do whatever you think"):

```
Agent: "Understood - I'll proceed with these assumptions:

        📋 ASSUMED SCOPE:
        • Workflow: [inferred from request context]
        • Purpose: General understanding
        • Scope: Balanced coverage of key aspects
        • Configuration: Default settings

        I'll check back if I discover the scope needs adjustment.

        Confirm to proceed with these assumptions?"

User: "Yes, fine."

→ SCOPE CLARIFIED (with assumptions) → PROCEED TO EXECUTION
```

**Key:** User knows they can intervene; work isn't black box.

---

### When Scope Becomes Invalid

**Principle: Impossibility trumps autonomy**

If you discover during execution that scope is impossible/invalid (e.g., "Analyze Morpho token" → discover no token exists):

**This is the ONLY valid reason to interrupt execution and return to scope clarification.**

```
Agent: "⚠️ SCOPE ISSUE DISCOVERED

        Initial scope: Analyze Morpho tokenomics
        Discovery: Morpho does not have a token yet

        Options:
        A) Analyze governance model (non-token mechanisms)
        B) Compare to competitors' token models
        C) Speculate on potential token design

        Which direction should I take?"
```

**NOT valid interruptions:**

- Found interesting tangent
- Better approach exists
- Want to share preliminary finding

---

## DECISION SUMMARY

```
ASSESS information completeness
    ↓
EVALUATE confidence and clarity:
    ├─ Very high confidence + all info clear → FAST PATH
    ├─ Moderate confidence + 1-3 gaps → SELECTIVE PATH
    └─ Low confidence + significant ambiguity → FULL PATH
    ↓
PRESENT complete scope summary
    ↓
WAIT for user confirmation
    ↓
SCOPE CLARIFIED → HAND OFF TO EXECUTION
```

**Common Pitfalls:**

- ❌ Always asking (frustrates users when info already provided)
- ❌ Never asking (wastes effort on wrong output)
- ❌ Guessing when uncertain (assumes mind-reading)
- ❌ Proceeding without user confirmation (skips alignment check)
- ❌ Re-clarifying during execution (should happen only if scope becomes invalid)

**✅ Adaptive Approach:** Assess intelligently, ask conservatively, present scope clearly, confirm with user, then execute autonomously

---

**End of Scope Clarification Guide**

_This guide applies to ALL workflows. What information to gather is determined by each workflow's MISSION and OBJECTIVES. This guide prescribes HOW to interact, not WHAT to ask._
