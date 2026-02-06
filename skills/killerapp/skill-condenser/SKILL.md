---
name: skill-condenser
description: 'Compress verbose SKILL.md files using Chain-of-Density with skill-aware formatting. Use when a skill exceeds 200 lines or needs terse refactoring.'
license: Apache-2.0
metadata:
  author: agentic-insights
  version: '1.0'
---

# Skill Condenser

Compress SKILL.md files using CoD with skill-format awareness. Optimized for 2-3 passes (not 5) since skills are structured, not prose.

## When to Use

- SKILL.md exceeds 200 lines
- Skill contains prose paragraphs instead of bullets
- Refactoring verbose documentation to terse style

## Process

1. Read the skill to condense
2. Run 2-3 iterations of `cod-iteration` with skill-format context
3. Each iteration: extract key entities, compress to bullets/tables
4. Output: condensed skill maintaining structure

## Orchestration

### Iteration 1: Structure Extraction

Pass to `cod-iteration`:

```
iteration: 1
target_words: [current_words * 0.6]
format_context: |
  OUTPUT FORMAT: Agent Skills SKILL.md
  - Use ## headers for sections
  - Bullet lists, not prose paragraphs
  - Tables for comparisons/options
  - Code blocks for commands
  - No filler phrases ("this skill helps you...")

text: [FULL SKILL.MD CONTENT]
```

### Iteration 2: Entity Densification

```
iteration: 2
target_words: [iteration_1_words]
format_context: |
  SKILL.md TERSE RULES:
  - Each bullet = one fact
  - Combine related bullets with semicolons
  - Remove redundant examples (keep 1 best)
  - Tables compress better than lists for options

text: [ITERATION 1 OUTPUT]
source: [ORIGINAL SKILL.MD]
```

### Iteration 3 (Optional): Final Polish

Only if still >150 lines:

```
iteration: 3
target_words: [iteration_2_words]
format_context: |
  FINAL PASS:
  - Move detailed content to references/ links
  - Keep only: Quick Start, Core Pattern, Troubleshooting
  - Each section <20 lines

text: [ITERATION 2 OUTPUT]
source: [ORIGINAL SKILL.MD]
```

## Expected Output Format

Each iteration returns:

```
Missing_Entities: "entity1"; "entity2"; "entity3"

Denser_Summary:
---
name: skill-name
description: ...
---
# Skill Name
[Condensed content in proper SKILL.md format]
```

## Skill-Specific Entities

When condensing skills, prioritize these entity types:

| Entity Type   | Keep                   | Remove                     |
| ------------- | ---------------------- | -------------------------- |
| Commands      | `deploy.py --env prod` | Verbose explanations       |
| Options       | Table row              | Paragraph per option       |
| Errors        | `Error → Fix`          | Long troubleshooting prose |
| Examples      | 1 best example         | Multiple similar examples  |
| Prerequisites | Bullet list            | Explanation of why needed  |

## Target Compression

| Original      | Target     | Iterations   |
| ------------- | ---------- | ------------ |
| 200-300 lines | 100-150    | 2            |
| 300-500 lines | 150-200    | 2-3          |
| 500+ lines    | 200 + refs | 3 + refactor |

## Example: Compressing Verbose Section

**Before** (45 words):

```markdown
## Configuration

The configuration system allows you to customize various aspects of the deployment.
You can set environment variables, adjust timeouts, and configure retry behavior.
Each setting has sensible defaults but can be overridden as needed.
```

**After** (18 words):

```markdown
## Configuration

| Setting   | Default | Override       |
| --------- | ------- | -------------- |
| `ENV`     | prod    | `--env dev`    |
| `TIMEOUT` | 30s     | `--timeout 60` |
| `RETRIES` | 3       | `--retries 5`  |
```

## Integration with Progressive Disclosure

If skill is too large after 3 iterations:

1. Keep in SKILL.md: Overview, Quick Start, Common Errors
2. Move to `references/`: API details, advanced config, examples
3. Update SKILL.md with links: `See [advanced config](references/config.md)`

## Constraints

- Preserve frontmatter exactly (don't condense metadata)
- Keep all ## section headers (structure matters)
- Don't remove code blocks (commands are entities)
- Maintain one concrete example per workflow
