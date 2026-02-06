# Creating Outlines for Prezentit

This guide explains how to create valid outlines that pass validation.

## Why Provide Your Own Outline?

1. **Save 33% credits** - Skip AI outline generation
2. **More control** - Exactly what you want on each slide
3. **Consistent quality** - You control the content structure

## Get Current Validation Rules

**ALWAYS call this first to get the latest constraints:**

```bash
GET /api/v1/docs/outline-format
```

This returns the exact validation rules including:
- Min/max characters for each field
- Min/max words for each field
- Min/max slides allowed
- Min/max talking points per slide

## Outline Structure

```json
{
  "slides": [
    {
      "title": "Slide Title Here",
      "mainIdea": "The core message of this slide explained clearly...",
      "talkingPoints": [
        "First key point to discuss",
        "Second key point",
        "Third key point"
      ],
      "visualGuide": "Description of what visuals would complement this content..."
    }
  ]
}
```

## Field Requirements (Check /docs/outline-format for exact values)

### title
- Required: Yes
- Purpose: The slide headline
- Tips: Be specific, not generic. "Revenue Growth Q4 2024" not "Results"

### mainIdea
- Required: Yes
- Purpose: The single most important takeaway
- Tips: One clear sentence that captures the slide's essence

### talkingPoints
- Required: Yes (array)
- Purpose: Key points to cover
- Tips: 3-5 concrete, actionable points

### visualGuide
- Required: Yes
- Purpose: Describes what the AI should design
- Tips: Be specific about layout, charts, images wanted

## Example: Good vs Bad Outlines

### ❌ Bad Outline (will fail validation)

```json
{
  "slides": [
    {
      "title": "Intro",
      "mainIdea": "Start",
      "talkingPoints": ["Point"],
      "visualGuide": "Image"
    }
  ]
}
```

Problems:
- Title too short
- mainIdea too vague
- Only one talking point
- visualGuide not descriptive

### ✅ Good Outline (will pass)

```json
{
  "slides": [
    {
      "title": "Introduction to Sustainable Energy",
      "mainIdea": "Sustainable energy sources are essential for reducing carbon emissions and ensuring long-term energy security for future generations.",
      "talkingPoints": [
        "Global energy consumption is increasing by 2% annually",
        "Fossil fuels account for 80% of current energy production",
        "Renewable sources can meet 90% of needs by 2050"
      ],
      "visualGuide": "Split layout showing traditional power plants on left versus wind turbines and solar panels on right, with a timeline arrow pointing toward clean energy future. Use green and blue color scheme."
    }
  ]
}
```

## Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Title too short" | Less than minimum characters | Expand to full descriptive title |
| "Title too long" | Exceeds maximum | Shorten, move details to mainIdea |
| "Too few talking points" | Need at least 3 | Add more specific points |
| "Too many talking points" | Exceeds maximum | Consolidate related points |
| "mainIdea too short" | Not descriptive enough | Write a complete sentence |
| "visualGuide missing" | Empty or missing | Describe the desired visual |

## Step-by-Step Outline Creation

1. **Get constraints**: `GET /api/v1/docs/outline-format`
2. **Plan your slides**: Decide the flow and key messages
3. **Write each slide**: Follow the structure above
4. **Check lengths**: Ensure all fields meet min/max requirements
5. **Submit**: Include in your generation request

## Submitting Your Outline

```bash
POST /api/v1/presentations/generate
{
  "topic": "Sustainable Energy",
  "stream": false,
  "outline": {
    "slides": [...]
  }
}
```

**Note:** When you provide an outline:
- You pay only for design generation (10 credits/slide)
- The topic is still required for context
- Theme can still be applied to your outline
