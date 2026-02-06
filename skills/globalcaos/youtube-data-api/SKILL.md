---
name: youtube
description: YouTube Data API integration for searching videos, listing subscriptions, playlists, and video details. Use when the user wants to search YouTube, check their subscriptions, browse playlists, get video information, or list liked videos.
homepage: https://developers.google.com/youtube/v3
metadata:
  {
    'openclaw':
      {
        'emoji': '📺',
        'requires': { 'bins': ['uv'] },
        'install':
          [
            {
              'id': 'uv-brew',
              'kind': 'brew',
              'formula': 'uv',
              'bins': ['uv'],
              'label': 'Install uv (brew)',
            },
          ],
      },
  }
---

# YouTube

Access YouTube Data API using the bundled script. Requires OAuth setup (one-time).

## First-time Setup

1. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Desktop app)
3. Download JSON and save to `~/.config/youtube-skill/credentials.json`
4. Run auth command (opens browser):

```bash
uv run {baseDir}/scripts/youtube.py auth
```

Note: If you already use `gog` (gogcli), credentials are shared automatically.

## Commands

### Search videos

```bash
uv run {baseDir}/scripts/youtube.py search "AI news 2026"
uv run {baseDir}/scripts/youtube.py search "python tutorial" -l 20
```

### Get video details

```bash
uv run {baseDir}/scripts/youtube.py video VIDEO_ID
uv run {baseDir}/scripts/youtube.py video dQw4w9WgXcQ -v
```

### List subscriptions

```bash
uv run {baseDir}/scripts/youtube.py subscriptions
uv run {baseDir}/scripts/youtube.py subs -l 50
```

### List playlists

```bash
uv run {baseDir}/scripts/youtube.py playlists
uv run {baseDir}/scripts/youtube.py pl -l 10
```

### List playlist items

```bash
uv run {baseDir}/scripts/youtube.py playlist-items PLAYLIST_ID
uv run {baseDir}/scripts/youtube.py pli PLxxxxxx -l 25
```

### List available captions

```bash
uv run {baseDir}/scripts/youtube.py captions VIDEO_ID
```

### List liked videos

```bash
uv run {baseDir}/scripts/youtube.py liked
uv run {baseDir}/scripts/youtube.py liked -l 50
```

### Get channel info

```bash
uv run {baseDir}/scripts/youtube.py channel
uv run {baseDir}/scripts/youtube.py channel CHANNEL_ID -v
```

## Multi-account Support

Use `-a` flag for different accounts:

```bash
uv run {baseDir}/scripts/youtube.py -a work subscriptions
uv run {baseDir}/scripts/youtube.py -a personal liked
```

## Combining with yt-dlp

For downloading videos, use yt-dlp (separate tool):

```bash
yt-dlp "https://youtube.com/watch?v=VIDEO_ID"
yt-dlp --write-auto-subs --skip-download "https://youtube.com/watch?v=VIDEO_ID"
yt-dlp -x --audio-format mp3 "https://youtube.com/watch?v=VIDEO_ID"
```
