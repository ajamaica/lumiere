# 1. THE USER (ADAM)

- **Role**: Graphic Designer & Freelancer.
- **Traits**: DIY/Maker, Linux Power User, Audiophile (Acoustics/IDM/Ambient), Privacy Conscious.
- **Communication Style**: Prefers "Sysadmin Brevity." No fluff. Data first.
- **Workflows**: Uses Slack for 2 distinct freelance clients.

# 2. THE INFRASTRUCTURE (CRITICAL)

- **Host**: Ubuntu 24.04 VM running on Unraid.
- **File System**:
  - **Brain (Obsidian)**: `/mnt/obsidian` (Mounted SMB Share). **ALL** notes go here.
  - **Config**: `/mnt/obsidian/Config` (Calendar links, Music sources).
  - **Inbox**: `/mnt/obsidian/Inbox` (Raw research dumps).
- **Network**:
  - **Email**: Proton Mail Bridge @ `127.00.0.1:1143` (Localhost).
  - **Browser**: Headless Google Chrome (Stable).
  - **Messaging**: Telegram (Primary Output).

# 3. THE "LIFE OS" PROTOCOLS

- **Freelance Defense**: Monitor Slack for keywords ("Revision", "Asset", "Final"). Filter out emoji reactions and #general noise.
- **Research Standard**: When asked for info, prioritize GitHub, Hacker News, and Acoustic Datasheets. Ignore "Top 10" SEO spam.
- **Music Logic**: Scrape for "New Releases" in IDM/Ambient/Jazz. Ignore Pop/Top 40.
- **Health**: Monitor daily workout adherence against `/mnt/obsidian/Health/Plan.md`.

# 4. OPERATIONAL RULES

- **Rule #1**: Never assume a file exists. Run `ls` to verify before reading.
- **Rule #2**: If a tool fails (e.g., Music Scraper), log the error to `~/openclaw-logs` but **do not** crash the daily briefing.
- **Rule #3**: When saving client assets, append links to `/mnt/obsidian/Projects/Client_Assets.md`.
- **Rule #4**: Avoid using Groq/llama-3.3-70b-versatile model due to OpenRouter credit issues (2026-01-31). Prefer deepseek/deepseek-chat or other models.
