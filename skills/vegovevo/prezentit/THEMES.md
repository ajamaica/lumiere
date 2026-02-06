# Prezentit Theme Reference

This document lists popular themes and how to find the right one.

## Finding Themes

### Search by Style
```bash
GET /api/v1/themes?search=minimalist
```

### List All Themes
```bash
GET /api/v1/themes
```

## Popular Theme Categories

### Professional / Business
- `minimalist` - Clean, simple, lots of white space
- `corporate` - Professional blue tones, formal
- `executive` - Premium, sophisticated look

### Creative / Design
- `creative` - Bold colors, artistic layouts
- `modern` - Contemporary design trends
- `gradient` - Smooth color transitions

### Technical
- `tech` - Technology-focused, digital aesthetic
- `dark-mode` - Dark backgrounds, neon accents
- `developer` - Code-friendly, monospace elements

### Educational
- `education` - Clear, informative layouts
- `academic` - Scholarly, research-focused
- `classroom` - Engaging, student-friendly

### Nature / Environment
- `nature` - Organic colors, natural imagery
- `eco` - Environmental, sustainability focus
- `earth` - Earthy tones, natural textures

## Using Themes

### With Theme ID
```json
{
  "topic": "Your topic",
  "theme": "minimalist",
  "stream": false
}
```

### With Custom Design Prompt
When no theme matches, use `customDesignPrompt`:

```json
{
  "topic": "Your topic",
  "customDesignPrompt": "Use a cyberpunk aesthetic with neon pink and cyan colors on dark backgrounds. Include futuristic UI elements and glitch effects.",
  "stream": false
}
```

## Theme Selection Logic

1. **User mentions a style?** → Search themes for it
2. **Match found?** → Use the theme `id`
3. **No match?** → Use `customDesignPrompt` with user's description
4. **Neither specified?** → Let AI choose based on topic

## Tips for AI Agents

- If user says "make it professional" → search "corporate" or "minimalist"
- If user says "make it fun" → search "creative" or "colorful"
- If user mentions specific colors → use `customDesignPrompt`
- When in doubt, `minimalist` is always a safe choice
