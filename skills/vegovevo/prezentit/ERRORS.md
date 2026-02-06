# Prezentit Error Handling Guide

This document explains how to handle every error from the Prezentit API.

## Quick Error Reference

| HTTP Code | Error Code | Meaning | What to Do |
|-----------|------------|---------|------------|
| 400 | MISSING_TOPIC | No topic provided | Ask user what the presentation should be about |
| 400 | INVALID_SLIDE_COUNT | Slides not 3-50 | Adjust slide count within range |
| 400 | INVALID_OUTLINE | Outline validation failed | See outline errors section |
| 401 | - | Invalid API key | Check API key configuration |
| 402 | - | Not enough credits | Direct user to buy credits |
| 429 | RATE_LIMITED | Too many requests | Wait and retry (see retryAfter) |
| 429 | DUPLICATE_REQUEST | Same request sent twice | Wait or modify request |
| 500 | - | Server error | Wait 30 seconds and retry |

## Detailed Error Handling

### 401 Unauthorized - Invalid API Key

```json
{
  "error": "Invalid or inactive API key"
}
```

**What to do:**
1. Check if PREZENTIT_API_KEY is configured
2. Verify the key starts with `pk_`
3. Tell user to get a new key at https://prezentit.net/api-keys

**Response to user:**
> "I couldn't connect to Prezentit. Please make sure your API key is configured correctly. You can get one at https://prezentit.net/api-keys"

---

### 402 Payment Required - Insufficient Credits

```json
{
  "error": "Insufficient credits",
  "required": 75,
  "available": 20,
  "purchaseUrl": "https://prezentit.net/buy-credits"
}
```

**What to do:**
1. Tell user exactly how many credits they need
2. Share the purchase link
3. Offer to reduce slide count if possible

**Response to user:**
> "You need 75 credits but only have 20. You can:
> - Buy more at https://prezentit.net/buy-credits
> - Reduce to X slides (would cost Y credits)"

---

### 429 Rate Limited

```json
{
  "error": "Rate limit exceeded: too many requests per minute",
  "retryAfter": 60
}
```

**What to do:**
1. DO NOT retry immediately
2. Wait the specified `retryAfter` seconds
3. Then retry the same request

**Response to user:**
> "I'm generating too fast. Let me wait a minute and try again."

---

### 429 Duplicate Request Blocked

```json
{
  "error": "Duplicate request detected...",
  "code": "DUPLICATE_REQUEST",
  "retryAfter": 25
}
```

**What to do:**
1. DO NOT retry the same request
2. Wait for the original request to complete
3. Or modify the request parameters

**Response to user:**
> "I already submitted this request. Let me wait for it to complete."

---

### 400 Invalid Outline

```json
{
  "error": "Invalid outline format",
  "code": "INVALID_OUTLINE",
  "validationErrors": [
    {
      "slide": 1,
      "field": "title",
      "error": "Title must be at least 3 characters",
      "value": "ML",
      "fix": "Expand the title to at least 3 characters"
    }
  ]
}
```

**What to do:**
1. Read each validation error
2. Apply the fix suggestion
3. Resubmit the corrected outline

**IMPORTANT:** Before creating outlines, always check the current constraints:
```bash
GET /api/v1/docs/outline-format
```

---

### 500 Server Error

```json
{
  "error": "Generation failed",
  "success": false
}
```

**What to do:**
1. Wait 30 seconds
2. Retry the request once
3. If it fails again, tell user to try later

**Response to user:**
> "There was a server issue. Let me try again..."
> (after retry fails)
> "The service is having issues. Please try again in a few minutes or visit https://prezentit.net directly."

## Anti-Spam Protection

The API has built-in spam protection:

1. **5-second cooldown** between any generation requests
2. **30-second duplicate detection** - identical requests are blocked
3. **Per-minute and per-day rate limits** on your API key

**Best practice:** Never make the same request twice. If you need to retry, wait for the `retryAfter` period.
