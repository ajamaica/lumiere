# 2slides Skills for Claude Code

AI-powered presentation generation using the [2slides API](https://2slides.com). This Claude Code skill enables you to create professional presentations from text content, match reference image styles, or summarize documents into slides.

## Important Links

**🌐 [2slides Website](https://2slides.com)** - Learn about 2slides features, pricing, and create presentations online

**🔑 [Get API Access](https://2slides.com/api)** - Sign up for API access, get your API key, and view API documentation

**📚 [API Documentation](https://2slides.com/api)** - Complete API reference with endpoints, parameters, and examples

> **New to 2slides?** Start at [2slides.com](https://2slides.com) to explore features, then visit [2slides.com/api](https://2slides.com/api) to get your API key and enable this skill.

## Overview

This skill provides integrated access to 2slides presentation generation capabilities within Claude Code. Generate slides in multiple languages, choose from various themes, and create presentations using several different methods.

## Features

- **Content-Based Generation**: Create slides from text, outlines, or bullet points
- **Reference Image Matching**: Generate slides that match the style of an existing image
- **Document Summarization**: Convert documents (PDF, DOCX, TXT) into presentation format
- **Theme Search**: Browse and select from professional themes
- **Multi-Language Support**: Generate presentations in 18+ languages
- **Sync & Async Modes**: Choose immediate results or batch processing
- **MCP Integration**: Use native tools in Claude Desktop

## Before You Begin

This skill requires a 2slides API account and API key. Follow these steps:

### Step 1: Explore 2slides

Visit **[2slides.com](https://2slides.com)** to:

- See examples of AI-generated presentations
- Understand available features and capabilities
- Review pricing plans and credit system
- Try the web interface to see what's possible

### Step 2: Get API Access

Visit **[2slides.com/api](https://2slides.com/api)** to:

- Sign up for an API account
- Generate your API key
- View API documentation and usage limits
- Check your credit balance and usage
- Access API endpoints reference

Once you have your API key, proceed with installation below.

## Installation

### 1. Set Up API Key

**First time using 2slides?**

1. **Visit [2slides.com](https://2slides.com)** to learn about the platform and features
2. **Go to [2slides.com/api](https://2slides.com/api)** to access the API portal
3. **Create an account** if you don't have one
4. **Generate your API key** from the API dashboard
5. **Set the environment variable** with your API key:

```bash
export SLIDES_2SLIDES_API_KEY="your_api_key_here"
```

To make this permanent, add it to your shell configuration file (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export SLIDES_2SLIDES_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Install the Skill

Copy this skill directory to your Claude Code skills location or invoke it directly using the skill name when it's available in your environment.

### 3. (Optional) Configure MCP Server

For Claude Desktop integration, add the 2slides MCP server to your Claude configuration. See [references/mcp-integration.md](references/mcp-integration.md) for complete setup instructions.

## Quick Start

### Create Slides from Text

```
Create a presentation about machine learning with these sections:
- Introduction to ML
- Types of Learning
- Applications
- Future Trends
```

### Create Slides from a Document

```
Create slides from this research paper [attach PDF]
```

### Match a Reference Style

```
Create slides about our Q4 results matching the style of this image: https://example.com/template.jpg
```

### Search for Themes

```
Search for professional business themes
```

## Usage Examples

### Example 1: Quick Presentation

```
User: Create a 5-slide presentation about climate change

Claude: [Searches for appropriate theme]
        [Generates structured content]
        [Creates presentation with generate_slides.py]

        Your presentation is ready!
        View online: https://2slides.com/slides/abc123
        Download PDF: https://2slides.com/slides/abc123/download
```

### Example 2: Document Summary

```
User: [Uploads 20-page research paper]
      Summarize this into slides

Claude: [Reads document]
        [Extracts key points]
        [Structures content for slides]
        [Generates presentation]

        Created a 12-slide summary of your research paper.
```

### Example 3: Style Matching

```
User: Create slides about our product launch using this design
      [provides reference image URL]

Claude: [Generates slides matching the reference style]

        Slides created matching your design template.
```

## Command Reference

The skill includes three Python scripts for API interaction:

### Generate Slides

```bash
# Basic generation with theme
python scripts/generate_slides.py --content "Your content" --theme-id "theme123"

# With language
python scripts/generate_slides.py --content "Content" --theme-id "theme123" --language "Spanish"

# From reference image
python scripts/generate_slides.py --content "Content" --reference-image "https://example.com/img.jpg"

# Async mode
python scripts/generate_slides.py --content "Content" --theme-id "theme123" --mode async
```

### Search Themes

```bash
# Search for themes
python scripts/search_themes.py --query "business"
python scripts/search_themes.py --query "creative" --limit 50
```

### Check Job Status

```bash
# For async jobs
python scripts/get_job_status.py --job-id "job123"
```

## Documentation

- **[SKILL.md](SKILL.md)**: Complete skill documentation with workflows and examples
- **[api-reference.md](references/api-reference.md)**: Detailed API documentation
- **[mcp-integration.md](references/mcp-integration.md)**: MCP server setup and configuration

## Supported Languages

Auto, English, Simplified Chinese, Traditional Chinese, Spanish, French, German, Japanese, Korean, Arabic, Portuguese, Indonesian, Russian, Hindi, Vietnamese, Turkish, Polish, Italian, and more.

## Generation Modes

### Content-Based Generation

Generate slides from text content using pre-designed themes.

**Requirements:**

- Text content (can be structured or unstructured)
- Theme ID (search themes first)

**Best for:**

- Quick presentations
- Structured outlines
- Bullet-point content

### Reference Image Generation

Create slides matching the style of a reference image.

**Requirements:**

- Text content
- Reference image URL (public or base64)

**Best for:**

- Matching existing brand guidelines
- Replicating design templates
- Consistent visual style

**Credit costs:**

- 1K/2K resolution: 100 credits per page
- 4K resolution: 200 credits per page

### Document Summarization

Convert documents into presentation format.

**Supported formats:**

- PDF documents
- Microsoft Word (DOCX)
- Plain text (TXT, MD)

**Best for:**

- Research papers
- Reports
- Long-form content

## Tips for Best Results

1. **Structure Your Content**
   - Use clear headings and subheadings
   - Keep bullet points concise (3-5 per slide)
   - Include relevant examples or data

2. **Choose Appropriate Themes**
   - Search with keywords matching your purpose
   - Common searches: "business", "professional", "creative", "education"
   - Preview themes before selecting

3. **Reference Images**
   - Use high-quality images for better matching
   - Ensure images are publicly accessible
   - Consider resolution settings based on quality needs

4. **Document Processing**
   - Focus on key insights, not full text
   - Use document headings as slide titles
   - Ask user which sections to emphasize

## Troubleshooting

### API Key Issues

```
Error: API key not found
Solution: Set SLIDES_2SLIDES_API_KEY environment variable
```

**To get your API key:**

- Go to [2slides.com/api](https://2slides.com/api)
- Log in to your account
- Navigate to API Keys section
- Generate a new key if needed

### Rate Limiting

```
Error: 429 Too Many Requests
Solution: Wait before retrying or check your plan limits
```

**To check your usage and limits:**

- Visit [2slides.com/api](https://2slides.com/api)
- Check your current plan and credit balance
- Review API rate limits for your tier
- Consider upgrading your plan at [2slides.com](https://2slides.com)

### Invalid Content

```
Error: 400 Bad Request
Solution: Verify content format and required parameters (theme-id or reference-image)
```

**For API support:**

- Visit [2slides.com/api](https://2slides.com/api) for API documentation
- Check the API reference for correct parameter formats
- Contact 2slides support through [2slides.com](https://2slides.com)

## Advanced Configuration

### Async vs Sync Mode

**Sync Mode (default):**

- Waits for generation (30-60 seconds)
- Returns results immediately
- Best for interactive use

**Async Mode:**

- Returns job ID immediately
- Poll for results with `get_job_status.py`
- Best for batch processing or large presentations

### Custom Settings

You can customize generation with additional parameters:

```bash
--aspect-ratio "16:9"          # Slide dimensions
--resolution "2K"              # Output quality (1K, 2K, 4K)
--page 10                      # Number of slides
--content-detail "concise"     # Brief or detailed content
```

See [SKILL.md](SKILL.md) for complete parameter documentation.

## Contributing

This skill is designed to work with the official 2slides API. For API issues or feature requests, contact 2slides support at [https://2slides.com](https://2slides.com).

For skill-related improvements, ensure all changes maintain compatibility with the 2slides API specification.

## License

This skill integrates with the 2slides API service. Usage is subject to 2slides terms of service and API usage limits.

## Resources

### 2slides Platform

- **[2slides.com](https://2slides.com)** - Main website
  - Product features and demos
  - Pricing and plans
  - Web-based presentation creation
  - Account management
  - Support and contact information

### API & Development

- **[2slides.com/api](https://2slides.com/api)** - API Portal
  - Get your API key
  - API documentation and reference
  - Usage limits and credit information
  - Code examples and guides
  - API status and updates

### Claude Code

- **[Claude Code](https://claude.ai/claude-code)** - Official Claude Code documentation
- **Skill Documentation** - See [SKILL.md](SKILL.md) for complete usage guide

### Getting Help

- **API Issues**: Visit [2slides.com/api](https://2slides.com/api) for documentation
- **Account Questions**: Contact support through [2slides.com](https://2slides.com)
- **Skill Usage**: Refer to [SKILL.md](SKILL.md) and [api-reference.md](references/api-reference.md)

## Version

Current version: 1.0.0

---

Made with Claude Code
