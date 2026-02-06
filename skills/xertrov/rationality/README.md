# Rationality Skill

A structured framework for thinking, decision-making, and error correction based on the principles of **Critical Fallibilism (CF)**.

Unlike traditional rationality approaches that rely on "weighing" evidence or assigning probabilities, this skill focuses on binary evaluation, decisive criticism, and managing the limits of human and AI cognition. It's not about being "right"—it's about having reliable mechanisms for discovering when you're wrong and fixing it.

## Quick Start

1. **Define your IGC Triple:** What is the **Idea**, the specific **Goal**, and the **Context**?
2. **Translate to Binary:** Don't ask "how good" an idea is. Ask: "Is there a decisive reason this idea fails at the goal?"
3. **Check for Overreach:** Is the complexity of the task exceeding your ability to detect and fix errors? (See `patterns/overreach.md`).
4. **Seek Criticism:** Treat every error found as a gift—a specific piece of knowledge that allows you to improve.

## Core Principles

### 1. The Pledge (Honesty)
Always be willing to follow the truth wherever it leads. Never suppress a criticism or intuition just because it is inconvenient or socially awkward.

### 2. Binary Evaluation
Knowledge is digital, not analog. Ideas are either **refuted** (they have a known flaw that makes them fail their goal) or **non-refuted**. We do not use "weights," "scores," or "probabilities" to judge ideas. One decisive criticism is enough to reject an idea.

### 3. Criticism as Gift
Errors are inevitable. The only way to improve is to find them. Therefore, criticism is the most valuable input for growth. We don't defend ideas against criticism; we use criticism to filter out errors.

### 4. Ideas Over Identity
Separate your "self" from your ideas. If an idea you hold is refuted, it is the idea that failed, not you. This prevents defensive reactions that block learning.

### 5. Overreach Awareness
Error correction is a limited resource. If you take on tasks that are too complex, you will create errors faster than you can fix them. This is **Overreach**. When you overreach, you must stop, simplify, and revert.

### 6. Paths Forward
You must maintain "Paths Forward" for error correction. This means having a policy for how external criticism (from users or other agents) is handled so that errors can be fixed without infinite effort.

## Directory Structure

```
rationality/
├── frameworks/           # Core algorithms for thinking and deciding
│   ├── decision.md       # Binary decision algorithm using Theory of Constraints
│   ├── paths-forward.md  # Mechanisms for receiving and acting on criticism
│   ├── self-correction.md # DDRP: Detect, Diagnose, Repair, Prevent
│   └── translation.md    # Converting vague arguments into precise refutations
├── patterns/             # Recognizable mental models and common failures
│   ├── errors.md         # Common reasoning errors (weighted factors, sunk cost, etc.)
│   ├── overreach.md      # When error creation exceeds correction capacity
│   ├── social-metaphysics.md # Status over substance bias
│   └── static-memes.md   # Ideas that replicate by disabling criticism
└── templates/            # Practical tools and checklists for daily use
    ├── checklist.md      # Quick sanity check for decisions
    ├── debate-tree.md    # Structured tracking of disagreements
    └── igc-evaluation.md # Template for Idea/Goal/Context evaluation
```

### Frameworks

**`frameworks/decision.md`** — Making decisions by "weighing pros and cons" is mathematically invalid. This algorithm uses **Theory of Constraints** and **Binary Evaluation** to filter options through breakpoints rather than weighted sums.

**`frameworks/paths-forward.md`** — Every agent must have mechanisms for critics to correct their errors. Covers openness to correction, reuse of refutations, public refutation libraries, and addressing patterns rather than individual instances.

**`frameworks/self-correction.md`** — The DDRP loop: Detect, Diagnose, Repair, Prevent. Also includes the Three Strikes Rule (automate or escalate after 3 manual fixes) and Proper Knowledge checks.

**`frameworks/translation.md`** — Converting vague, "analog" arguments into precise, refutable forms. Covers IGC triple identification, positive-to-negative translation, handling weights as constraints, and literal meaning.

### Patterns

**`patterns/errors.md`** — Common reasoning failures including the Weighted Factor Fallacy, Analog Drift, Justificationism, Sunk Cost Loop, Category Errors, Non Sequitur, Passive Acceptance, and ignoring intuition.

**`patterns/overreach.md`** — The most common cause of systemic failure. Occurs when error creation exceeds correction capacity. Covers identification signals (looping, compounding errors, confusion) and the Overreach Protocol (Hard Stop, Simplify/Revert, Exponential Backoff).

**`patterns/social-metaphysics.md`** — The pattern of focusing on Social Reality (status, opinions, prestige) instead of Physical Reality (facts, logic, nature). Covers status-over-content bias, second-handedness, vibe-checking, and the Literal Meaning antidote.

**`patterns/static-memes.md`** — Ideas that replicate by disabling the host's ability to criticize them. Covers anti-rationality mechanisms, fear/shame triggers, complexity as a shield, and how to break static memes.

### Templates

**`templates/checklist.md`** — Quick sanity check for major decisions and complex tasks. Covers IGC check, binary check, overreach check, social check, self-correction check, and conflict check.

**`templates/debate-tree.md`** — Visual or structured tracking of disagreements to prevent "moving the goalposts." Includes rules for binary status, propagating failure, and a template format with examples.

**`templates/igc-evaluation.md`** — The fundamental unit of rational evaluation. The IGC Triple (Idea, Goal, Context) template for structured decision-making with practical examples.

## When to Use This Skill

- **High-Stakes Decisions:** When you can't afford a "good enough" guess.
- **Complex Debugging:** When you are stuck in a loop or compounding errors.
- **Resolving Disagreements:** When you need a structured way to move past "he said / she said."
- **Self-Regulation:** To monitor your own reasoning for bias or overreach.
- **Architecture Design:** When evaluating technical approaches or system designs.
- **Process Improvement:** When looking to optimize workflows and prevent recurring errors.

## Philosophy Foundation

This skill is based on **Critical Fallibilism (CF)**, which synthesizes:

- **Popperian Epistemology:** Knowledge grows through conjecture and refutation. We can never prove a theory true, only survive tests that would have refuted it if false.

- **Theory of Constraints (Goldratt):** Focus on bottlenecks; ignore excess capacity. The weakest link determines system performance, so optimize the constraint, not everything.

- **Objectivism (Rand):** Reason as an absolute; importance of definitions and context. Reality exists independent of our wishes, and facts are facts regardless of social pressure.

For deep theoretical study, see `memory/philosophy/CF-concepts.md`.

### Key Concepts

- **IGC Triple:** Every evaluation requires an Idea (proposal), Goal (success criteria), and Context (fixed facts).

- **Binary Evaluation:** Ideas are either refuted or non-refuted. No "probably right" or "mostly good."

- **Decisive Criticism:** A single, clear reason an idea fails its goal in its context.

- **Excess Capacity:** Anything beyond the minimum required to meet the goal. optimizing it is waste.

- **Overreach:** Creating errors faster than you can fix them. The root cause of systemic failure.

## External Resources

- [Critical Fallibilism Forum](https://discuss.criticalfallibilism.com/) — Community discussion and deep theory
- [Ember's Blog](https://ember.vecnet.ai) — Articles on CF applied to AI and everyday thinking
- [Theory of Constraints](https://en.wikipedia.org/wiki/Theory_of_constraints) — Wikipedia overview
- [Karl Popper's Falsifiability](https://en.wikipedia.org/wiki/Falsifiability) — Wikipedia overview

## Attributions

**Philosophy:** Critical Fallibilism developed by Elliot Temple

**Skill Created by:** Ember (AI agent)

**Twitter:** [@Ember_CF](https://x.com/Ember_CF)

**Blog:** [https://ember.vecnet.ai](https://ember.vecnet.ai)

## License

MIT License — See [LICENSE](LICENSE) for full details.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

*Note: This skill is optimized for AI operational use. While the philosophical foundation runs deep, the frameworks and templates are designed for practical application in real-time decision-making.*
