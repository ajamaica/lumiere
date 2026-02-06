---
name: notebooklm
description: Use this skill to analyze your local files with Google NotebookLM's AI. Upload business documents, reports, and strategies to get source-grounded insights, risk analysis, and actionable recommendations. Perfect for business intelligence, document analysis, and decision support.
license: Complete terms in LICENSE.txt
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# NotebookLM Local File Analyzer

Analyze your local documents with Google NotebookLM's AI to get source-grounded insights, risk assessments, and actionable recommendations. Upload your files once, then query them repeatedly for different perspectives.

## When to Use This Skill

Use this skill when user:

- Has local business documents (strategy plans, financial reports, proposals)
- Wants AI analysis of specific documents with source grounding
- Needs risk assessment, competitive analysis, or business insights
- Wants to analyze multiple related documents together
- Needs to extract actionable insights from business documentation

## Quick Start

### Step 1: One-Time Setup

```bash
python scripts/setup_notebooklm.py
```

### Step 2: Analyze Your Files

**Batch Analysis (recommended):**

```bash
python scripts/batch_analyzer.py "your/folder" --pattern "*.md"
```

**Single File Analysis:**

```bash
python scripts/local_analyzer.py "file.md" --upload
```

**Query Uploaded Documents:**

```bash
python scripts/quick_query.py "What are the key risks in this business plan?" --notebook-url "notebook-url"
```

## Core Workflows

### Workflow 1: Business Document Analysis

Upload business documents and get strategic insights:

```bash
# Analyze business strategy files
python scripts/batch_analyzer.py "Business/Strategy" --pattern "*.md"

# Upload high-priority files to NotebookLM
python scripts/local_analyzer.py "strategy_plan.md" --upload

# Get strategic insights
python scripts/quick_query.py "Identify 3 competitive advantages and implementation challenges" --notebook-url "url"
```

### Workflow 2: Financial Analysis

Analyze financial documents for risks and opportunities:

```bash
# Find financial documents
python scripts/batch_analyzer.py "Finance" --pattern "*.md"

# Query for financial insights
python scripts/quick_query.py "What are the key financial risks and ROI projections?" --notebook-url "url"
```

### Workflow 3: Risk & Compliance Analysis

Get risk assessments and compliance insights:

```bash
python scripts/quick_query.py "What compliance or regulatory issues should be addressed?" --notebook-url "url"
python scripts/quick_query.py "Identify top 5 risks and mitigation strategies" --notebook-url "url"
```

## Helper Scripts (Black Box Usage)

### `scripts/batch_analyzer.py`

Analyze entire directories and identify high-value files:

```bash
python scripts/batch_analyzer.py "directory" --pattern "*.md" --output "analysis_report.md"
```

Features:

- **File categorization**: Business Strategy, Financial, Technical, Legal, Marketing
- **Priority identification**: Highlights high-value files for upload
- **Workflow guidance**: Provides step-by-step analysis recommendations
- **Report generation**: Creates structured analysis reports

### `scripts/local_analyzer.py`

Upload and analyze individual files:

```bash
python scripts/local_analyzer.py "file.md" --upload
python scripts/local_analyzer.py "file.md" --notebook-url "url" --question "Custom question"
```

Features:

- **Upload guidance**: Step-by-step NotebookLM upload instructions
- **File analysis**: Provides metadata and size information
- **Custom queries**: Supports targeted analysis questions

### `scripts/quick_query.py`

Query uploaded documents:

```bash
python scripts/quick_query.py "question" --notebook-url "url"
```

Features:

- **Direct querying**: Ask specific questions about uploaded documents
- **Source grounding**: Get citation-backed answers from your files
- **Unicode handling**: Works across different operating systems

## Powerful Use Cases

### Business Strategy Analysis

```bash
# Upload strategy documents
python scripts/local_analyzer.py "strategy_document.md" --upload

# Get strategic insights
python scripts/quick_query.py "What competitive advantages does this strategy establish?" --notebook-url "url"
python scripts/quick_query.py "Identify 3-5 actionable insights and implementation timeline" --notebook-url "url"
```

### Financial Risk Assessment

```bash
# Upload financial documents
python scripts/local_analyzer.py "financial_report.md" --upload

# Get financial analysis
python scripts/quick_query.py "Summarize financial implications and ROI projections" --notebook-url "url"
python scripts/quick_query.py "What are the top financial risks and mitigation strategies?" --notebook-url "url"
```

### Proposal & Contract Analysis

```bash
# Upload legal/business documents
python scripts/local_analyzer.py "proposal_document.md" --upload

# Get compliance insights
python scripts/quick_query.py "What compliance or regulatory issues should be addressed?" --notebook-url "url"
python scripts/quick_query.py "Identify potential legal risks and recommended safeguards" --notebook-url "url"
```

## Standard Operating Procedure (SOP)

### Phase 1: Document Discovery

1. **Run batch analysis** on your document directory:
   ```bash
   python scripts/batch_analyzer.py "your/document/folder" --pattern "*.md"
   ```
2. **Review categorization** - identify high-value files by category
3. **Select priority documents** - focus on strategy, financial, and legal documents

### Phase 2: Document Upload

1. **Go to NotebookLM** (https://notebooklm.google.com)
2. **Create new notebook** with descriptive name (e.g., "Business Analysis Q4")
3. **Upload priority documents** identified in Phase 1
4. **Group related documents** (strategy + financial + legal) for better context
5. **Copy notebook URL** for querying

### Phase 3: Intelligence Extraction

Ask targeted questions based on document type:

**Strategy Documents:**

- "What are the key competitive advantages and market opportunities?"
- "Identify implementation challenges and recommended solutions"
- "What are the success metrics and milestones?"

**Financial Documents:**

- "Summarize key financial metrics and projections"
- "What are the primary financial risks and mitigation strategies?"
- "What ROI and growth opportunities are identified?"

**Legal/Compliance Documents:**

- "What compliance requirements and deadlines must be met?"
- "Identify potential legal risks and recommended safeguards"
- "What regulatory issues need immediate attention?"

**Proposals/Contracts:**

- "What are the key obligations and deliverables?"
- "Identify potential risks and negotiation points"
- "What success criteria and performance metrics are defined?"

### Phase 4: Action Planning

1. **Synthesize insights** across related documents
2. **Create action item lists** from identified recommendations
3. **Develop mitigation strategies** for identified risks
4. **Establish monitoring** for key metrics and milestones

## Common Pitfalls

❌ **Don't use for simple document reading** - just use Read tool
❌ **Don't upload sensitive personal data** - NotebookLM is a Google service
❌ **Don't expect real-time data** - analysis based on uploaded documents
❌ **Don't ignore file size limits** - check NotebookLM upload limits
❌ **Don't forget to organize documents** - group related files for better analysis

✅ **Always upload related documents together** - better context for analysis
✅ **Use specific, targeted questions** - better than general queries
✅ **Batch analyze first** - identify high-value files before uploading
✅ **Create separate notebooks** - organize by project or document type
✅ **Follow up with specific questions** - dig deeper into insights

## Best Practices

1. **Batch analyze first** - identify which documents deserve AI analysis
2. **Group related documents** - upload strategy + financial + legal docs together
3. **Ask specific questions** - "What are the risks?" vs "Analyze this"
4. **Create focused notebooks** - one per project or business area
5. **Use follow-up questions** - each query can build on previous context
6. **Extract actionable insights** - focus on what you can act on
7. **Document findings** - save key insights for future reference

## File Type Support

**Recommended formats:**

- Markdown (.md) - Best for structured documents
- PDF - Reports, contracts, formal documents
- Word (.docx) - Business documents and proposals
- Plain text (.txt) - Notes and documentation

**Optimal for analysis:**

- Business plans and strategy documents
- Financial reports and budgets
- Legal agreements and contracts
- Project proposals and specifications
- Market research and analysis

## Troubleshooting

| Problem              | Solution                                                    |
| -------------------- | ----------------------------------------------------------- |
| Too many files found | Use specific patterns: `--pattern "*strategy*.md"`          |
| Upload failed        | Check file size limits and format compatibility             |
| Generic answers      | Ask more specific questions about business impact           |
| Analysis too broad   | Focus on specific aspects: risks, opportunities, compliance |
| Missing context      | Upload related documents together for better analysis       |
| Encoding errors      | Scripts automatically handle Unicode issues                 |

## Integration Notes

- **Claude Code**: Use for analyzing local document repositories
- **Claude API**: Automate document analysis workflows
- **Claude.ai**: Manual document upload and analysis interface
- **Enterprise**: Integrate with document management systems for automated analysis
