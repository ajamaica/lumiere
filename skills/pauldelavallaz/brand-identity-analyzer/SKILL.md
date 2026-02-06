---
name: brand-analyzer
description: Analyze brands to generate comprehensive brand identity profiles (JSON). Use when the user wants to analyze a brand, create a brand profile, or needs brand data for ad generation. Stores profiles for reuse across Ad-Ready, Morpheus, and other creative workflows. Can list existing profiles and update them.
---

# Brand Analyzer: AI Brand Identity Profiler

Analyze any brand to generate a comprehensive brand identity JSON profile using Gemini Flash with Google Search grounding.

## Overview

Brand Analyzer creates structured brand identity profiles by:

1. **Researching** the brand via Google Search (official data, campaigns, visual identity)
2. **Analyzing** brand behavior, visual patterns, photography style, tone of voice
3. **Generating** a complete JSON profile following the standard template
4. **Storing** the profile for reuse across all creative workflows

## When to Use

- User asks to "analyze a brand" or "create a brand profile"
- Before running Ad-Ready when the brand isn't in the catalog
- When the user mentions a brand that doesn't have a profile yet
- To update/refresh an existing brand profile

## Quick Commands

### Analyze a brand and save to file

```bash
GEMINI_API_KEY="$KEY" uv run {baseDir}/scripts/analyze.py \
  --brand "Brand Name" \
  --output ./brands/Brand_Name.json
```

### Analyze and auto-save to Ad-Ready brands catalog

```bash
GEMINI_API_KEY="$KEY" uv run {baseDir}/scripts/analyze.py \
  --brand "Heredero Gin" \
  --auto-save
```

The `--auto-save` flag automatically saves to `~/clawd/ad-ready/configs/Brands/{Brand_Name}.json`

### ⚠️ MANDATORY: Push to GitHub After Every New Brand Profile

**Every time a new brand profile is generated and saved, it MUST be pushed to GitHub immediately.** This is non-optional — the ComfyDeploy deployment pulls brand profiles from the repo.

```bash
cd ~/clawd/ad-ready
git add configs/Brands/{Brand_Name}.json
git commit -m "Add brand profile: {Brand Name}"
git push origin main
```

Do NOT skip this step. The ad generation pipeline on ComfyDeploy needs the profile in the repo to work correctly.

### Print to stdout

```bash
GEMINI_API_KEY="$KEY" uv run {baseDir}/scripts/analyze.py --brand "Nike"
```

## Inputs

| Input         | Required | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `--brand`     | ✅       | Brand name to analyze                            |
| `--output`    | Optional | Output file path (default: stdout)               |
| `--auto-save` | Optional | Auto-save to Ad-Ready brands catalog             |
| `--api-key`   | Optional | Gemini API key (or set `GEMINI_API_KEY` env var) |

## Output Format

The generated JSON follows the standard brand identity template used by Ad-Ready:

```json
{
  "brand_info": { "name", "tagline", "category", "positioning", "vision", "mission", "origin_story" },
  "brand_values": { "core_values", "brand_promise", "differentiators", "non_negotiables" },
  "target_audience": { "demographics", "psychographics" },
  "tone_of_voice": { "personality_traits", "communication_style", "language_register", ... },
  "visual_identity": { "logo", "color_system", "typography", "layout_principles" },
  "photography": { "style", "technical" },
  "campaign_guidelines": { "visual_tone", "model_casting", "product_presentation", ... },
  "brand_behavior": { "do_dont", "immutability" },
  "channel_expression": { "retail", "digital", "print" },
  "compliance": { ... }
}
```

## Integration with Other Workflows

### Ad-Ready

Brand profiles are automatically available as `brand_profile` options when generating ads.

### Morpheus Fashion Design

Brand visual identity (colors, photography style, tone) can inform Morpheus campaigns.

### Custom Workflows

Load any brand profile JSON to extract visual identity, tone of voice, or campaign guidelines for any creative task.

## Analysis Methodology

The analyzer follows a 3-phase approach:

### Phase 1: Official Research (via Google Search)

- Brand website, corporate pages, official communications
- Locks canonical data: name, founding, positioning, vision, mission, tagline

### Phase 2: Campaign Research (via Google Search)

- Google Images and Pinterest for advertising campaigns
- Identifies 10+ distinct campaigns
- Treats them as analytical reference material

### Phase 3: Deductive Visual Analysis

- Cross-sectional analysis of visual patterns
- Identifies recurring photography style, color systems, typography
- Fills visual identity fields not covered by official data

## API Key

Uses Gemini API. Set via:

- `GEMINI_API_KEY` environment variable
- `--api-key` flag
