# Skill: deep-scraper

## Overview

A high-performance engineering tool for deep web scraping. It uses a containerized Docker + Crawlee (Playwright) environment to penetrate protections on complex websites like YouTube and X/Twitter, providing "interception-level" raw data.

## Requirements

1.  **Docker**: Must be installed and running on the host machine.
2.  **Image**: Build the environment with the tag `clawd-crawlee`.
    - Build command: `docker build -t clawd-crawlee skills/deep-scraper/`

## Integration Guide

Simply copy the `skills/deep-scraper` directory into your `skills/` folder. Ensure the Dockerfile remains within the skill directory for self-contained deployment.

## Standard Interface (CLI)

```bash
docker run -t --rm -v $(pwd)/skills/deep-scraper/assets:/usr/src/app/assets clawd-crawlee node assets/main_handler.js [TARGET_URL]
```

## Output Specification (JSON)

The scraping results are printed to stdout as a JSON string:

- `status`: SUCCESS | PARTIAL | ERROR
- `type`: TRANSCRIPT | DESCRIPTION | GENERIC
- `videoId`: (For YouTube) The validated Video ID.
- `data`: The core text content or transcript.

## Core Rules

1.  **ID Validation**: All YouTube tasks MUST verify the Video ID to prevent cache contamination.
2.  **Privacy**: Strictly forbidden from scraping password-protected or non-public personal information.
3.  **Alpha-Focused**: Automatically strips ads and noise, delivering pure data optimized for LLM processing.
