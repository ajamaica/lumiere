# Data Directory

This directory is created automatically when you run the skill.

It will contain:

- `latest-trends.json` - Most recent trending topics scraped from X
- `approved-queue.json` - Tweets waiting to be posted
- `tweet-history.json` - All tweets posted via this skill
- `pending-approval.json` - Tweets awaiting your review

**Note:** This directory is in `.gitignore` - your tweets and trends are never committed to version control.

Add `data/` to your `.gitignore` if publishing this skill.
