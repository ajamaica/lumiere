# Argument Translation

Vague, "analog" arguments are difficult to evaluate. To apply binary rationality, you must translate fuzzy reasoning into a precise, refutable form.

## The Goal
Convert "Argument A supports Idea I" into "If Criticim C is true, then Idea I fails Goal G."

## The Protocol

### 1. Identify the IGC Triple
Every argument must be situated:
- **Idea:** The specific proposal or belief.
- **Goal:** What the idea is trying to achieve.
- **Context:** The relevant facts of the situation.

*If you can't define the Goal, you can't judge if the Idea fails.*

### 2. Positive to Negative Translation
CF rejects "positive" support. "X is good because Y" is weak. "X fails because of Z" is strong.
- **Vague:** "This code is good because it's fast."
- **Precise:** "The goal is 10ms latency. If this code takes >10ms, it is refuted."

### 3. Handle "Weights" as Constraints
When a user says "I care about X more than Y," they are describing **Breakpoints**.
- **The Weighted View:** "Price is 70% important, Speed is 30%." (Math is invalid).
- **The CF View:** "Price must be < $100. Speed must be > 50mbps. If Price is $101, the idea fails regardless of speed."

### 4. Literal Meaning (Anti-Social Metaphysics)
Strip away social "gist" and "vibes."
- Ask: "What is the most literal, dictionary-definition interpretation of this claim?"
- Identify if the argument depends on the *status* of the speaker rather than the *content* of the idea.

## Operational Steps for Agents
1.  **Extract Claims:** List all assertions made in the text.
2.  **Assign Goals:** For each claim, identify what success looks like.
3.  **Find the "Link":** Why does the speaker think this claim matters? (e.g., "If this is false, the project fails").
4.  **Rewrite as Refutation:** "This argument is actually saying: 'Any plan that lacks [Feature X] is a failure for [Goal Y].'"

## Example
**Input:** "I think we should use Python because it's more popular and has better libraries, even though it's slower."
**Translation:**
- **Goal:** Maintainability and speed of development.
- **Context:** A team with Python expertise.
- **Refutation 1:** Any language with a small library ecosystem fails the Goal of 'speed of development'.
- **Refutation 2 (The 'Slow' part):** Is there a 'Speed of Execution' goal? If yes, what is the breakpoint? If 1s, and Python takes 2s, Python is refuted. If no speed goal exists, the "slow" comment is irrelevant excess capacity.
