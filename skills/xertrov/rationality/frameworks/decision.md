# Binary Decision Algorithm

Making decisions by "weighing pros and cons" is mathematically invalid (you can't add different dimensions like 'price' and 'beauty'). This algorithm uses the **Theory of Constraints (TOC)** and **Binary Evaluation**.

## The Algorithm

### 1. Define Goals and Context
State clearly what "success" looks like. If you have multiple goals, you are evaluating the same Idea against each Goal separately.

### 2. Identify Constraints (Breakpoints)
For every factor (Price, Time, Quality, etc.), define a **Breakpoint**:
- "Anything over $500 is a FAIL."
- "Must be completed by Friday, or it's a FAIL."
- "Must support 100 concurrent users, or it's a FAIL."

### 3. Binary Filter (The Elimination Round)
Evaluate every option against every constraint.
- **Pass:** The option meets the minimum requirement.
- **Fail:** The option violates a constraint.
- **Result:** If an option fails *any* constraint, it is **refuted** for that goal. Discard it.

### 4. Handling Multiple "Passing" Options
If you have three cars that all pass your budget, safety, and speed requirements:
- **Check for Excess Capacity:** Recognize that "even safer" doesn't matter if you've already met your safety goal.
- **Pick a Tie-breaker:** Choose *one* new constraint (e.g., "Least expensive of the remaining") and apply it.
- **Flip a Coin:** If you truly have no preference between non-refuted ideas, just pick one. Don't waste time optimizing things that don't matter.

### 5. Handling "No Options Pass"
If every option is refuted:
1.  **Lower your goals:** Your constraints are currently impossible to meet in this context.
2.  **Create new options:** Think of a new "Idea" that circumvents the bottleneck.

## Operational Rules for Agents
- **Never Use Weighted Sums:** Do not multiply a "score" by an "importance factor."
- **Focus on the Bottleneck:** Identify the *one* thing that is actually stopping the plan from working. Optimize only that.
- **Ignore Non-Constraints:** If a factor already passes its breakpoint, ignore it. Making it "better" is a waste of resources.

## Example
**Goal:** Buy a laptop for coding.
- **Constraints:** RAM >= 16GB, Price <= $1500, Battery >= 8h.
- **Option A:** 8GB RAM, $800, 12h Battery. -> **FAIL** (RAM constraint).
- **Option B:** 32GB RAM, $1400, 10h Battery. -> **PASS**.
- **Option C:** 16GB RAM, $1200, 15h Battery. -> **PASS**.
- **Decision:** Both B and C are valid. Pick C to save money, or B if you think you'll hit the RAM limit soon (New Goal).
