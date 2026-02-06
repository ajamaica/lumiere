# 2slides API Reference

Complete API documentation for 2slides slide generation service.

## Base URL

```
https://2slides.com/api/v1
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Get your API key from: https://2slides.com/api

Store the API key in environment variable: `SLIDES_2SLIDES_API_KEY`

## Endpoints

### 1. Generate Slides

Generate slides from user input with optional theme selection.

**Endpoint:** `POST /slides/generate`

**Headers:**

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

```json
{
  "userInput": "string (required) - Content to convert into slides",
  "themeId": "string (required) - Theme ID from themes/search",
  "responseLanguage": "string (optional, default: 'Auto') - Language code",
  "mode": "string (optional, default: 'sync') - 'sync' or 'async'"
}
```

**Supported Languages:**
Auto, English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文), Spanish, Arabic, Portuguese, Indonesian, Japanese, Russian, Hindi, French, German, Vietnamese, Turkish, Polish, Italian, Korean

**Response (sync mode):**

```json
{
  "slideUrl": "https://2slides.com/slides/...",
  "pdfUrl": "https://2slides.com/slides/.../download",
  "status": "completed"
}
```

**Response (async mode):**

```json
{
  "jobId": "abc123...",
  "status": "pending"
}
```

**Notes:**

- **Sync mode**: Waits for generation to complete and returns the result directly (may take 30-60 seconds)
- **Async mode**: Returns immediately with a jobId to poll for results using `/jobs/{jobId}`

---

### 2. Create Like This (Reference Image)

Generate slides matching a reference image style (Nano Banana Pro mode).

**Endpoint:** `POST /slides/create-like-this`

**Headers:**

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**

```json
{
  "userInput": "string (required) - Content for slides",
  "referenceImageUrl": "string (required) - URL or base64 of reference image",
  "responseLanguage": "string (optional, default: 'Auto')",
  "aspectRatio": "string (optional, default: '16:9') - width:height format",
  "resolution": "string (optional, default: '2K') - '1K', '2K', or '4K'",
  "page": "number (optional, default: 1) - 0 for auto-detection, max 100",
  "contentDetail": "string (optional, default: 'concise') - 'concise' or 'standard'"
}
```

**Resolution Options:**

- **1K**: Standard quality
- **2K**: High quality (default)
- **4K**: Ultra high quality

**Content Detail Options:**

- **concise**: Brief, keyword-focused content
- **standard**: Comprehensive, detailed content

**Page Parameter:**

- Set to `0` to enable automatic slide count detection
- Set to specific number (1-100) for exact slide count

**Response:**

```json
{
  "success": true,
  "data": {
    "jobId": "608f8997-5207-480c-9ff2-d2475cba6b9d",
    "status": "success",
    "message": "Successfully generated N slides",
    "downloadUrl": "https://...pdf...",
    "jobUrl": "https://2slides.com/workspace?jobId=...",
    "createdAt": 1770108913384,
    "updatedAt": 1770108934015,
    "slidePageCount": 3,
    "successCount": 3,
    "failedCount": 0
  }
}
```

**Response Fields:**

- `success`: Boolean indicating if request succeeded
- `data.jobId`: Unique job identifier
- `data.status`: Generation status ("success" or "failed")
- `data.message`: Human-readable status message
- `data.downloadUrl`: Direct PDF download URL (temporary, expires in 1 hour)
- `data.jobUrl`: View slides in 2slides workspace
- `data.slidePageCount`: Number of slides generated
- `data.successCount`: Number of successfully generated slides
- `data.failedCount`: Number of failed slides

**Notes:**

- This endpoint always runs synchronously
- Processing time: ~30 seconds per page
- Typical response time: 30-60 seconds for 1-2 pages
- Automatically generates PDF
- Matches the style and design of the reference image
- **Timeout recommendation**: Set timeout to `max(120, pages * 40)` seconds

---

### 3. Search Themes

Search for available presentation themes.

**Endpoint:** `GET /themes/search`

**Headers:**

```
Authorization: Bearer YOUR_API_KEY
```

**Query Parameters:**

```
query: string (required) - Search keyword
limit: number (optional, default: 20, max: 100)
```

**Response:**

```json
{
  "themes": [
    {
      "id": "theme_id_123",
      "name": "Professional Blue",
      "description": "Clean professional theme with blue accents",
      "previewUrl": "https://..."
    }
  ],
  "count": 1
}
```

---

### 4. Get Job Status

Retrieve the status and results of an async generation job.

**Endpoint:** `GET /jobs/{jobId}`

**Headers:**

```
Authorization: Bearer YOUR_API_KEY
```

**Path Parameters:**

```
jobId: string (required) - Job ID from async generation
```

**Response:**

```json
{
  "jobId": "abc123",
  "status": "completed|pending|failed",
  "slideUrl": "https://2slides.com/slides/...",
  "pdfUrl": "https://2slides.com/slides/.../download",
  "error": "error message if failed"
}
```

**Status Values:**

- `pending`: Job is still processing
- `completed`: Slides are ready
- `failed`: Generation failed (see error field)

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Response Format:**

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Credit Costs

- **Fast PPT (generate endpoint)**: 10 credits per slide page
- **Nano Banana Pro 1K/2K**: 100 credits per page
- **Nano Banana Pro 4K**: 200 credits per page

## Rate Limits

Check your plan's rate limits and credit balance at https://2slides.com/api

If rate limited, wait before retrying or upgrade your plan.

---

## Best Practices

### Content Formatting

**For best results, structure content clearly:**

```
Title: Introduction to AI

Section 1: Machine Learning
- Definition
- Key concepts
- Applications

Section 2: Deep Learning
- Neural networks
- Training process
- Use cases
```

### Choosing Sync vs Async Mode

- **Use sync** for quick generations (<5 slides)
- **Use async** for larger presentations (>5 slides)
- **Use async** when integrating into workflows that can poll

### Theme Selection

1. Search themes with relevant keywords
2. Preview themes if URLs available
3. Use theme ID in generation request
4. Leave theme blank for default styling

### Language Support

Specify `responseLanguage` to generate slides in different languages:

- `"Auto"` - Automatic language detection (default)
- `"English"` - English
- `"Simplified Chinese"` - 简体中文
- `"Traditional Chinese"` - 繁體中文
- `"Spanish"` - Español
- `"Arabic"` - العربية
- `"Portuguese"` - Português
- `"Indonesian"` - Bahasa Indonesia
- `"Japanese"` - 日本語
- `"Russian"` - Русский
- `"Hindi"` - हिन्दी
- `"French"` - Français
- `"German"` - Deutsch
- `"Vietnamese"` - Tiếng Việt
- `"Turkish"` - Türkçe
- `"Polish"` - Polski
- `"Italian"` - Italiano
- `"Korean"` - 한국어
