# Prezentit Workflow Guide

This document explains the complete workflow for generating presentations.

## Step-by-Step Workflow

### Step 1: Check Credits
**Always start here before generating.**

```bash
GET /api/v1/me/credits
```

**What you'll get:**
- Current credit balance
- Cost per slide (outline + design)
- Rate limits

**Decision tree:**
- If credits >= needed → Proceed to Step 2
- If credits < needed → Tell user to buy credits at https://prezentit.net/buy-credits

### Step 2: Find a Theme (Optional but Recommended)
**If user wants a specific style:**

```bash
GET /api/v1/themes?search=minimalist
```

**What you'll get:**
- List of matching themes with IDs
- Theme descriptions
- Recommended use cases

**Decision tree:**
- Theme found → Use the `id` field in generation
- No theme matches → Use `customDesignPrompt` instead

### Step 3: Generate Presentation
**The main action:**

```bash
POST /api/v1/presentations/generate
{
  "topic": "Your topic",
  "slideCount": 5,
  "theme": "theme-id-from-step-2",
  "stream": false  ← CRITICAL for AI agents
}
```

**IMPORTANT**: Generation takes 1-3 minutes for 5 slides. With `stream: false`, the API waits and returns the complete result.

**What you'll get:**
- `viewUrl` - Share this with the user immediately
- `presentationId` - For future reference
- `creditsUsed` - What was spent
- `remainingCredits` - Balance after generation

### Step 4: Present Results to User
**What to tell the user:**

1. ✅ "Your presentation is ready!"
2. 🔗 Share the `viewUrl` link
3. 💳 Mention remaining credits
4. 📥 Mention they can download from the link

## Timing Expectations

| Slide Count | Estimated Time |
|-------------|----------------|
| 3-5 slides | 1-2 minutes |
| 6-10 slides | 2-4 minutes |
| 11-20 slides | 4-8 minutes |
| 20+ slides | 8-15 minutes |

## Error Recovery Guide

See [ERRORS.md](./ERRORS.md) for detailed error handling.

## Credit Calculations

| Scenario | Formula |
|----------|---------|
| Standard generation | slides × 15 credits |
| With external outline | slides × 10 credits |

**Example:** 5-slide presentation = 75 credits (or 50 with your own outline)
