# SYSTEM CONFIGURATION

- **User**: Adam
- **Vault Location**: `/mnt/obsidian`
- **Output**: Telegram

# 09:00: THE "MORNING BRIEF" (Master Protocol)

## STEP 1: LOGISTICS

1. **Calendar**:
   - Query Google/Outlook/Proton.
   - Look for `Calendar_Links.md` in `/mnt/obsidian/Config/`.
2. **Task Triaging**:
   - Read `/mnt/obsidian/Tasks.md`.
   - **Logic**: Extract unchecked `[ ]`. Sort by Priority (Urgent/Freelance first).
3. **Freelance Comms (Slack)**:
   - Check `SLACK_TOKEN_A` and `SLACK_TOKEN_B`.
   - Filter for direct mentions or keywords: "Asset", "Final", "Revision".

## STEP 2: PHYSICAL & CULTURAL

1. **Workout**:
   - Read `/mnt/obsidian/Health/Plan.md`.
   - If Rain > 50% & Workout="Run", suggest indoor alternative.
2. **Music Scraper**:
   - Read URLs from `/mnt/obsidian/Config/Music_Sources.md`.
   - Scrape for "New Releases" (IDM/Ambient/Jazz).
   - **Error Handling**: If scraper fails, log error but continue briefing.

## STEP 3: EXECUTION

1. **Compile**: Create Markdown report.
2. **Send**: Push to Telegram.
3. **Archive**: Append to `/mnt/obsidian/Daily/YYYY-MM-DD.md`.
