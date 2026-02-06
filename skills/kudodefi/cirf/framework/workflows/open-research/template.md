<!--
OPEN RESEARCH TEMPLATE
INSTRUCTIONS:
- Recall & Apply: {output-standards} (./framework/guides/output-standards.md)
- Validation: See open-research/objectives.md

PURPOSE: Flexible research output answering user's research question
OUTPUT: Research report with structure adapted to question type

LANGUAGE:
- Output: Follow core-config.yaml → language.output
- Terminology: English (crypto domain terms always preserved)

DETAIL LEVEL:
- concise: Synthesis and key findings only
- standard: Balanced presentation with essential details
- detailed: Comprehensive with full details, examples, comparisons

OUTPUT TYPE:
- brief: Executive summary style, key points only, minimal supporting detail
- standard: Balanced depth, essential evidence and analysis included
- comprehensive: Full exploration, extensive evidence, thorough analysis

NOTE: This is a flexible template. AI determines appropriate structure,
subsections, and depth based on the research question. The 3 core sections
below are required, but internal structure is AI-determined.
-->

# {RESEARCH TITLE}

**Research Question:** {Primary question being answered}
**Research depth:** {quick | standard | deep}
**Output type:** {brief | standard | comprehensive}

---

## EXECUTIVE SUMMARY

> **Purpose:** Direct answer to research question for quick consumption
> **Questions:** What is the answer? | What are key findings? | How confident?
> **Detail level:** concise
> **Format:** Core answer + key findings bullets + confidence statement

**Answer:** {1-2 sentence direct answer to research question}

**Key Findings:**

- {Finding 1}
- {Finding 2}
- {Finding 3}

**Confidence:** {HIGH | MEDIUM | LOW} - {Brief justification}

---

## RESEARCH & ANALYSIS

> **Purpose:** Evidence and analysis supporting the answer
> **Questions:** AI determines based on research question
> **Detail level:** {standard | detailed} based on output_type
> **Format:** AI determines subsections based on question type
> **Note:** This is the main section. AI has full autonomy to structure analysis
> appropriately. May include: background, methodology, findings by theme,
> comparisons, implications, or any other relevant dimensions.

{AI-determined subsections and content}

---

## CONCLUSION & SOURCES

> **Purpose:** Final synthesis and source documentation
> **Questions:** What's the bottom line? | What should reader do? | Where did this come from?
> **Detail level:** standard
> **Format:** Conclusion + recommendations (if applicable) + sources

### Conclusion

{Synthesis of findings, direct answer to research question, caveats}

### Recommendations

{Actionable next steps if applicable - omit section if not relevant}

### Sources & References

**Primary Sources**
{Direct sources: official docs, on-chain data, interviews, original research}

**Secondary Sources**
{Interpretive sources: media, research reports, analyses}

**Tertiary Sources**
{Community sources: discussions, social media, unverified claims}

---

**Total:** [N] sources | **Date range:** [Earliest] to [Latest]
