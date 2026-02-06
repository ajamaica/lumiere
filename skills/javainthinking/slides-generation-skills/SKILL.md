---
name: 2slides
description: AI-powered presentation generation using 2slides API. Create slides from text content, match reference image styles, or summarize documents into presentations. Use when users request to "create a presentation", "make slides", "generate a deck", "create slides from this content/document/image", or any presentation creation task. Supports theme selection, multiple languages, and both synchronous and asynchronous generation modes.
---

# 2slides Presentation Generation

Generate professional presentations using the 2slides AI API. Supports content-based generation, style matching from reference images, and document summarization.

## Setup Requirements

Users must have a 2slides API key:

1. Visit https://2slides.com/api to create an API key
2. Store the key in environment variable: `SLIDES_2SLIDES_API_KEY`

```bash
export SLIDES_2SLIDES_API_KEY="your_api_key_here"
```

## Workflow Decision Tree

Choose the appropriate approach based on the user's request:

```
User Request
│
├─ "Create slides from this content/text"
│  └─> Use Content-Based Generation (Section 1)
│
├─ "Create slides like this image"
│  └─> Use Reference Image Generation (Section 2)
│
├─ "Create slides from this document"
│  └─> Use Document Summarization (Section 3)
│
└─ "Search for themes" or "What themes are available?"
   └─> Use Theme Search (Section 4)
```

---

## 1. Content-Based Generation

Generate slides from user-provided text content.

### When to Use

- User provides content directly in their message
- User says "create a presentation about X"
- User provides structured outline or bullet points

### Workflow

**Step 1: Prepare Content**

Structure the content clearly for best results:

```
Title: [Main Topic]

Section 1: [Subtopic]
- Key point 1
- Key point 2
- Key point 3

Section 2: [Subtopic]
- Key point 1
- Key point 2
```

**Step 2: Choose Theme (Required)**

Search for an appropriate theme (themeId is required):

```bash
python scripts/search_themes.py --query "business"
python scripts/search_themes.py --query "professional"
python scripts/search_themes.py --query "creative"
```

Pick a theme ID from the results.

**Step 3: Generate Slides**

Use the `generate_slides.py` script with the theme ID:

```bash
# Basic generation (theme ID required)
python scripts/generate_slides.py --content "Your content here" --theme-id "theme123"

# In different language
python scripts/generate_slides.py --content "Your content" --theme-id "theme123" --language "Spanish"

# Async mode for longer presentations
python scripts/generate_slides.py --content "Your content" --theme-id "theme123" --mode async
```

**Step 4: Handle Results**

**Sync mode response:**

```json
{
  "slideUrl": "https://2slides.com/slides/abc123",
  "pdfUrl": "https://2slides.com/slides/abc123/download",
  "status": "completed"
}
```

Provide both URLs to the user:

- `slideUrl`: Interactive online slides
- `pdfUrl`: Downloadable PDF version

**Async mode response:**

```json
{
  "jobId": "job123",
  "status": "pending"
}
```

Poll for results:

```bash
python scripts/get_job_status.py --job-id "job123"
```

---

## 2. Reference Image Generation

Generate slides that match the style of a reference image.

### When to Use

- User provides an image URL and says "create slides like this"
- User wants to match existing brand/design style
- User has a template image they want to emulate

### Workflow

**Step 1: Verify Image URL**

Ensure the reference image is:

- Publicly accessible URL
- Valid image format (PNG, JPG, etc.)
- Represents the desired slide style

**Step 2: Generate Slides**

Use the `generate_slides.py` script with `--reference-image`:

```bash
python scripts/generate_slides.py \
  --content "Your presentation content" \
  --reference-image "https://example.com/template.jpg" \
  --language "Auto"
```

**Optional parameters:**

```bash
--aspect-ratio "16:9"           # width:height format (e.g., "16:9", "4:3")
--resolution "2K"               # "1K", "2K" (default), or "4K"
--page 5                        # Number of slides (0 for auto-detection, max 100)
--content-detail "concise"      # "concise" (brief) or "standard" (detailed)
```

**Note:** This uses Nano Banana Pro mode with credit costs:

- 1K/2K: 100 credits per page
- 4K: 200 credits per page

**Step 3: Handle Results**

This mode always runs synchronously and returns:

```json
{
  "slideUrl": "https://2slides.com/workspace?jobId=...",
  "pdfUrl": "https://...pdf...",
  "status": "completed",
  "message": "Successfully generated N slides",
  "slidePageCount": N
}
```

Provide both URLs to the user:

- `slideUrl`: View slides in 2slides workspace
- `pdfUrl`: Direct PDF download (expires in 1 hour)

**Processing time:** ~30 seconds per page (30-60 seconds typical for 1-2 pages)

---

## 3. Document Summarization

Generate slides from document content.

### When to Use

- User uploads a document (PDF, DOCX, TXT, etc.)
- User says "create slides from this document"
- User wants to summarize long content into presentation format

### Workflow

**Step 1: Read Document**

Use appropriate tool to read the document content:

- PDF: Use PDF reading tools
- DOCX: Use DOCX reading tools
- TXT/MD: Use Read tool

**Step 2: Extract Key Points**

Analyze the document and extract:

- Main topics and themes
- Key points for each section
- Important data, quotes, or examples
- Logical flow and structure

**Step 3: Structure Content**

Format extracted information into presentation structure:

```
Title: [Document Main Topic]

Introduction
- Context
- Purpose
- Overview

[Section 1 from document]
- Key point 1
- Key point 2
- Supporting detail

[Section 2 from document]
- Key point 1
- Key point 2
- Supporting detail

Conclusion
- Summary
- Key takeaways
- Next steps
```

**Step 4: Generate Slides**

Use content-based generation workflow (Section 1). First search for a theme, then generate:

```bash
# Search for appropriate theme
python scripts/search_themes.py --query "business"

# Generate with theme ID
python scripts/generate_slides.py --content "[Structured content from step 3]" --theme-id "theme123"
```

**Tips:**

- Keep slides concise (3-5 points per slide)
- Focus on key insights, not full text
- Use document headings as slide titles
- Include important statistics or quotes
- Ask user if they want specific sections highlighted

---

## 4. Theme Search

Find appropriate themes for presentations.

### When to Use

- Before generating slides with specific styling
- User asks "what themes are available?"
- User wants professional or branded appearance

### Workflow

**Search themes:**

```bash
# Search for specific style (query is required)
python scripts/search_themes.py --query "business"
python scripts/search_themes.py --query "creative"
python scripts/search_themes.py --query "education"
python scripts/search_themes.py --query "professional"

# Get more results
python scripts/search_themes.py --query "modern" --limit 50
```

**Theme selection:**

1. Show user available themes with names and descriptions
2. Ask user to choose or let them use default
3. Use the theme ID in generation request

---

## Using the MCP Server

If the 2slides MCP server is configured in Claude Desktop, use the integrated tools instead of scripts.

**Two Configuration Modes:**

1. **Streamable HTTP Protocol (Recommended)**
   - Simplest setup, no local installation
   - Configure: `"url": "https://2slides.com/api/mcp?apikey=YOUR_API_KEY"`

2. **NPM Package (stdio)**
   - Uses local npm package
   - Configure: `"command": "npx", "args": ["2slides-mcp"]`

**Available MCP tools:**

- `slides_generate` - Generate slides from content
- `slides_create_like_this` - Generate from reference image
- `themes_search` - Search themes
- `jobs_get` - Check job status

See [mcp-integration.md](references/mcp-integration.md) for complete setup instructions and detailed tool documentation.

**When to use MCP vs scripts:**

- **Use MCP** in Claude Desktop when configured
- **Use scripts** in Claude Code CLI or when MCP not available

---

## Advanced Features

### Sync vs Async Mode

**Sync Mode (default):**

- Waits for generation to complete (30-60 seconds)
- Returns results immediately
- Best for quick presentations

**Async Mode:**

- Returns job ID immediately
- Poll for results with `get_job_status.py`
- Best for large presentations or batch processing

### Language Support

Generate slides in multiple languages (use full language name):

```bash
--language "Auto"                # Automatic detection (default)
--language "English"             # English
--language "Simplified Chinese"  # 简体中文
--language "Traditional Chinese" # 繁體中文
--language "Spanish"             # Español
--language "French"              # Français
--language "German"              # Deutsch
--language "Japanese"            # 日本語
--language "Korean"              # 한국어
```

And more: Arabic, Portuguese, Indonesian, Russian, Hindi, Vietnamese, Turkish, Polish, Italian

### Error Handling

**Common issues:**

1. **Missing API key**

   ```
   Error: API key not found
   Solution: Set SLIDES_2SLIDES_API_KEY environment variable
   ```

2. **Rate limiting**

   ```
   Error: 429 Too Many Requests
   Solution: Wait before retrying or check plan limits
   ```

3. **Invalid content**
   ```
   Error: 400 Bad Request
   Solution: Verify content format and parameters
   ```

---

## Complete API Reference

For detailed API documentation, see [api-reference.md](references/api-reference.md)

Includes:

- All endpoints and parameters
- Request/response formats
- Authentication details
- Rate limits and best practices
- Error codes and handling

---

## Tips for Best Results

**Content Structure:**

- Use clear headings and subheadings
- Keep bullet points concise
- Limit to 3-5 points per section
- Include relevant examples or data

**Theme Selection:**

- Theme ID is required for standard generation
- Search with keywords matching presentation purpose
- Common searches: "business", "professional", "creative", "education", "modern"
- Each theme has unique styling and layout

**Reference Images:**

- Use high-quality images for best results
- Can use URL or base64 encoded image
- Public URL must be accessible
- Consider resolution setting (1K/2K/4K) based on quality needs
- Use page=0 for automatic slide count detection

**Document Processing:**

- Extract only key information
- Don't try to fit entire document in slides
- Focus on main insights and takeaways
- Ask user which sections to emphasize
