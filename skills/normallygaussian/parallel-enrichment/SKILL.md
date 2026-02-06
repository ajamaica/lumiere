---
name: parallel-enrichment
description: 'Bulk data enrichment via Parallel API. Adds web-sourced fields (CEO names, funding, contact info) to lists of companies, people, or products. Use for enriching CSV files or inline data.'
homepage: https://parallel.ai
---

# Parallel Enrichment

Bulk data enrichment that adds web-sourced fields to lists of companies, people, or products. Describe what you want in natural language.

## When to Use

Trigger this skill when the user asks for:

- "enrich this list with...", "add CEO names to...", "find funding for these companies..."
- "look up contact info for...", "get LinkedIn profiles for..."
- Bulk data operations on CSV files or lists
- Adding web-sourced columns to existing datasets
- Lead enrichment, company research, product comparison

## Quick Start

```bash
# Inline data
parallel-cli enrich run \
  --data '[{"company": "Google"}, {"company": "Microsoft"}]' \
  --intent "CEO name and founding year" \
  --target output.csv

# CSV file
parallel-cli enrich run \
  --source-type csv --source input.csv \
  --target output.csv \
  --intent "CEO name and founding year"
```

## CLI Reference

### Basic Usage

```bash
parallel-cli enrich run [options]
```

**Note:** There is no `--json` flag for enrich. Results are written to the target file.

### Common Flags

| Flag                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `--data "<json>"`             | Inline JSON array of records                 |
| `--source-type csv`           | Source file type                             |
| `--source <path>`             | Input CSV file path                          |
| `--target <path>`             | Output CSV file path                         |
| `--source-columns "<json>"`   | Describe input columns                       |
| `--enriched-columns "<json>"` | Specify output columns                       |
| `--intent "<description>"`    | Natural language description of what to find |
| `--processor <tier>`          | Processing tier (see table below)            |

### Processor Tiers

| Processor    | Use Case                        |
| ------------ | ------------------------------- |
| `lite-fast`  | Simple lookups                  |
| `base-fast`  | Basic enrichment                |
| `core-fast`  | Standard enrichment             |
| `pro-fast`   | Deep enrichment (default)       |
| `ultra-fast` | Complex multi-source enrichment |

### Examples

**Inline data enrichment:**

```bash
parallel-cli enrich run \
  --data '[{"company": "Stripe"}, {"company": "Square"}, {"company": "Adyen"}]' \
  --intent "CEO name, headquarters city, and latest funding round" \
  --target ./companies-enriched.csv
```

**CSV file enrichment:**

```bash
parallel-cli enrich run \
  --source-type csv \
  --source ./leads.csv \
  --target ./leads-enriched.csv \
  --source-columns '[{"name": "company_name", "description": "Company name"}]' \
  --intent "Find CEO name, company size, and LinkedIn company page URL"
```

**With explicit output columns:**

```bash
parallel-cli enrich run \
  --data '[{"name": "Sam Altman"}, {"name": "Satya Nadella"}]' \
  --source-columns '[{"name": "name", "description": "Person full name"}]' \
  --enriched-columns '[
    {"name": "current_company", "description": "Current company/employer"},
    {"name": "title", "description": "Current job title"},
    {"name": "twitter", "description": "Twitter/X handle"}
  ]' \
  --target ./people-enriched.csv
```

**Using AI to suggest columns:**

```bash
# First, get AI suggestions
parallel-cli enrich suggest \
  --source-type csv \
  --source ./companies.csv \
  --intent "competitor analysis data"

# Then run with suggested columns
parallel-cli enrich run \
  --source-type csv \
  --source ./companies.csv \
  --target ./companies-analysis.csv \
  --intent "competitor analysis: market position, key products, recent news"
```

## Best-Practice Prompting

### Intent Description

Write 1-2 sentences describing:

- What specific fields you want to add
- Context about the data (B2B companies, tech startups, etc.)
- Any constraints (recent data, specific sources)

**Good:**

```
--intent "Find CEO name, total funding raised, and number of employees for B2B SaaS companies"
```

**Poor:**

```
--intent "Find stuff about these companies"
```

### Source Column Descriptions

When using `--source-columns`, provide context:

```json
[
  { "name": "company", "description": "Company name, may include Inc/LLC suffix" },
  { "name": "website", "description": "Company website URL, may be partial" }
]
```

## Response Format

The CLI outputs:

- A monitoring URL to track progress
- Status updates as rows are processed
- Final output written to target CSV

The target CSV contains:

- All original columns from the source
- New enriched columns as specified
- A `_parallel_status` column indicating success/failure per row

## Output Handling

After enrichment completes:

1. Report the number of rows enriched
2. Preview the first few rows: `head -6 output.csv`
3. Share the full path to the output file
4. Note any rows that failed enrichment

## Configuration File

For complex enrichments, use a YAML config:

```yaml
# enrich-config.yaml
source:
  type: csv
  path: ./input.csv
  columns:
    - name: company_name
      description: 'Company legal name'
    - name: website
      description: 'Company website URL'

target:
  type: csv
  path: ./output.csv

enriched_columns:
  - name: ceo_name
    description: 'Current CEO full name'
  - name: employee_count
    description: 'Approximate number of employees'
  - name: funding_total
    description: 'Total funding raised in USD'

processor: pro-fast
```

Then run:

```bash
parallel-cli enrich run enrich-config.yaml
```

## Running Out of Context?

For large enrichments, save results and use `sessions_spawn`:

```bash
parallel-cli enrich run --source-type csv --source input.csv --target /tmp/enriched-<topic>.csv --intent "..."
```

Then spawn a sub-agent:

```json
{
  "tool": "sessions_spawn",
  "task": "Read /tmp/enriched-<topic>.csv and summarize the results. Report row count, success rate, and preview first 5 rows.",
  "label": "enrich-summary"
}
```

## Error Handling

| Exit Code | Meaning                           |
| --------- | --------------------------------- |
| 0         | Success                           |
| 1         | Unexpected error (network, parse) |
| 2         | Invalid arguments                 |
| 3         | API error (non-2xx)               |

Common issues:

- **Row failures:** Check `_parallel_status` column in output
- **Timeout:** Use smaller batches or lower processor tier
- **Rate limits:** Add delays between large enrichments

## Prerequisites

1. Get an API key at [parallel.ai](https://parallel.ai)
2. Install the CLI:

```bash
curl -fsSL https://parallel.ai/install.sh | bash
export PARALLEL_API_KEY=your-key
```

## References

- [API Docs](https://docs.parallel.ai)
- [Enrichment API Reference](https://docs.parallel.ai/api-reference/enrichment)
