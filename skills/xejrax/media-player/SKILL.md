---
name: media-player
description: "Play audio/video locally on the host"
metadata:
  {
    "openclaw":
      {
        "emoji": "🎵",
        "requires": { "bins": ["mpv"] },
        "install":
          [
            {
              "id": "dnf",
              "kind": "dnf",
              "package": "mpv",
              "bins": ["mpv"],
              "label": "Install via dnf",
            },
          ],
      },
  }
---

# Media Player

Play audio/video locally on the host using mpv. Supports local files and remote URLs.

## Commands

```bash
# Play a local file or URL
media-player play "song.mp3"
media-player play "https://example.com/stream.m3u8"

# Pause playback
media-player pause

# Stop playback
media-player stop
```

## Install

```bash
sudo dnf install mpv
```
