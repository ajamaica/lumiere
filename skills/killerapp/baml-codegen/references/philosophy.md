# BAML Philosophy

**Author**: Vaibhav Gupta (BoundaryML)

## Core Insight

80-90% accuracy is easy; 99%+ production reliability requires: schema-driven prompts, type-safe outputs, automatic retries, validation assertions, and testing infrastructure.

## Five Principles

| Principle                  | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| **Schema Is The Prompt**   | Define classes first, add `@description`, use `{{ ctx.output_format }}` |
| **Types Over Strings**     | Enums for choices, classes for actions, unions for tools                |
| **Fuzzy Parsing**          | BAML extracts valid JSON from messy LLM output automatically            |
| **Transpiler Not Library** | `.baml` → native Python/TypeScript/Ruby/Go code                         |
| **Test-Driven Prompting**  | VS Code playground or `baml-cli test` for iteration                     |

## Golden Rules

| Rule                     | Bad                               | Good                                      |
| ------------------------ | --------------------------------- | ----------------------------------------- |
| Don't Parse              | `json.loads(response)`            | `b.Extract(input)` → typed object         |
| Types Over Strings       | `"classify as positive/negative"` | `enum Sentiment { POSITIVE \| NEGATIVE }` |
| Always ctx.output_format | Manual JSON instructions          | `{{ ctx.output_format }}`                 |
| No Logic in Prompts      | Complex conditionals in templates | Schema + simple instructions              |
| Use @assert              | Hope LLM follows constraints      | `@assert(valid, {{ this > 0 }})`          |

## When to Use BAML

| Use BAML                  | Skip BAML                        |
| ------------------------- | -------------------------------- |
| Type safety needed        | Simple one-off extractions       |
| Hierarchical/nested data  | Creative text generation         |
| 99%+ reliability required | Quick prototyping                |
| Complex schemas           | Simple API calls                 |
| Team collaboration        | Streaming text without structure |
| Multi-model fallbacks     |                                  |

## Workflow

```bash
vim baml_src/extractors.baml   # Edit source
baml-cli generate               # Generate client
python app.py                   # Use native imports
baml-cli test                   # Test prompts
```

## Performance Benefits

| Metric      | Improvement                          |
| ----------- | ------------------------------------ |
| Token usage | 50-70% reduction vs manual prompts   |
| Reliability | No retry loops for parsing           |
| Cost        | Lower due to efficient prompts       |
| DX          | Autocomplete, type checking, testing |

## Key Takeaway

BAML treats LLM calls with database-level rigor: structured, typed, testable, and reliable.

**Docs**: https://docs.boundaryml.com
