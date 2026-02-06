---
name: google_tv
description: Control the Living Room Chromecast with Google TV via ADB
author: Anthony
---

# Google TV Control

Use this skill when I ask to control the TV, play shows, or check if the TV is online.

## Setup

This skill uses a local Python virtual environment to communicate with the TV via ADB.

- Always use the skill-specific venv at `./.venv/bin/python3` (not the workspace `venv` folder). Activate or call that python explicitly when running the script.
- The skill requires a few Python packages at runtime; ensure the venv has at minimum: `requests` and `beautifulsoup4` (bs4). To install into the skill venv run:

```
./.venv/bin/python3 -m pip install -r requirements.txt
```

(See requirements.txt in the skill folder.)

## Capabilities

This skill provides a small CLI wrapper around ADB to control a Google TV device. It exposes the following subcommands:

- status: show adb devices output
- play <query_or_id_or_url>: play content. Prefer providing a YouTube video ID or a provider URL/ID.
- pause: send media pause
- resume: send media play

### Usage examples

`./.venv/bin/python3 google_tv_skill.py status --device 192.168.4.64 --port 5555`

`./.venv/bin/python3 google_tv_skill.py play "7m714Ls29ZA" --device 192.168.4.64 --port 5555`

`./.venv/bin/python3 google_tv_skill.py pause --device 192.168.4.64 --port 5555`

### Device selection and env overrides

- You can pass --device (IP) and --port on the CLI.
- Alternatively, set CHROMECAST_HOST and CHROMECAST_PORT environment variables to override defaults.
- If you provide only --device or only --port, the script will use the cached counterpart when available; otherwise it will error.
- The script caches the last successful IP:PORT to `.last_device.json` in the skill folder and will use that cache if no explicit device is provided.
- IMPORTANT: This skill does NOT perform any port probing or scanning. It will only attempt an adb connect to the explicit port provided or the cached port.

### YouTube handling — direct intent only (preferred)

- If you provide a YouTube video ID or URL, the skill will launch the YouTube TV app directly via an ADB intent restricted to the YouTube TV package (no Assistant/UI fallback).
- The skill attempts to resolve titles/queries to a YouTube video ID using the `yt-api` CLI (on PATH) and falls back to `/Users/anthony/go/bin/yt-api` if needed. If ID resolution fails, the skill will report failure rather than attempting UI search.
- You can override the package name with `YOUTUBE_TV_PACKAGE` (default `com.google.android.youtube.tv`).

### Tubi handling

- If you provide a numeric Tubi ID the skill will attempt the tubitv:// intent and then a VIEW https intent for a Tubi URL, both restricted to the Tubi package.
- If you provide a Tubi https URL, the skill will send a VIEW intent with that URL (restricted to the Tubi package).
- If the canonical Tubi https URL is needed, the assistant can look it up via web_search and supply it to this skill.
- You can override the package name with `TUBI_PACKAGE` (default `com.tubitv`).

### Pause / Resume

`./.venv/bin/python3 google_tv_skill.py pause`
`./.venv/bin/python3 google_tv_skill.py resume`

### Behavior and logging

- Default logging level is INFO. Use --verbose to enable DEBUG logging.
- Exit codes: 0 success, 2 adb/connect error, 3 resolution error (e.g., could not resolve YouTube ID), 4 adb command failure.

### Dependencies & venv

- requirements.txt includes required Python packages. Install them into the skill venv at `./.venv`.
- The script expects `adb` to be on PATH and `yt-api` to be available on PATH or at `/Users/anthony/go/bin/yt-api`.

### Caching and non-destructive defaults

- The script stores the last successful device (ip and port) in `.last_device.json` in the skill folder.
- It will not attempt port scanning; this keeps behavior predictable and avoids conflicts with Google's ADB port rotation.

### Troubleshooting

- If adb connect fails, run `adb connect IP:PORT` manually from your host to verify the current port.
- If adb connect is refused and you're running interactively, the script will prompt you for a new port and update `.last_device.json` on success.
- If yt-api resolution fails, ensure `yt-api` is installed or accessible at `/Users/anthony/go/bin/yt-api`.

## Implementation notes

- The skill CLI code lives in `google_tv_skill.py` in this folder. It uses subprocess calls to `adb` and to `yt-api` when needed.
- For Tubi URL discovery, the assistant can use web_search to find canonical Tubi pages and pass the https URL to the skill.
