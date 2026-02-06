---
name: prezentit
description: Generate beautiful AI-powered presentations instantly. Create professional slides with custom themes, visual designs, and speaker notes—all through natural language commands.
homepage: https://prezentit.net
emoji: "👽"
metadata:
  clawdbot:
    emoji: "👽"
    skillKey: prezentit
    homepage: https://prezentit.net
    requires:
      config:
        - PREZENTIT_API_KEY
    config:
      requiredEnv:
        - name: PREZENTIT_API_KEY
          description: Your Prezentit API key. Get one at https://prezentit.net/api-keys
      example: |
        export PREZENTIT_API_KEY=pk_your_api_key_here
---

# Prezentit - AI Presentation Generator

**Base URL**: `https://prezentit.net/api/v1`  
**Auth Header**: `Authorization: Bearer pk_your_api_key_here`

## ⚠️ CRITICAL FOR AI AGENTS

**ALWAYS use `"stream": false`** in generation requests! Without this, you get streaming responses that cause issues.

## Quick Reference

| I want to... | Endpoint | Guide |
|--------------|----------|-------|
| Check credits | `GET /me/credits` | - |
| Find themes | `GET /themes?search=NAME` | [THEMES.md](./THEMES.md) |
| Generate presentation | `POST /presentations/generate` | [WORKFLOW.md](./WORKFLOW.md) |
| Handle errors | - | [ERRORS.md](./ERRORS.md) |
| Create outlines | `GET /docs/outline-format` | [OUTLINES.md](./OUTLINES.md) |

## Complete Workflow (FOLLOW THIS ORDER)

### Step 1: Check Credits First
```
GET /api/v1/me/credits
```
→ If not enough credits, tell user to buy at https://prezentit.net/buy-credits

### Step 2: Find Theme (if user wants specific style)
```
GET /api/v1/themes?search=minimalist
```
→ Use the `id` from results

### Step 3: Generate
```json
POST /api/v1/presentations/generate
{
  "topic": "User's topic here",
  "slideCount": 5,
  "theme": "theme-id",
  "stream": false
}
```

**⏱️ IMPORTANT: Generation takes 1-3 minutes. The API will return when complete.**

### Step 4: Give User the Link
From the response, share the `viewUrl` with the user. That's their presentation!

## Response Format

```json
{
  "success": true,
  "data": {
    "viewUrl": "https://prezentit.net/view/abc123",  ← SHARE THIS
    "presentationId": "uuid",
    "creditsUsed": 75,
    "remainingCredits": 25
  }
}
```

## Pricing

- **15 credits per slide** (outline + design)
- **10 credits per slide** if you provide your own outline (33% savings)
- New accounts get **100 free credits**

## Additional Guides

- **[WORKFLOW.md](./WORKFLOW.md)** - Detailed step-by-step workflow
- **[ERRORS.md](./ERRORS.md)** - How to handle every error
- **[THEMES.md](./THEMES.md)** - Theme selection guide  
- **[OUTLINES.md](./OUTLINES.md)** - Creating valid outlines to save credits
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete endpoint documentation

## Anti-Spam Rules

- **5-second cooldown** between requests
- **No duplicate requests** within 30 seconds
- If rate limited, wait for `retryAfter` seconds

## Getting Help

- Website: https://prezentit.net
- API Docs: `GET /api/v1/docs/outline-format`
- Support: https://prezentit.net/support
