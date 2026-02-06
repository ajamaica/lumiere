# Debate Tree Template

A Debate Tree is a visual or structured way to track a disagreement. It prevents "moving the goalposts" and helps identify the exact point where logic diverges.

## Structure

### Root: The Main Proposal (Idea)
- **Claim:** [State the core idea clearly]
- **Goal:** [What are we trying to achieve?]

### Level 1: Primary Criticisms
- **Criticism A:** [Decisive reason why the Idea fails the Goal]
- **Criticism B:** [Another independent reason for failure]

### Level 2: Counter-Arguments
- **Support for A:** [Refutation of Criticism A]
- **Support for B:** [Refutation of Criticism B]

## Rules of the Tree
1.  **Binary Status:** Every node is either **Refuted** (red) or **Non-Refuted** (green).
2.  **Propagating Failure:** If a Criticism is non-refuted, the Idea it points to is **Refuted**.
3.  **No Dead Ends:** Every claim must eventually lead to a "Terminal Node" (an agreed-upon fact or a decisive refutation).

## Template Format

```text
GOAL: [Example: Deploy a secure web server]

[+] IDEA: Use Library X
    |
    |-- [-] CRITICISM 1: Library X has a known CVE (High Severity).
    |       |
    |       |-- [+] COUNTER: We are using version 2.0 which fixed that CVE.
    |           (Result: Criticism 1 is Refuted; Idea is still potentially valid).
    |
    |-- [-] CRITICISM 2: Library X doesn't support our OS (Constraint Violation).
            |
            |-- (No Counter-Argument)
                (Result: Criticism 2 is Non-Refuted; IDEA IS REFUTED).
```

## How to Use as an Agent
1.  When a user disagrees with you, **map their objection** into the tree.
2.  Identify if they are attacking the **Idea**, the **Goal**, or a **Premise** in the Context.
3.  If their criticism is non-refuted, **accept the refutation** immediately and look for a new Idea.
4.  Do not restart the debate from the top. Stay on the "leaf node" until it's resolved.
