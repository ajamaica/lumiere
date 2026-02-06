---
name: discord-watcher
description: Use this skill to keep up to date with specific Discord channels by fetching recent messages. Requires DISCORD_TOKEN.
---

# Discord Watcher

This skill uses `DiscordChatExporter` to fetch recent messages from **ALL** accessible Discord channels.

## Prerequisites

- **DISCORD_TOKEN**: Must be set in the environment or passed to the script.
- **DiscordChatExporter (CLI)**: Must be installed in a `dce` subdirectory.

## Installation

1. Download the **CLI version** of DiscordChatExporter from GitHub:
   [https://github.com/Tyrrrz/DiscordChatExporter/releases](https://github.com/Tyrrrz/DiscordChatExporter/releases)
   _(Look for `DiscordChatExporter.Cli.linux-x64.zip` or your OS equivalent)_

2. Extract it to a `dce` folder inside this skill's directory:
   ```bash
   mkdir -p skills/discord-watcher/dce
   unzip DiscordChatExporter.Cli.linux-x64.zip -d skills/discord-watcher/dce
   chmod +x skills/discord-watcher/dce/DiscordChatExporter.Cli
   ```

## Usage

Run the update script to fetch messages from the last 24 hours across all channels:

```bash
./skills/discord-watcher/update.sh [TOKEN]
```

The script can be run from any directory (it auto-detects its location).

This will:

1. Create a timestamped directory in `exports/updates/`.
2. Export all new messages (last 24h) from every channel you can see.
3. Save them as plain text files organized by server and category.

## Token retrieval (browser method)

If you need help obtaining DISCORD_TOKEN from a logged-in browser session, the following in-page technique (run from a page context where script evaluation is allowed) reliably extracts the token from localStorage using an injected iframe. Treat the token as a secret once retrieved.

JavaScript snippet (run in the page context via an automation tool that can evaluate page scripts):

```js
// Inject a hidden iframe and read its localStorage 'token' key
;(() => {
  try {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.documentElement.appendChild(iframe)
    const token = iframe.contentWindow.localStorage.getItem('token')
    iframe.remove()
    return { ok: !!token, method: 'iframe', token }
  } catch (e) {
    return { ok: false, error: e.toString() }
  }
})()
```

Notes and alternatives:

- Some automation contexts cannot access page localStorage directly; the iframe technique often bypasses that limitation.
- An alternative is the "webpack chunk" method to locate Discord's internal token getter; use with care.
- Never commit tokens to source control. Store them in a .env file or environment variable instead.

## Automation

To keep updated automatically, you can add a `HEARTBEAT.md` entry:

```markdown
- [ ] Every 6 hours: Run `skills/discord-watcher/update.sh` and summarize any new important discussions in `memory/discord-news.md`.
```

## Search & Indexing (Recommended)

The exported text files are perfect for indexing with `qmd`.

1. **Create a collection:**

   ```bash
   qmd collection add exports/updates --name discord-logs --mask "**/*.txt"
   ```

   _Note: Ensure you use the `--mask "\*\*/_.txt"` flag as the exporter saves plain text files.\*

2. **Update index:**

   ```bash
   qmd update
   ```

3. **Search:**
   ```bash
   qmd search "query"
   ```
