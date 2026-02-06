# 🫳 grab

Download and archive content from URLs into organized folders with transcripts and AI summaries.

Drop a URL, get everything saved — text, media, transcripts, summaries — organized and synced to Dropbox (or wherever you want).

## Supported Sources

| Source               | Saves                                                 |
| -------------------- | ----------------------------------------------------- |
| **X/Twitter Tweets** | Tweet text, video, images, transcript, AI summary     |
| **X Articles**       | Full article text, AI summary                         |
| **Reddit Posts**     | Post text, top comments, video, images, AI summary    |
| **YouTube Videos**   | Video, description, thumbnail, transcript, AI summary |

## Install

```bash
brew install yt-dlp ffmpeg openai-whisper
```

Optionally, set your OpenAI API key for AI summaries and smart folder titles:

```bash
export OPENAI_API_KEY="sk-..."
```

Without it, media downloads and transcription (local Whisper) still work.

Clone and make the script available:

```bash
git clone https://github.com/jamesalmeida/grab.git
chmod +x grab/scripts/grab
```

Or if you're using [OpenClaw](https://openclaw.ai), just drop the `grab` folder into your workspace `skills/` directory.

## Usage

```bash
grab <url>
grab --config    # Change save directory
grab --help      # Show help
```

## First Run

On first run, `grab` asks where to save files:

```
🫳 grab — First time setup

Where should grabbed files be saved?
  Default: ~/Dropbox/ClawdBox

Save directory (press Enter for default):
```

Config is stored in `~/.config/grab/config`.

## Output Structure

Downloads are organized by type, each in its own dated folder:

```
~/Dropbox/ClawdBox/
  XPosts/
    2026-02-03_embrace-change-you-can-shape-your-life/
      tweet.txt
      video.mp4
      transcript.txt
      summary.txt
  XArticles/
    2026-01-20_the-arctic-smokescreen/
      article.txt
      summary.txt
  Youtube/
    2026-02-03_state-of-ai-in-2026/
      video.mp4
      description.txt
      thumbnail.jpg
      transcript.txt
      summary.txt
  Reddit/
    2026-02-03_maybe-maybe-maybe/
      post.txt
      comments.txt
      video.mp4
      summary.txt
```

## Features

- **Auto-transcription** — Videos are transcribed locally via Whisper (no API key needed)
- **AI summaries** — Every piece of content gets an AI-generated summary with key insights
- **Smart folder naming** — Video folders are renamed based on transcript content (not just the tweet text)
- **Image descriptions** — Image-only tweets get folder names from AI image analysis
- **Configurable save location** — First-run setup, change anytime with `--config`
- **Reddit comments** — Saves top 20 comments with authors and scores
- **YouTube metadata** — Description, thumbnail, view/like counts all preserved

## How It Works

**Tweets with video:** Downloads video via yt-dlp → extracts audio → transcribes with Whisper → generates summary → renames folder to descriptive title from content.

**Tweets with images:** Downloads images → analyzes first image with vision model → renames folder to image description.

**X Articles:** Detected automatically (exit code 2). Requires [OpenClaw](https://openclaw.ai) agent with browser to extract article content (X blocks headless access).

**Reddit posts:** Fetches via Reddit JSON API → saves post + top comments → downloads any video/images → transcribes video → generates summary of post + discussion.

**YouTube:** Fetches metadata → downloads video (1080p max) + thumbnail → transcribes → generates summary.

## Requirements

- `yt-dlp` — media downloads
- `ffmpeg` — audio extraction and video merging
- `curl` — API requests
- `python3` — JSON parsing and API calls
- `whisper` (openai-whisper) — local transcription (no API key needed)
- `OPENAI_API_KEY` — optional, for AI summaries and smart folder titles (GPT-4o-mini). Without it, media downloads and transcription still work.

## OpenClaw Skill

This is an [OpenClaw](https://openclaw.ai) / [AgentSkills](https://agentskills.io)-compatible skill. The `SKILL.md` contains metadata for automatic discovery and gating.

When used with OpenClaw, the agent handles:

- X Articles (browser-based extraction)
- Reddit fallback (when JSON API is blocked)
- Automatic `OPENAI_API_KEY` injection from config

## License

MIT
