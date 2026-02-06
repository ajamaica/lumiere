# COLLABORATIVE RESEARCH

> **CIRF - CRYPTO INTERACTIVE RESEARCH FRAMEWORK - GUIDE**
> **TYPE:** Execution Mode Guide
> **PURPOSE:** Enable iterative human-AI teamwork through natural workflow interaction
> **USAGE:** Apply when user selects Collaborative Mode for research execution

---

## PURPOSE

This guide defines how AI agents execute research in **Collaborative Mode** - an approach where AI works naturally and autonomously decides when to interact with users for validation.

**Core Philosophy:** AI executes research following its natural chain of thought. When meaningful work is complete, AI presents findings to user for validation before continuing. No upfront task breakdown, no rigid structure - just natural workflow with checkpoints.

---

## WHEN TO USE COLLABORATIVE MODE

**User selects Collaborative Mode when they:**

- Want involvement in research direction without controlling every step
- Have domain expertise to validate findings at key milestones
- Need confidence that research stays on track
- Prefer transparency over speed

**Default is Autonomous Mode** - Only activate collaborative mode if explicitly requested by user.

---

## CORE PRINCIPLES

### 1. Natural Workflow Execution

**AI works naturally following objectives:**

- Read mission and objectives from instructions.md
- Determine what work needs to be done (AI's chain of thought)
- Execute research autonomously
- Present findings when meaningful work unit is complete
- Get user validation before continuing

**No upfront planning required:**

- Don't create 8-step research plan
- Don't break into sections beforehand
- Don't present breakdown for approval
- Just start working and interact when needed

### 2. Autonomous Checkpoint Placement

**AI decides when to interact based on:**

**Present checkpoint after:**

- ✅ **Completed discovery phase** - Found key entities/data that will drive rest of research
  - Example: Identified 24 DeFi lending protocols in market
- ✅ **Critical structural decision made** - Created taxonomy/framework that shapes subsequent work
  - Example: Defined 6 market categories (Lending, DEX, Staking, etc.)
- ✅ **Finished major research component** - Completed analysis of significant section
  - Example: Analyzed market mechanics and value flows
- ✅ **Before synthesis** - Accumulated all inputs, ready to structure into final output

**Don't interrupt for:**

- ❌ Minor findings during research
- ❌ Routine data collection
- ❌ Small analytical steps
- ❌ Progress updates without deliverable

### 3. Meaningful Deliverables

**Each checkpoint presents concrete output:**

- **Discovery checkpoint:** List of entities, data sources, key facts found
- **Structure checkpoint:** Taxonomy, categorization framework, mental model
- **Analysis checkpoint:** Insights, patterns, assessment of component
- **Synthesis checkpoint:** Draft sections or complete report

**NOT abstract status updates** - Always show what you built/found.

### 4. Validate Direction, Not Details

**Checkpoints validate:**

- ✅ Approach correctness ("Am I looking at the right things?")
- ✅ Structural soundness ("Does this taxonomy make sense?")
- ✅ Completeness ("Did I miss anything major?")
- ✅ Priority alignment ("Should I focus more on X or Y?")

**User feedback shapes next work:**

- User confirms → Continue with next logical work
- User adjusts → Modify approach and continue
- User expands → Add more depth and continue
- User redirects → Change direction entirely

### 5. Accumulate and Synthesize

**During research:**

- Accumulate findings in memory
- Don't write to file at checkpoints
- Keep building on validated work

**At final synthesis:**

- Read template.md structure
- Map accumulated findings to template sections
- Write complete report in one operation
- Present for final approval

**Rationale:** Best synthesis happens with full context, not piecemeal section-by-section.

### 6. Transparent Uncertainty

**Surface uncertainties at checkpoints:**

- "Found conflicting data: Source A says X, Source B says Y. Your take?"
- "Limited information on [topic]. Dig deeper or proceed with what we have?"
- "Two valid approaches: [Option A] vs [Option B]. Which fits our goal better?"

**Leverage user expertise** - They're your partner, not just reviewer.

---

## EXECUTION FLOW

### Phase A: Start Working

**No ceremony, just begin:**

```markdown
I'll research [market/topic] to achieve the workflow objectives. I'll work autonomously and check in with you when I complete meaningful milestones.

Starting research now...
```

**Then:** Execute research autonomously following objectives.

---

### Phase B: Checkpoint Interaction (Repeat depending on mission's complexity)

**When meaningful work complete:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 **CHECKPOINT: [Work Description]**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Work completed:**
[Brief description of what I did in last 8-15 minutes]

**Key findings:**
• [Finding 1 with confidence level]
• [Finding 2 with confidence level]
• [Finding 3 with confidence level]

**Deliverable:**
[Show concrete output - list, taxonomy, analysis, etc.]

**Example:**
**Market Players Identified:**

1. Aave - Leading lending protocol, $5B TVL
2. Compound - Original lending market, $2B TVL
3. Morpho - Efficiency-focused, $800M TVL
   [... 21 more players ...]

Total: 24 protocols identified

**Your feedback:**

1. ✅ **Looks Good** - Continue with next work
2. 🔍 **Expand** - Add [specific area]
3. 🔄 **Adjust** - Focus more on [aspect]
4. ❓ **Question** - Why/what about [topic]?

What would you like?
```

**Wait for user response.**

**Handle feedback:**

- 1 → Continue to next work autonomously
- 2-4 → Execute requested changes → Re-present → Wait for approval

**Then continue working autonomously until next checkpoint.**

---

### Phase C: Research Completion & Confirmation

**After all checkpoints validated:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **ALL RESEARCH COMPLETE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Validated findings:**
• [Summary of checkpoint 1]
• [Summary of checkpoint 2]
• [Summary of checkpoint 3]
• [Summary of checkpoint 4]

All research components are complete and validated.

**Before proceeding to output generation:**
Do you have any additional requirements or adjustments you'd like me to incorporate?

**Your options:**

1. ✅ **No changes** - Proceed to validation & delivery
2. 🔍 **Add focus** - Include more depth on [specific area]
3. 🔄 **Adjust emphasis** - Change priority/focus
4. ➕ **Additional research** - Investigate [new aspect]

What would you like?
```

**Wait for user confirmation.**

**After user confirms "No changes":**

- Return to instructions.md workflow
- Continue with STEP 4: VALIDATION

---

**Note:** The synthesis (structuring findings into final report) happens during STEP 3 execution, NOT in Phase C. Phase C is only about confirming research completeness before moving to validation and delivery.

---

## CHECKPOINT DECISION EXAMPLES

### Example 1: Market Overview Workflow

**Checkpoint 1 (after ~10 min):**

- **Work:** Searched and identified all major players in DeFi lending market
- **Deliverable:** List of 24 protocols with brief positioning
- **Why checkpoint:** Player list drives categorization and analysis - must be complete and accurate

**Checkpoint 2 (after ~8 min):**

- **Work:** Created category taxonomy (6 categories: Lending Pools, CDP, P2P, etc.)
- **Deliverable:** Category definitions with 3-5 players per category
- **Why checkpoint:** Taxonomy shapes rest of analysis - validate before deep dive

**Checkpoint 3 (after ~12 min):**

- **Work:** Analyzed market mechanics (how lending works, participants, value flows)
- **Deliverable:** Technical analysis and user flow diagrams
- **Why checkpoint:** Core understanding established - ensure accuracy before dynamics

**Checkpoint 4 (after ~10 min):**

- **Work:** Researched market history, growth patterns, current trends
- **Deliverable:** Timeline and trend analysis
- **Why checkpoint:** All research inputs gathered - ready for synthesis

**Phase C (research completion):**

- **Work:** All research complete, ready for output generation
- **Deliverable:** Summary of all validated findings
- **Why checkpoint:** Confirm research completeness, gather final requirements before validation & delivery

### Example 2: Competitive Analysis Workflow

**Checkpoint 1:** Competitor identification (list of 8 competitors)
**Checkpoint 2:** Selection criteria for deep dive (which 4 to analyze deeply)
**Checkpoint 3:** Analysis framework (dimensions to evaluate: tech, traction, positioning)
**Checkpoint 4:** Completed competitive matrix
**Phase C:** Research completion confirmation before validation & delivery

---

## ADAPTIVE GRANULARITY

**Adjust checkpoint frequency based on user engagement:**

**High engagement (asks many questions):**

- More frequent checkpoints (~6-8 per workflow)
- More detailed presentations
- Deeper discussions

**Low engagement (quick approvals):**

- Fewer checkpoints (~4-5 per workflow)
- Concise presentations
- Faster progression

**Watch for signals:**

- "Looks good, continue" → User trusts you, fewer checkpoints
- "Wait, why did you...?" → User wants involvement, more checkpoints
- "Can you expand...?" → User has expertise, leverage it

---

## WHEN NOT TO USE CHECKPOINTS

**Don't interrupt autonomous work for:**

- Progress updates without meaningful deliverable
- Small incremental findings during research
- Routine data collection (gathering sources, reading articles)
- Minor analytical observations

**Checkpoint only when:**

- Work unit complete and validatable
- Decision made that affects future work
- Direction change needed based on findings
- All inputs gathered and ready for synthesis

---

## KEY DIFFERENCES FROM AUTONOMOUS MODE

| Aspect                  | Autonomous Mode                 | Collaborative Mode                              |
| ----------------------- | ------------------------------- | ----------------------------------------------- |
| **User involvement**    | None during research            | 4-6 validation checkpoints + final confirmation |
| **When user sees work** | Final output only               | At key milestones + before delivery             |
| **Direction changes**   | Not possible mid-research       | User can redirect at checkpoints                |
| **Domain expertise**    | AI-only                         | User expertise incorporated                     |
| **Confidence building** | Trust final output              | Confidence through validation                   |
| **Delivery control**    | Auto-delivered after validation | User confirms before delivery                   |
| **Speed**               | Faster (~20-30 min)             | Slower (~60-90 min with interaction)            |

---

**End of Collaborative Research Guide**

_Use this guide when workflow activates Collaborative Mode. AI works naturally and autonomously decides when to present checkpoints. No upfront planning, no rigid structure - just natural workflow with validation at meaningful milestones._
