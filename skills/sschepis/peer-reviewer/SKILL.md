---
name: peer-reviewer
description: AI-powered academic paper reviewer. Uses a multi-agent system (Deconstructor, Devil's Advocate, Judge) to analyze papers for logical flaws, contradictions, and empirical validity.
version: 1.0.0
---

# Peer Reviewer

A rigorous academic review system that uses multiple AI agents to deconstruct, attack, and judge scientific papers.

## When to use

Use this skill when:

- The user asks to "review this paper" or "find flaws in this logic".
- You need to check an academic paper for contradictions with established literature.
- You want a "Reviewer 2" style critique of a text.

## How to use

Run the tool via the Node.js CLI in the installation directory.

**Directory:** `/Users/sschepis/Development/peer-reviewer`

### Command

```bash
node dist/index.js "<path_to_paper_or_raw_text>"
```

### Arguments

- `path_to_paper_or_raw_text`: either a file path (absolute or relative to the package root) OR the raw text of the paper/claim.

### Output

The tool outputs a "Merit Report" in JSON format, containing:

- `overallScore` (0-10)
- `defenseStrategy`
- `suggestions` (list of improvements)
- `dimensions` (scores for logic, novelty, etc.)

## Examples

**Review a local file:**

```bash
cd /Users/sschepis/Development/peer-reviewer
node dist/index.js "/Users/sschepis/Desktop/research/draft_v1.txt"
```

**Review a raw claim:**

```bash
cd /Users/sschepis/Development/peer-reviewer
node dist/index.js "Claim: P=NP because I can solve Traveling Salesman in O(1) by guessing."
```

## Configuration

Ensure `google.json` is present in the root directory or `GOOGLE_APPLICATION_CREDENTIALS` is set if running in a new environment.
