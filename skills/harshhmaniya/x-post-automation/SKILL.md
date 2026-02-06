---
name: x-automation
description: Automates the process of identifying trends on X (Twitter), generating opinionated/engaging content, and posting it. Use when asked to post to X, run X automation, or check trends for content creation.
---

# X (Twitter) Automation Skill

This skill provides a structured workflow for generating and posting high-engagement content on X.

## Workflow

1.  **Context Gathering**:
    - Use `browser(profile="chrome")` to visit `https://x.com/home`.
    - Scroll for ~30 seconds to absorb the timeline's "vibe" and current discourse.
2.  **Trend Identification**:
    - Navigate to `https://x.com/explore/`.
    - Identify 5 distinct trending topics from the main list.
3.  **Trend Analysis (Deep Dive)**:
    - For each trend, search: `https://x.com/search?q={trend}&src=trend_click&vertical=trends`.
    - Read the **Top 5 tweets** per trend.
4.  **Content Generation**:
    - Generate **3 candidate tweets**.
    - **Constraint**: Opinions are encouraged! Be bold, witty, or opinionated to drive engagement.
    - Include relevant hashtags but keep them minimal (1-2).
5.  **Logging & Selection**:
    - Write candidates to `memory/x-daily-candidates.log`.
    - Select the best one based on viral potential and alignment with the current timeline vibe.
6.  **Publication**:
    - Navigate to `https://x.com/compose/post`.
    - Type the selected text and click "Post".
7.  **Notification**:
    - Notify the user via the primary channel (Telegram/Webchat) of success or failure.
    - Include the best draft in case of failure.

## Troubleshooting

- **Browser Relay**: Ensure a tab is connected in Chrome via the OpenClaw extension.
- **Failure Logging**: Always log errors to `memory/x-automation-logs.md`.

## Content Style Guide

- **Concise**: Keep it punchy.
- **Opinionated**: Don't just report facts; give a "hot take".
- **Engaging**: Use questions or strong statements to prompt replies.
